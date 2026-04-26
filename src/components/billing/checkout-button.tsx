"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { BillingCheckoutKind, BillingPlanId, CreditPackId } from "@/lib/billing/plans";

type CheckoutPayload =
  | { kind: Extract<BillingCheckoutKind, "subscription">; planId: BillingPlanId }
  | { kind: Extract<BillingCheckoutKind, "credits">; pack: CreditPackId };

type CheckoutButtonProps = {
  payload: CheckoutPayload;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md";
};

async function getCheckoutError(response: Response) {
  if (response.status === 404) {
    return "Checkout is not wired yet. Connect /api/billing/checkout to Stripe to continue.";
  }

  const text = await response.text();

  try {
    const json = JSON.parse(text) as { error?: string; message?: string; code?: string; requestId?: string };
    const base = json.message ?? json.error ?? "Checkout could not start.";
    return json.requestId ? `${base} (ref ${json.requestId.slice(0, 8)})` : base;
  } catch {
    return text || "Checkout could not start.";
  }
}

export function CheckoutButton({ payload, children, className, disabled, variant = "default", size = "md" }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    // Keep previous error visible while the retry is in flight; only clear it
    // on a successful redirect or replace with the new error message.

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await getCheckoutError(response));
      }

      const data = (await response.json().catch(() => null)) as { url?: string; error?: string; message?: string } | null;

      if (!data?.url) {
        throw new Error(data?.error ?? data?.message ?? "Checkout did not return a redirect URL.");
      }

      setError(null);
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not start.");
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("w-full whitespace-nowrap", className)}
        disabled={disabled || loading}
        onClick={startCheckout}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        <span>{children}</span>
        {!loading ? <ArrowRight className="size-4" /> : null}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-xs leading-5 text-amber-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
