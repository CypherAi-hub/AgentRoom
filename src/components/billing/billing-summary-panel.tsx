import { Activity, Clock3, Cpu, Terminal } from "lucide-react";
import { Badge, Progress } from "@/components/ui/primitives";
import {
  FALLBACK_BILLING_PROFILE,
  formatBillingDate,
  formatCredits,
  getBillingPlan,
  withBillingFallback,
  type BillingProfile,
} from "@/lib/billing/plans";

type BillingSummaryPanelProps = {
  profile?: Partial<BillingProfile> | null;
};

export function BillingSummaryPanel({ profile = FALLBACK_BILLING_PROFILE }: BillingSummaryPanelProps) {
  const safeProfile = withBillingFallback(profile);
  const plan = getBillingPlan(safeProfile.planId);
  const creditPercent = Math.round((safeProfile.creditsRemaining / safeProfile.creditsTotal) * 100);
  const sourceLabel = safeProfile.source === "supabase" ? "Live profile" : "Mock fallback";

  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="glass-panel min-w-0 rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Current plan</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-normal">{plan.name}</h2>
              <Badge variant={safeProfile.planId === "pro" ? "success" : "outline"}>{sourceLabel}</Badge>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{plan.description}</p>
          </div>
          <div className="rounded-md border border-sky-300/20 bg-sky-300/10 px-3 py-2 text-right">
            <div className="text-xs uppercase tracking-[0.16em] text-sky-100/80">Renews</div>
            <div className="mt-1 text-sm font-medium text-sky-50">{formatBillingDate(safeProfile.currentPeriodEndsAt)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Credits remaining</span>
            <span className="font-medium">
              {formatCredits(safeProfile.creditsRemaining)} / {formatCredits(safeProfile.creditsTotal)}
            </span>
          </div>
          <Progress value={creditPercent} className="h-2.5 bg-white/10" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
            <Clock3 className="size-4 text-emerald-200" />
            <div className="mt-3 text-lg font-semibold">6.4h</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">TIME RECLAIMED this week</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
            <Terminal className="size-4 text-sky-200" />
            <div className="mt-3 text-lg font-semibold">12</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Terminal runs proved</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
            <Cpu className="size-4 text-violet-200" />
            <div className="mt-3 text-lg font-semibold">3</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">VM sessions ready</p>
          </div>
        </div>
      </div>

      <div className="glass-panel min-w-0 rounded-lg p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
            <Activity className="size-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Live proof stream</h2>
            <p className="mt-1 text-sm text-muted-foreground">Terminal and VM receipts for founder demos.</p>
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-md border border-white/10 bg-[#05070b]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
            <span className="size-2 rounded-full bg-red-300" />
            <span className="size-2 rounded-full bg-amber-300" />
            <span className="size-2 rounded-full bg-emerald-300" />
            <span className="ml-2 font-mono text-xs text-muted-foreground">agent-room-vm</span>
          </div>
          <div className="space-y-2 p-4 font-mono text-xs leading-5 text-slate-200">
            <p>
              <span className="text-emerald-200">$</span> agent-room vm start --room billing
            </p>
            <p className="text-muted-foreground">desktop ready / checkout route pending</p>
            <p>
              <span className="text-emerald-200">$</span> reclaim --since monday
            </p>
            <p className="text-sky-100">6.4h returned to founder build time</p>
          </div>
        </div>
      </div>
    </section>
  );
}
