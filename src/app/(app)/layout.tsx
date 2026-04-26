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
import { AppShell } from "@/components/shell/app-shell";
import { getAppShellSession } from "@/lib/supabase/app-session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppShellSession();
  return <AppShell session={session}>{children}</AppShell>;
}
