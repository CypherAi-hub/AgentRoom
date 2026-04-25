import { mapRun } from "@/lib/data/mappers";
import { getAdminClient, getAuthedClient } from "@/lib/data/clients";
import type { Run, RunStats, RunStatus, RunWithRefs } from "@/lib/data/types";

type RoomRef = { name: string };
type AgentRef = { name: string };
type RunRow = Record<string, unknown> & {
  rooms?: RoomRef | null;
  agents?: AgentRef | null;
};

function attachRefs(row: RunRow): RunWithRefs {
  const run = mapRun(row);
  return {
    ...run,
    roomName: row.rooms?.name ?? null,
    agentName: row.agents?.name ?? null,
  };
}

export async function getRecentRuns(userId: string, limit = 20): Promise<RunWithRefs[]> {
  const supabase = await getAuthedClient();
  const { data, error } = await supabase
    .from("runs")
    .select("*, rooms(name), agents(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as RunRow[]).map(attachRefs);
}

export async function getRunsForRoom(userId: string, roomId: string, limit = 20): Promise<RunWithRefs[]> {
  const supabase = await getAuthedClient();
  const { data, error } = await supabase
    .from("runs")
    .select("*, rooms(name), agents(name)")
    .eq("user_id", userId)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as RunRow[]).map(attachRefs);
}

export async function getRun(userId: string, runId: string): Promise<RunWithRefs | null> {
  const supabase = await getAuthedClient();
  const { data, error } = await supabase
    .from("runs")
    .select("*, rooms(name), agents(name)")
    .eq("user_id", userId)
    .eq("id", runId)
    .maybeSingle();
  if (error) throw error;
  return data ? attachRefs(data as RunRow) : null;
}

export type CreateRunParams = {
  taskPrompt: string;
  roomId?: string | null;
  agentId?: string | null;
  sandboxId?: string | null;
  streamUrl?: string | null;
};

export async function createRunAdmin(userId: string, params: CreateRunParams): Promise<Run> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("runs")
    .insert({
      user_id: userId,
      task_prompt: params.taskPrompt,
      room_id: params.roomId ?? null,
      agent_id: params.agentId ?? null,
      sandbox_id: params.sandboxId ?? null,
      stream_url: params.streamUrl ?? null,
      status: "running",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRun(data);
}

export type UpdateRunPatch = {
  status?: RunStatus;
  endedAt?: string | null;
  creditsUsed?: number;
  errorMessage?: string | null;
};

export async function updateRunAdmin(userId: string, runId: string, patch: UpdateRunPatch): Promise<Run | null> {
  const supabase = getAdminClient();
  const update: Record<string, unknown> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.endedAt !== undefined) update.ended_at = patch.endedAt;
  if (patch.creditsUsed !== undefined) update.credits_used = patch.creditsUsed;
  if (patch.errorMessage !== undefined) update.error_message = patch.errorMessage;
  const { data, error } = await supabase
    .from("runs")
    .update(update)
    .eq("user_id", userId)
    .eq("id", runId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapRun(data) : null;
}

export async function getRunStats(userId: string, periodDays = 30): Promise<RunStats> {
  const supabase = await getAuthedClient();
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("runs")
    .select("status, started_at, ended_at, credits_used")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    status: RunStatus | null;
    started_at: string | null;
    ended_at: string | null;
    credits_used: number | null;
  }>;
  let running = 0;
  let completed = 0;
  let errored = 0;
  let totalCredits = 0;
  let durationCount = 0;
  let durationSum = 0;

  for (const row of rows) {
    if (row.status === "running") running += 1;
    if (row.status === "completed") completed += 1;
    if (row.status === "error") errored += 1;
    totalCredits += row.credits_used ?? 0;
    if (row.started_at && row.ended_at) {
      const start = Date.parse(row.started_at);
      const end = Date.parse(row.ended_at);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        durationSum += end - start;
        durationCount += 1;
      }
    }
  }

  return {
    total: rows.length,
    running,
    completed,
    errored,
    totalCreditsUsed: totalCredits,
    avgDurationMs: durationCount ? Math.round(durationSum / durationCount) : null,
  };
}
