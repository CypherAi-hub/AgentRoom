"use client";

import { BillingSummaryPanel } from "@/components/billing/billing-summary-panel";
import { CheckoutButton } from "@/components/billing/checkout-button";
import {
  CREDIT_PACKS,
  FALLBACK_BILLING_PROFILE,
  withBillingFallback,
  type BillingProfile,
} from "@/lib/billing/plans";

type BillingPageClientProps = {
  profile?: Partial<BillingProfile> | null;
};

export function BillingPageClient({ profile = FALLBACK_BILLING_PROFILE }: BillingPageClientProps) {
  const billingProfile = withBillingFallback(profile);
  const isPro = billingProfile.planId === "pro";

  return (
    <div className="flex w-full flex-col gap-6">
      <BillingSummaryPanel profile={billingProfile} />

      <section className="grid gap-3 sm:grid-cols-2">
        <CheckoutButton payload={{ kind: "subscription", planId: "pro" }} disabled={isPro}>
          {isPro ? "Pro active" : "Upgrade to Pro"}
        </CheckoutButton>
        <CheckoutButton payload={{ kind: "credits", pack: CREDIT_PACKS[1].id }} variant="secondary">
          Buy credits
        </CheckoutButton>
      </section>

      <section className="glass-panel min-w-0 rounded-lg p-5">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Invoice history</h2>
          <span className="text-xs text-muted-foreground">Powered by Stripe</span>
        </header>
        <div className="mt-4 overflow-hidden rounded-md border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
                <th className="px-4 py-2.5 text-right font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No invoices yet. Upgrade or buy credits to see receipts here.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
