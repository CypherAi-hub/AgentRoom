import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRun } from "@/lib/data/runs";
import { getUsageLogs } from "@/lib/data/usage-logs";
import {
  Section,
  StatusPill,
  durationLabel,
  relativeTime,
} from "@/components/dashboard/dashboard-shared";

export const dynamic = "force-dynamic";

type Params = { runId: string };

export default async function RunDetailPage({ params }: { params: Promise<Params> }) {
  const { runId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/runs/${runId}`);

  const run = await getRun(user.id, runId);
  if (!run) notFound();

  const usage = await getUsageLogs(user.id, runId);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link href="/runs" className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to runs
        </Link>
        <div className="flex flex-col gap-3">
          <StatusPill status={run.status} />
          <h1 className="text-2xl font-semibold tracking-tight">{run.taskPrompt}</h1>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Started" value={relativeTime(run.startedAt)} />
        <Field label="Duration" value={durationLabel(run.startedAt, run.endedAt)} />
        <Field label="Credits used" value={`${run.creditsUsed} cr`} />
        <Field label="Status" value={run.status} />
        <Field label="Agent" value={run.agentName ?? "—"} />
        <Field label="Room" value={run.roomName ?? "—"} />
        <Field label="Sandbox" value={run.sandboxId ?? "—"} mono />
        <Field
          label="Stream"
          value={run.status === "running" && run.streamUrl ? "Live" : "Stream ended"}
        />
      </section>

      {run.errorMessage ? (
        <section className="rounded-lg border border-red-300/30 bg-red-300/[0.06] p-4 text-sm text-red-100">
          <strong className="block text-xs font-bold uppercase tracking-[0.16em]">Error</strong>
          <p className="mt-1.5 whitespace-pre-wrap leading-6">{run.errorMessage}</p>
        </section>
      ) : null}

      <Section title="Usage log">
        {usage.length ? (
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y divide-[var(--border)]">
              {usage.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">{log.type}</span>
                  <span className="font-mono text-xs text-muted-foreground">{log.creditsUsed} cr</span>
                  <span className="font-mono text-xs text-muted-foreground">{relativeTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed bg-card/40 px-4 py-6 text-sm text-muted-foreground">
            No usage events recorded for this run.
          </p>
        )}
      </Section>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`mt-1.5 truncate text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
