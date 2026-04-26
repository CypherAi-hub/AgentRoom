/**
 * (app) route group — authenticated app shell.
 *
 * Routes that render INSIDE this shell (sidebar + topbar via <AppShell>):
 *   - /dashboard
 *   - /rooms        (and /rooms/[id], /rooms/new, etc.)
 *   - /agents
 *   - /runs
 *   - /integrations
 *   - /settings
 *
 * Routes that live OUTSIDE this shell (own layouts):
 *   - /             (marketing root, src/app/page.tsx)
 *   - /login        (src/app/login)
 *   - /signup       (src/app/signup)
 *   - /pricing      (src/app/pricing)
 *   - /billing      (src/app/billing — top-level, not inside (app))
 *   - /dev/sandbox-test
 *   - /auth/callback, /auth/logout
 *   - /api/*        (route handlers, no UI)
 *
 * If you add a route that should share the shell chrome, place it under
 * src/app/(app)/<route>. Otherwise put it at the top level of src/app.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { ensureProfile } from "@/lib/billing/credits";
import { getAppShellSession } from "@/lib/supabase/app-session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppShellSession();

  // P1 #1 — auth guard at the layout level. Pages still redirect individually,
  // but this is the choke-point so a new (app)/* route can't accidentally leak
  // server-rendered content to an unauthenticated user.
  if (!session.user) {
    const requestHeaders = await headers();
    const pathname =
      requestHeaders.get("x-invoke-path") ||
      requestHeaders.get("x-pathname") ||
      requestHeaders.get("next-url") ||
      "/dashboard";
    const safePath = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/dashboard";
    redirect(`/login?next=${encodeURIComponent(safePath)}`);
  }

  // P1 #4 — idempotent profile bootstrap. If the auth.users -> profiles trigger
  // missed (older accounts, edge cases), seed a default profile so dashboard /
  // credit-gated routes don't render a blank state.
  await ensureProfile(session.user.id, session.user.email);

  return <AppShell session={session}>{children}</AppShell>;
}
