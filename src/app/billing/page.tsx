import type { Metadata } from "next";
import { BillingPageClient } from "@/components/billing";
import type { BillingBanner } from "@/components/billing/billing-page-client";
import { AppShell } from "@/components/shell/app-shell";
import { getAppShellSession } from "@/lib/supabase/app-session";
import { withBillingFallback, type BillingPlanId, type BillingProfile } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing | Agent Room",
  description: "Agent Room credits, plans, and checkout controls.",
};

type BillingSearchParams = {
  checkout?: string | string[];
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

function bannerFromCheckoutParam(value?: string | string[]): BillingBanner | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  switch (raw) {
    case "success":
      return {
        kind: "success",
        message: "Payment received. Your Pro plan is active.",
      };
    case "credits-success":
      return {
        kind: "success",
        message: "Credits added. Ready when you are.",
      };
    case "cancelled":
    case "credits-cancelled":
      return {
        kind: "info",
        message: "Checkout cancelled. No charges made.",
      };
    default:
      return null;
  }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<BillingSearchParams>;
}) {
  const session = await getAppShellSession();
  const profile = withBillingFallback(billingProfileFromShellSession(session));
  const params = (await searchParams) ?? {};
  const banner = bannerFromCheckoutParam(params.checkout);

  return (
    <AppShell session={session}>
      <BillingPageClient profile={profile} banner={banner} />
    </AppShell>
  );
}
