"use client";

import { ActivityFeed } from "@/components/activity";
import { AgentStatusBadge, PermissionBadge } from "@/components/cards";
import { RoomApprovalsList } from "@/components/approvals";
import { RoomNotFound } from "@/components/rooms/room-not-found";
import { TaskBoard } from "@/components/tasks";
import { Avatar, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { WorkflowCard } from "@/components/workflows";
import { getRoomWorkflows, mockAgents, mockIntegrations } from "@/lib/mock-data";
import { useAgentRoomStore } from "@/lib/store/agent-room-store";
import { titleCase } from "@/lib/utils";
import type { ActivityEvent, AgentId, Room, RoomId } from "@/types";

function sortEvents(events: ActivityEvent[]) {
  return [...events].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function LoadingRoom() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="glass-panel max-w-xl rounded-lg border p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Checking room</p>
        <h1 className="mt-3 text-3xl font-semibold">Loading environment</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Looking for saved local room context.</p>
      </div>
    </div>
  );
}

function PageHeader({
  room,
  title,
  description,
}: {
  room: Room;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">{room.name}</p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function useResolvedRoom(roomSlug: string) {
  const { hasMounted, getRoomBySlug, getRoomState } = useAgentRoomStore();
  const room = getRoomBySlug(roomSlug);
  const roomState = room ? getRoomState(room.id) : undefined;

  return {
    hasMounted,
    room,
    roomState,
  };
}

function selectedAgents(agentIds: AgentId[]) {
  if (!agentIds.length) return mockAgents;
  const selected = new Set(agentIds);
  return mockAgents.filter((agent) => selected.has(agent.id));
}

export function RoomTasksResolver({ roomSlug }: { roomSlug: string }) {
  const { hasMounted, room, roomState } = useResolvedRoom(roomSlug);

  if (!hasMounted) return <LoadingRoom />;
  if (!room || !roomState) return <RoomNotFound />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        room={room}
        title="Task board"
        description="Local kanban board for assigning work to agents and linking work to tools. Task movement stays inside Agent Room state."
      />
      <TaskBoard tasks={roomState.localTasks} />
    </div>
  );
}

export function RoomActivityResolver({ roomSlug }: { roomSlug: string }) {
  const { hasMounted, room, roomState } = useResolvedRoom(roomSlug);

  if (!hasMounted) return <LoadingRoom />;
  if (!room || !roomState) return <RoomNotFound />;

  const events = sortEvents([...roomState.liveActivityEvents, ...roomState.localActivityEvents]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        room={room}
        title="Live activity feed"
        description="Unified read-only tool signals and local room events. External actions remain disabled."
      />
      <ActivityFeed events={events} />
    </div>
  );
}

export function RoomAgentsResolver({ roomSlug }: { roomSlug: string }) {
  const { hasMounted, room, roomState } = useResolvedRoom(roomSlug);

  if (!hasMounted) return <LoadingRoom />;
  if (!room || !roomState) return <RoomNotFound />;

  const agents = selectedAgents(roomState.selectedAgentIds);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        room={room}
        title="Room agents"
        description="Agents are scoped by tools, memory, permissions, tasks, and output history."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const displayName = roomState.customAgentNames[agent.id] ?? agent.name;
          const status = roomState.localAgentStatuses[agent.id] ?? agent.status;
          const tools = agent.integrationIds
            .filter((integrationId) => roomState.selectedIntegrationIds.includes(integrationId))
            .map((integrationId) => mockIntegrations.find((integration) => integration.id === integrationId)?.name)
            .filter(Boolean);

          return (
            <Card key={agent.id} className="glass-panel">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar name={displayName} />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{displayName}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{agent.role}</p>
                  </div>
                  <AgentStatusBadge status={status} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm leading-6 text-muted-foreground">{agent.description}</p>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Current room status
                  </div>
                  <p className="mt-1 text-sm">{titleCase(status)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PermissionBadge permission={agent.permissionLevel} />
                  {tools.slice(0, 3).map((tool) => (
                    <span key={tool} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {tool}
                    </span>
                  ))}
                  {!tools.length ? (
                    <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                      Local context
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function RoomApprovalsResolver({ roomSlug }: { roomSlug: string }) {
  const { hasMounted, room } = useResolvedRoom(roomSlug);

  if (!hasMounted) return <LoadingRoom />;
  if (!room) return <RoomNotFound />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        room={room}
        title="Approval center"
        description="High-risk actions are never executed automatically. Approve and deny controls stay local in the MVP."
      />
      <RoomApprovalsList roomId={room.id as RoomId} />
    </div>
  );
}

export function RoomWorkflowsResolver({ roomSlug }: { roomSlug: string }) {
  const { hasMounted, room } = useResolvedRoom(roomSlug);

  if (!hasMounted) return <LoadingRoom />;
  if (!room) return <RoomNotFound />;

  const workflows = getRoomWorkflows(room.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        room={room}
        title="Workflow builder"
        description="Read-only MVP workflows show reusable operating sequences. Execution comes later through adapters and approvals."
      />
      {workflows.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-card/45">
          <CardContent className="p-8 text-center">
            <h2 className="text-base font-semibold">No workflows yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              This local room is ready for reusable workflows once the workflow builder moves beyond read-only mock
              sequences.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
