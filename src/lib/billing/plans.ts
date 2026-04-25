export type BillingPlanId = "free" | "pro";
export type BillingCheckoutKind = "subscription" | "credits";
export type CreditPackId = "credits_50" | "credits_120" | "credits_300";
export type BillingProfileSource = "supabase" | "fallback";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  priceLabel: string;
  intervalLabel: string;
  creditsPerMonth: number;
  headline: string;
  description: string;
  ctaLabel: string;
  features: string[];
  highlighted?: boolean;
};

export type CreditPack = {
  id: CreditPackId;
  credits: number;
  priceCents: number;
  priceLabel: string;
  name: string;
  description: string;
  ctaLabel: string;
};

export type BillingProfile = {
  planId: BillingPlanId;
  creditsRemaining: number;
  creditsTotal: number;
  currentPeriodEndsAt?: string;
  email?: string;
  displayName?: string;
  source: BillingProfileSource;
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "free",
    name: "Starter",
    priceLabel: "$0",
    intervalLabel: "forever",
    creditsPerMonth: 10,
    headline: "Try the magic",
    description: "Enough credit to start a real cloud desktop and watch an agent work.",
    ctaLabel: "Current plan",
    features: ["10 starter credits", "Live VM Stage access", "Approval-safe agent actions"],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$20",
    intervalLabel: "per month",
    creditsPerMonth: 300,
    headline: "Start building faster",
    description: "A founder-ready plan for real runs, live terminals, and VM-backed proof.",
    ctaLabel: "Upgrade to Pro",
    highlighted: true,
    features: ["300 credits every month", "Live terminal and VM proof", "Priority room execution", "Time reclaimed reporting"],
  },
];

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "credits_50",
    credits: 50,
    priceCents: 500,
    priceLabel: "$5",
    name: "Top-up",
    description: "A quick sprint buffer when the room is almost done.",
    ctaLabel: "Add more time",
  },
  {
    id: "credits_120",
    credits: 120,
    priceCents: 1000,
    priceLabel: "$10",
    name: "Build pack",
    description: "Enough room for a focused feature pass or QA loop.",
    ctaLabel: "Add more time",
  },
  {
    id: "credits_300",
    credits: 300,
    priceCents: 2000,
    priceLabel: "$20",
    name: "Launch pack",
    description: "A heavier push for demos, previews, and release polish.",
    ctaLabel: "Add more time",
  },
];

export const FALLBACK_BILLING_PROFILE: BillingProfile = {
  planId: "free",
  creditsRemaining: 0,
  creditsTotal: 10,
  displayName: "Signed-out preview",
  source: "fallback",
};

export function getBillingPlan(planId: BillingPlanId) {
  return BILLING_PLANS.find((plan) => plan.id === planId) ?? BILLING_PLANS[0];
}

export function getCreditPack(packId: CreditPackId) {
  return CREDIT_PACKS.find((pack) => pack.id === packId) ?? CREDIT_PACKS[0];
}

export function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatBillingDate(value?: string) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function withBillingFallback(profile?: Partial<BillingProfile> | null): BillingProfile {
  return {
    ...FALLBACK_BILLING_PROFILE,
    ...profile,
    creditsRemaining: Number.isFinite(profile?.creditsRemaining)
      ? Math.max(0, Number(profile?.creditsRemaining))
      : FALLBACK_BILLING_PROFILE.creditsRemaining,
    creditsTotal: Number.isFinite(profile?.creditsTotal)
      ? Math.max(1, Number(profile?.creditsTotal))
      : FALLBACK_BILLING_PROFILE.creditsTotal,
    planId: profile?.planId === "pro" ? "pro" : profile?.planId === "free" ? "free" : FALLBACK_BILLING_PROFILE.planId,
    source: profile?.source ?? FALLBACK_BILLING_PROFILE.source,
  };
}
