import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoom } from "@/lib/data/rooms";
import { getRunsForRoom } from "@/lib/data/runs";
import { getAgents } from "@/lib/data/agents";
import { Button } from "@/components/ui/primitives";
import {
  EmptyState,
  Section,
  StatusPill,
  durationLabel,
  relativeTime,
} from "@/components/dashboard/dashboard-shared";

export const dynamic = "force-dynamic";

type Params = { roomId: string };

export default async function RoomDetailPage({ params }: { params: Promise<Params> }) {
  const { roomId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/rooms/${roomId}`);

  const room = await getRoom(user.id, roomId);
  if (!room) notFound();

  const [runs, agents] = await Promise.all([
    getRunsForRoom(user.id, roomId, 20),
    getAgents(user.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link href="/rooms" className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to rooms
        </Link>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0">
            <StatusPill status={room.status} />
            <h1 className="mt-3 break-words text-xl font-semibold tracking-tight sm:text-2xl">{room.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {room.description ?? "No description yet."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Created {relativeTime(room.createdAt)}</p>
          </div>
          <Link href="/dev/sandbox-test">
            <Button variant="default">
              <Play className="size-4" />
              Start run
            </Button>
          </Link>
        </div>
      </header>

      <Section title="Recent runs">
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
                      {run.taskPrompt.slice(0, 80)}
                      {run.taskPrompt.length > 80 ? "…" : ""}
                    </span>
                    <span className="hidden text-xs text-muted-foreground md:inline">{run.agentName ?? "—"}</span>
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
            title="No runs in this room yet."
            description="Run an agent to populate this room with history."
            cta={{ label: "Start a run", href: "/dev/sandbox-test" }}
          />
        )}
      </Section>

      <Section title="Available agents">
        {agents.length ? (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {agents.map((agent) => (
              <li key={agent.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="grid size-10 place-items-center rounded-full font-mono text-xs font-bold"
                    style={{ background: `${agent.color}1a`, border: `1px solid ${agent.color}66`, color: agent.color }}
                  >
                    {agent.avatarInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{agent.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{agent.role}</div>
                  </div>
                </div>
                <div className="mt-3"><StatusPill status={agent.status} /></div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No agents configured." description="Default agents will be seeded automatically." />
        )}
      </Section>
    </div>
  );
}
