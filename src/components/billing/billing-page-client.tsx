"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Info, X } from "lucide-react";
import { BillingSummaryPanel } from "@/components/billing/billing-summary-panel";
import { CheckoutButton } from "@/components/billing/checkout-button";
import {
  CREDIT_PACKS,
  FALLBACK_BILLING_PROFILE,
  withBillingFallback,
  type BillingProfile,
} from "@/lib/billing/plans";

export type BillingBanner = {
  kind: "success" | "info" | "error";
  message: string;
};

type BillingPageClientProps = {
  profile?: Partial<BillingProfile> | null;
  banner?: BillingBanner | null;
};

export function BillingPageClient({
  profile = FALLBACK_BILLING_PROFILE,
  banner = null,
}: BillingPageClientProps) {
  const billingProfile = withBillingFallback(profile);
  const isPro = billingProfile.planId === "pro";

  return (
    <div className="flex w-full flex-col gap-6">
      <CheckoutBanner banner={banner} />

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

function CheckoutBanner({ banner }: { banner: BillingBanner | null }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (!banner || dismissed) return null;

  const isSuccess = banner.kind === "success";
  const isError = banner.kind === "error";

  const containerStyle: React.CSSProperties = isSuccess
    ? {
        borderColor: "rgba(62,233,140,0.35)",
        background: "rgba(62,233,140,0.08)",
        color: "#3EE98C",
        boxShadow: "var(--shadow-glow)",
      }
    : isError
      ? {
          borderColor: "rgba(226,75,74,0.35)",
          background: "rgba(226,75,74,0.08)",
          color: "#E24B4A",
        }
      : {
          borderColor: "rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          color: "#A0A0A0",
        };

  function handleDismiss() {
    setDismissed(true);
    router.replace("/billing");
  }

  const Icon = isSuccess ? CheckCircle2 : Info;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
      style={containerStyle}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 leading-5">{banner.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="rounded p-1 text-current opacity-70 transition hover:opacity-100"
        aria-label="Dismiss banner"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
