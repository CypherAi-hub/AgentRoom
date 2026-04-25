export type PermissionLevel = "read_only" | "suggest_only" | "draft_only" | "execute_with_approval" | "execute_auto";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type RoomStatus = "active" | "planning" | "paused" | "archived";
export type AgentStatus = "idle" | "thinking" | "planning" | "working" | "reviewing" | "waiting_for_approval" | "blocked" | "done";
export type TaskStatus = "backlog" | "next" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type IntegrationStatus = "connected" | "disconnected" | "needs_setup" | "error";
export type IntegrationHealth = "healthy" | "degraded" | "failing" | "unknown";
export type IntegrationPhase = "phase_1" | "phase_2" | "phase_3";
export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";
export type AgentRunStatus = "queued" | "running" | "blocked" | "completed" | "failed" | "cancelled";
export type RunLogLevel = "debug" | "info" | "warn" | "error";
export type ToolCallStatus = "queued" | "running" | "succeeded" | "failed" | "blocked" | "approval_required";
export type WorkflowStatus = "active" | "draft" | "paused";
export type ActorType = "user" | "agent" | "integration" | "system";
export type IntegrationCategory = "code" | "deployment" | "database" | "payments" | "monitoring" | "project_management" | "docs" | "design" | "marketing" | "analytics" | "infrastructure" | "local";
export type IntegrationKey = "github" | "vercel" | "supabase" | "stripe" | "sentry" | "linear" | "notion" | "figma" | "canva" | "jam" | "amplitude" | "cloudflare" | "local_agent_feed";
export type ActionType = "read_activity" | "sync" | "create_task" | "create_draft" | "deploy_preview" | "deploy_production" | "merge_pr" | "delete_database_rows" | "change_dns" | "create_stripe_product" | "send_email" | "update_env_vars" | "modify_auth_settings" | "change_billing" | "delete_user_data";
export type UserId = `user_${string}`; export type WorkspaceId = `workspace_${string}`; export type RoomId = `room_${string}`; export type AgentId = `agent_${string}`; export type IntegrationId = `integration_${string}`; export type TaskId = `task_${string}`; export type WorkflowId = `workflow_${string}`; export type WorkflowStepId = `workflow_step_${string}`; export type ActivityEventId = `event_${string}`; export type ApprovalId = `approval_${string}`; export type AgentRunId = `run_${string}`; export type RunLogId = `run_log_${string}`; export type ToolCallId = `tool_call_${string}`; export type AgentMemoryId = `memory_${string}`; export type AuditLogId = `audit_${string}`;
export interface SuggestedAction { id: string; label: string; description: string; actionType: ActionType; riskLevel: RiskLevel; }
export interface AgentOutput { id: string; title: string; summary: string; createdAt: string; }
export interface User { id: UserId; email: string; displayName: string; avatarUrl?: string; createdAt: string; updatedAt: string; }
export interface Room { id: RoomId; workspaceId: WorkspaceId; name: string; slug: string; mission: string; status: RoomStatus; accentColor: string; launchProgress: number; ownerUserId: UserId; createdAt: string; updatedAt: string; }
export interface Agent { id: AgentId; workspaceId: WorkspaceId; name: string; role: string; description: string; status: AgentStatus; rolePrompt: string; integrationIds: IntegrationId[]; permissionLevel: PermissionLevel; currentTaskId?: TaskId; memorySummary: string; suggestedActions: SuggestedAction[]; recentActivityEventIds: ActivityEventId[]; outputHistory: AgentOutput[]; createdAt: string; }
export interface RoomAgent { id: string; roomId: RoomId; agentId: AgentId; status: AgentStatus; currentTaskId?: TaskId; permissionOverride?: PermissionLevel; memorySummary: string; }
export interface Integration { id: IntegrationId; key: IntegrationKey; name: string; category: IntegrationCategory; phase: IntegrationPhase; status: IntegrationStatus; health: IntegrationHealth; permissionLevel: PermissionLevel; lastSyncedAt?: string; capabilities: string[]; highRiskActions: ActionType[]; errorMessage?: string; }
export interface RoomIntegration { id: string; roomId: RoomId; integrationId: IntegrationId; status: IntegrationStatus; health: IntegrationHealth; lastSyncedAt?: string; }
export interface Task { id: TaskId; roomId: RoomId; title: string; description: string; status: TaskStatus; priority: TaskPriority; dueDate?: string; assignedAgentId?: AgentId; integrationIds: IntegrationId[]; externalLinks: { label: string; href: string; integrationId?: IntegrationId }[]; createdAt: string; updatedAt: string; }
export interface Workflow { id: WorkflowId; roomId: RoomId; name: string; description: string; status: WorkflowStatus; triggerType: "manual" | "scheduled" | "webhook"; stepIds: WorkflowStepId[]; createdAt: string; }
export interface WorkflowStep { id: WorkflowStepId; workflowId: WorkflowId; position: number; name: string; actionType: ActionType; integrationId?: IntegrationId; requiresApproval: boolean; expectedOutput: string; }
export interface ActivityEvent { id: ActivityEventId; workspaceId: WorkspaceId; roomId: RoomId; actorType: ActorType; actorId?: UserId | AgentId | IntegrationId; agentId?: AgentId; integrationId?: IntegrationId; eventType: string; title: string; summary: string; riskLevel: RiskLevel; payload?: Record<string, unknown>; createdAt: string; }
export interface Approval { id: ApprovalId; workspaceId: WorkspaceId; roomId: RoomId; requestedByAgentId: AgentId; actionType: ActionType; integrationId: IntegrationId; summary: string; payload: Record<string, unknown>; riskLevel: RiskLevel; status: ApprovalStatus; requestedAt: string; reviewedAt?: string; }
export interface AgentRun { id: AgentRunId; workspaceId: WorkspaceId; roomId: RoomId; agentId: AgentId; taskId?: TaskId; approvalId?: ApprovalId; status: AgentRunStatus; command: string; input: Record<string, unknown>; output?: string; error?: string; startedAt?: string; completedAt?: string; createdAt: string; updatedAt: string; }
export interface RunLog { id: RunLogId; workspaceId: WorkspaceId; runId: AgentRunId; level: RunLogLevel; message: string; metadata: Record<string, unknown>; createdAt: string; }
export interface ToolCall { id: ToolCallId; workspaceId: WorkspaceId; runId: AgentRunId; integrationId: IntegrationId; callName: string; status: ToolCallStatus; input: Record<string, unknown>; output: Record<string, unknown>; error?: string; startedAt?: string; completedAt?: string; createdAt: string; updatedAt: string; }
export interface AgentMemory { id: AgentMemoryId; workspaceId: WorkspaceId; roomId?: RoomId; agentId: AgentId; scope: "workspace" | "room" | "task"; key: string; value: Record<string, unknown>; source: string; createdAt: string; }
export interface AuditLog { id: AuditLogId; workspaceId: WorkspaceId; actorUserId?: UserId; actorAgentId?: AgentId; action: string; targetType: string; targetId: string; payload: Record<string, unknown>; createdAt: string; }
export interface DashboardMetric { label: string; value: string; detail: string; trend: "up" | "down" | "flat"; }
export interface IntegrationAction { type: ActionType; integrationKey: IntegrationKey; roomId: RoomId; requestedByAgentId?: AgentId; summary: string; payload?: Record<string, unknown>; riskLevel?: RiskLevel; }
export interface IntegrationTaskInput { roomId: RoomId; title: string; description: string; priority: TaskPriority; assignedAgentId?: AgentId; externalMetadata?: Record<string, unknown>; }
export interface PermissionDecision { allowed: boolean; requiresApproval: boolean; riskLevel: RiskLevel; reason: string; }
export interface IntegrationResult { ok: boolean; status: "executed" | "drafted" | "approval_required" | "blocked" | "failed"; message: string; activityEvents?: ActivityEvent[]; approvalRequest?: Omit<Approval, "id" | "requestedAt" | "status">; data?: Record<string, unknown>; error?: string; }
