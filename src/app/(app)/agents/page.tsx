import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAgents } from "@/lib/data/agents";
import { EmptyState, StatusPill, relativeTime } from "@/components/dashboard/dashboard-shared";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agents");

  const agents = await getAgents(user.id);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your configured agents. Run them on real cloud machines.</p>
      </header>

      {agents.length ? (
        <ul className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <li key={agent.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="grid size-12 place-items-center rounded-full font-mono text-sm font-bold"
                  style={{ background: `${agent.color}1a`, border: `1px solid ${agent.color}66`, color: agent.color }}
                >
                  {agent.avatarInitials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{agent.name}</div>
                  <div className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">{agent.role}</div>
                </div>
              </div>
              <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
                {agent.description ?? "No description yet."}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <StatusPill status={agent.status} />
                <span className="font-mono text-muted-foreground">added {relativeTime(agent.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          emphasize
          title="No agents yet."
          description="Agents are reusable task templates. Define one once, run it on demand or schedule it. Think of them as functions for your cloud desktop."
          cta={{ label: "Create your first agent", href: "/dev/sandbox-test" }}
          secondary={{ label: "Learn more", href: "/integrations" }}
        />
      )}
    </div>
  );
}
