"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, Clock3, Database, ListChecks, Play, ShieldAlert, Terminal } from "lucide-react";
import { AgentStatusBadge, RiskBadge } from "@/components/cards";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { getAgent, getIntegration } from "@/lib/mock-data";
import { useAgentRoomStore } from "@/lib/store/agent-room-store";
import { cn, formatDateTime, titleCase } from "@/lib/utils";
import type { AgentRun, AgentRunStatus, Room, RunLog, RunLogLevel, ToolCall, ToolCallStatus } from "@/types";

function runStatusVariant(status: AgentRunStatus) {
  if (status === "completed") return "success" as const;
  if (status === "running" || status === "queued") return "warning" as const;
  if (status === "blocked" || status === "failed") return "destructive" as const;
  return "secondary" as const;
}

function logTone(level: RunLogLevel) {
  if (level === "error") return "text-red-200";
  if (level === "warn") return "text-amber-200";
  if (level === "debug") return "text-muted-foreground";
  return "text-emerald-100";
}

function toolTone(status: ToolCallStatus) {
  if (status === "succeeded") return "success" as const;
  if (status === "failed" || status === "blocked") return "destructive" as const;
  if (status === "approval_required" || status === "running") return "warning" as const;
  return "secondary" as const;
}

function RunStatusBadge({ status }: { status: AgentRunStatus }) {
  return <Badge variant={runStatusVariant(status)}>{titleCase(status)}</Badge>;
}

function RunCard({ run, active, onSelect }: { run: AgentRun; active: boolean; onSelect: () => void }) {
  const agent = getAgent(run.agentId);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border bg-card/70 p-4 text-left transition-colors hover:border-primary/40",
        active && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RunStatusBadge status={run.status} />
            <span className="text-xs text-muted-foreground">{formatDateTime(run.createdAt)}</span>
          </div>
          <h3 className="mt-3 line-clamp-2 text-sm font-semibold">{run.command}</h3>
          <p className="mt-2 text-xs text-muted-foreground">{agent?.name ?? "Agent"}</p>
        </div>
        <Bot className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}

function RunLogStream({ logs }: { logs: RunLog[] }) {
  if (!logs.length) {
    return <p className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">No logs recorded for this run yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-black/20">
      {logs.map((log) => (
        <div key={log.id} className="grid gap-2 border-b px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[90px_minmax(0,1fr)_132px]">
          <span className={cn("font-mono text-xs uppercase", logTone(log.level))}>{log.level}</span>
          <span className="min-w-0 break-words text-muted-foreground">{log.message}</span>
          <span className="text-xs text-muted-foreground sm:text-right">{formatDateTime(log.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function ToolCallList({ calls }: { calls: ToolCall[] }) {
  if (!calls.length) {
    return <p className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">No tool calls recorded.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {calls.map((call) => {
        const integration = getIntegration(call.integrationId);
        return (
          <div key={call.id} className="rounded-lg border bg-card/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Terminal className="size-4 text-muted-foreground" />
                  {call.callName.replaceAll("_", " ")}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{integration?.name ?? "Integration"}</p>
              </div>
              <Badge variant={toolTone(call.status)}>{titleCase(call.status)}</Badge>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Input and output are sanitized local metadata. Tokens and secrets are never displayed.</p>
          </div>
        );
      })}
    </div>
  );
}

function StartRunBox({ rooms }: { rooms: Room[] }) {
  const { startAgentRun } = useAgentRoomStore();
  const [command, setCommand] = useState("Create FoFit waitlist schema plan");
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "room_fofit");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const runId = startAgentRun(roomId, command, command.toLowerCase().includes("schema") ? "agent_security" : "agent_engineer");
    if (runId) setCommand("");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border bg-card/70 p-4 lg:grid-cols-[190px_minmax(0,1fr)_auto]">
      <select
        value={roomId}
        onChange={(event) => setRoomId(event.target.value as Room["id"])}
        className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        aria-label="Room"
      >
        {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
      </select>
      <input
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder="Ask Agent Room to record a safe local run..."
        className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      />
      <Button type="submit" disabled={!command.trim()}>
        <Play className="size-4" />
        Record Run
      </Button>
    </form>
  );
}

export function RunsDashboard() {
  const { getRooms, getRoomRuns, getRunLogs, getRunToolCalls, getRoomState } = useAgentRoomStore();
  const rooms = getRooms();
  const runs = useMemo(
    () => rooms.flatMap((room) => getRoomRuns(room.id).map((run) => ({ ...run, roomName: room.name, roomSlug: room.slug }))).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [getRoomRuns, rooms],
  );
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id);
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0];
  const selectedRoom = selectedRun ? rooms.find((room) => room.id === selectedRun.roomId) : undefined;
  const logs = selectedRun ? getRunLogs(selectedRun.id) : [];
  const calls = selectedRun ? getRunToolCalls(selectedRun.id) : [];
  const activeCount = runs.filter((run) => run.status === "running" || run.status === "queued").length;
  const blockedCount = runs.filter((run) => run.status === "blocked").length;
  const completedCount = runs.filter((run) => run.status === "completed").length;
  const selectedAgent = selectedRun ? getAgent(selectedRun.agentId) : undefined;
  const selectedState = selectedRun ? getRoomState(selectedRun.roomId) : undefined;
  const selectedStatus = selectedAgent && selectedState ? selectedState.localAgentStatuses[selectedAgent.id] ?? selectedAgent.status : "idle";

  return (
    <div className="flex w-full max-w-[358px] flex-col gap-6 sm:max-w-none">
      <section className="glass-panel rounded-lg border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">V0.6</Badge>
              <Badge variant="secondary">Local runtime</Badge>
              <Badge variant="outline">Supabase schema-ready</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">Agent Runs</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Track command execution, run logs, and tool calls without enabling external mutations. Supabase persistence is staged behind migrations, while the app still starts locally.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm sm:min-w-[360px]">
            <div className="rounded-lg border bg-secondary/30 p-3"><div className="text-xl font-semibold">{activeCount}</div><div className="text-xs text-muted-foreground">Active</div></div>
            <div className="rounded-lg border bg-secondary/30 p-3"><div className="text-xl font-semibold">{completedCount}</div><div className="text-xs text-muted-foreground">Done</div></div>
            <div className="rounded-lg border bg-secondary/30 p-3"><div className="text-xl font-semibold">{blockedCount}</div><div className="text-xs text-muted-foreground">Blocked</div></div>
          </div>
        </div>
      </section>

      <StartRunBox rooms={rooms} />

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="glass-panel">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Recent runs</CardTitle>
            <p className="text-sm text-muted-foreground">Local and seeded execution records.</p>
          </CardHeader>
          <CardContent className="flex max-h-[760px] flex-col gap-3 overflow-y-auto p-4">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} active={run.id === selectedRun?.id} onSelect={() => setSelectedRunId(run.id)} />
            ))}
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          {selectedRun ? (
            <>
              <Card className="glass-panel">
                <CardHeader className="border-b">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <RunStatusBadge status={selectedRun.status} />
                        {selectedRun.status === "blocked" ? <RiskBadge risk="high" /> : null}
                        {selectedAgent ? <AgentStatusBadge status={selectedStatus} /> : null}
                      </div>
                      <CardTitle className="text-lg">{selectedRun.command}</CardTitle>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedRoom ? <Link href={'/rooms/' + selectedRoom.slug} className="hover:text-foreground">{selectedRoom.name}</Link> : "Room"} / {selectedAgent?.name ?? "Agent"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:min-w-[250px]">
                      <div className="rounded-md border bg-secondary/20 p-3"><Clock3 className="mb-2 size-4" />Started<br />{formatDateTime(selectedRun.startedAt)}</div>
                      <div className="rounded-md border bg-secondary/20 p-3"><CheckCircle2 className="mb-2 size-4" />Completed<br />{formatDateTime(selectedRun.completedAt)}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg border bg-secondary/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium"><ListChecks className="size-4 text-muted-foreground" />Output</div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedRun.output || "No output has been saved yet."}</p>
                    </div>
                    <div className="rounded-lg border bg-secondary/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium"><Database className="size-4 text-muted-foreground" />Persistence</div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">Stored locally now. V0.6 database tables are migration-ready for Supabase persistence.</p>
                    </div>
                    <div className="rounded-lg border bg-secondary/20 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium"><ShieldAlert className="size-4 text-muted-foreground" />Safety</div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">External write actions remain disabled and approval-gated.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Run log stream</CardTitle>
                  <p className="text-sm text-muted-foreground">Chronological execution notes ready for future Supabase Realtime.</p>
                </CardHeader>
                <CardContent className="p-5"><RunLogStream logs={logs} /></CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Tool calls</CardTitle>
                  <p className="text-sm text-muted-foreground">Sanitized integration activity, never raw tokens or secrets.</p>
                </CardHeader>
                <CardContent className="p-5"><ToolCallList calls={calls} /></CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-panel"><CardContent className="p-8 text-center text-sm text-muted-foreground">No runs yet.</CardContent></Card>
          )}
        </div>
      </section>
    </div>
  );
}
