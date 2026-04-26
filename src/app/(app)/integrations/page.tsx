import Link from "next/link";
import { redirect } from "next/navigation";
import { Bug, CheckCircle2, Database, Github, Globe, Mail, MessageSquare, Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/dashboard-shared";
import { getUserIntegrations } from "@/lib/data/integrations";
import type { IntegrationProvider, UserIntegrationPublic } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type Card = {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: typeof Github;
  /** Provider is wired up (UI + routes). Other providers stay "Soon". */
  available: boolean;
  /** Aspirational ETA shown under the SOON pill on roadmap providers. */
  eta?: string;
};

const CARDS: Card[] = [
  { provider: "github", name: "GitHub", description: "Connect your repos so agents can read issues and code.", icon: Github, available: true },
  { provider: "slack", name: "Slack", description: "Notify a channel when long runs finish.", icon: MessageSquare, available: false, eta: "Coming Q3 2026" },
  { provider: "linear", name: "Linear", description: "Open tickets from agent findings.", icon: Bug, available: false, eta: "Coming Q3 2026" },
  { provider: "vercel", name: "Vercel", description: "Connect deployments and preview URLs.", icon: Globe, available: false, eta: "Coming Q4 2026" },
  { provider: "resend", name: "Resend", description: "Email summaries when long runs complete.", icon: Mail, available: false, eta: "Coming Q4 2026" },
  { provider: "supabase", name: "Supabase", description: "Connect your DB for migrations and audits.", icon: Database, available: false, eta: "Coming Q4 2026" },
];

const SUPPORT_EMAIL = "hello@agentroom.app";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function bannerFromParams(params: Record<string, string | string[] | undefined>) {
  const error = typeof params.error === "string" ? params.error : null;
  const disconnected = typeof params.disconnected === "string" ? params.disconnected : null;

  if (error?.startsWith("github_")) {
    const code = error.slice("github_".length);
    const message =
      code === "state_mismatch"
        ? "Sign-in handshake didn't match. Try connecting GitHub again."
        : code === "not_configured"
          ? "GitHub integration isn't fully configured yet. Reach out to support."
          : code === "missing_params"
            ? "GitHub didn't return the expected response. Try again."
            : code === "token_exchange_failed"
              ? "Couldn't exchange the GitHub code for a token. Try again."
              : `GitHub connect failed (${code}). Try again or contact support.`;
    return { kind: "error" as const, message };
  }

  if (disconnected === "github") {
    return { kind: "info" as const, message: "GitHub disconnected. You can reconnect anytime." };
  }

  return null;
}

export default async function IntegrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/integrations");

  const params = await searchParams;
  const banner = bannerFromParams(params);

  const integrations = await getUserIntegrations(user.id).catch(() => [] as UserIntegrationPublic[]);
  const connected = new Map(integrations.map((i) => [i.provider, i] as const));

  const connectedCards = CARDS.filter((c) => connected.has(c.provider));
  const otherCards = CARDS.filter((c) => !connected.has(c.provider));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Agent Room to the tools your work already lives in.
        </p>
      </header>

      {banner ? (
        <div
          role={banner.kind === "error" ? "alert" : "status"}
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: banner.kind === "error" ? "rgba(226,75,74,0.35)" : "var(--border-subtle)",
            background: banner.kind === "error" ? "rgba(226,75,74,0.08)" : "var(--bg-surface)",
            color: banner.kind === "error" ? "var(--status-error)" : "var(--text-secondary)",
          }}
        >
          {banner.message}
        </div>
      ) : null}

      {connectedCards.length === 0 ? (
        <EmptyState
          emphasize
          title="No tools connected yet."
          description="Connect GitHub so your agents can read your repos. More integrations are on the roadmap."
          cta={{ label: "Connect GitHub", href: "/api/integrations/github/connect" }}
          secondary={{ label: "Learn more", href: "/agents" }}
        />
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Connected</h2>
          <ul className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {connectedCards.map((card) => {
              const integration = connected.get(card.provider)!;
              return (
                <li key={card.provider} className="rounded-lg border bg-card p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-md border bg-secondary">
                      <card.icon className="size-5 text-text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{card.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {integration.externalAccountLogin ? `@${integration.externalAccountLogin}` : "Connected"}
                      </div>
                    </div>
                    <span
                      className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{
                        borderColor: "rgba(62,233,140,0.35)",
                        background: "rgba(62,233,140,0.08)",
                        color: "var(--accent-hero)",
                      }}
                    >
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      Connected
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{card.description}</p>
                  <div className="mt-4">
                    <Link
                      href={`/integrations/${card.provider}`}
                      className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-secondary"
                    >
                      Manage
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {connectedCards.length === 0 ? "Available" : "More integrations"}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {otherCards.map((card) => (
            <li key={card.provider} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid size-10 place-items-center rounded-md border bg-secondary">
                  <card.icon className="size-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{card.name}</div>
                  <div className="text-xs text-muted-foreground">Integration</div>
                </div>
                {card.available ? null : (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <Sparkles className="size-3" aria-hidden="true" />
                    Soon
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{card.description}</p>
              {card.available ? (
                <div className="mt-4">
                  <Link
                    href={`/api/integrations/${card.provider}/connect`}
                    className="inline-flex h-9 items-center rounded-md bg-accent-hero px-3 text-sm font-semibold text-accent-hero-fg hover:opacity-90"
                  >
                    Connect {card.name}
                  </Link>
                </div>
              ) : card.eta ? (
                <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-text-muted">{card.eta}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <footer className="rounded-md border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-secondary">
        Need something else?{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-text-primary underline-offset-2 hover:underline"
        >
          Email us
        </a>
        {" "}— we&apos;ll prioritize based on demand.
      </footer>
    </div>
  );
}
