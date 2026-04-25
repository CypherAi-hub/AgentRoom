import { mapUsageLog } from "@/lib/data/mappers";
import { getAdminClient, getAuthedClient } from "@/lib/data/clients";
import type { UsageLog, UsageLogType, UsageThisMonth } from "@/lib/data/types";

export type InsertUsageLogParams = {
  runId?: string | null;
  type: UsageLogType;
  creditsUsed: number;
};

export async function insertUsageLogAdmin(userId: string, params: InsertUsageLogParams): Promise<UsageLog> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("usage_logs")
    .insert({
      user_id: userId,
      run_id: params.runId ?? null,
      type: params.type,
      credits_used: params.creditsUsed,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapUsageLog(data);
}

export async function getUsageLogs(userId: string, runId?: string): Promise<UsageLog[]> {
  const supabase = await getAuthedClient();
  let query = supabase
    .from("usage_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (runId) query = query.eq("run_id", runId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapUsageLog);
}

export async function getUsageThisMonth(userId: string): Promise<UsageThisMonth> {
  const supabase = await getAuthedClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: usageRows, error: usageError } = await supabase
    .from("usage_logs")
    .select("credits_used")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (usageError) throw usageError;

  const { data: runRows, error: runError } = await supabase
    .from("runs")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (runError) throw runError;

  const creditsUsed = (usageRows ?? []).reduce(
    (sum, row) => sum + (typeof row.credits_used === "number" ? row.credits_used : 0),
    0,
  );

  return {
    creditsUsed,
    runsStarted: runRows?.length ?? 0,
  };
}
