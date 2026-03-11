import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { AgentAvatar } from './droid';

const statusColor = (status: string) => {
  if (status === 'working') return 'var(--green)';
  if (status === 'idle') return 'var(--yellow)';
  return 'var(--red)';
};

const App = () => {
  const [config, setConfig] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<'agents' | 'projects' | 'settings'>('agents');
  const [agents, setAgents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [showScopePrompt, setShowScopePrompt] = useState(false);
  const [scopeProjectName, setScopeProjectName] = useState('');
  const [assignPrompt, setAssignPrompt] = useState<{ projectSlug: string; agentId: string } | null>(null);

  const refresh = () => {
    // @ts-ignore
    window.claw.getConfig().then(setConfig);
    // @ts-ignore
    window.claw.listAgents().then((res: any) => {
      const list = Array.isArray(res?.agents) ? res.agents : [];
      setAgents(list);
    });
    // @ts-ignore
    window.claw.listProjects().then((res: any) => {
      const list = Array.isArray(res?.projects) ? res.projects : [];
      setProjects(list);
    });
    // @ts-ignore
    window.claw.listAssignments().then((res: any) => {
      const map = res?.assignments || {};
      setAssignments(map);
    });
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    // load models once
    window.claw.modelsStatus().then((res: any) => {
      if (res?.ok && res?.data) {
        const allowed: string[] = Array.isArray(res.data.allowed) ? res.data.allowed : [];
        const providers = Array.isArray(res.data.auth?.providers) ? res.data.auth.providers : [];
        const allowedProviders = new Set(
          providers
            .filter((p: any) => (p.profiles?.count || 0) > 0 || p.modelsJson)
            .map((p: any) => p.provider)
        );
        const filtered = allowed.filter((m) => {
          const provider = m.split('/')[0];
          return allowedProviders.has(provider);
        });
        setModelOptions(filtered.length ? filtered : allowed);
      } else {
        setModelOptions([]);
      }
    }).catch(() => setModelOptions([]));
    return () => clearInterval(id);
  }, []);


  const repairBay = config?.layout?.repairBay || { x: 900, y: 420 };
  const breakRoom = config?.layout?.breakRoom || { x: 840, y: 140 };

  const agentById = Object.fromEntries(agents.map((a) => [a.id, a]));
  const assignedAgentIds = new Set(Object.values(assignments || {}));

  const displayName = (a: any) => (a?.id === 'main' && (!a.name || a.name === 'main') ? 'Sensei' : (a?.name || a?.id || ''));

  const projectStations = (() => {
    const list = Array.isArray(projects) ? projects : [];
    if (list.length === 1) {
      return [
        { ...list[0], kind: 'project' },
        { name: 'Select Project / Create New Project', slug: '__selector', kind: 'selector' },
      ];
    }
    return list.map((p: any) => ({ ...p, kind: 'project' }));
  })();

  const inRepair = agents.filter((a) => a.status === 'issue');
  const idleAgents = agents.filter((a) => (a.status === 'idle' || !a.status) && !assignedAgentIds.has(a.id));
  const activeUnassigned = agents.filter((a) => a.status === 'working' && !assignedAgentIds.has(a.id));

  const [logLines, setLogLines] = useState<string[]>(['Live agent telemetry updating every 5s…']);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentModel, setNewAgentModel] = useState('');
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [identityAgent, setIdentityAgent] = useState('');
  const [identityName, setIdentityName] = useState('');
  const [identityEmoji, setIdentityEmoji] = useState('');
  const [identityAvatar, setIdentityAvatar] = useState('');
  const [bindingsAgent, setBindingsAgent] = useState('');
  const [bindingsList, setBindingsList] = useState<any[]>([]);
  const [bindAgentId, setBindAgentId] = useState('');
  const [bindValue, setBindValue] = useState('');
  const [unbindAgentId, setUnbindAgentId] = useState('');
  const [unbindValue, setUnbindValue] = useState('');
  const [unbindAll, setUnbindAll] = useState(false);
  const [runAgentId, setRunAgentId] = useState('');
  const [runChannel, setRunChannel] = useState('');
  const [runTo, setRunTo] = useState('');
  const [runSessionId, setRunSessionId] = useState('');
  const [runMessage, setRunMessage] = useState('');
  const [runDeliver, setRunDeliver] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [dragStationId, setDragStationId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState('No build run yet.');
  const [testStatus, setTestStatus] = useState('No tests run yet.');
  const [buildRunning, setBuildRunning] = useState(false);
  const [testRunning, setTestRunning] = useState(false);

  const appendLog = (line: string) => setLogLines((prev) => [line, ...prev].slice(0, 120));

  const runCreateProject = async () => {
    const fallback = prompt('New project name?') || '';
    const name = (newProjectName || fallback).trim();
    if (!name) return;
    const res = await window.claw.createProject(name);
    if (res?.ok) {
      appendLog(`[project] Created ${res.slug}`);
      setScopeProjectName(name);
      setShowScopePrompt(true);
      setNewProjectName('');
      refresh();
    } else {
      appendLog(`[project] ERR ${res?.stderr || res?.error || 'create failed'}`.trim());
    }
  };

  const runDeleteProject = async (slug: string) => {
    if (!slug) return;
    if (!confirm(`DELETE PROJECT ${slug}?
This will move the project to Trash.`)) return;
    const typed = prompt(`Type the project slug to confirm deletion: ${slug}`) || '';
    if (typed.trim() !== slug) {
      appendLog(`[project delete ${slug}] ABORTED (slug mismatch)`);
      return;
    }
    const res = await window.claw.deleteProject(slug);
    appendLog(`[project delete ${slug}] ${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout || ''}`.trim());
    refresh();
  };

  const assignAgentToProject = async (projectSlug: string, agentId: string) => {
    if (!projectSlug || !agentId) return;
    const res = await window.claw.setAssignment(projectSlug, agentId);
    if (res?.ok) {
      setAssignments(res.assignments || {});
      appendLog(`[assign] ${agentId} → ${projectSlug}`);
    } else {
      appendLog(`[assign] ERR ${res?.stderr || res?.error || 'failed'}`.trim());
    }
  };

  const runAddAgent = async () => {
    if (!newAgentName) return;
    const res = await window.claw.agentsAdd(newAgentName, newAgentModel || undefined);
    appendLog(`[agents add] ${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout}`.trim());
    if (res?.stderr?.includes('openclaw binary not found') || res?.stderr?.includes('ENOENT')) {
      appendLog(`[agents add] Hint: ensure /opt/homebrew/bin/openclaw is installed and accessible.`);
    }
    setNewAgentName('');
    refresh();
  };

  const runDeleteAgent = async (id: string) => {
    const mainWorkspace = '/Users/openclaw/.openclaw/workspace';
    const agent = agentById[id];
    if (agent?.workspace === mainWorkspace) {
      if (!confirm(`WARNING: ${id} shares the MAIN workspace (${mainWorkspace}).
Deleting it can move the shared workspace to Trash and break the app.
Continue only if you know what you're doing.`)) return;
      const typedShared = prompt('Type DELETE SHARED to continue:') || '';
      if (typedShared.trim() !== 'DELETE SHARED') {
        appendLog(`[agents delete ${id}] ABORTED (shared workspace guard)`);
        return;
      }
    }
    if (!confirm(`DELETE AGENT ${id}?
This is destructive and cannot be undone.`)) return;
    const typed = prompt(`Type the agent name to confirm deletion: ${id}`) || '';
    if (typed.trim() !== id) {
      appendLog(`[agents delete ${id}] ABORTED (name mismatch)`);
      return;
    }
    const res = await window.claw.agentsDelete(id);
    appendLog(`[agents delete ${id}] ${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout}`.trim());
    if (res?.ok) {
      setAgents((prev) => prev.filter((a) => a.id !== id));
      setAssignments((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (next[k] === id) delete next[k];
        });
        return next;
      });
    }
    refresh();
  };

  const runSetIdentity = async () => {
    if (!identityAgent) return;
    const res = await window.claw.agentsSetIdentity({ id: identityAgent, name: identityName || undefined, emoji: identityEmoji || undefined, avatar: identityAvatar || undefined });
    appendLog(`[set-identity ${identityAgent}] ${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout}`.trim());
    refresh();
  };

  const runSessionsList = async () => {
    const res = await window.claw.sessionsList();
    if (res?.ok && res?.data) {
      appendLog(`[sessions] ${JSON.stringify(res.data).slice(0, 200)}...`);
    } else {
      appendLog(`[sessions] ERR ${res?.stderr || ''}`.trim());
    }
  };

  const runBindingsList = async () => {
    const res = await window.claw.agentsBindings(bindingsAgent || undefined);
    if (res?.ok && res?.data) {
      const list = Array.isArray(res.data?.bindings) ? res.data.bindings : res.data;
      setBindingsList(list || []);
      appendLog(`[bindings] ${JSON.stringify(list).slice(0, 200)}...`);
    } else {
      appendLog(`[bindings] ERR ${res?.stderr || ''}`.trim());
    }
  };

  const runBind = async () => {
    if (!bindAgentId || !bindValue) return;
    const res = await window.claw.agentsBind({ agentId: bindAgentId, binding: bindValue });
    appendLog(`[bind ${bindAgentId}] ${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout}`.trim());
    setBindValue('');
    runBindingsList();
  };

  const runUnbind = async () => {
    if (!unbindAgentId) return;
    if (!unbindAll && !unbindValue) return;
    if (unbindAll && !confirm(`Remove ALL bindings for ${unbindAgentId}?`)) return;
    const res = await window.claw.agentsUnbind({ agentId: unbindAgentId, binding: unbindAll ? undefined : unbindValue, all: unbindAll || undefined });
    appendLog(`[unbind ${unbindAgentId}] ${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout}`.trim());
    setUnbindValue('');
    runBindingsList();
  };

  const runAgentTurn = async () => {
    if (!runMessage) return;
    if (!confirm('Run agent turn with this message?')) return;
    const res = await window.claw.agentRun({
      agentId: runAgentId || undefined,
      channel: runChannel || undefined,
      to: runTo || undefined,
      sessionId: runSessionId || undefined,
      message: runMessage,
      deliver: runDeliver || undefined,
    });
    appendLog(`[agent] ${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout}`.trim());
    setRunMessage('');
  };

  const runAgentQuick = async (agentId: string, message: string) => {
    const res = await window.claw.agentRun({ agentId, message, deliver: true });
    appendLog(`[agent quick ${agentId}] ${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout}`.trim());
  };

  const runSessionsCleanup = async () => {
    if (!confirm('Run sessions cleanup across all agents?')) return;
    const res = await window.claw.sessionsCleanup();
    appendLog(`[sessions cleanup] ${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout}`.trim());
  };

  const runBuild = async () => {
    setBuildRunning(true);
    const res = await window.claw.buildRun();
    const summary = `${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout || ''}`.trim();
    setBuildStatus(summary || (res.ok ? 'OK' : 'ERR'));
    appendLog(`[build] ${summary}`.trim());
    setBuildRunning(false);
  };

  const runTest = async () => {
    setTestRunning(true);
    const res = await window.claw.testRun();
    const summary = `${res.ok ? 'OK' : 'ERR'} ${res.stderr || res.stdout || ''}`.trim();
    setTestStatus(summary || (res.ok ? 'OK' : 'ERR'));
    appendLog(`[test] ${summary}`.trim());
    setTestRunning(false);
  };


  return (
    <div className="app-shell">
      <div className="top-nav">
        <button className={activeMenu === 'agents' ? 'nav-button active' : 'nav-button'} onClick={() => setActiveMenu('agents')}>AGENTS</button>
        <button className={activeMenu === 'projects' ? 'nav-button active' : 'nav-button'} onClick={() => setActiveMenu('projects')}>PROJECTS</button>
        <button className={activeMenu === 'settings' ? 'nav-button active' : 'nav-button'} onClick={() => setActiveMenu('settings')}>SETTINGS</button>
      </div>
      <div className="app">
      {showScopePrompt && (
        <div className="modal">
          <div className="modal-card">
            <div className="tiny-label">OpenClaw</div>
            <div style={{ fontSize: 10, lineHeight: 1.4, marginBottom: 8 }}>
              I see you want to create a new project{scopeProjectName ? ` (“${scopeProjectName}”)` : ''}. Let’s scope it out together.
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowScopePrompt(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
      {assignPrompt && (
        <div className="modal">
          <div className="modal-card">
            <div className="tiny-label">Assign & Start</div>
            <div style={{ fontSize: 10, lineHeight: 1.4 }}>
              {displayName(agentById[assignPrompt.agentId])} → {assignPrompt.projectSlug}
            </div>
            <div className="modal-actions" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <button onClick={async () => {
                await assignAgentToProject(assignPrompt.projectSlug, assignPrompt.agentId);
                await runAgentQuick(assignPrompt.agentId, 'What should I work on?');
                setAssignPrompt(null);
              }}>WHAT SHOULD I WORK ON?</button>
              <button onClick={async () => {
                await assignAgentToProject(assignPrompt.projectSlug, assignPrompt.agentId);
                await runAgentQuick(assignPrompt.agentId, 'Just find a task.');
                setAssignPrompt(null);
              }}>JUST FIND A TASK</button>
              <button onClick={async () => {
                await assignAgentToProject(assignPrompt.projectSlug, assignPrompt.agentId);
                setAssignPrompt(null);
              }}>ASSIGN ONLY</button>
            </div>
            <button className="tiny-button" onClick={() => setAssignPrompt(null)}>CANCEL</button>
          </div>
        </div>
      )}
      <div className="bridge">
        <h1 style={{ fontSize: 14, marginTop: 0 }}>Claw Agent Manager — Bridge</h1>
        {projectStations.length === 0 && (
          <div className="tiny-label" style={{ marginBottom: 8 }}>No projects yet</div>
        )}
        <div className="bridge-grid">
          {projectStations.map((st: any, i: number) => {
            const assignedId = st.kind === 'project' ? assignments[st.slug] : null;
            const agent = assignedId ? agentById[assignedId] : null;
            const status = agent?.status || 'idle';
            return (
              <div
                key={st.slug || st.id || i}
                className={dragStationId === st.slug ? 'station drag-over' : 'station'}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragStationId(st.slug || null)}
                onDragLeave={() => setDragStationId(null)}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData('text/plain');
                  if (st.kind === 'project' && id) setAssignPrompt({ projectSlug: st.slug, agentId: id });
                  setDragStationId(null);
                }}
                onClick={() => st.kind === 'selector' && runCreateProject()}
              >
                {st.kind === 'selector' ? (
                  <div className="tiny-label">SELECT / CREATE</div>
                ) : (
                  agent ? <AgentAvatar id={agent.id} color={statusColor(status)} /> : <div className="tiny-label">UNASSIGNED</div>
                )}
                <div className="light" style={{ color: statusColor(status), background: statusColor(status) }} />
                <div style={{ fontSize: 8 }}>{st.kind === 'selector' ? st.name : (displayName(agent) || st.name)}</div>
                {st.kind === 'project' && (
                  <div className="tiny-label" style={{ opacity: 0.6 }}>{st.name}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="side-panel">
        {activeMenu === 'agents' && (
          <>
        <div className="panel">
          <h2 style={{ fontSize: 12, marginTop: 0 }}>Agent Monitor</h2>
          {agents.map((a) => (
            <div
              key={a.id}
              className="status-row"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
              onDragEnd={() => setDragStationId(null)}
              title={`Workspace: ${a.workspace || 'unknown'}`}
            >
              <span className="badge" style={{ borderColor: statusColor(a.status), color: statusColor(a.status) }}>
                {a.status?.toUpperCase()}
              </span>
              <span>{displayName(a)}</span>
              {a.workspace && a.workspace !== '/Users/openclaw/.openclaw/workspace' && (
                <span className="tiny-label" style={{ marginLeft: 6, color: '#7aa2ff' }}>EXTERNAL</span>
              )}
              <span style={{ fontSize: 8, marginLeft: 'auto' }}>{a.lastActiveAt ? new Date(a.lastActiveAt).toLocaleTimeString() : '—'}</span>
              <button style={{ marginLeft: 6 }} onClick={() => runDeleteAgent(a.id)}>DELETE</button>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2 style={{ fontSize: 12, marginTop: 0 }}>Actions</h2>
          <div className="actions">
            <div>
              <div className="tiny-label">Add Agent</div>
              <div className="row">
                <input placeholder="name" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} />
                <select value={newAgentModel} onChange={(e) => setNewAgentModel(e.target.value)}>
                  <option value="">model (optional)</option>
                  {modelOptions.length === 0 ? (
                    <option value="" disabled>loading models…</option>
                  ) : (
                    modelOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))
                  )}
                </select>
              </div>
              <button onClick={runAddAgent}>CREATE</button>
            </div>

            <div>
              <div className="tiny-label">Set Identity</div>
              <div className="row">
                <input placeholder="agent id" value={identityAgent} onChange={(e) => setIdentityAgent(e.target.value)} />
                <input placeholder="name" value={identityName} onChange={(e) => setIdentityName(e.target.value)} />
              </div>
              <div className="row">
                <input placeholder="emoji" value={identityEmoji} onChange={(e) => setIdentityEmoji(e.target.value)} />
                <input placeholder="avatar path/url" value={identityAvatar} onChange={(e) => setIdentityAvatar(e.target.value)} />
              </div>
              <button onClick={runSetIdentity}>APPLY</button>
            </div>

            <div>
              <div className="tiny-label">Routing Bindings</div>
              <div className="row">
                <input placeholder="filter agent id" value={bindingsAgent} onChange={(e) => setBindingsAgent(e.target.value)} />
                <button onClick={runBindingsList}>LIST</button>
              </div>
              <div className="tiny-label" style={{ marginTop: 6 }}>Add Binding</div>
              <div className="row">
                <input placeholder="agent id" value={bindAgentId} onChange={(e) => setBindAgentId(e.target.value)} />
                <input placeholder="channel[:accountId]" value={bindValue} onChange={(e) => setBindValue(e.target.value)} />
              </div>
              <button onClick={runBind}>BIND</button>
              <div className="tiny-label" style={{ marginTop: 6 }}>Remove Binding</div>
              <div className="row">
                <input placeholder="agent id" value={unbindAgentId} onChange={(e) => setUnbindAgentId(e.target.value)} />
                <input placeholder="channel[:accountId]" value={unbindValue} onChange={(e) => setUnbindValue(e.target.value)} disabled={unbindAll} />
              </div>
              <label className="tiny-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={unbindAll} onChange={(e) => setUnbindAll(e.target.checked)} />
                Remove all bindings
              </label>
              <button onClick={runUnbind}>UNBIND</button>
              {bindingsList?.length > 0 && (
                <div className="log" style={{ marginTop: 6 }}>
                  {bindingsList.map((b, i) => (
                    <div key={i}>{JSON.stringify(b)}</div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="tiny-label">Run Agent</div>
              <div className="row">
                <input placeholder="agent id (optional)" value={runAgentId} onChange={(e) => setRunAgentId(e.target.value)} />
                <input placeholder="channel (optional)" value={runChannel} onChange={(e) => setRunChannel(e.target.value)} />
              </div>
              <div className="row">
                <input placeholder="to (optional)" value={runTo} onChange={(e) => setRunTo(e.target.value)} />
                <input placeholder="session id (optional)" value={runSessionId} onChange={(e) => setRunSessionId(e.target.value)} />
              </div>
              <textarea placeholder="message" value={runMessage} onChange={(e) => setRunMessage(e.target.value)} rows={3} />
              <label className="tiny-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={runDeliver} onChange={(e) => setRunDeliver(e.target.checked)} />
                deliver reply
              </label>
              <button onClick={runAgentTurn}>RUN AGENT</button>
            </div>

            <div>
              <button onClick={runSessionsList}>REFRESH SESSIONS (ALL AGENTS)</button>
              <button onClick={runSessionsCleanup} style={{ marginTop: 6 }}>SESSIONS CLEANUP (ALL)</button>
            </div>
          </div>
        </div>
          </>
        )}

        {activeMenu === 'projects' && (
          <>
            <div className="panel">
              <h2 style={{ fontSize: 12, marginTop: 0 }}>Projects</h2>
              <div className="actions">
                <div>
                  <div className="tiny-label">Create Project</div>
                  <div className="row">
                    <input placeholder="project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
                  </div>
                  <button onClick={runCreateProject}>CREATE PROJECT</button>
                </div>
                <div>
                  <div className="tiny-label">Existing Projects</div>
                  {projects.length === 0 ? (
                    <div className="tiny-label" style={{ marginTop: 6 }}>No projects yet</div>
                  ) : (
                    <div className="log" style={{ marginTop: 6 }}>
                      {projects.map((p: any) => (
                        <div key={p.slug || p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                          <span>{p.name || p.slug}</span>
                          <button className="tiny-button" onClick={() => runDeleteProject(p.slug)}>DELETE</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeMenu === 'settings' && (
          <>
        <div className="panel">
          <h2 style={{ fontSize: 12, marginTop: 0 }}>Build & Tests</h2>
          <div className="status-grid">
            <div>
              <div className="tiny-label">Build status</div>
              <div className="status-pill">{buildStatus}</div>
              <button onClick={runBuild} disabled={buildRunning}>{buildRunning ? 'BUILDING…' : 'RUN BUILD'}</button>
            </div>
            <div>
              <div className="tiny-label">Test status</div>
              <div className="status-pill">{testStatus}</div>
              <button onClick={runTest} disabled={testRunning}>{testRunning ? 'RUNNING…' : 'RUN TESTS'}</button>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2 style={{ fontSize: 12, marginTop: 0 }}>System Log</h2>
          <div className="log">{logLines.map((l, i) => (<div key={i}>{l}</div>))}</div>
        </div>
          </>
        )}

        {activeMenu === 'agents' && (
        <div className="panel">
          <h2 style={{ fontSize: 12, marginTop: 0 }}>Support Bays</h2>
          <div className="bays">
            <div className="break-room">
              BREAK ROOM ({idleAgents.length})
              {idleAgents.map((a) => (
                <div
                  key={a.id}
                  className="draggable-agent"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                  title="Drag to assign to a project station"
                >
                  <AgentAvatar id={a.id} color={statusColor(a.status || 'idle')} />
                  <div className="tiny-label">{displayName(a)}</div>
                </div>
              ))}
            </div>
            <div className="active-bay">
              ACTIVE PATROL ({activeUnassigned.length})
              {activeUnassigned.map((a) => (
                <div key={a.id}>
                  <AgentAvatar id={a.id} color={statusColor('working')} />
                  <div className="tiny-label">{displayName(a)}</div>
                </div>
              ))}
            </div>
            <div className="repair-bay">
              REPAIR BAY ({inRepair.length})
              {inRepair.map((a) => (
                <div
                  key={a.id}
                  className="draggable-agent"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)}
                  title="Drag to assign or click to ping"
                >
                  <AgentAvatar id={a.id} color={statusColor('issue')} />
                  <div className="tiny-label">{displayName(a)}</div>
                  <button className="tiny-button" onClick={() => runAgentQuick(a.id, 'Status check. Are you ready for work?')}>PING</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
