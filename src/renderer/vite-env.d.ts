/// <reference types="vite/client" />

declare global {
  interface Window {
    claw: {
      getConfig: () => Promise<any>;
      listAgents: () => Promise<any>;
      listProjects: () => Promise<any>;
      createProject: (name: string) => Promise<any>;
      listAssignments: () => Promise<any>;
      setAssignment: (projectSlug: string, agentId: string) => Promise<any>;
      agentsAdd: (name: string, model?: string) => Promise<any>;
      agentsDelete: (id: string) => Promise<any>;
      agentsSetIdentity: (payload: { id: string; name?: string; emoji?: string; avatar?: string }) => Promise<any>;
      agentsBindings: (agentId?: string) => Promise<any>;
      agentsBind: (payload: { agentId: string; binding: string }) => Promise<any>;
      agentsUnbind: (payload: { agentId: string; binding?: string; all?: boolean }) => Promise<any>;
      agentRun: (payload: { agentId?: string; channel?: string; to?: string; sessionId?: string; message: string; deliver?: boolean }) => Promise<any>;
      sessionsList: () => Promise<any>;
      sessionsCleanup: () => Promise<any>;
      modelsStatus: () => Promise<any>;
      buildRun: () => Promise<any>;
      testRun: () => Promise<any>;
    };
  }
}

export {};
