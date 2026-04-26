export type RoomStatus = "active" | "archived";
export type AgentStatus = "idle" | "working" | "reviewing" | "blocked";
export type RunStatus = "pending" | "running" | "completed" | "stopped" | "error";
export type UsageLogType = "sandbox_start" | "minute" | "agent_step" | "screenshot";

export type Room = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
};

export type Agent = {
  id: string;
  userId: string;
  name: string;
  role: string;
  description: string | null;
  avatarInitials: string;
  color: string;
  status: AgentStatus;
  createdAt: string;
};

export type Run = {
  id: string;
  userId: string;
  roomId: string | null;
  agentId: string | null;
  taskPrompt: string;
  status: RunStatus;
  startedAt: string;
  endedAt: string | null;
  creditsUsed: number;
  sandboxId: string | null;
  streamUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type RunWithRefs = Run & {
  roomName: string | null;
  agentName: string | null;
};

export type UsageLog = {
  id: string;
  userId: string;
  runId: string | null;
  type: UsageLogType;
  creditsUsed: number;
  createdAt: string;
};

export type RunStats = {
  total: number;
  running: number;
  completed: number;
  errored: number;
  totalCreditsUsed: number;
  avgDurationMs: number | null;
};

export type UsageThisMonth = {
  creditsUsed: number;
  runsStarted: number;
};

export type IntegrationProvider =
  | "github"
  | "slack"
  | "linear"
  | "vercel"
  | "resend"
  | "supabase";

/**
 * Server-only shape — token fields must NEVER be sent to the client.
 * Use UserIntegrationPublic for anything that crosses the network.
 */
export type UserIntegration = {
  id: string;
  userId: string;
  provider: IntegrationProvider;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
  externalAccountId: string | null;
  externalAccountLogin: string | null;
  metadata: Record<string, unknown>;
  connectedAt: string;
  lastUsedAt: string | null;
};

/** Client-safe — what server components and React props can carry. */
export type UserIntegrationPublic = {
  provider: IntegrationProvider;
  externalAccountLogin: string | null;
  scopes: string[];
  connectedAt: string;
  lastUsedAt: string | null;
};
