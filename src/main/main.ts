import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { listAgentsEnriched } from './agent-data';
import { buildOpenClawEnv, resolveOpenClawBin } from './openclaw';

const isDev = !app.isPackaged;
const ROOT = app.getAppPath();
const CONFIG_PATH = path.join(ROOT, 'config', 'bridge-config.json');
const CACHE_DIR = path.join(app.getPath('userData'), 'avatar-cache');
const PROJECTS_DIR = path.join(os.homedir(), 'Documents', 'OpenClaw', 'Projects');
const ASSIGNMENTS_PATH = path.join(app.getPath('userData'), 'project-assignments.json');
const SCOPING_TEMPLATE = path.join(os.homedir(), '.openclaw', 'workspace', 'SCOPING_TEMPLATE.md');

type ProjectInfo = { slug: string; name: string; path: string; scopingPath?: string };

type Station = { id: string; x: number; y: number; agentId?: string };

type AssignmentsFile = {
  activeProject?: string;
  projects: Record<string, { stations: Station[] }>;
};

function attachWindowWatchdogs(win: BrowserWindow) {
  const LOAD_TIMEOUT_MS = 20000;
  let loadTimeout = setTimeout(() => {
    if (win.webContents.isLoading()) {
      console.warn('[watchdog] load timeout — reloading');
      win.webContents.reloadIgnoringCache();
    }
  }, LOAD_TIMEOUT_MS);

  const clearLoadTimeout = () => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      // @ts-ignore
      loadTimeout = null;
    }
  };

  win.webContents.on('did-finish-load', clearLoadTimeout);
  win.webContents.on('did-fail-load', (_evt, code, desc) => {
    console.warn(`[watchdog] did-fail-load (${code}): ${desc} — retrying`);
    setTimeout(() => win.webContents.reloadIgnoringCache(), 1000);
  });
  win.webContents.on('unresponsive', () => {
    console.warn('[watchdog] renderer unresponsive — reloading');
    win.webContents.reloadIgnoringCache();
  });
  win.webContents.on('render-process-gone', (_evt, details) => {
    console.warn(`[watchdog] renderer gone (${details?.reason || 'unknown'}) — reloading`);
    win.webContents.reloadIgnoringCache();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0b0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  attachWindowWatchdogs(win);

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-config', async () => {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
});

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

function readAssignments(): Record<string, string> {
  try {
    if (!fs.existsSync(ASSIGNMENTS_PATH)) return {};
    return JSON.parse(fs.readFileSync(ASSIGNMENTS_PATH, 'utf-8')) || {};
  } catch {
    return {};
  }
}

function writeAssignments(assignments: Record<string, string>) {
  fs.writeFileSync(ASSIGNMENTS_PATH, JSON.stringify(assignments, null, 2));
}

function slugify(name: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  return base || `project-${Date.now()}`;
}

ipcMain.handle('list-projects', async () => {
  ensureProjectsDir();
  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => {
      const p = path.join(PROJECTS_DIR, d.name);
      const stat = fs.statSync(p);
      return { name: d.name, slug: d.name, path: p, updatedAt: stat.mtimeMs };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return { projects: entries };
});

ipcMain.handle('list-assignments', async () => {
  return { assignments: readAssignments() };
});

ipcMain.handle('set-assignment', async (_evt, payload: { projectSlug: string; agentId: string }) => {
  const assignments = readAssignments();
  assignments[payload.projectSlug] = payload.agentId;
  writeAssignments(assignments);
  return { ok: true, assignments };
});

ipcMain.handle('create-project', async (_evt, payload: { name: string }) => {
  ensureProjectsDir();
  const slugBase = slugify(payload.name || 'new-project');
  let slug = slugBase;
  let i = 1;
  while (fs.existsSync(path.join(PROJECTS_DIR, slug))) {
    slug = `${slugBase}-${i++}`;
  }
  const projectPath = path.join(PROJECTS_DIR, slug);
  fs.mkdirSync(projectPath, { recursive: true });
  try {
    if (fs.existsSync(SCOPING_TEMPLATE)) {
      const dest = path.join(projectPath, 'SCOPING.md');
      if (!fs.existsSync(dest)) fs.copyFileSync(SCOPING_TEMPLATE, dest);
    }
  } catch {}
  return { ok: true, slug, path: projectPath };
});

function runOpenClaw(args: string[]) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string }>((resolve) => {
    const bin = resolveOpenClawBin();
    const env = buildOpenClawEnv();
    if (bin === 'openclaw') {
      const cmd = ['openclaw', ...args.map((a) => JSON.stringify(a))].join(' ');
      execFile('/bin/bash', ['-c', cmd], { encoding: 'utf-8', env }, (err, stdout, stderr) => {
        if (err) return resolve({ ok: false, stdout: stdout || '', stderr: stderr || err.message });
        return resolve({ ok: true, stdout: stdout || '', stderr: stderr || '' });
      });
      return;
    }
    execFile(bin, args, { encoding: 'utf-8', env }, (err, stdout, stderr) => {
      if (err) return resolve({ ok: false, stdout: stdout || '', stderr: stderr || err.message });
      return resolve({ ok: true, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

function runProjectCommand(command: string) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string }>((resolve) => {
    const env = buildOpenClawEnv();
    const projectRoot = ROOT;
    if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
      return resolve({ ok: false, stdout: '', stderr: 'Build/tests only available in dev source checkout.' });
    }
    execFile('/bin/bash', ['-lc', `cd "${projectRoot}" && ${command}`], { encoding: 'utf-8', env }, (err, stdout, stderr) => {
      if (err) return resolve({ ok: false, stdout: stdout || '', stderr: stderr || err.message });
      return resolve({ ok: true, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}


function readProjectName(scopingPath?: string, fallback?: string) {
  if (!scopingPath || !fs.existsSync(scopingPath)) return fallback || 'Untitled';
  try {
    const firstLine = fs.readFileSync(scopingPath, 'utf-8').split('\n')[0] || '';
    const match = firstLine.match(/#\s*Project Scoping\s*—\s*(.*)/i);
    return (match?.[1] || fallback || 'Untitled').trim();
  } catch {
    return fallback || 'Untitled';
  }
}

function listProjects(): ProjectInfo[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  const entries = fs.readdirSync(PROJECTS_DIR).filter((d) => {
    const full = path.join(PROJECTS_DIR, d);
    return fs.statSync(full).isDirectory();
  });
  return entries.map((slug) => {
    const projectPath = path.join(PROJECTS_DIR, slug);
    const scopingPath = path.join(projectPath, 'SCOPING.md');
    const name = readProjectName(scopingPath, slug);
    return { slug, name, path: projectPath, scopingPath: fs.existsSync(scopingPath) ? scopingPath : undefined };
  });
}

function loadDefaultStations(): Station[] {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      const stations = Array.isArray(cfg?.layout?.stations) ? cfg.layout.stations : [];
      if (stations.length) return stations.map((s: any, idx: number) => ({ id: s.id || `station-${idx + 1}`, x: s.x || 0, y: s.y || 0 }));
    } catch {}
  }
  return [
    { id: 'station-1', x: 40, y: 80 },
    { id: 'station-2', x: 200, y: 80 },
    { id: 'station-3', x: 360, y: 80 },
    { id: 'station-4', x: 120, y: 240 },
    { id: 'station-5', x: 280, y: 240 },
  ];
}

function loadAssignments(projects: ProjectInfo[], defaultStations: Station[]): AssignmentsFile {
  let data: AssignmentsFile = { projects: {} };
  if (fs.existsSync(ASSIGNMENTS_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(ASSIGNMENTS_PATH, 'utf-8'));
    } catch {}
  }
  if (!data.projects) data.projects = {};
  for (const proj of projects) {
    if (!data.projects[proj.slug]) {
      data.projects[proj.slug] = { stations: defaultStations.map((s) => ({ ...s })) };
    }
  }
  if (!data.activeProject && projects.length) data.activeProject = projects[0].slug;
  fs.writeFileSync(ASSIGNMENTS_PATH, JSON.stringify(data, null, 2));
  return data;
}

function saveAssignments(data: AssignmentsFile) {
  fs.writeFileSync(ASSIGNMENTS_PATH, JSON.stringify(data, null, 2));
}

ipcMain.handle('list-agents', async () => {
  return { agents: listAgentsEnriched(CACHE_DIR) };
});

ipcMain.handle('cli-agents-add', async (_evt, payload: { name: string; model?: string }) => {
  const args = ['agents', 'add', payload.name, '--non-interactive', '--workspace', '/Users/openclaw/.openclaw/workspace'];
  if (payload.model) args.push('--model', payload.model);
  return runOpenClaw(args);
});

ipcMain.handle('cli-agents-delete', async (_evt, payload: { id: string }) => {
  return runOpenClaw(['agents', 'delete', payload.id, '--force']);
});

ipcMain.handle('cli-agents-set-identity', async (_evt, payload: { id: string; name?: string; emoji?: string; avatar?: string }) => {
  const args = ['agents', 'set-identity', '--agent', payload.id];
  if (payload.name) args.push('--name', payload.name);
  if (payload.emoji) args.push('--emoji', payload.emoji);
  if (payload.avatar) args.push('--avatar', payload.avatar);
  return runOpenClaw(args);
});

ipcMain.handle('cli-sessions-list', async () => {
  const res = await runOpenClaw(['sessions', '--all-agents', '--json']);
  if (res.ok && res.stdout) {
    try {
      return { ok: true, data: JSON.parse(res.stdout) };
    } catch {
      return { ok: false, stdout: res.stdout, stderr: 'Failed to parse JSON' };
    }
  }
  return res;
});

ipcMain.handle('cli-agents-bindings', async (_evt, payload: { agentId?: string }) => {
  const args = ['agents', 'bindings', '--json'];
  if (payload?.agentId) args.push('--agent', payload.agentId);
  const res = await runOpenClaw(args);
  if (res.ok && res.stdout) {
    try {
      return { ok: true, data: JSON.parse(res.stdout) };
    } catch {
      return { ok: false, stdout: res.stdout, stderr: 'Failed to parse JSON' };
    }
  }
  return res;
});

ipcMain.handle('cli-agents-bind', async (_evt, payload: { agentId: string; binding: string }) => {
  const args = ['agents', 'bind'];
  if (payload.agentId) args.push('--agent', payload.agentId);
  if (payload.binding) args.push('--bind', payload.binding);
  return runOpenClaw(args);
});

ipcMain.handle('cli-agents-unbind', async (_evt, payload: { agentId: string; binding?: string; all?: boolean }) => {
  const args = ['agents', 'unbind'];
  if (payload.agentId) args.push('--agent', payload.agentId);
  if (payload.all) args.push('--all');
  if (payload.binding) args.push('--bind', payload.binding);
  return runOpenClaw(args);
});

ipcMain.handle('cli-agent-run', async (_evt, payload: { agentId?: string; channel?: string; to?: string; message: string; deliver?: boolean; sessionId?: string }) => {
  const args = ['agent'];
  if (payload.agentId) args.push('--agent', payload.agentId);
  if (payload.channel) args.push('--channel', payload.channel);
  if (payload.to) args.push('--to', payload.to);
  if (payload.sessionId) args.push('--session-id', payload.sessionId);
  if (payload.deliver) args.push('--deliver');
  args.push('--message', payload.message);
  args.push('--json');
  return runOpenClaw(args);
});

ipcMain.handle('cli-sessions-cleanup', async () => {
  return runOpenClaw(['sessions', 'cleanup', '--all-agents', '--enforce', '--json']);
});

ipcMain.handle('cli-models-status', async () => {
  const res = await runOpenClaw(['models', 'status', '--json']);
  if (res.ok && res.stdout) {
    try {
      return { ok: true, data: JSON.parse(res.stdout) };
    } catch {
      return { ok: false, stdout: res.stdout, stderr: 'Failed to parse JSON' };
    }
  }
  return res;
});

ipcMain.handle('projects-list', async () => {
  const projects = listProjects();
  const assignments = loadAssignments(projects, loadDefaultStations());
  return { ok: true, projects, assignments };
});

ipcMain.handle('projects-set-active', async (_evt, payload: { slug: string }) => {
  const projects = listProjects();
  const assignments = loadAssignments(projects, loadDefaultStations());
  assignments.activeProject = payload.slug;
  saveAssignments(assignments);
  return { ok: true };
});

ipcMain.handle('projects-assign', async (_evt, payload: { projectSlug: string; stationId: string; agentId?: string }) => {
  const projects = listProjects();
  const assignments = loadAssignments(projects, loadDefaultStations());
  const project = assignments.projects[payload.projectSlug];
  if (!project) return { ok: false, stderr: `Project not found: ${payload.projectSlug}` };
  const station = project.stations.find((s) => s.id === payload.stationId);
  if (!station) return { ok: false, stderr: `Station not found: ${payload.stationId}` };
  station.agentId = payload.agentId;
  saveAssignments(assignments);
  return { ok: true };
});

ipcMain.handle('projects-create', async (_evt, payload: { name: string; slug?: string }) => {
  const name = payload.name?.trim();
  if (!name) return { ok: false, stderr: 'Project name required' };
  const slug = payload.slug?.trim() || slugify(name);
  if (!slug) return { ok: false, stderr: 'Project slug required' };
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  const projectPath = path.join(PROJECTS_DIR, slug);
  if (fs.existsSync(projectPath)) return { ok: false, stderr: 'Project already exists' };
  fs.mkdirSync(projectPath, { recursive: true });
  const scopingPath = path.join(projectPath, 'SCOPING.md');
  let template = '# Project Scoping — ' + name + '\n';
  if (fs.existsSync(SCOPING_TEMPLATE)) {
    template = fs.readFileSync(SCOPING_TEMPLATE, 'utf-8').replace('<Project Name>', name);
  }
  fs.writeFileSync(scopingPath, template);
  const projects = listProjects();
  const assignments = loadAssignments(projects, loadDefaultStations());
  assignments.projects[slug] = { stations: loadDefaultStations().map((s) => ({ ...s })) };
  assignments.activeProject = slug;
  saveAssignments(assignments);
  const prompt = `Please open the chat widget and complete the project scoping for "${name}". Fill out ${scopingPath} using concise bullet points for each section.`;
  return { ok: true, project: { slug, name, path: projectPath, scopingPath }, prompt };
});

ipcMain.handle('build-run', async () => {
  if (app.isPackaged) return { ok: false, stderr: 'Build/tests only available in dev source checkout.' };
  return runProjectCommand('npm run build');
});

ipcMain.handle('test-run', async () => {
  if (app.isPackaged) return { ok: false, stderr: 'Build/tests only available in dev source checkout.' };
  return runProjectCommand('npm test');
});
