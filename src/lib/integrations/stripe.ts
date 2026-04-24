import { createMockAdapter } from "@/lib/integrations/mock";
export const stripeAdapter = createMockAdapter({ id: "stripe", name: "Stripe", category: "payments", permissionLevel: "execute_with_approval" });
