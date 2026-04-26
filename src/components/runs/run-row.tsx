import Link from "next/link";
import { Check, X, Loader2, Circle } from "lucide-react";
import type { RunWithRefs } from "@/lib/data/types";
import { durationLabel, relativeTime } from "@/components/dashboard/dashboard-shared";

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") {
    return <Check className="size-4 text-emerald-300" aria-hidden="true" />;
  }
  if (status === "error") {
    return <X className="size-4 text-red-300" aria-hidden="true" />;
  }
  if (status === "running") {
    return <Loader2 className="size-4 animate-spin text-amber-300" aria-hidden="true" />;
  }
  return <Circle className="size-3.5 text-muted-foreground" aria-hidden="true" />;
}

export function RunRow({ run }: { run: RunWithRefs }) {
  const truncatedId = run.id.length > 8 ? `${run.id.slice(0, 8)}…` : run.id;
  return (
    <Link
      href={`/runs/${run.id}`}
      className="group block transition hover:bg-secondary/40 focus:bg-secondary/40 focus:outline-none"
    >
      {/* Desktop / tablet row */}
      <div className="hidden items-center gap-3 px-4 py-3 text-sm sm:flex">
        <span className="flex size-6 items-center justify-center">
          <StatusIcon status={run.status} />
        </span>
        <span
          className="w-[88px] shrink-0 truncate font-mono text-xs text-muted-foreground"
          title={run.id}
        >
          {truncatedId}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {run.taskPrompt}
        </span>
        <span className="hidden w-20 shrink-0 text-right font-mono text-xs text-muted-foreground md:inline">
          {run.creditsUsed} cr
        </span>
        <span className="hidden w-16 shrink-0 text-right font-mono text-xs text-muted-foreground md:inline">
          {durationLabel(run.startedAt, run.endedAt)}
        </span>
        <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
          {relativeTime(run.createdAt)}
        </span>
      </div>

      {/* Mobile card layout */}
      <div className="flex flex-col gap-2 px-4 py-3 sm:hidden">
        <div className="flex items-center gap-2">
          <StatusIcon status={run.status} />
          <span
            className="truncate font-mono text-xs text-muted-foreground"
            title={run.id}
          >
            {truncatedId}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {relativeTime(run.createdAt)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm font-medium">{run.taskPrompt}</p>
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span>{run.creditsUsed} cr</span>
          <span>{durationLabel(run.startedAt, run.endedAt)}</span>
          {run.agentName ? <span className="truncate">{run.agentName}</span> : null}
        </div>
      </div>
    </Link>
  );
}
