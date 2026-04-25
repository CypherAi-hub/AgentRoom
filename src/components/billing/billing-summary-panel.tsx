import { Clock3, Cpu, Terminal } from "lucide-react";
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

  return (
    <div className="glass-panel min-w-0 rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Current plan</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-normal">{plan.name}</h2>
            <Badge variant={safeProfile.planId === "pro" ? "success" : "outline"}>
              {safeProfile.planId === "pro" ? "PRO" : "FREE"}
            </Badge>
          </div>
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
          <Terminal className="size-4 text-sky-200" />
          <div className="mt-3 text-lg font-semibold">0</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Runs this period</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <Cpu className="size-4 text-violet-200" />
          <div className="mt-3 text-lg font-semibold">
            {formatCredits(Math.max(safeProfile.creditsTotal - safeProfile.creditsRemaining, 0))}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Credits used</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <Clock3 className="size-4 text-emerald-200" />
          <div className="mt-3 text-lg font-semibold">0h</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Time reclaimed</p>
        </div>
      </div>
    </div>
  );
}
