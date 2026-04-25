import { mapAgent } from "@/lib/data/mappers";
import { getAdminClient, getAuthedClient } from "@/lib/data/clients";
import type { Agent, AgentStatus } from "@/lib/data/types";

const DEFAULT_SEED: Array<Pick<Agent, "name" | "role" | "description" | "avatarInitials" | "color">> = [
  { name: "Engineer", role: "engineer", description: "Builds, fixes, and ships code on a real cloud machine.", avatarInitials: "EA", color: "#3EE98C" },
  { name: "Designer", role: "designer", description: "Crafts UI, mocks, and design pass-throughs.", avatarInitials: "DA", color: "#a855f7" },
  { name: "QA", role: "qa", description: "Validates flows, regression-tests, and reports.", avatarInitials: "QA", color: "#7dd3fc" },
  { name: "PM", role: "pm", description: "Plans, prioritizes, and writes specs.", avatarInitials: "PM", color: "#FDBA74" },
];

export async function getAgents(userId: string): Promise<Agent[]> {
  const supabase = await getAuthedClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapAgent);
}

export async function getAgent(userId: string, agentId: string): Promise<Agent | null> {
  const supabase = await getAuthedClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .eq("id", agentId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapAgent(data) : null;
}

export async function updateAgentStatus(userId: string, agentId: string, status: AgentStatus): Promise<void> {
  const supabase = await getAdminClient();
  const { error } = await supabase
    .from("agents")
    .update({ status })
    .eq("user_id", userId)
    .eq("id", agentId);
  if (error) throw error;
}

export async function ensureUserHasAgents(userId: string): Promise<Agent[]> {
  const supabase = await getAdminClient();
  const { data: existing } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", userId);
  if (existing && existing.length > 0) return existing.map(mapAgent);

  const { data: created, error } = await supabase
    .from("agents")
    .insert(
      DEFAULT_SEED.map((seed) => ({
        user_id: userId,
        name: seed.name,
        role: seed.role,
        description: seed.description,
        avatar_initials: seed.avatarInitials,
        color: seed.color,
      })),
    )
    .select("*");
  if (error) throw error;
  return (created ?? []).map(mapAgent);
}
