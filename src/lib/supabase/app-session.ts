import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ShellPlan, ShellSession } from "@/lib/supabase/session-types";

type ProfileRow = {
  email?: string | null;
  plan?: string | null;
  credits?: number | null;
};

function normalizePlan(value?: string | null): ShellPlan {
  return value === "pro" ? "pro" : "free";
}

function normalizeCredits(value?: number | null) {
  return Number.isFinite(value) ? Number(value) : null;
}

export async function getAppShellSession(): Promise<ShellSession> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, profile: null, error: userError?.message ?? null };
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("email, plan, credits")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    const email = profileRow?.email ?? user.email ?? null;

    return {
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      profile: {
        userId: user.id,
        email,
        plan: normalizePlan(profileRow?.plan),
        credits: normalizeCredits(profileRow?.credits),
      },
      error: profileError?.message ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read the current session.";
    return { user: null, profile: null, error: message };
  }
}
