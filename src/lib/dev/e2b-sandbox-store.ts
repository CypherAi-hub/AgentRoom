export type SandboxStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "missing_api_key"
  | "stream_unavailable"
  | "creation_failed"
  | "cleanup_failed";

export type AgentStatus = "idle" | "running" | "stopped" | "error" | "done";

export type AgentEventType =
  | "agent_started"
  | "assistant_message"
  | "tool_use"
  | "screenshot"
  | "tool_result"
  | "unsupported_action"
  | "stopped_requested"
  | "stopped"
  | "done"
  | "error"
  | "max_iterations_reached"
  | "max_runtime_reached";

export type AgentLogEvent = {
  ts: number;
  type: AgentEventType;
  payload: unknown;
};

type StreamController = {
  start: () => Promise<void>;
  stop?: () => Promise<void>;
  getUrl: () => string;
};

export type DevDesktopSandbox = {
  id?: string;
  sandboxId?: string;
  stream?: StreamController;
  kill?: () => Promise<void>;
  screenshot?: (format?: "bytes") => Promise<Uint8Array>;
  leftClick?: (x?: number, y?: number) => Promise<void>;
  rightClick?: (x?: number, y?: number) => Promise<void>;
  middleClick?: (x?: number, y?: number) => Promise<void>;
  doubleClick?: (x?: number, y?: number) => Promise<void>;
  scroll?: (direction?: "up" | "down", amount?: number) => Promise<void>;
  moveMouse?: (x: number, y: number) => Promise<void>;
  getCursorPosition?: () => Promise<{ x: number; y: number }>;
  write?: (text: string, options?: { chunkSize: number; delayInMs: number }) => Promise<void>;
  press?: (key: string | string[]) => Promise<void>;
  drag?: (from: [number, number], to: [number, number]) => Promise<void>;
  wait?: (ms: number) => Promise<void>;
};

type AgentSseClient = {
  send: (event: AgentLogEvent) => void;
  close: () => void;
};

type AgentState = {
  status: AgentStatus;
  taskPrompt: string | null;
  logs: AgentLogEvent[];
  abortFlag: boolean;
  startedAt: number | null;
  endedAt: number | null;
  lastError: string | null;
  iterationCount: number;
  maxIterations: number;
  maxRuntimeMs: number;
  sseClients: Set<AgentSseClient>;
};

type StoreState = {
  sandbox: DevDesktopSandbox | null;
  sandboxId: string;
  streamUrl: string;
  status: SandboxStatus;
  startedAt: string;
  lastError: string;
  agent: AgentState;
};

export type AgentPublicState = Omit<AgentState, "sseClients"> & {
  anthropicKeyConfigured: boolean;
  runtimeMs: number;
};

export type SandboxPublicState = {
  apiKeyConfigured: boolean;
  anthropicKeyConfigured: boolean;
  sandboxId: string;
  streamUrl: string;
  hasStreamUrl: boolean;
  status: SandboxStatus;
  startedAt: string;
  lastError: string;
  agent: AgentPublicState;
};

declare global {
  // Keep the dev sandbox and agent event log alive across Next dev hot reloads when possible.
  var __agentRoomDevE2BStoreState: StoreState | undefined;
}

function createInitialAgentState(): AgentState {
  return {
    status: "idle",
    taskPrompt: null,
    logs: [],
    abortFlag: false,
    startedAt: null,
    endedAt: null,
    lastError: null,
    iterationCount: 0,
    maxIterations: parsePositiveInt(process.env.ANTHROPIC_MAX_AGENT_ITERATIONS, 8),
    maxRuntimeMs: parsePositiveInt(process.env.ANTHROPIC_MAX_AGENT_RUNTIME_MS, 180_000),
    sseClients: new Set<AgentSseClient>(),
  };
}

function createInitialState(): StoreState {
  return {
    sandbox: null,
    sandboxId: "",
    streamUrl: "",
    status: "idle",
    startedAt: "",
    lastError: "",
    agent: createInitialAgentState(),
  };
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function store(): StoreState {
  if (!globalThis.__agentRoomDevE2BStoreState) {
    globalThis.__agentRoomDevE2BStoreState = createInitialState();
  }

  return globalThis.__agentRoomDevE2BStoreState;
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return String(error || "Unknown error");
}

function agentRuntimeMs(agent = store().agent) {
  if (!agent.startedAt) return 0;
  return (agent.endedAt || Date.now()) - agent.startedAt;
}

function agentPublicState(agent = store().agent): AgentPublicState {
  return {
    status: agent.status,
    taskPrompt: agent.taskPrompt,
    logs: agent.logs,
    abortFlag: agent.abortFlag,
    startedAt: agent.startedAt,
    endedAt: agent.endedAt,
    lastError: agent.lastError,
    iterationCount: agent.iterationCount,
    maxIterations: agent.maxIterations,
    maxRuntimeMs: agent.maxRuntimeMs,
    anthropicKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    runtimeMs: agentRuntimeMs(agent),
  };
}

function publicState(state = store()): SandboxPublicState {
  return {
    apiKeyConfigured: Boolean(process.env.E2B_API_KEY),
    anthropicKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    sandboxId: state.sandboxId,
    streamUrl: state.streamUrl,
    hasStreamUrl: Boolean(state.streamUrl),
    status: state.status,
    startedAt: state.startedAt,
    lastError: state.lastError,
    agent: agentPublicState(state.agent),
  };
}

function resetState(status: SandboxStatus = "idle") {
  const state = store();
  state.sandbox = null;
  state.sandboxId = "";
  state.streamUrl = "";
  state.status = status;
  state.startedAt = "";
}

function isFinalAgentEvent(type: AgentEventType) {
  return type === "done" || type === "stopped" || type === "error";
}

function closeAgentSseClients(agent = store().agent) {
  for (const client of agent.sseClients) {
    client.close();
  }

  agent.sseClients.clear();
}

export function isDevSandboxRouteEnabled() {
  return true;
}

export function getSandboxState() {
  return publicState();
}

export function getActiveSandbox() {
  return store().sandbox;
}

export function getAgentState() {
  return agentPublicState();
}

export function resetAgentState() {
  const state = store();
  const sseClients = state.agent.sseClients;
  state.agent = createInitialAgentState();
  state.agent.sseClients = sseClients;
  return agentPublicState(state.agent);
}

export function startAgentState(taskPrompt: string, maxIterations: number, maxRuntimeMs: number) {
  const agent = store().agent;
  agent.status = "running";
  agent.taskPrompt = taskPrompt;
  agent.abortFlag = false;
  agent.startedAt = Date.now();
  agent.endedAt = null;
  agent.lastError = null;
  agent.iterationCount = 0;
  agent.maxIterations = maxIterations;
  agent.maxRuntimeMs = maxRuntimeMs;
  return agentPublicState(agent);
}

export function setAgentStatus(status: AgentStatus, lastError?: string | null) {
  const agent = store().agent;
  agent.status = status;
  agent.lastError = lastError ?? agent.lastError;

  if (status === "done" || status === "stopped" || status === "error") {
    agent.endedAt = Date.now();
  }

  return agentPublicState(agent);
}

export function setAgentIterationCount(iterationCount: number) {
  const agent = store().agent;
  agent.iterationCount = iterationCount;
  return agentPublicState(agent);
}

export function requestAgentStop() {
  const agent = store().agent;
  agent.abortFlag = true;
  return agentPublicState(agent);
}

export function isAgentRunning() {
  return store().agent.status === "running";
}

export function appendAgentLog(event: Omit<AgentLogEvent, "ts"> & { ts?: number }) {
  const agent = store().agent;
  const nextEvent: AgentLogEvent = {
    ts: event.ts ?? Date.now(),
    type: event.type,
    payload: event.payload,
  };

  agent.logs.push(nextEvent);
  if (agent.logs.length > 200) {
    agent.logs.splice(0, agent.logs.length - 200);
  }

  for (const client of agent.sseClients) {
    client.send(nextEvent);
  }

  if (isFinalAgentEvent(nextEvent.type)) {
    closeAgentSseClients(agent);
  }

  return nextEvent;
}

export function addAgentSseClient(client: AgentSseClient) {
  const agent = store().agent;
  agent.sseClients.add(client);

  for (const event of agent.logs) {
    client.send(event);
  }

  if (agent.status === "done" || agent.status === "stopped" || agent.status === "error") {
    client.close();
    agent.sseClients.delete(client);
  }
}

export function removeAgentSseClient(client: AgentSseClient) {
  store().agent.sseClients.delete(client);
}

export async function stopSandbox() {
  const state = store();
  const sandbox = state.sandbox;

  if (state.agent.status === "running") {
    requestAgentStop();
    appendAgentLog({ type: "stopped_requested", payload: { reason: "sandbox_cleanup" } });
  }

  if (!sandbox) {
    resetState("idle");
    state.lastError = "";
    return publicState(state);
  }

  state.status = "stopping";

  try {
    if (sandbox.stream?.stop) {
      await sandbox.stream.stop().catch(() => {});
    }

    if (sandbox.kill) {
      await sandbox.kill();
    }

    resetState("idle");
    state.lastError = "";
    return publicState(state);
  } catch (error) {
    state.status = "cleanup_failed";
    state.lastError = errorMessage(error);
    return publicState(state);
  }
}

export async function startSandbox() {
  const state = store();

  if (!process.env.E2B_API_KEY) {
    state.status = "missing_api_key";
    state.lastError = "Missing E2B_API_KEY. Add it to .env.local or the shell running npm run dev.";
    return publicState(state);
  }

  if (state.sandbox && state.status === "running") {
    return publicState(state);
  }

  if (state.status === "starting" || state.status === "stopping") {
    return publicState(state);
  }

  if (state.sandbox) {
    await stopSandbox();
  }

  let sandbox: DevDesktopSandbox | null = null;
  state.status = "starting";
  state.lastError = "";
  state.streamUrl = "";
  state.sandboxId = "";
  state.startedAt = new Date().toISOString();

  try {
    const e2bDesktop = await import("@e2b/desktop");
    const Sandbox = e2bDesktop.Sandbox;

    sandbox = await Sandbox.create({
      resolution: [1024, 720],
      dpi: 96,
      timeoutMs: 300_000,
    });

    await sandbox.stream?.start();
    const streamUrl = sandbox.stream?.getUrl() || "";

    state.sandbox = sandbox;
    state.sandboxId = sandbox.sandboxId || sandbox.id || "";
    state.streamUrl = streamUrl;
    state.status = streamUrl ? "running" : "stream_unavailable";

    if (!streamUrl) {
      state.lastError = "E2B sandbox started, but no stream URL was returned.";
    }

    return publicState(state);
  } catch (error) {
    if (sandbox?.kill) {
      await sandbox.kill().catch(() => {});
    }

    state.sandbox = null;
    state.sandboxId = "";
    state.streamUrl = "";
    state.status = "creation_failed";
    state.lastError = errorMessage(error);
    return publicState(state);
  }
}
