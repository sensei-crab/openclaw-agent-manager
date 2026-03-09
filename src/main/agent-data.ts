import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { buildOpenClawEnv, resolveOpenClawBin } from './openclaw';

export type AgentInfo = {
  id: string;
  name?: string;
  emoji?: string;
  avatarPath?: string;
  avatarCachePath?: string;
  workspace?: string;
  status?: 'working' | 'idle' | 'issue';
  lastActiveAt?: number;
  lastError?: string | null;
};

const HOME = os.homedir();
const AGENTS_DIR = path.join(HOME, '.openclaw', 'agents');
const MAIN_WORKSPACE = path.join(HOME, '.openclaw', 'workspace');
const WORKSPACE_IDENTITY = path.join(MAIN_WORKSPACE, 'IDENTITY.md');


function readIdentity(agentId: string) {
  const identityPath = path.join(AGENTS_DIR, agentId, 'IDENTITY.md');
  if (!fs.existsSync(identityPath)) return {};
  const text = fs.readFileSync(identityPath, 'utf-8');
  const name = text.match(/\*\*Name:\*\*\s*(.*)/)?.[1]?.trim();
  const emoji = text.match(/\*\*Emoji:\*\*\s*(.*)/)?.[1]?.trim();
  const avatar = text.match(/\*\*Avatar:\*\*\s*(.*)/)?.[1]?.trim();
  return { name, emoji, avatarPath: avatar };
}

function readSessions(agentId: string) {
  const sessionsPath = path.join(AGENTS_DIR, agentId, 'sessions', 'sessions.json');
  if (!fs.existsSync(sessionsPath)) return { data: null, exists: false };
  try {
    const data = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
    return { data, exists: true };
  } catch {
    return { data: null, exists: true };
  }
}

function computeStatus(lastActiveAt?: number, hasSessionFile?: boolean) {
  if (!lastActiveAt) return hasSessionFile ? 'idle' : 'issue';
  const ageMs = Date.now() - lastActiveAt;
  if (ageMs < 10 * 60 * 1000) return 'working';
  if (ageMs < 60 * 60 * 1000) return 'idle';
  return 'issue';
}

function resolveAvatarPath(agentId: string, avatarPath?: string) {
  if (!avatarPath) return undefined;
  if (avatarPath.startsWith('http')) return avatarPath;
  if (avatarPath.startsWith('data:')) return avatarPath;
  if (avatarPath.startsWith('~')) return path.join(HOME, avatarPath.slice(1));
  if (path.isAbsolute(avatarPath)) return avatarPath;
  return path.join(AGENTS_DIR, agentId, avatarPath);
}

export function listAgentsEnriched(cacheDir: string): AgentInfo[] {
  let agents: Array<{ id: string; name?: string; emoji?: string; avatarPath?: string; workspace?: string }> = [];
  try {
    const bin = resolveOpenClawBin();
    const env = buildOpenClawEnv();
    let json = '';
    if (bin === 'openclaw') {
      json = execFileSync('/bin/bash', ['-c', 'openclaw agents list --json'], { encoding: 'utf-8', env });
    } else {
      json = execFileSync(bin, ['agents', 'list', '--json'], { encoding: 'utf-8', env });
    }
    const parsed = JSON.parse(json);
    agents = parsed?.map((a: any) => ({ id: a.id, name: a.identityName || a.name, emoji: a.identityEmoji, workspace: a.workspace })) || [];
  } catch {
    agents = (fs.existsSync(AGENTS_DIR) ? fs.readdirSync(AGENTS_DIR).filter((d) => fs.statSync(path.join(AGENTS_DIR, d)).isDirectory()) : []).map((id) => ({ id }));
  }

  if (!agents.length) {
    if (fs.existsSync(WORKSPACE_IDENTITY)) {
      const text = fs.readFileSync(WORKSPACE_IDENTITY, 'utf-8');
      const wsName = text.match(/\*\*Name:\*\*\s*(.*)/)?.[1]?.trim();
      const wsEmoji = text.match(/\*\*Emoji:\*\*\s*(.*)/)?.[1]?.trim();
      agents = [{ id: 'main', name: wsName, emoji: wsEmoji }];
    } else {
      agents = [{ id: 'main' }];
    }
  }

  return agents.map(({ id, name, emoji, workspace }) => {
    const identity = readIdentity(id);
    let mergedName = name || identity.name || id;
    let mergedEmoji = emoji || identity.emoji;
    if ((!mergedName || mergedName === id) && id === 'main' && fs.existsSync(WORKSPACE_IDENTITY)) {
      const text = fs.readFileSync(WORKSPACE_IDENTITY, 'utf-8');
      const wsName = text.match(/\*\*Name:\*\*\s*(.*)/)?.[1]?.trim();
      const wsEmoji = text.match(/\*\*Emoji:\*\*\s*(.*)/)?.[1]?.trim();
      if (wsName) mergedName = wsName;
      if (wsEmoji) mergedEmoji = wsEmoji;
    }
    const avatarFromIdentity = identity.avatarPath;

    const sessionsInfo = readSessions(id);
    const sessions = sessionsInfo.data;
    const recent = sessions?.recent?.[0];
    const lastActiveAt = recent?.updatedAt || null;
    const status = computeStatus(lastActiveAt, sessionsInfo.exists);

    const resolvedAvatar = resolveAvatarPath(id, avatarFromIdentity);
    let avatarCachePath: string | undefined;
    if (resolvedAvatar && !resolvedAvatar.startsWith('http') && !resolvedAvatar.startsWith('data:') && fs.existsSync(resolvedAvatar)) {
      const ext = path.extname(resolvedAvatar) || '.png';
      const cached = path.join(cacheDir, `${id}${ext}`);
      try {
        fs.copyFileSync(resolvedAvatar, cached);
        avatarCachePath = cached;
      } catch {}
    }

    return {
      id,
      name: mergedName,
      emoji: mergedEmoji,
      avatarPath: resolvedAvatar,
      avatarCachePath,
      workspace,
      status,
      lastActiveAt: lastActiveAt || undefined,
      lastError: null,
    };
  });
}
