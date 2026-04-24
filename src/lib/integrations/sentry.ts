import { createMockAdapter } from "@/lib/integrations/mock";
export const sentryAdapter = createMockAdapter({ id: "sentry", name: "Sentry", category: "monitoring", permissionLevel: "draft_only" });
