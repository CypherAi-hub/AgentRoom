"use client";

import { useEffect, useRef } from "react";
import { Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { CREDIT_PACKS, formatCredits } from "@/lib/billing/plans";
import { CheckoutButton } from "@/components/billing/checkout-button";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type PaywallModalProps = {
  open: boolean;
  credits?: number;
  onClose: () => void;
};

export function PaywallModal({ open, credits = 0, onClose }: PaywallModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;

    function getFocusable(): HTMLElement[] {
      const root = dialogRef.current;
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
        if (el.hasAttribute("disabled")) return false;
        if (el.getAttribute("aria-hidden") === "true") return false;
        // Skip elements that are not rendered (display:none / no layout box).
        return el.offsetParent !== null || el === document.activeElement;
      });
    }

    // Move focus to the close button on open. The close button carries
    // data-paywall-close so we can find it without forwarding a ref through
    // the Button primitive.
    const focusTimer = window.setTimeout(() => {
      const root = dialogRef.current;
      const target =
        root?.querySelector<HTMLElement>("[data-paywall-close]") ?? getFocusable()[0] ?? null;
      target?.focus();
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusable();
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const root = dialogRef.current;

      // If focus has escaped the dialog, pull it back to the first focusable.
      if (!root || !active || !root.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      // Restore focus to whatever was focused before the modal opened.
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close paywall" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
        className="glass-panel relative w-full max-w-[520px] rounded-lg border-sky-300/25 p-5 shadow-[0_30px_120px_rgba(14,165,233,0.18)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid size-11 place-items-center rounded-md border border-sky-300/25 bg-sky-300/10 text-sky-100">
            <Clock3 className="size-5" />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close paywall"
            data-paywall-close=""
          >
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
