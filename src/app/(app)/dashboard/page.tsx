import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowRight, Bot, CreditCard, History } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecentRuns, getRunStats } from "@/lib/data/runs";
import { getRooms } from "@/lib/data/rooms";
import { getAgents } from "@/lib/data/agents";
import { getUsageThisMonth } from "@/lib/data/usage-logs";
import {
  EmptyState,
  Section,
  StatCard,
  StatusPill,
  durationLabel,
  relativeTime,
} from "@/components/dashboard/dashboard-shared";

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

  const credits = typeof profileRow?.credits === "number" ? profileRow.credits : 0;

  const [stats, usage, recent, rooms, agents] = await Promise.all([
    getRunStats(user.id, 30),
    getUsageThisMonth(user.id),
    getRecentRuns(user.id, 10),
    getRooms(user.id),
    getAgents(user.id),
  ]);

  const activeRooms = rooms.filter((room) => room.status === "active").slice(0, 3);
  const workingAgents = agents.filter((agent) => agent.status === "working").length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back{user.email ? `, ${user.email.split("@")[0]}` : ""}.</h1>
        <p className="text-sm text-muted-foreground">
          Your agents, runs, rooms, and credits — all live.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active runs" value={stats.running} detail={`${workingAgents} agents working`} icon={Activity} />
        <StatCard label="Credits remaining" value={credits} detail="Top up anytime" icon={CreditCard} />
        <StatCard label="Runs this month" value={usage.runsStarted} detail="Last 30 days" icon={History} />
        <StatCard label="Credits used (30d)" value={usage.creditsUsed} detail={`${stats.completed} completed runs`} icon={Bot} />
      </section>

      <Section
        title="Recent runs"
        action={
          recent.length ? (
            <Link href="/runs" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
              View all <ArrowRight className="size-3.5" />
            </Link>
          ) : null
        }
      >
        {recent.length ? (
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y divide-[var(--border)]">
              {recent.map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/runs/${run.id}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm transition hover:bg-secondary/50"
                  >
                    <StatusPill status={run.status} />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {run.taskPrompt.slice(0, 80)}
                      {run.taskPrompt.length > 80 ? "…" : ""}
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
            description="Welcome to Agent Room. Start your first agent run on a real cloud machine."
            cta={{ label: "Start your first run", href: "/dev/sandbox-test" }}
          />
        )}
      </Section>

      <Section
        title="Active rooms"
        action={
          <Link href="/rooms" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
            View all <ArrowRight className="size-3.5" />
          </Link>
        }
      >
        {activeRooms.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {activeRooms.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                className="rounded-lg border bg-card p-4 transition hover:bg-secondary/50"
              >
                <StatusPill status={room.status} />
                <h3 className="mt-3 text-base font-semibold">{room.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {room.description ?? "No description yet."}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Created {relativeTime(room.createdAt)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Create your first room."
            description="Rooms organize your work. Group runs, agents, and history by project."
            cta={{ label: "Create room", href: "/rooms" }}
          />
        )}
      </Section>

      <Section title="Pending approvals">
        <div className="rounded-lg border border-dashed bg-card/40 px-4 py-6 text-sm text-muted-foreground">
          Approval workflows arrive in a later phase. Risky agent actions will surface here for review.
        </div>
      </Section>
    </div>
  );
}
