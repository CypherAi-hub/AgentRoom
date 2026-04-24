import { createMockAdapter } from "@/lib/integrations/mock";
export const localAgentFeedAdapter = createMockAdapter({ id: "local_agent_feed", name: "Local Agent Feed", category: "local", permissionLevel: "read_only" });
