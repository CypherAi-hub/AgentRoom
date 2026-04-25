"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CreditCard, Gauge, History, Home, PlugZap, Settings, Tag } from "lucide-react";
import type { ShellSession } from "@/lib/supabase/session-types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/rooms", label: "Rooms", icon: Gauge },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/runs", label: "Runs", icon: History },
  { href: "/integrations", label: "Integrations", icon: PlugZap },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function formatCredits(value: number | null | undefined) {
  if (typeof value !== "number") return "credits unavailable";
  return `${value.toLocaleString()} ${value === 1 ? "credit" : "credits"}`;
}

export function Sidebar({ onNavigate, session }: { onNavigate?: () => void; session?: ShellSession | null }) {
  const pathname = usePathname();
  const email = session?.profile?.email ?? session?.user?.email ?? null;
  const plan = session?.profile?.plan === "pro" ? "Pro" : "Free";

  return (
    <aside className="flex h-full flex-col border-r bg-background/80 p-4 backdrop-blur">
      <Link href="/dashboard" onClick={onNavigate} className="mb-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg border bg-secondary font-mono text-sm font-black">AR</div>
        <div>
          <div className="text-sm font-semibold">Agent Room</div>
          <div className="text-xs text-muted-foreground">AI operations room</div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                active && "bg-secondary text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border bg-card/70 p-3">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {email ? "Signed in" : "Signed out"}
        </div>
        {email ? (
          <div className="mt-2 space-y-2">
            <div className="truncate text-sm font-medium">{email}</div>
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{plan} plan</span>
              <span>{formatCredits(session?.profile?.credits)}</span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            Sign in to see your plan, credits, and protected rooms.
          </p>
        )}
      </div>
    </aside>
  );
}
