import { mockActivityEvents } from "@/lib/mock-data";
import { createApprovalFromAction, evaluatePermission } from "@/lib/permissions";
import type { IntegrationAdapter } from "@/lib/integrations/types";
import type { ActivityEvent, IntegrationAction, IntegrationCategory, IntegrationKey, IntegrationResult, IntegrationStatus, PermissionLevel } from "@/types";
export function createMockAdapter(config: { id: IntegrationKey; name: string; category: IntegrationCategory; status?: IntegrationStatus; permissionLevel?: PermissionLevel }): IntegrationAdapter {
  const permissionLevel = config.permissionLevel ?? "execute_with_approval";
  const events = () => mockActivityEvents.filter((event) => event.integrationId === `integration_${config.id}`);
  async function executeAction(action: IntegrationAction): Promise<IntegrationResult> {
    const decision = evaluatePermission(action, permissionLevel);
    if (decision.requiresApproval) return { ok: false, status: "approval_required", message: decision.reason, approvalRequest: createApprovalFromAction(action, decision) };
    if (!decision.allowed) return { ok: false, status: "blocked", message: decision.reason };
    const activityEvents: ActivityEvent[] = [{ id: `event_mock_${config.id}_${Date.now()}`, workspaceId: "workspace_agent_room", roomId: action.roomId, actorType: "integration", actorId: `integration_${config.id}`, integrationId: `integration_${config.id}`, agentId: action.requestedByAgentId, eventType: action.type, title: `${config.name} mock action executed`, summary: action.summary, riskLevel: decision.riskLevel, payload: action.payload, createdAt: new Date().toISOString() }];
    return { ok: true, status: action.type === "create_draft" || action.type === "create_task" ? "drafted" : "executed", message: "Mock adapter executed without external side effects.", activityEvents };
  }
  return { id: config.id, name: config.name, category: config.category, connect: async () => undefined, disconnect: async () => undefined, getStatus: async () => config.status ?? "connected", sync: async () => events(), getActivity: async () => events(), createTask: async (input) => ({ ok: true, status: "drafted", message: "Mock task draft created.", data: { input } }), executeAction, validatePermissions: async (action, permission) => evaluatePermission(action, permission) };
}
