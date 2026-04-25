"use client";

import { useState } from "react";
import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { BillingSummaryPanel } from "@/components/billing/billing-summary-panel";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { PaywallModal } from "@/components/billing/paywall-modal";
import { PricingCards } from "@/components/billing/pricing-cards";
import {
  CREDIT_PACKS,
  FALLBACK_BILLING_PROFILE,
  formatCredits,
  getBillingPlan,
  withBillingFallback,
  type BillingProfile,
} from "@/lib/billing/plans";

type BillingPageClientProps = {
  profile?: Partial<BillingProfile> | null;
};

export function BillingPageClient({ profile = FALLBACK_BILLING_PROFILE }: BillingPageClientProps) {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const billingProfile = withBillingFallback(profile);
  const plan = getBillingPlan(billingProfile.planId);

  return (
    <div className="flex w-full flex-col gap-8">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[#080b12] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] lg:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />
        <div className="grid gap-7 lg:grid-cols-[1fr_380px] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Billing</Badge>
              <Badge className="border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">TIME RECLAIMED</Badge>
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal md:text-6xl">
              Credits that turn agent work into proof.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Upgrade to Pro, buy credits, and keep the Agent Room running with live terminal sessions, VM receipts, and founder-demo-ready billing.
            </p>
            <div className="mt-6 grid max-w-[560px] gap-3 sm:grid-cols-2">
              <CheckoutButton payload={{ kind: "subscription", planId: "pro" }} disabled={billingProfile.planId === "pro"}>
                {billingProfile.planId === "pro" ? "Pro active" : "Upgrade to Pro"}
              </CheckoutButton>
              <CheckoutButton payload={{ kind: "credits", pack: CREDIT_PACKS[1].id }} variant="secondary">
                Buy credits
              </CheckoutButton>
            </div>
          </div>

          <div className="glass-panel min-w-0 rounded-lg p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Room balance</p>
                <div className="mt-2 text-4xl font-semibold">{formatCredits(billingProfile.creditsRemaining)}</div>
              </div>
              <div className="grid size-12 place-items-center rounded-md border border-sky-300/25 bg-sky-300/10 text-sky-100">
                <Clock3 className="size-5" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Current plan: <span className="text-foreground">{plan.name}</span>. Credits reset or stack depending on the checkout path returned by Stripe.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-emerald-200" />
                Approval-safe
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="size-3.5 text-amber-200" />
                Stripe Checkout
              </span>
            </div>
            <Button type="button" variant="outline" className="mt-5 w-full" onClick={() => setPaywallOpen(true)}>
              Preview paywall
            </Button>
          </div>
        </div>
      </section>

      <BillingSummaryPanel profile={billingProfile} />
      <PricingCards currentPlanId={billingProfile.planId} />
      <PaywallModal open={paywallOpen} credits={billingProfile.creditsRemaining} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
