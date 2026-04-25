import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type BillingPlan = "free" | "pro";

export type AgentRunLimits = {
  maxIterations: number;
  maxRuntimeMs: number;
};

export type BillingProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  plan: BillingPlan;
  credits: number;
};

export type CreditGateFailureCode =
  | "AUTH_REQUIRED"
  | "BILLING_NOT_CONFIGURED"
  | "PROFILE_REQUIRED"
  | "PROFILE_READ_FAILED"
  | "NO_CREDITS"
  | "CREDIT_DEDUCT_FAILED";

export type CreditGateFailure = {
  ok: false;
  status: number;
  code: CreditGateFailureCode;
  message: string;
  profile?: BillingProfile;
};

export type BillingProfileResult =
  | {
      ok: true;
      userId: string;
      profile: BillingProfile;
      supabase: BillingSupabaseClient;
      hasServiceRoleKey: boolean;
    }
  | CreditGateFailure;

export type CreditDeductionResult =
  | {
      ok: true;
      profile: BillingProfile;
    }
  | CreditGateFailure;

type SupabaseCredentials = {
  url: string;
  publicKey: string;
  serviceRoleKey: string | null;
};

type BillingSupabaseClient = SupabaseClient;

const CREDIT_FIELD_CANDIDATES = ["credits", "agent_credits", "credit_balance"] as const;
const PLAN_FIELD_CANDIDATES = ["plan", "billing_plan", "subscription_plan"] as const;

export const AGENT_RUN_CREDIT_COST = 1;
export const FREE_AGENT_LIMITS: AgentRunLimits = {
  maxIterations: 4,
  maxRuntimeMs: 90_000,
};
export const PRO_AGENT_LIMIT_DEFAULTS: AgentRunLimits = {
  maxIterations: 8,
  maxRuntimeMs: 180_000,
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getSupabaseCredentials(): SupabaseCredentials | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

  if (!url || !publicKey) return null;
  return { url, publicKey, serviceRoleKey };
}

function createSupabaseForRequest(request: NextRequest, credentials: SupabaseCredentials) {
  return createServerClient(credentials.url, credentials.publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
    },
  });
}

function createProfileSupabaseClient(credentials: SupabaseCredentials, fallback: BillingSupabaseClient) {
  if (!credentials.serviceRoleKey) return fallback;

  return createClient(credentials.url, credentials.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function firstStringField(row: Record<string, unknown>, fields: readonly string[]) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) return value;
  }

  return "";
}

function firstNumericField(row: Record<string, unknown>, fields: readonly string[]) {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return 0;
}

function profileCreditField(row: Record<string, unknown>) {
  return CREDIT_FIELD_CANDIDATES.find((field) => Object.prototype.hasOwnProperty.call(row, field)) ?? "credits";
}

function normalizePlan(value: string): BillingPlan {
  const plan = value.toLowerCase();
  return plan === "pro" || plan === "paid" || plan === "professional" ? "pro" : "free";
}

function normalizeProfile(row: Record<string, unknown>, fallbackEmail?: string | null): BillingProfile {
  const email = typeof row.email === "string" && row.email ? row.email : fallbackEmail || null;
  const displayName = typeof row.display_name === "string" && row.display_name ? row.display_name : null;
  const credits = Math.max(0, firstNumericField(row, CREDIT_FIELD_CANDIDATES));

  return {
    id: String(row.id || ""),
    email,
    displayName,
    plan: normalizePlan(firstStringField(row, PLAN_FIELD_CANDIDATES)),
    credits,
  };
}

function failure(
  status: number,
  code: CreditGateFailureCode,
  message: string,
  profile?: BillingProfile,
): CreditGateFailure {
  return {
    ok: false,
    status,
    code,
    message,
    ...(profile ? { profile } : {}),
  };
}

export function getAgentRunLimits(plan: BillingPlan): AgentRunLimits {
  // First-pass policy: every successful agent run costs exactly 1 profile credit.
  // Free users get conservative computer-use caps. Pro users get env-configurable
  // caps, defaulting to 8 iterations / 180s.
  if (plan === "free") return FREE_AGENT_LIMITS;

  return {
    maxIterations: parsePositiveInt(process.env.ANTHROPIC_MAX_AGENT_ITERATIONS, PRO_AGENT_LIMIT_DEFAULTS.maxIterations),
    maxRuntimeMs: parsePositiveInt(process.env.ANTHROPIC_MAX_AGENT_RUNTIME_MS, PRO_AGENT_LIMIT_DEFAULTS.maxRuntimeMs),
  };
}

export async function getAuthenticatedBillingProfile(request: NextRequest): Promise<BillingProfileResult> {
  const credentials = getSupabaseCredentials();

  if (!credentials) {
    return failure(
      500,
      "BILLING_NOT_CONFIGURED",
      "Supabase billing environment variables are not configured.",
    );
  }

  const supabase = createSupabaseForRequest(request, credentials);
  const profileSupabase = createProfileSupabaseClient(credentials, supabase);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return failure(401, "AUTH_REQUIRED", "Sign in to use the sandbox agent.");
  }

  const { data: profileRow, error: profileError } = await profileSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return failure(500, "PROFILE_READ_FAILED", profileError.message);
  }

  if (!profileRow || typeof profileRow !== "object" || Array.isArray(profileRow)) {
    return failure(403, "PROFILE_REQUIRED", "Create a profile before starting the sandbox agent.");
  }

  return {
    ok: true,
    userId: user.id,
    profile: normalizeProfile(profileRow as Record<string, unknown>, user.email),
    supabase: profileSupabase,
    hasServiceRoleKey: Boolean(credentials.serviceRoleKey),
  };
}

export function requireAvailableCredit(profile: BillingProfile): CreditGateFailure | null {
  if (profile.credits > 0) return null;
  return failure(402, "NO_CREDITS", "You need at least 1 credit to start an agent run.", profile);
}

export async function deductAgentRunCredit(context: Extract<BillingProfileResult, { ok: true }>): Promise<CreditDeductionResult> {
  const noCredits = requireAvailableCredit(context.profile);
  if (noCredits) return noCredits;

  if (!context.hasServiceRoleKey) {
    return failure(
      500,
      "BILLING_NOT_CONFIGURED",
      "SUPABASE_SERVICE_ROLE_KEY is required to deduct credits securely.",
      context.profile,
    );
  }

  const { data: latestProfileRow, error: latestProfileError } = await context.supabase
    .from("profiles")
    .select("*")
    .eq("id", context.userId)
    .maybeSingle();

  if (latestProfileError) {
    return failure(500, "PROFILE_READ_FAILED", latestProfileError.message, context.profile);
  }

  if (!latestProfileRow || typeof latestProfileRow !== "object" || Array.isArray(latestProfileRow)) {
    return failure(403, "PROFILE_REQUIRED", "Create a profile before starting the sandbox agent.", context.profile);
  }

  const latestRow = latestProfileRow as Record<string, unknown>;
  const latestProfile = normalizeProfile(latestRow, context.profile.email);
  const noLatestCredits = requireAvailableCredit(latestProfile);
  if (noLatestCredits) return noLatestCredits;

  const creditField = profileCreditField(latestRow);
  const nextCredits = latestProfile.credits - AGENT_RUN_CREDIT_COST;
  const { data: updatedProfileRow, error: updateError } = await context.supabase
    .from("profiles")
    .update({ [creditField]: nextCredits })
    .eq("id", context.userId)
    .eq(creditField, latestProfile.credits)
    .gte(creditField, AGENT_RUN_CREDIT_COST)
    .select("*")
    .maybeSingle();

  if (updateError) {
    return failure(500, "CREDIT_DEDUCT_FAILED", updateError.message, latestProfile);
  }

  if (!updatedProfileRow || typeof updatedProfileRow !== "object" || Array.isArray(updatedProfileRow)) {
    return failure(409, "CREDIT_DEDUCT_FAILED", "Credit balance changed before deduction. Try again.", latestProfile);
  }

  return {
    ok: true,
    profile: normalizeProfile(updatedProfileRow as Record<string, unknown>, latestProfile.email),
  };
}
