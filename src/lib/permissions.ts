import type { ActionType, Approval, IntegrationAction, PermissionDecision, PermissionLevel, RiskLevel } from "@/types";
import { workspaceId } from "@/lib/mock-data";
export const permissionRank: Record<PermissionLevel, number> = { read_only: 0, suggest_only: 1, draft_only: 2, execute_with_approval: 3, execute_auto: 4 };
export const HIGH_RISK_ACTIONS = new Set<ActionType>(["deploy_production", "merge_pr", "delete_database_rows", "change_dns", "create_stripe_product", "send_email", "update_env_vars", "modify_auth_settings", "change_billing", "delete_user_data"]);
export function getActionRiskLevel(action: IntegrationAction): RiskLevel { if (action.riskLevel) return action.riskLevel; if (HIGH_RISK_ACTIONS.has(action.type)) return ["delete_database_rows", "change_dns", "deploy_production", "update_env_vars", "modify_auth_settings"].includes(action.type) ? "critical" : "high"; return action.type === "deploy_preview" || action.type === "create_task" || action.type === "create_draft" ? "medium" : "low"; }
export function evaluatePermission(action: IntegrationAction, permissionLevel: PermissionLevel): PermissionDecision {
  const riskLevel = getActionRiskLevel(action);
  if (HIGH_RISK_ACTIONS.has(action.type) || riskLevel === "high" || riskLevel === "critical") return { allowed: false, requiresApproval: true, riskLevel, reason: "High-risk actions always require user approval before execution." };
  if (permissionLevel === "read_only") { const allowed = action.type === "read_activity" || action.type === "sync"; return { allowed, requiresApproval: false, riskLevel, reason: allowed ? "Read-only action allowed." : "Read-only permission cannot create or execute actions." }; }
  if (permissionLevel === "suggest_only") return { allowed: false, requiresApproval: true, riskLevel, reason: "Suggest-only agents can propose actions but cannot execute them." };
  if (permissionLevel === "draft_only") { const allowed = ["create_draft", "create_task", "read_activity", "sync"].includes(action.type); return { allowed, requiresApproval: !allowed, riskLevel, reason: allowed ? "Draft-safe action allowed." : "Draft-only agents cannot perform external side effects." }; }
  return { allowed: true, requiresApproval: false, riskLevel, reason: "Low-risk action can execute in mock mode." };
}
export function createApprovalFromAction(action: IntegrationAction, decision: PermissionDecision): Omit<Approval, "id" | "requestedAt" | "status"> { return { workspaceId, roomId: action.roomId, requestedByAgentId: action.requestedByAgentId ?? "agent_product", actionType: action.type, integrationId: `integration_${action.integrationKey}`, summary: action.summary, payload: action.payload ?? {}, riskLevel: decision.riskLevel }; }
