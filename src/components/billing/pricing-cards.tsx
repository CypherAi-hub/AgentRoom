"use client";

import { Check, Cpu, Terminal, Zap } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import {
  BILLING_PLANS,
  CREDIT_PACKS,
  FALLBACK_BILLING_PROFILE,
  formatCredits,
  type BillingPlan,
  type BillingPlanId,
  type CreditPack,
} from "@/lib/billing/plans";
import { CheckoutButton } from "@/components/billing/checkout-button";

type PricingCardsProps = {
  currentPlanId?: BillingPlanId;
};

function PlanCard({ plan, currentPlanId }: { plan: BillingPlan; currentPlanId: BillingPlanId }) {
  const isCurrent = plan.id === currentPlanId;
  const canCheckout = plan.id === "pro";

  return (
    <article
      className={cn(
        "glass-panel relative flex min-w-0 flex-col rounded-lg p-5",
        plan.highlighted && "border-sky-300/35 shadow-[0_24px_90px_rgba(56,189,248,0.12)]",
      )}
    >
      {plan.highlighted ? (
        <div className="absolute right-4 top-4">
          <Badge className="bg-sky-300 text-slate-950">Founder pick</Badge>
        </div>
      ) : null}
      <div className="pr-28">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{plan.name}</p>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-4xl font-semibold tracking-normal">{plan.priceLabel}</span>
          <span className="pb-1 text-sm text-muted-foreground">{plan.intervalLabel}</span>
        </div>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{plan.headline}</h3>
      <p className="mt-2 min-h-[48px] text-sm leading-6 text-muted-foreground">{plan.description}</p>
      <div className="mt-5 space-y-3">
        {plan.features.map((feature) => (
          <div key={feature} className="flex gap-3 text-sm leading-5 text-slate-200">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-200" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
      <div className="mt-6">
        {isCurrent ? (
          <Button type="button" variant="outline" className="w-full" disabled>
            Current plan
          </Button>
        ) : canCheckout ? (
          <CheckoutButton payload={{ kind: "subscription", planId: plan.id }}>{plan.ctaLabel}</CheckoutButton>
        ) : (
          <Button type="button" variant="outline" className="w-full" disabled>
            Included
          </Button>
        )}
      </div>
    </article>
  );
}

function CreditPackCard({ pack }: { pack: CreditPack }) {
  return (
    <article className="glass-panel flex min-w-0 flex-col rounded-lg p-5 transition-colors hover:border-emerald-300/35">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{pack.name}</p>
          <div className="mt-3 text-3xl font-semibold">{pack.priceLabel}</div>
        </div>
        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-right">
          <div className="text-lg font-semibold text-emerald-50">{formatCredits(pack.credits)}</div>
          <div className="text-xs text-emerald-100/80">credits</div>
        </div>
      </div>
      <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">{pack.description}</p>
      <div className="mt-5">
        <CheckoutButton payload={{ kind: "credits", pack: pack.id }} variant="secondary">
          {pack.ctaLabel}
        </CheckoutButton>
      </div>
    </article>
  );
}

export function PricingCards({ currentPlanId = FALLBACK_BILLING_PROFILE.planId }: PricingCardsProps) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Upgrade</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">Start building faster</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
            <Terminal className="size-3.5 text-sky-200" />
            Live terminal proof
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
            <Cpu className="size-3.5 text-violet-200" />
            VM receipts
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
            <Zap className="size-3.5 text-emerald-200" />
            TIME RECLAIMED
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {BILLING_PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} currentPlanId={currentPlanId} />
        ))}
      </div>

      <div className="mt-2 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Buy credits</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">Add more time</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Credit packs stack on top of your plan for extra agent runs, terminal sessions, and launch polish.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <CreditPackCard key={pack.id} pack={pack} />
        ))}
      </div>
    </section>
  );
}
