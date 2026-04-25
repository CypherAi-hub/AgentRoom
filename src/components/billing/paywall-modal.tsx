"use client";

import { useEffect } from "react";
import { Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { CREDIT_PACKS, formatCredits } from "@/lib/billing/plans";
import { CheckoutButton } from "@/components/billing/checkout-button";

type PaywallModalProps = {
  open: boolean;
  credits?: number;
  onClose: () => void;
};

export function PaywallModal({ open, credits = 0, onClose }: PaywallModalProps) {
  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close paywall" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="glass-panel relative w-full max-w-[520px] rounded-lg border-sky-300/25 p-5 shadow-[0_30px_120px_rgba(14,165,233,0.18)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid size-11 place-items-center rounded-md border border-sky-300/25 bg-sky-300/10 text-sky-100">
            <Clock3 className="size-5" />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close paywall">
            <X className="size-4" />
          </Button>
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Credits</p>
        <h2 id="paywall-title" className="mt-2 text-3xl font-semibold tracking-normal">
          You&apos;re out of credits
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {formatCredits(credits)} credits remain. Upgrade to Pro or add a pack to keep the room running with terminal and VM proof.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <CheckoutButton payload={{ kind: "subscription", planId: "pro" }}>Upgrade to Pro</CheckoutButton>
          <CheckoutButton payload={{ kind: "credits", pack: CREDIT_PACKS[1].id }} variant="secondary">
            Add more time
          </CheckoutButton>
        </div>

        <div className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Fastest top-up</span>
            <span className="font-medium">{CREDIT_PACKS[1].priceLabel} / {formatCredits(CREDIT_PACKS[1].credits)} credits</span>
          </div>
          <div className="mt-3 h-px bg-white/10" />
          <p className="mt-3 font-mono text-xs leading-5 text-slate-300">agent-room credits unlock queued runs, live terminal proof, and VM receipts for the current room.</p>
        </div>
      </section>
    </div>
  );
}
