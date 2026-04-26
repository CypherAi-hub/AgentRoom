import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRun } from "@/lib/data/runs";
import { getUsageLogs } from "@/lib/data/usage-logs";
import {
  StatusPill,
  durationLabel,
  relativeTime,
} from "@/components/dashboard/dashboard-shared";
import { RunDetailHeader } from "@/components/runs/run-detail-header";
import {
  EventTimeline,
  type TimelineEvent,
} from "@/components/runs/event-timeline";
import type { UsageLog } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type Params = { runId: string };

const CATEGORY_BY_TYPE: Record<string, TimelineEvent["category"]> = {
  screenshot: "screenshot",
  agent_step: "click",
  minute: "default",
  sandbox_start: "default",
};

function toEvent(log: UsageLog): TimelineEvent {
  return {
    id: log.id,
    toolName: log.type,
    toolInput: null,
    toolResult: `${log.creditsUsed} credit${log.creditsUsed === 1 ? "" : "s"} used`,
    timestamp: log.createdAt,
    category: CATEGORY_BY_TYPE[log.type] ?? "default",
  };
}

function StreamPill({ status }: { status: string }) {
  if (status === "running") {
    return (
      <Link
        href="/dev/sandbox-test"
        className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/35 bg-sky-300/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-sky-100 transition hover:bg-sky-300/15"
      >
        <span
          className="size-1.5 rounded-full bg-sky-300"
          aria-hidden="true"
        />
        Live
      </Link>
    );
  }
  return <span className="text-sm text-muted-foreground">—</span>;
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { runId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/runs/${runId}`);

  const run = await getRun(user.id, runId);
  if (!run) notFound();

  const usage = await getUsageLogs(user.id, runId);
  // Reverse so oldest events appear at top of timeline.
  const events = [...usage].reverse().map(toEvent);

  return (
    <div className="flex flex-col gap-8">
      <RunDetailHeader taskPrompt={run.taskPrompt} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Status" valueNode={<StatusPill status={run.status} />} />
        <Field label="Created" value={relativeTime(run.createdAt)} />
        <Field label="Duration" value={durationLabel(run.startedAt, run.endedAt)} />
        <Field label="Credits used" value={`${run.creditsUsed} cr`} mono />
        <Field label="Agent" value={run.agentName ?? "—"} />
        <Field label="Sandbox" value={run.sandboxId ?? "—"} mono />
        <Field label="Stream" valueNode={<StreamPill status={run.status} />} />
      </section>

      {run.errorMessage ? (
        <section className="rounded-lg border border-red-300/30 bg-red-300/[0.06] p-4 text-sm text-red-100">
          <strong className="block text-xs font-bold uppercase tracking-[0.16em]">
            Error
          </strong>
          <p className="mt-1.5 whitespace-pre-wrap leading-6">{run.errorMessage}</p>
        </section>
      ) : null}

      <section className="space-y-3">
        <header>
          <h2 className="text-base font-semibold tracking-tight">Timeline</h2>
        </header>
        <EventTimeline events={events} />
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  valueNode,
  mono,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1.5 truncate text-sm ${mono ? "font-mono" : ""}`}
      >
        {valueNode ?? value}
      </div>
    </div>
  );
}
