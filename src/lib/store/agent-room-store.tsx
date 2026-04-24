"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getRoomApprovals,
  getRoomEvents,
  getRoomTasks,
  mockAgents,
  mockRooms,
  workspaceId,
} from "@/lib/mock-data";
import type {
  ActionType,
  ActivityEvent,
  ActorType,
  AgentId,
  AgentStatus,
  Approval,
  ApprovalId,
  ApprovalStatus,
  IntegrationId,
  RiskLevel,
  Room,
  RoomId,
  Task,
  TaskId,
  TaskStatus,
} from "@/types";

const STORAGE_KEY = "agent-room:v0.3:runtime-state";
const SEED_TIME = "2026-04-24T17:00:00.000Z";

export type ConsoleMessageKind = "user" | "agent" | "tool" | "approval" | "task" | "system";
export type LiveSourceMode = "live" | "mock";
export type DataMode = "mock" | "hybrid" | "live_read_only";

export interface ConsoleMessage {
  id: string;
  roomId: RoomId;
  kind: ConsoleMessageKind;
  authorName: string;
  authorId?: string;
  agentId?: AgentId;
  integrationId?: IntegrationId;
  approvalId?: ApprovalId;
  taskId?: TaskId;
  title?: string;
  body: string;
  createdAt: string;
}

export interface RoomRuntimeState {
  roomId: RoomId;
  currentRoomObjective: string;
  consoleMessages: ConsoleMessage[];
  localAgentStatuses: Record<string, AgentStatus>;
  localApprovals: Approval[];
  localTasks: Task[];
  localActivityEvents: ActivityEvent[];
  liveActivityEvents: ActivityEvent[];
  liveModes: Partial<Record<"github" | "vercel", LiveSourceMode>>;
  selectedAgentId?: AgentId;
}

interface AgentRoomRuntimeState {
  rooms: Record<string, RoomRuntimeState>;
}

interface ConsoleMessageInput {
  kind: ConsoleMessageKind;
  authorName: string;
  body: string;
  authorId?: string;
  agentId?: AgentId;
  integrationId?: IntegrationId;
  approvalId?: ApprovalId;
  taskId?: TaskId;
  title?: string;
}

interface ActivityEventInput {
  actorType?: ActorType;
  actorId?: string;
  agentId?: AgentId;
  integrationId?: IntegrationId;
  eventType: string;
  title: string;
  summary: string;
  riskLevel?: RiskLevel;
  payload?: Record<string, unknown>;
}

interface ApprovalInput {
  requestedByAgentId: AgentId;
  actionType: ActionType;
  integrationId: IntegrationId;
  summary: string;
  riskLevel: RiskLevel;
  payload?: Record<string, unknown>;
}

interface RiskDetection {
  actionType: ActionType;
  integrationId: IntegrationId;
  riskLevel: RiskLevel;
  summary: string;
}

interface AgentRoomStoreValue {
  getRoomState: (roomId: RoomId) => RoomRuntimeState;
  getDataMode: (roomId: RoomId) => DataMode;
  createConsoleMessage: (roomId: RoomId, message: ConsoleMessageInput) => void;
  addActivityEvent: (roomId: RoomId, event: ActivityEventInput) => void;
  updateAgentStatus: (roomId: RoomId, agentId: AgentId, status: AgentStatus) => void;
  updateTaskStatus: (roomId: RoomId, taskId: TaskId, status: TaskStatus) => void;
  createApproval: (roomId: RoomId, approval: ApprovalInput) => void;
  updateApprovalStatus: (roomId: RoomId, approvalId: ApprovalId, status: ApprovalStatus) => void;
  hydrateLiveActivity: (
    roomId: RoomId,
    events: ActivityEvent[],
    liveModes?: Partial<Record<"github" | "vercel", LiveSourceMode>>,
  ) => void;
  simulateAgentWork: (roomId: RoomId) => void;
  submitRoomInstruction: (roomId: RoomId, instruction: string) => void;
  selectAgent: (roomId: RoomId, agentId: AgentId) => void;
}

const AgentRoomStoreContext = createContext<AgentRoomStoreValue | undefined>(undefined);

const taskStatusOrder: TaskStatus[] = ["backlog", "next", "in_progress", "review", "done"];

function makeId(prefix: string) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function toActivityId(value: string) {
  return value as ActivityEvent["id"];
}

function toApprovalId(value: string) {
  return value as Approval["id"];
}

function nowIso() {
  return new Date().toISOString();
}

function nextTaskStatus(status: TaskStatus): TaskStatus {
  const index = taskStatusOrder.indexOf(status);
  return taskStatusOrder[Math.min(taskStatusOrder.length - 1, Math.max(0, index) + 1)];
}

function sortEvents(events: ActivityEvent[]) {
  return [...events].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function createMessage(roomId: RoomId, input: ConsoleMessageInput, createdAt = nowIso()): ConsoleMessage {
  return {
    id: makeId("message"),
    roomId,
    createdAt,
    ...input,
  };
}

function createActivityEvent(roomId: RoomId, input: ActivityEventInput, createdAt = nowIso()): ActivityEvent {
  return {
    id: toActivityId(makeId("event_local")),
    workspaceId,
    roomId,
    actorType: input.actorType ?? "system",
    actorId: input.actorId as ActivityEvent["actorId"],
    agentId: input.agentId,
    integrationId: input.integrationId,
    eventType: input.eventType,
    title: input.title,
    summary: input.summary,
    riskLevel: input.riskLevel ?? "low",
    payload: {
      localOnly: true,
      mutationsDisabled: true,
      ...(input.payload ?? {}),
    },
    createdAt,
  };
}

function createApprovalRecord(roomId: RoomId, input: ApprovalInput, createdAt = nowIso()): Approval {
  return {
    id: toApprovalId(makeId("approval_local")),
    workspaceId,
    roomId,
    requestedByAgentId: input.requestedByAgentId,
    actionType: input.actionType,
    integrationId: input.integrationId,
    summary: input.summary,
    payload: {
      localOnly: true,
      mutationsDisabled: true,
      ...(input.payload ?? {}),
    },
    riskLevel: input.riskLevel,
    status: "pending",
    requestedAt: createdAt,
  };
}

function seededAgentStatuses(): Record<string, AgentStatus> {
  return Object.fromEntries(mockAgents.map((agent) => [agent.id, agent.status]));
}

function seededMessages(room: Room): ConsoleMessage[] {
  return [
    {
      id: "message_seed_" + room.id + "_system",
      roomId: room.id,
      kind: "system",
      authorName: "Agent Room",
      title: room.name + " console online",
      body: "Live read-only signals can be blended with local room decisions. External mutations remain disabled.",
      createdAt: SEED_TIME,
    },
    {
      id: "message_seed_" + room.id + "_product",
      roomId: room.id,
      kind: "agent",
      authorName: "Product Manager Agent",
      agentId: "agent_product",
      title: "Mission loaded",
      body: room.mission,
      createdAt: SEED_TIME,
    },
    {
      id: "message_seed_" + room.id + "_security",
      roomId: room.id,
      kind: "agent",
      authorName: "Security Agent",
      agentId: "agent_security",
      title: "Approval guardrails active",
      body: "Deploys, merges, billing, environment changes, production work, and deletes create local approvals before anything can run.",
      createdAt: SEED_TIME,
    },
  ];
}

function createRoomRuntime(room: Room): RoomRuntimeState {
  return {
    roomId: room.id,
    currentRoomObjective: room.mission,
    consoleMessages: seededMessages(room),
    localAgentStatuses: seededAgentStatuses(),
    localApprovals: getRoomApprovals(room.id),
    localTasks: getRoomTasks(room.id),
    localActivityEvents: getRoomEvents(room.id),
    liveActivityEvents: [],
    liveModes: {},
    selectedAgentId: "agent_product",
  };
}

function createInitialState(): AgentRoomRuntimeState {
  return {
    rooms: Object.fromEntries(mockRooms.map((room) => [room.id, createRoomRuntime(room)])),
  };
}

function getRoom(roomId: RoomId) {
  return mockRooms.find((room) => room.id === roomId) ?? mockRooms[0];
}

function getRuntime(state: AgentRoomRuntimeState, roomId: RoomId) {
  return state.rooms[roomId] ?? createRoomRuntime(getRoom(roomId));
}

function mergeSavedState(saved: unknown): AgentRoomRuntimeState {
  const initial = createInitialState();
  if (!saved || typeof saved !== "object" || !("rooms" in saved)) return initial;
  const savedRooms = (saved as { rooms?: Record<string, Partial<RoomRuntimeState>> }).rooms ?? {};
  const mergedRooms = { ...initial.rooms };

  for (const room of mockRooms) {
    const savedRoom = savedRooms[room.id];
    if (!savedRoom) continue;
    const initialRoom = mergedRooms[room.id];
    mergedRooms[room.id] = {
      ...initialRoom,
      ...savedRoom,
      consoleMessages: savedRoom.consoleMessages?.length ? savedRoom.consoleMessages : initialRoom.consoleMessages,
      localAgentStatuses: { ...initialRoom.localAgentStatuses, ...(savedRoom.localAgentStatuses ?? {}) },
      localApprovals: savedRoom.localApprovals?.length ? savedRoom.localApprovals : initialRoom.localApprovals,
      localTasks: savedRoom.localTasks?.length ? savedRoom.localTasks : initialRoom.localTasks,
      localActivityEvents: savedRoom.localActivityEvents?.length ? savedRoom.localActivityEvents : initialRoom.localActivityEvents,
      liveActivityEvents: savedRoom.liveActivityEvents ?? [],
      liveModes: savedRoom.liveModes ?? {},
    };
  }

  return { rooms: mergedRooms };
}

function updateRoomState(
  state: AgentRoomRuntimeState,
  roomId: RoomId,
  updater: (roomState: RoomRuntimeState) => RoomRuntimeState,
): AgentRoomRuntimeState {
  const current = getRuntime(state, roomId);
  return {
    rooms: {
      ...state.rooms,
      [roomId]: updater(current),
    },
  };
}

function detectHighRiskInstruction(instruction: string): RiskDetection | undefined {
  const lower = instruction.toLowerCase();
  if (lower.includes("deploy") || lower.includes("production")) {
    return {
      actionType: "deploy_production",
      integrationId: "integration_vercel",
      riskLevel: "critical",
      summary: "Production deployment requires approval before any external deployment can run.",
    };
  }
  if (lower.includes("merge")) {
    return {
      actionType: "merge_pr",
      integrationId: "integration_github",
      riskLevel: "high",
      summary: "Merging code requires approval before GitHub can be changed.",
    };
  }
  if (lower.includes("env")) {
    return {
      actionType: "update_env_vars",
      integrationId: "integration_vercel",
      riskLevel: "critical",
      summary: "Environment variable changes require approval and are not executed in V0.3.",
    };
  }
  if (lower.includes("stripe") || lower.includes("billing")) {
    return {
      actionType: "change_billing",
      integrationId: "integration_stripe",
      riskLevel: "high",
      summary: "Billing and Stripe changes require approval and are not executed in V0.3.",
    };
  }
  if (lower.includes("delete")) {
    return {
      actionType: "delete_user_data",
      integrationId: "integration_supabase",
      riskLevel: "critical",
      summary: "Deleting data requires approval and is blocked from external execution in V0.3.",
    };
  }
  return undefined;
}

function modeForRoom(roomState: RoomRuntimeState): DataMode {
  const github = roomState.liveModes.github;
  const vercel = roomState.liveModes.vercel;
  if (github === "live" && vercel === "live") return "live_read_only";
  if (github === "live" || vercel === "live") return "hybrid";
  return "mock";
}

function latestEvent(roomState: RoomRuntimeState, integrationId: IntegrationId) {
  return sortEvents([...roomState.liveActivityEvents, ...roomState.localActivityEvents]).find(
    (event) => event.integrationId === integrationId,
  );
}

export function AgentRoomStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AgentRoomRuntimeState>(() => {
    if (typeof window === "undefined") return createInitialState();
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? mergeSavedState(JSON.parse(stored)) : createInitialState();
    } catch {
      return createInitialState();
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getRoomState = useCallback((roomId: RoomId) => getRuntime(state, roomId), [state]);
  const getDataMode = useCallback((roomId: RoomId) => modeForRoom(getRuntime(state, roomId)), [state]);

  const createConsoleMessage = useCallback((roomId: RoomId, message: ConsoleMessageInput) => {
    setState((current) =>
      updateRoomState(current, roomId, (roomState) => ({
        ...roomState,
        consoleMessages: [...roomState.consoleMessages, createMessage(roomId, message)].slice(-80),
      })),
    );
  }, []);

  const addActivityEvent = useCallback((roomId: RoomId, event: ActivityEventInput) => {
    setState((current) =>
      updateRoomState(current, roomId, (roomState) => ({
        ...roomState,
        localActivityEvents: sortEvents([createActivityEvent(roomId, event), ...roomState.localActivityEvents]).slice(0, 80),
      })),
    );
  }, []);

  const updateAgentStatus = useCallback((roomId: RoomId, agentId: AgentId, status: AgentStatus) => {
    setState((current) =>
      updateRoomState(current, roomId, (roomState) => ({
        ...roomState,
        localAgentStatuses: {
          ...roomState.localAgentStatuses,
          [agentId]: status,
        },
      })),
    );
  }, []);

  const updateTaskStatus = useCallback((roomId: RoomId, taskId: TaskId, status: TaskStatus) => {
    setState((current) =>
      updateRoomState(current, roomId, (roomState) => {
        const now = nowIso();
        const task = roomState.localTasks.find((item) => item.id === taskId);
        if (!task) return roomState;
        const updatedTask = { ...task, status, updatedAt: now };
        return {
          ...roomState,
          localTasks: roomState.localTasks.map((item) => (item.id === taskId ? updatedTask : item)),
          localActivityEvents: sortEvents([
            createActivityEvent(roomId, {
              actorType: "system",
              eventType: "local_task_moved",
              title: "Task moved",
              summary: task.title + " moved to " + status.replaceAll("_", " ") + ".",
              riskLevel: "low",
              payload: { taskId, status },
            }, now),
            ...roomState.localActivityEvents,
          ]).slice(0, 80),
          consoleMessages: [
            ...roomState.consoleMessages,
            createMessage(roomId, {
              kind: "task",
              authorName: "Agent Room",
              taskId,
              title: "Task moved",
              body: task.title + " is now " + status.replaceAll("_", " ") + ".",
            }, now),
          ].slice(-80),
        };
      }),
    );
  }, []);

  const createApproval = useCallback((roomId: RoomId, approval: ApprovalInput) => {
    setState((current) =>
      updateRoomState(current, roomId, (roomState) => {
        const now = nowIso();
        const approvalRecord = createApprovalRecord(roomId, approval, now);
        return {
          ...roomState,
          localApprovals: [approvalRecord, ...roomState.localApprovals],
          localActivityEvents: sortEvents([
            createActivityEvent(roomId, {
              actorType: "agent",
              agentId: approval.requestedByAgentId,
              actorId: approval.requestedByAgentId,
              integrationId: approval.integrationId,
              eventType: "local_approval_created",
              title: "Approval requested",
              summary: approval.summary,
              riskLevel: approval.riskLevel,
              payload: { approvalId: approvalRecord.id, actionType: approval.actionType },
            }, now),
            ...roomState.localActivityEvents,
          ]).slice(0, 80),
          consoleMessages: [
            ...roomState.consoleMessages,
            createMessage(roomId, {
              kind: "approval",
              authorName: "Security Agent",
              agentId: "agent_security",
              approvalId: approvalRecord.id,
              title: "Approval required",
              body: approval.summary,
            }, now),
          ].slice(-80),
        };
      }),
    );
  }, []);

  const updateApprovalStatus = useCallback((roomId: RoomId, approvalId: ApprovalId, status: ApprovalStatus) => {
    setState((current) =>
      updateRoomState(current, roomId, (roomState) => {
        const now = nowIso();
        const approval = roomState.localApprovals.find((item) => item.id === approvalId);
        if (!approval) return roomState;
        const verb = status === "approved" ? "approved" : status === "denied" ? "denied" : status;
        return {
          ...roomState,
          localApprovals: roomState.localApprovals.map((item) =>
            item.id === approvalId ? { ...item, status, reviewedAt: now } : item,
          ),
          localActivityEvents: sortEvents([
            createActivityEvent(roomId, {
              actorType: "user",
              actorId: "user_kenan",
              integrationId: approval.integrationId,
              eventType: "local_approval_" + status,
              title: "Approval " + verb,
              summary: approval.summary,
              riskLevel: approval.riskLevel,
              payload: { approvalId, actionType: approval.actionType },
            }, now),
            ...roomState.localActivityEvents,
          ]).slice(0, 80),
          consoleMessages: [
            ...roomState.consoleMessages,
            createMessage(roomId, {
              kind: "approval",
              authorName: "Agent Room",
              approvalId,
              title: "Approval " + verb,
              body: "Local approval record " + verb + ". No external mutation was executed.",
            }, now),
          ].slice(-80),
        };
      }),
    );
  }, []);

  const hydrateLiveActivity = useCallback(
    (roomId: RoomId, events: ActivityEvent[], liveModes?: Partial<Record<"github" | "vercel", LiveSourceMode>>) => {
      setState((current) =>
        updateRoomState(current, roomId, (roomState) => {
          const existingIds = new Set(roomState.liveActivityEvents.map((event) => event.id));
          const normalizedEvents = events.map((event) => ({
            ...event,
            roomId,
            payload: {
              ...(event.payload ?? {}),
              readOnly: true,
              hydratedIntoRoom: roomId,
            },
          }));
          const newEvents = normalizedEvents.filter((event) => !existingIds.has(event.id));
          const toolMessages = newEvents.slice(0, 4).map((event) =>
            createMessage(roomId, {
              kind: "tool",
              authorName:
                event.integrationId === "integration_github"
                  ? "GitHub"
                  : event.integrationId === "integration_vercel"
                    ? "Vercel"
                    : "Integration",
              integrationId: event.integrationId,
              title: event.title,
              body: event.summary,
            }, event.createdAt),
          );
          return {
            ...roomState,
            liveModes: {
              ...roomState.liveModes,
              ...(liveModes ?? {}),
            },
            liveActivityEvents: sortEvents([...newEvents, ...roomState.liveActivityEvents]).slice(0, 50),
            consoleMessages: [...roomState.consoleMessages, ...toolMessages].slice(-80),
          };
        }),
      );
    },
    [],
  );

  const simulateAgentWork = useCallback((roomId: RoomId) => {
    setState((current) =>
      updateRoomState(current, roomId, (roomState) => {
        const now = nowIso();
        const nextTask = roomState.localTasks.find((task) => task.status !== "done");
        const updatedTasks = nextTask
          ? roomState.localTasks.map((task) =>
              task.id === nextTask.id ? { ...task, status: nextTaskStatus(task.status), updatedAt: now } : task,
            )
          : roomState.localTasks;
        return {
          ...roomState,
          localAgentStatuses: {
            ...roomState.localAgentStatuses,
            agent_product: "planning",
            agent_engineer: "working",
            agent_qa: "reviewing",
            agent_deployment: "reviewing",
          },
          localTasks: updatedTasks,
          localActivityEvents: sortEvents([
            createActivityEvent(roomId, {
              actorType: "agent",
              actorId: "agent_engineer",
              agentId: "agent_engineer",
              eventType: "local_agent_loop",
              title: "Local agent loop completed",
              summary: nextTask ? "Reviewed " + nextTask.title + " and moved it forward locally." : "Reviewed room context.",
              riskLevel: "low",
            }, now),
            ...roomState.localActivityEvents,
          ]).slice(0, 80),
          consoleMessages: [
            ...roomState.consoleMessages,
            createMessage(roomId, {
              kind: "agent",
              authorName: "Engineer Agent",
              agentId: "agent_engineer",
              title: "Local loop finished",
              body: nextTask
                ? "I moved " + nextTask.title + " to " + nextTaskStatus(nextTask.status).replaceAll("_", " ") + " in local room state."
                : "I reviewed the room context and did not find a movable task.",
            }, now),
          ].slice(-80),
        };
      }),
    );
  }, []);

  const submitRoomInstruction = useCallback((roomId: RoomId, instruction: string) => {
    const trimmed = instruction.trim();
    if (!trimmed) return;

    setState((current) =>
      updateRoomState(current, roomId, (roomState) => {
        const now = nowIso();
        const risk = detectHighRiskInstruction(trimmed);
        const githubEvent = latestEvent(roomState, "integration_github");
        const vercelEvent = latestEvent(roomState, "integration_vercel");
        const nextTask = roomState.localTasks.find((task) => task.status !== "done");
        const approval = risk
          ? createApprovalRecord(roomId, {
              requestedByAgentId: "agent_security",
              actionType: risk.actionType,
              integrationId: risk.integrationId,
              summary: risk.summary,
              riskLevel: risk.riskLevel,
              payload: { instruction: trimmed },
            }, now)
          : undefined;
        const taskStatus = nextTask ? nextTaskStatus(nextTask.status) : undefined;
        const updatedTasks = nextTask && taskStatus
          ? roomState.localTasks.map((task) =>
              task.id === nextTask.id ? { ...task, status: taskStatus, updatedAt: now } : task,
            )
          : roomState.localTasks;
        const messages: ConsoleMessage[] = [
          createMessage(roomId, {
            kind: "user",
            authorName: "You",
            title: "Room instruction",
            body: trimmed,
          }, now),
          createMessage(roomId, {
            kind: "agent",
            authorName: "Product Manager Agent",
            agentId: "agent_product",
            title: "Plan formed",
            body: "I am treating this as the active room objective and splitting it into local task movement, read-only tool review, and approval-gated risk checks.",
          }, now),
          createMessage(roomId, {
            kind: "agent",
            authorName: "Engineer Agent",
            agentId: "agent_engineer",
            title: "GitHub context checked",
            body: githubEvent
              ? "Latest GitHub read-only signal: " + githubEvent.summary
              : "No live GitHub signal is available yet, so I am using the local task board context.",
          }, now),
          createMessage(roomId, {
            kind: "agent",
            authorName: "Deployment Agent",
            agentId: "agent_deployment",
            title: "Vercel context checked",
            body: vercelEvent
              ? "Latest Vercel read-only signal: " + vercelEvent.title + ". " + vercelEvent.summary
              : "No live Vercel signal is available yet, so deployment work stays in local planning mode.",
          }, now),
        ];

        if (approval) {
          messages.push(
            createMessage(roomId, {
              kind: "approval",
              authorName: "Security Agent",
              agentId: "agent_security",
              approvalId: approval.id,
              title: "Approval required",
              body: risk?.summary ?? "High-risk action requires approval.",
            }, now),
          );
        } else {
          messages.push(
            createMessage(roomId, {
              kind: "agent",
              authorName: "QA Agent",
              agentId: "agent_qa",
              title: "Safe local pass",
              body: "This does not match a high-risk action keyword, so I kept the response inside local planning and review state.",
            }, now),
          );
        }

        const activityEvents: ActivityEvent[] = [
          createActivityEvent(roomId, {
            actorType: "user",
            actorId: "user_kenan",
            eventType: "local_instruction_submitted",
            title: "Room instruction submitted",
            summary: trimmed,
            riskLevel: risk?.riskLevel ?? "low",
            payload: { instruction: trimmed },
          }, now),
        ];

        if (nextTask && taskStatus) {
          activityEvents.push(
            createActivityEvent(roomId, {
              actorType: "system",
              eventType: "local_task_moved",
              title: "Task moved",
              summary: nextTask.title + " moved to " + taskStatus.replaceAll("_", " ") + ".",
              riskLevel: "low",
              payload: { taskId: nextTask.id, status: taskStatus },
            }, now),
          );
        }

        if (approval && risk) {
          activityEvents.push(
            createActivityEvent(roomId, {
              actorType: "agent",
              actorId: "agent_security",
              agentId: "agent_security",
              integrationId: risk.integrationId,
              eventType: "local_approval_created",
              title: "Approval requested",
              summary: risk.summary,
              riskLevel: risk.riskLevel,
              payload: { approvalId: approval.id, actionType: risk.actionType },
            }, now),
          );
        }

        return {
          ...roomState,
          currentRoomObjective: trimmed,
          localAgentStatuses: {
            ...roomState.localAgentStatuses,
            agent_product: "planning",
            agent_engineer: risk ? "reviewing" : "working",
            agent_qa: "reviewing",
            agent_security: risk ? "waiting_for_approval" : "reviewing",
            agent_deployment: risk ? "waiting_for_approval" : "reviewing",
          },
          localApprovals: approval ? [approval, ...roomState.localApprovals] : roomState.localApprovals,
          localTasks: updatedTasks,
          localActivityEvents: sortEvents([...activityEvents, ...roomState.localActivityEvents]).slice(0, 80),
          consoleMessages: [...roomState.consoleMessages, ...messages].slice(-80),
        };
      }),
    );
  }, []);

  const selectAgent = useCallback((roomId: RoomId, agentId: AgentId) => {
    setState((current) =>
      updateRoomState(current, roomId, (roomState) => ({
        ...roomState,
        selectedAgentId: agentId,
      })),
    );
  }, []);

  const value = useMemo<AgentRoomStoreValue>(
    () => ({
      getRoomState,
      getDataMode,
      createConsoleMessage,
      addActivityEvent,
      updateAgentStatus,
      updateTaskStatus,
      createApproval,
      updateApprovalStatus,
      hydrateLiveActivity,
      simulateAgentWork,
      submitRoomInstruction,
      selectAgent,
    }),
    [
      addActivityEvent,
      createApproval,
      createConsoleMessage,
      getDataMode,
      getRoomState,
      hydrateLiveActivity,
      selectAgent,
      simulateAgentWork,
      submitRoomInstruction,
      updateAgentStatus,
      updateApprovalStatus,
      updateTaskStatus,
    ],
  );

  return <AgentRoomStoreContext.Provider value={value}>{children}</AgentRoomStoreContext.Provider>;
}

export function useAgentRoomStore() {
  const context = useContext(AgentRoomStoreContext);
  if (!context) throw new Error("useAgentRoomStore must be used inside AgentRoomStoreProvider");
  return context;
}
