import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecentRuns, getRunStats } from "@/lib/data/runs";
import { getAgents } from "@/lib/data/agents";
import { getUsageThisMonth } from "@/lib/data/usage-logs";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentRuns } from "@/components/dashboard/recent-runs";
import { QuickActions } from "@/components/dashboard/quick-actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("credits, plan")
    .eq("id", user.id)
    .maybeSingle<{ credits: number | null; plan: string | null }>();

  const credits =
    typeof profileRow?.credits === "number" ? profileRow.credits : 0;

  const [stats, usage, recent, agents] = await Promise.all([
    getRunStats(user.id, 30),
    getUsageThisMonth(user.id),
    getRecentRuns(user.id, 5),
    getAgents(user.id),
  ]);

  const totalRuns = stats.total;
  const agentCount = agents.length;
  // Time saved heuristic: ~10 minutes saved per completed run.
  const timeSavedMinutes = stats.completed * 10;

  const isNewUser = totalRuns === 0 && agentCount === 0;
  const firstName = user.email ? user.email.split("@")[0] : null;

  if (isNewUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-xl rounded-lg border border-border-subtle bg-bg-surface p-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            You haven&apos;t started yet.
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Spin up your first sandbox in 30 seconds. Agent Room gives your
            agent a real cloud desktop — they click, type, and browse just
            like you do.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dev/sandbox-test"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent-hero px-5 text-sm font-semibold text-[color:var(--color-accent-hero-fg,#0A0A0A)] transition hover:opacity-90"
            >
              Start your first sandbox <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border-subtle px-5 text-sm font-medium text-text-primary transition hover:bg-bg-surface-hi"
            >
              See how it works
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-sm text-text-secondary">
          Here&apos;s what your agents have been up to.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total runs" value={totalRuns} />
        <StatCard label="Credits" value={credits} />
        <StatCard label="Time saved (min)" value={timeSavedMinutes} />
        <StatCard label="Agents" value={agentCount} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <header className="flex items-end justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight text-text-primary">
              Recent runs
            </h2>
            {recent.length ? (
              <Link
                href="/runs"
                className="inline-flex items-center gap-1 text-sm text-text-secondary transition hover:text-text-primary"
              >
                View all <ArrowRight className="size-3.5" />
              </Link>
            ) : null}
          </header>
          <RecentRuns
            runs={recent.map((run) => ({
              id: run.id,
              status: run.status,
              taskPrompt: run.taskPrompt,
              createdAt: run.createdAt,
            }))}
          />
        </div>

        <div className="flex flex-col gap-3">
          <header className="flex items-end justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight text-text-primary">
              Quick actions
            </h2>
          </header>
          <QuickActions />

          <p className="px-1 text-xs text-text-muted">
            Total credits used (30d):{" "}
            <span className="font-mono text-text-secondary">
              {usage.creditsUsed.toLocaleString()}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
