import { createMockAdapter } from "@/lib/integrations/mock";
export const vercelAdapter = createMockAdapter({ id: "vercel", name: "Vercel", category: "deployment", permissionLevel: "execute_with_approval" });
