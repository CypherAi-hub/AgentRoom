import { createMockAdapter } from "@/lib/integrations/mock";
export const githubAdapter = createMockAdapter({ id: "github", name: "GitHub", category: "code", permissionLevel: "execute_with_approval" });
