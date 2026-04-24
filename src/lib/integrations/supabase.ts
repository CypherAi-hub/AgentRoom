import { createMockAdapter } from "@/lib/integrations/mock";
export const supabaseAdapter = createMockAdapter({ id: "supabase", name: "Supabase", category: "database", permissionLevel: "execute_with_approval" });
