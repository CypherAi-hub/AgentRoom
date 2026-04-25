"use client";

import Link from "next/link";
import { ActivityFeed } from "@/components/activity";
import { Badge } from "@/components/ui/primitives";
import { ApprovalCard } from "@/components/approvals";
import { AgentCard, IntegrationCard, MetricCard, RoomCard } from "@/components/cards";
import { getAgent, mockActivityEvents, mockAgentRuns, mockAgents, mockApprovals, mockDashboardMetrics, mockIntegrations } from "@/lib/mock-data";
import { useAgentRoomStore } from "@/lib/store/agent-room-store";

const createLinkClass =
  "inline-flex h-10 w-full max-w-[290px] items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 sm:w-auto";

export function DashboardHome() {
  const { getRooms } = useAgentRoomStore();
  const rooms = getRooms();
  const metrics = mockDashboardMetrics.map((metric) =>
    metric.label === "Active rooms" ? { ...metric, value: String(rooms.length) } : metric,
  );

  return (
    <div className="flex w-full max-w-[358px] flex-col gap-6 sm:max-w-none">
      <section className="flex min-w-0 flex-col justify-between gap-4 overflow-hidden rounded-xl border bg-card/60 p-6 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Agent Room MVP</p>
          <h1 className="mt-3 max-w-[280px] break-words text-3xl font-semibold tracking-normal sm:max-w-3xl md:text-5xl">
            Manage the work AI is doing, not another chat window.
          </h1>
          <p className="mt-4 max-w-[290px] text-sm leading-6 text-muted-foreground sm:max-w-2xl md:text-base">
            FoFit is the flagship operating room for agents, integrations, workflows, approvals, and launch progress.
          </p>
        </div>
        <Link href="/environments/new" className={createLinkClass}>
          Create Room
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((m) => <MetricCard key={m.label} metric={m} />)}</section>
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Rooms</h2>
              <Link href="/rooms" className="text-sm text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">{rooms.map((r) => <RoomCard key={r.id} room={r} featured={r.id === "room_fofit"} />)}</div>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active agents</h2>
              <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground">Directory</Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">{mockAgents.slice(0, 4).map((a) => <AgentCard key={a.id} agent={a} />)}</div>
          </div>
        </div>
        <aside className="flex flex-col gap-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pending approvals</h2>
              <Link href="/rooms/fofit/approvals" className="text-sm text-muted-foreground hover:text-foreground">Review</Link>
            </div>
            <div className="flex flex-col gap-3">{mockApprovals.slice(0, 2).map((a) => <ApprovalCard key={a.id} approval={a} />)}</div>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent runs</h2>
              <Link href="/runs" className="text-sm text-muted-foreground hover:text-foreground">View runs</Link>
            </div>
            <div className="flex flex-col gap-3">
              {mockAgentRuns.slice(0, 3).map((run) => (
                <div key={run.id} className="rounded-lg border bg-card/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-medium">{run.command}</p>
                    <Badge variant={run.status === "completed" ? "success" : run.status === "running" ? "warning" : "secondary"}>{run.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{getAgent(run.agentId)?.name ?? "Agent"}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
            <ActivityFeed events={mockActivityEvents} limit={5} />
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Integration health</h2>
            <div className="flex flex-col gap-3">{mockIntegrations.slice(0, 3).map((i) => <IntegrationCard key={i.id} integration={i} />)}</div>
          </div>
        </aside>
      </section>
    </div>
  );
}
