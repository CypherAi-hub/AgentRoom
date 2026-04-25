import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecentRuns } from "@/lib/data/runs";
import {
  EmptyState,
  StatusPill,
  durationLabel,
  relativeTime,
} from "@/components/dashboard/dashboard-shared";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/runs");

  const runs = await getRecentRuns(user.id, 100);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every agent run, with its task, status, and credits used.</p>
      </header>

      {runs.length ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <ul className="divide-y divide-[var(--border)]">
            {runs.map((run) => (
              <li key={run.id}>
                <Link
                  href={`/runs/${run.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm transition hover:bg-secondary/50"
                >
                  <StatusPill status={run.status} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {run.taskPrompt.slice(0, 100)}
                    {run.taskPrompt.length > 100 ? "…" : ""}
                  </span>
                  <span className="hidden text-xs text-muted-foreground md:inline">{run.agentName ?? "—"}</span>
                  <span className="hidden text-xs text-muted-foreground lg:inline">{run.roomName ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">{relativeTime(run.createdAt)}</span>
                  <span className="font-mono text-xs text-muted-foreground">{run.creditsUsed} cr</span>
                  <span className="font-mono text-xs text-muted-foreground">{durationLabel(run.startedAt, run.endedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          title="No runs yet."
          description="Your run history will appear here once you start your first agent task."
          cta={{ label: "Start your first run", href: "/dev/sandbox-test" }}
        />
      )}
    </div>
  );
}
