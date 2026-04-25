import type { Metadata } from "next";
import { BillingPageClient } from "@/components/billing";
import { AppShell } from "@/components/shell/app-shell";
import { getAppShellSession } from "@/lib/supabase/app-session";
import { withBillingFallback, type BillingPlanId, type BillingProfile } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing | Agent Room",
  description: "Agent Room credits, plans, and checkout controls.",
};

function toFiniteNumber(value?: number | null) {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function billingProfileFromShellSession(
  session: Awaited<ReturnType<typeof getAppShellSession>>,
): Partial<BillingProfile> | null {
  if (!session.profile) return null;

  const planId: BillingPlanId = session.profile.plan;

  return {
    source: "supabase",
    email: session.profile.email ?? session.user?.email ?? undefined,
    displayName: session.profile.email ?? session.user?.email ?? undefined,
    planId,
    creditsRemaining: toFiniteNumber(session.profile.credits),
    creditsTotal: planId === "pro" ? 300 : 10,
  };
}

export default async function BillingPage() {
  const session = await getAppShellSession();
  const profile = withBillingFallback(billingProfileFromShellSession(session));

  return (
    <AppShell session={session}>
      <BillingPageClient profile={profile} />
    </AppShell>
  );
}
