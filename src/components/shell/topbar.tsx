"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, LogIn, LogOut, Menu, ShieldCheck, Tag } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import type { ShellSession } from "@/lib/supabase/session-types";

function formatCredits(value: number | null | undefined) {
  if (typeof value !== "number") return "credits unavailable";
  return `${value.toLocaleString()} ${value === 1 ? "credit" : "credits"}`;
}

function planLabel(session?: ShellSession | null) {
  return session?.profile?.plan === "pro" ? "PRO" : "FREE";
}

export function Topbar({
  onMenu,
  session,
}: {
  onMenu: () => void;
  session?: ShellSession | null;
}) {
  const initialCredits = session?.profile?.credits ?? null;
  const [override, setOverride] = useState<number | null>(null);
  const credits = override ?? initialCredits;

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch("/api/profile/credits", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json().catch(() => null)) as { credits?: number } | null;
        if (!cancelled && typeof body?.credits === "number") setOverride(body.credits);
      } catch {
        // Ignore — keep current value.
      }
    }

    function onFocus() {
      refresh().catch(() => {});
    }

    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(refresh, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, []);

  const email = session?.profile?.email ?? session?.user?.email ?? null;
  const signedIn = Boolean(session?.user);

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between gap-3 overflow-hidden border-b border-border-subtle bg-bg-base/80 px-4 backdrop-blur xl:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onMenu} aria-label="Open navigation">
          <Menu className="size-4" />
        </Button>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text-primary">Agent Room</div>
          <div className="truncate text-xs text-text-secondary">Real cloud machines, real agents.</div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={signedIn ? "/billing" : "/pricing"}
          className="hidden h-8 items-center gap-2 rounded-full border border-border-subtle px-3 text-xs text-text-secondary transition-colors duration-200 ease-out hover:bg-bg-surface hover:text-text-primary sm:inline-flex"
        >
          <Tag className="size-3.5" />
          Pricing
        </Link>

        {signedIn ? (
          <>
            <div
              className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs md:flex"
              style={{
                borderColor: "rgba(62,233,140,0.25)",
                backgroundColor: "var(--accent-hero-dim)",
                color: "var(--accent-hero)",
              }}
            >
              <ShieldCheck className="size-3.5" />
              {planLabel(session)}
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary lg:flex">
              <CreditCard className="size-3.5" style={{ color: "var(--status-info)" }} />
              {formatCredits(credits)}
            </div>
            <div className="hidden max-w-[220px] truncate rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary sm:block">
              {email}
            </div>
            <form action="/auth/logout" method="post">
              <Button variant="outline" size="sm" className="px-2.5 sm:px-3" type="submit" aria-label="Log out">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border-subtle bg-transparent px-3 text-sm font-medium text-text-primary transition-colors duration-200 ease-out hover:bg-bg-surface"
          >
            <LogIn className="size-4" />
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
