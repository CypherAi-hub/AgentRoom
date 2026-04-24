"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDot,
  Clock3,
  GitBranch,
  Loader2,
  MessageSquare,
  Play,
  Rocket,
  Send,
  ShieldAlert,
  Terminal,
  XCircle,
} from "lucide-react";
import {
  AgentStatusBadge,
  PermissionBadge,
  PriorityBadge,
  RiskBadge,
  TaskStatusBadge,
} from "@/components/cards";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui/primitives";
import {
  useAgentRoomStore,
  type ConsoleMessage as ConsoleMessageRecord,
  type DataMode,
  type LiveSourceMode,
  type RoomRuntimeState,
} from "@/lib/store/agent-room-store";
import { getAgent, getIntegration, mockAgents } from "@/lib/mock-data";
import { cn, formatDateTime, titleCase } from "@/lib/utils";
import type { ActivityEvent, Agent, Approval, ApprovalStatus, Room, Task, TaskStatus } from "@/types";

type ActivityResponse = {
  integration?: "github" | "vercel";
  mode?: LiveSourceMode;
  readOnly?: boolean;
  events?: ActivityEvent[];
};

const taskStatusOrder: TaskStatus[] = ["backlog", "next", "in_progress", "review", "done"];

function nextStatus(status: TaskStatus) {
  const index = taskStatusOrder.indexOf(status);
  return taskStatusOrder[Math.min(taskStatusOrder.length - 1, Math.max(0, index) + 1)];
}

function compactPayloadValue(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value.length > 70 ? value.slice(0, 67) + "..." : value;
}

function modeLabel(mode: DataMode) {
  if (mode === "live_read_only") return "Live Read-Only";
  if (mode === "hybrid") return "Hybrid Mode";
  return "Mock Mode";
}

function modeVariant(mode: DataMode) {
  if (mode === "live_read_only") return "success" as const;
  if (mode === "hybrid") return "warning" as const;
  return "secondary" as const;
}

function MessageKindIcon({ kind }: { kind: ConsoleMessageRecord["kind"] }) {
  if (kind === "user") return <MessageSquare className="size-4" />;
  if (kind === "tool") return <Terminal className="size-4" />;
  if (kind === "approval") return <ShieldAlert className="size-4" />;
  if (kind === "task") return <CheckCircle2 className="size-4" />;
  if (kind === "agent") return <Bot className="size-4" />;
  return <CircleDot className="size-4" />;
}

function statusSummary(roomState: RoomRuntimeState) {
  const counts = mockAgents.reduce<Record<string, number>>((acc, agent) => {
    const status = roomState.localAgentStatuses[agent.id] ?? agent.status;
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([status, count]) => count + " " + status.replaceAll("_", " "))
    .join(" / ");
}

export function RoomConsole({ room }: { room: Room }) {
  const {
    hasMounted,
    getRoomState,
    getDataMode,
    hydrateLiveActivity,
    submitRoomInstruction,
    simulateAgentWork,
    updateTaskStatus,
    updateApprovalStatus,
    selectAgent,
  } = useAgentRoomStore();
  const roomState = getRoomState(room.id);
  const dataMode = getDataMode(room.id);
  const [loadingLive, setLoadingLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveActivity() {
      setLoadingLive(true);
      const readActivity = async (url: string): Promise<ActivityResponse | undefined> => {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) return undefined;
          return (await response.json()) as ActivityResponse;
        } catch {
          return undefined;
        }
      };

      const [github, vercel] = await Promise.all([
        readActivity("/api/integrations/github/activity"),
        readActivity("/api/integrations/vercel/activity"),
      ]);

      if (cancelled) return;
      hydrateLiveActivity(room.id, [...(github?.events ?? []), ...(vercel?.events ?? [])], {
        github: github?.mode ?? "mock",
        vercel: vercel?.mode ?? "mock",
      });
      setLoadingLive(false);
    }

    loadLiveActivity();
    return () => {
      cancelled = true;
    };
  }, [hydrateLiveActivity, room.id]);

  const combinedActivity = useMemo(
    () =>
      [...roomState.liveActivityEvents, ...roomState.localActivityEvents].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      ),
    [roomState.liveActivityEvents, roomState.localActivityEvents],
  );

  const pendingApprovals = roomState.localApprovals.filter((approval) => approval.status === "pending");

  return (
    <div className="flex flex-col gap-5">
      <header className="glass-panel rounded-lg border p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant={room.status === "active" ? "success" : "secondary"}>{titleCase(room.status)}</Badge>
              <DataModeBadge mode={dataMode} ready={hasMounted} />
              <Badge variant="outline">Read-only mutations disabled</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">{room.name} Live Console</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{roomState.currentRoomObjective}</p>
          </div>
          <div className="w-full max-w-sm rounded-lg border bg-secondary/30 p-4">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>Launch progress</span>
              <span>{room.launchProgress}%</span>
            </div>
            <Progress value={room.launchProgress} />
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              {loadingLive ? <Loader2 className="size-3 animate-spin" /> : <Activity className="size-3" />}
              <span>{loadingLive ? "Syncing read-only activity" : statusSummary(roomState)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <AgentDock
          selectedAgentId={roomState.selectedAgentId}
          statuses={roomState.localAgentStatuses}
          onSelect={(agentId) => selectAgent(room.id, agentId)}
        />
        <AgentDetailPanel
          agent={mockAgents.find((agent) => agent.id === roomState.selectedAgentId) ?? mockAgents[0]}
          status={roomState.localAgentStatuses[roomState.selectedAgentId ?? "agent_product"]}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card className="glass-panel min-h-[720px]">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Room Thread</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  User direction, agent responses, read-only tool events, approvals, and local task movement.
                </p>
              </div>
              <QuickActions
                onInstruction={(instruction) => submitRoomInstruction(room.id, instruction)}
                onSimulate={() => simulateAgentWork(room.id)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex min-h-[650px] flex-col p-0">
            <ConsoleThread
              messages={roomState.consoleMessages}
              approvals={roomState.localApprovals}
              onReviewApproval={(approvalId, status) => updateApprovalStatus(room.id, approvalId, status)}
            />
            <ConsoleInput onSubmit={(instruction) => submitRoomInstruction(room.id, instruction)} />
          </CardContent>
        </Card>

        <ContextRail
          roomState={roomState}
          dataMode={dataMode}
          modeReady={hasMounted}
          loadingLive={loadingLive}
          activity={combinedActivity}
          pendingApprovals={pendingApprovals}
          onReviewApproval={(approvalId, status) => updateApprovalStatus(room.id, approvalId, status)}
          onMoveTask={(task) => updateTaskStatus(room.id, task.id, nextStatus(task.status))}
        />
      </div>
    </div>
  );
}

export function DataModeBadge({ mode, ready = true }: { mode: DataMode; ready?: boolean }) {
  const label = ready ? modeLabel(mode) : "Checking Mode";
  const variant = ready ? modeVariant(mode) : ("secondary" as const);

  return (
    <Badge variant={variant} className="gap-1.5">
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

export function AgentDock({
  selectedAgentId,
  statuses,
  onSelect,
}: {
  selectedAgentId?: string;
  statuses: Record<string, string>;
  onSelect: (agentId: Agent["id"]) => void;
}) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Agent Dock</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Local state only. No autonomous external execution.</p>
          </div>
          <Badge variant="outline">{mockAgents.length} agents</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {mockAgents.map((agent) => {
            const selected = selectedAgentId === agent.id;
            const status = (statuses[agent.id] ?? agent.status) as Agent["status"];
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelect(agent.id)}
                className={cn(
                  "min-w-0 rounded-lg border bg-secondary/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-primary/50 bg-primary/10" : "border-border",
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={agent.name} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{agent.name}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{agent.role}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <AgentStatusBadge status={status} />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentDetailPanel({ agent, status }: { agent: Agent; status?: Agent["status"] }) {
  const tools = agent.integrationIds.map((id) => getIntegration(id)?.name).filter(Boolean);
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar name={agent.name} />
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{agent.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <AgentStatusBadge status={status ?? agent.status} />
          <PermissionBadge permission={agent.permissionLevel} />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Memory</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{agent.memorySummary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => (
            <span key={tool} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
              {tool}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function QuickActions({
  onInstruction,
  onSimulate,
}: {
  onInstruction: (instruction: string) => void;
  onSimulate: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => onInstruction("Triage the latest GitHub and Vercel signals for FoFit.")}>
        <GitBranch className="size-4" />
        Triage
      </Button>
      <Button size="sm" variant="outline" onClick={() => onInstruction("Prepare a production deploy readiness plan for FoFit.")}>
        <Rocket className="size-4" />
        Release Plan
      </Button>
      <Button size="sm" variant="secondary" onClick={onSimulate}>
        <Play className="size-4" />
        Local Loop
      </Button>
    </div>
  );
}

export function ConsoleThread({
  messages,
  approvals,
  onReviewApproval,
}: {
  messages: ConsoleMessageRecord[];
  approvals: Approval[];
  onReviewApproval: (approvalId: Approval["id"], status: ApprovalStatus) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col gap-3">
        {messages.map((message) => {
          const approval = message.approvalId ? approvals.find((item) => item.id === message.approvalId) : undefined;
          return (
            <ConsoleMessage
              key={message.id}
              message={message}
              approval={approval}
              onReviewApproval={onReviewApproval}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ConsoleMessage({
  message,
  approval,
  onReviewApproval,
}: {
  message: ConsoleMessageRecord;
  approval?: Approval;
  onReviewApproval: (approvalId: Approval["id"], status: ApprovalStatus) => void;
}) {
  const agent = getAgent(message.agentId);
  const integration = getIntegration(message.integrationId);
  return (
    <article className="rounded-lg border bg-secondary/20 p-4">
      <div className="flex gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md border bg-card text-muted-foreground">
          <MessageKindIcon kind={message.kind} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{message.authorName}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(message.createdAt)}</span>
            {message.kind === "tool" ? <Badge variant="outline">read-only</Badge> : null}
            {agent ? <AgentStatusBadge status={agent.status} /> : null}
            {integration ? <Badge variant="secondary">{integration.name}</Badge> : null}
          </div>
          {message.title ? <h3 className="mt-2 text-sm font-semibold">{message.title}</h3> : null}
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{message.body}</p>
          {approval ? (
            <div className="mt-3">
              <InlineApprovalCard approval={approval} onReview={onReviewApproval} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ConsoleInput({ onSubmit }: { onSubmit: (instruction: string) => void }) {
  const [value, setValue] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={submit} className="border-t p-4">
      <div className="rounded-lg border bg-background/70 p-3">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Tell this room what to work on next..."
          className="min-h-24 w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">High-risk keywords create local approvals. External writes stay disabled.</p>
          <Button type="submit" size="sm" disabled={!value.trim()}>
            <Send className="size-4" />
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ContextRail({
  roomState,
  dataMode,
  modeReady,
  loadingLive,
  activity,
  pendingApprovals,
  onReviewApproval,
  onMoveTask,
}: {
  roomState: RoomRuntimeState;
  dataMode: DataMode;
  modeReady: boolean;
  loadingLive: boolean;
  activity: ActivityEvent[];
  pendingApprovals: Approval[];
  onReviewApproval: (approvalId: Approval["id"], status: ApprovalStatus) => void;
  onMoveTask: (task: Task) => void;
}) {
  return (
    <aside className="flex flex-col gap-5">
      <Card className="glass-panel">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Live Context</CardTitle>
            <DataModeBadge mode={dataMode} ready={modeReady} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-lg border bg-secondary/20 p-3 text-sm leading-6 text-muted-foreground">
            {roomState.currentRoomObjective}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {loadingLive ? <Loader2 className="size-3 animate-spin" /> : <Clock3 className="size-3" />}
            <span>{loadingLive ? "Reading GitHub and Vercel activity" : "Live read-only refresh complete"}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pendingApprovals.length ? (
            pendingApprovals.slice(0, 3).map((approval) => (
              <InlineApprovalCard key={approval.id} approval={approval} onReview={onReviewApproval} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No pending approvals in this room.</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Priority Tasks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {roomState.localTasks.slice(0, 5).map((task) => (
            <TaskMover key={task.id} task={task} onMove={onMoveTask} />
          ))}
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Activity Rail</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {activity.slice(0, 8).map((event) => (
            <ToolActivityCard key={event.id} event={event} />
          ))}
        </CardContent>
      </Card>
    </aside>
  );
}

function TaskMover({ task, onMove }: { task: Task; onMove: (task: Task) => void }) {
  const done = task.status === "done";
  return (
    <div className="rounded-lg border bg-secondary/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-medium">{task.title}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onMove(task)} disabled={done}>
          Move
        </Button>
      </div>
    </div>
  );
}

export function InlineApprovalCard({
  approval,
  onReview,
}: {
  approval: Approval;
  onReview: (approvalId: Approval["id"], status: ApprovalStatus) => void;
}) {
  const integration = getIntegration(approval.integrationId);
  const agent = getAgent(approval.requestedByAgentId);
  return (
    <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge risk={approval.riskLevel} />
        <Badge variant="outline">{titleCase(approval.actionType)}</Badge>
        {integration ? <Badge variant="secondary">{integration.name}</Badge> : null}
      </div>
      <p className="mt-2 text-sm leading-6">{approval.summary}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Requested by {agent?.name ?? "Agent"} / {formatDateTime(approval.requestedAt)}
      </p>
      {approval.status === "pending" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onReview(approval.id, "approved")}>
            <CheckCircle2 className="size-4" />
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReview(approval.id, "denied")}>
            <XCircle className="size-4" />
            Deny
          </Button>
        </div>
      ) : (
        <Badge variant={approval.status === "approved" ? "success" : "destructive"} className="mt-3">
          {titleCase(approval.status)}
        </Badge>
      )}
    </div>
  );
}

export function ToolActivityCard({ event }: { event: ActivityEvent }) {
  const integration = getIntegration(event.integrationId);
  const source = compactPayloadValue(event.payload?.source);
  const repository = compactPayloadValue(event.payload?.repository ?? event.payload?.project);
  return (
    <div className="rounded-lg border bg-secondary/20 p-3">
      <div className="flex items-start gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-md border bg-card text-muted-foreground">
          <Terminal className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{integration?.name ?? "Tool"}</span>
            <RiskBadge risk={event.riskLevel} />
          </div>
          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.title}</div>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{event.summary}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{formatDateTime(event.createdAt)}</span>
            {source ? <span>{source}</span> : null}
            {repository ? <span>{repository}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
