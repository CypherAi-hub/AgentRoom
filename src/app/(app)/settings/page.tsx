import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, plan, credits, created_at")
    .eq("id", user.id)
    .maybeSingle<{ email: string | null; plan: string | null; credits: number | null; created_at: string | null }>();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account and billing essentials.</p>
      </header>

      <section className="rounded-lg border bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Account</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm">{profile?.email ?? user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Plan</dt>
            <dd className="mt-1 text-sm uppercase">{profile?.plan ?? "free"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Credits</dt>
            <dd className="mt-1 text-sm">{typeof profile?.credits === "number" ? profile.credits : 0}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">User ID</dt>
            <dd className="mt-1 break-all font-mono text-xs">{user.id}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
