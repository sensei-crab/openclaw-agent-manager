import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('claw', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  listAgents: () => ipcRenderer.invoke('list-agents'),
  listProjects: () => ipcRenderer.invoke('list-projects'),
  createProject: (name: string) => ipcRenderer.invoke('create-project', { name }),
  listAssignments: () => ipcRenderer.invoke('list-assignments'),
  setAssignment: (projectSlug: string, agentId: string) => ipcRenderer.invoke('set-assignment', { projectSlug, agentId }),
  agentsAdd: (name: string, model?: string) => ipcRenderer.invoke('cli-agents-add', { name, model }),
  agentsDelete: (id: string) => ipcRenderer.invoke('cli-agents-delete', { id }),
  agentsSetIdentity: (payload: { id: string; name?: string; emoji?: string; avatar?: string }) =>
    ipcRenderer.invoke('cli-agents-set-identity', payload),
  agentsBindings: (agentId?: string) => ipcRenderer.invoke('cli-agents-bindings', { agentId }),
  agentsBind: (payload: { agentId: string; binding: string }) => ipcRenderer.invoke('cli-agents-bind', payload),
  agentsUnbind: (payload: { agentId: string; binding?: string; all?: boolean }) => ipcRenderer.invoke('cli-agents-unbind', payload),
  agentRun: (payload: { agentId?: string; channel?: string; to?: string; sessionId?: string; message: string; deliver?: boolean }) => ipcRenderer.invoke('cli-agent-run', payload),
  sessionsList: () => ipcRenderer.invoke('cli-sessions-list'),
  sessionsCleanup: () => ipcRenderer.invoke('cli-sessions-cleanup'),
  modelsStatus: () => ipcRenderer.invoke('cli-models-status'),
  buildRun: () => ipcRenderer.invoke('build-run'),
  testRun: () => ipcRenderer.invoke('test-run'),
});
