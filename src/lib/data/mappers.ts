import type { Agent, AgentStatus, Room, RoomStatus, Run, RunStatus, UsageLog, UsageLogType } from "@/lib/data/types";

type Row = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const ROOM_STATUSES: RoomStatus[] = ["active", "archived"];
const AGENT_STATUSES: AgentStatus[] = ["idle", "working", "reviewing", "blocked"];
const RUN_STATUSES: RunStatus[] = ["pending", "running", "completed", "stopped", "error"];
const USAGE_TYPES: UsageLogType[] = ["sandbox_start", "minute", "agent_step", "screenshot"];

function asRoomStatus(value: unknown): RoomStatus {
  return ROOM_STATUSES.includes(value as RoomStatus) ? (value as RoomStatus) : "active";
}

function asAgentStatus(value: unknown): AgentStatus {
  return AGENT_STATUSES.includes(value as AgentStatus) ? (value as AgentStatus) : "idle";
}

function asRunStatus(value: unknown): RunStatus {
  return RUN_STATUSES.includes(value as RunStatus) ? (value as RunStatus) : "pending";
}

function asUsageLogType(value: unknown): UsageLogType {
  return USAGE_TYPES.includes(value as UsageLogType) ? (value as UsageLogType) : "agent_step";
}

export function mapRoom(row: Row): Room {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    name: asString(row.name),
    description: asNullableString(row.description),
    status: asRoomStatus(row.status),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapAgent(row: Row): Agent {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    name: asString(row.name),
    role: asString(row.role),
    description: asNullableString(row.description),
    avatarInitials: asString(row.avatar_initials, "AG"),
    color: asString(row.color, "#3EE98C"),
    status: asAgentStatus(row.status),
    createdAt: asString(row.created_at),
  };
}

export function mapRun(row: Row): Run {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    roomId: asNullableString(row.room_id),
    agentId: asNullableString(row.agent_id),
    taskPrompt: asString(row.task_prompt),
    status: asRunStatus(row.status),
    startedAt: asString(row.started_at),
    endedAt: asNullableString(row.ended_at),
    creditsUsed: asNumber(row.credits_used),
    sandboxId: asNullableString(row.sandbox_id),
    streamUrl: asNullableString(row.stream_url),
    errorMessage: asNullableString(row.error_message),
    createdAt: asString(row.created_at),
  };
}

export function mapUsageLog(row: Row): UsageLog {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    runId: asNullableString(row.run_id),
    type: asUsageLogType(row.type),
    creditsUsed: asNumber(row.credits_used),
    createdAt: asString(row.created_at),
  };
}
