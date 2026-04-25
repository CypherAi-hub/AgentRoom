import { Github, Globe, MessageSquare, Mail, Sparkles, Database, Bug } from "lucide-react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COMING_SOON = [
  { name: "GitHub", description: "Pull repos into the sandbox and open PRs.", icon: Github },
  { name: "Slack", description: "Notify a channel when runs finish.", icon: MessageSquare },
  { name: "Linear", description: "Open tickets from agent findings.", icon: Bug },
  { name: "Vercel", description: "Connect deployments and preview URLs.", icon: Globe },
  { name: "Resend", description: "Email summaries when long runs complete.", icon: Mail },
  { name: "Supabase", description: "Connect your DB for migrations and audits.", icon: Database },
];

export default async function IntegrationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/integrations");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Agent Room to the tools your work already lives in. Real wiring lands in a future phase.
        </p>
      </header>

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {COMING_SOON.map((item) => (
          <li key={item.name} className="rounded-lg border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md border bg-secondary">
                <item.icon className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{item.name}</div>
                <div className="text-xs text-muted-foreground">Integration</div>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <Sparkles className="size-3" aria-hidden="true" />
                Soon
              </span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
