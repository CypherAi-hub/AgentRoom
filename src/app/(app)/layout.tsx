import { AppShell } from "@/components/shell/app-shell";
import { getAppShellSession } from "@/lib/supabase/app-session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppShellSession();
  return <AppShell session={session}>{children}</AppShell>;
}
