import type { Metadata } from "next";
import { BillingPageClient } from "@/components/billing";
import { AppShell } from "@/components/shell/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AgentRoomStoreProvider } from "@/lib/store/agent-room-store";
import { withBillingFallback, type BillingPlanId, type BillingProfile } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing | Agent Room",
  description: "Agent Room credits, plans, and checkout controls.",
};

type ProfileRow = {
  email?: string | null;
  plan?: string | null;
  credits?: number | null;
};

function toPlanId(value?: string | null): BillingPlanId | undefined {
  return value === "pro" || value === "free" ? value : undefined;
}

function toFiniteNumber(value?: number | null) {
  return Number.isFinite(value) ? Number(value) : undefined;
}

async function readSupabaseBillingProfile(): Promise<Partial<BillingProfile> | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("email, plan, credits")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();
    const planId = toPlanId(profileRow?.plan);
    const creditsRemaining = toFiniteNumber(profileRow?.credits);

    return {
      source: "supabase",
      email: profileRow?.email ?? user.email,
      displayName: user.email,
      planId,
      creditsRemaining,
      creditsTotal: planId === "pro" ? 300 : 10,
    };
  } catch {
    return null;
  }
}

export default async function BillingPage() {
  const profile = withBillingFallback(await readSupabaseBillingProfile());

  return (
    <AgentRoomStoreProvider>
      <AppShell>
        <BillingPageClient profile={profile} />
      </AppShell>
    </AgentRoomStoreProvider>
  );
}
