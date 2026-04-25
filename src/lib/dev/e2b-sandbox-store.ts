type SandboxStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "missing_api_key"
  | "stream_unavailable"
  | "creation_failed"
  | "cleanup_failed";

type StreamController = {
  start: () => Promise<void>;
  stop?: () => Promise<void>;
  getUrl: () => string;
};

type DesktopSandbox = {
  id?: string;
  sandboxId?: string;
  stream?: StreamController;
  kill?: () => Promise<void>;
};

type StoreState = {
  sandbox: DesktopSandbox | null;
  sandboxId: string;
  streamUrl: string;
  status: SandboxStatus;
  startedAt: string;
  lastError: string;
};

export type SandboxPublicState = {
  apiKeyConfigured: boolean;
  sandboxId: string;
  streamUrl: string;
  hasStreamUrl: boolean;
  status: SandboxStatus;
  startedAt: string;
  lastError: string;
};

declare global {
  // Keep the dev sandbox alive across Next dev hot reloads when possible.
  var __agentRoomDevE2BSandboxState: StoreState | undefined;
}

function createInitialState(): StoreState {
  return {
    sandbox: null,
    sandboxId: "",
    streamUrl: "",
    status: "idle",
    startedAt: "",
    lastError: "",
  };
}

function store(): StoreState {
  if (!globalThis.__agentRoomDevE2BSandboxState) {
    globalThis.__agentRoomDevE2BSandboxState = createInitialState();
  }

  return globalThis.__agentRoomDevE2BSandboxState;
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return String(error || "Unknown error");
}

function publicState(state = store()): SandboxPublicState {
  return {
    apiKeyConfigured: Boolean(process.env.E2B_API_KEY),
    sandboxId: state.sandboxId,
    streamUrl: state.streamUrl,
    hasStreamUrl: Boolean(state.streamUrl),
    status: state.status,
    startedAt: state.startedAt,
    lastError: state.lastError,
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

export function isDevSandboxRouteEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function getSandboxState() {
  return publicState();
}

export async function stopSandbox() {
  const state = store();
  const sandbox = state.sandbox;

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

  let sandbox: DesktopSandbox | null = null;
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
