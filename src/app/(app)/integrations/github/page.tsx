import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, GitFork, Github, Lock, Star } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getUserIntegration,
  getUserIntegrationToken,
  markIntegrationUsed,
} from "@/lib/data/integrations";

export const dynamic = "force-dynamic";

const REPOS_URL = "https://api.github.com/user/repos?per_page=20&sort=updated";

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
};

type RepoFetch =
  | { kind: "ok"; repos: GitHubRepo[]; remaining: number; reset: Date | null; total: number }
  | { kind: "rate_limited"; reset: Date | null }
  | { kind: "auth_failed" }
  | { kind: "error"; message: string };

async function fetchRepos(token: string): Promise<RepoFetch> {
  let res: Response;
  try {
    res = await fetch(REPOS_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : "Network error" };
  }

  const remaining = Number(res.headers.get("x-ratelimit-remaining") ?? "");
  const resetEpoch = Number(res.headers.get("x-ratelimit-reset") ?? "");
  const reset = Number.isFinite(resetEpoch) && resetEpoch > 0 ? new Date(resetEpoch * 1000) : null;

  if (res.status === 401) {
    return { kind: "auth_failed" };
  }
  if (res.status === 403 && Number.isFinite(remaining) && remaining === 0) {
    return { kind: "rate_limited", reset };
  }
  if (!res.ok) {
    return { kind: "error", message: `GitHub returned ${res.status}` };
  }

  const repos = (await res.json()) as GitHubRepo[];
  return {
    kind: "ok",
    repos,
    remaining: Number.isFinite(remaining) ? remaining : 0,
    reset,
    total: repos.length,
  };
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function relative(value: string) {
  try {
    const ms = Date.now() - new Date(value).getTime();
    const min = Math.round(ms / 60000);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.round(hr / 24);
    if (day < 30) return `${day}d ago`;
    const mo = Math.round(day / 30);
    if (mo < 12) return `${mo}mo ago`;
    return `${Math.round(mo / 12)}y ago`;
  } catch {
    return formatDate(value);
  }
}

export default async function GithubIntegrationDetailPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/integrations/github");

  const integration = await getUserIntegration(user.id, "github").catch(() => null);
  if (!integration) {
    redirect("/integrations");
  }

  const token = await getUserIntegrationToken(user.id, "github");
  const repoResult: RepoFetch = token
    ? await fetchRepos(token)
    : { kind: "error", message: "No token on file." };

  if (repoResult.kind === "ok") {
    markIntegrationUsed(user.id, "github").catch(() => {});
  }

  const login = integration.externalAccountLogin;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-border-subtle pb-6">
        <Link href="/integrations" className="inline-flex w-fit items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary">
          <span aria-hidden="true">←</span> Integrations
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md border bg-secondary">
            <Github className="size-5 text-text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">GitHub</h1>
            <p className="text-sm text-muted-foreground">
              {login ? <>Connected as <span className="font-mono">@{login}</span></> : "Connected"}
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailRow label="Account" value={login ? `@${login}` : "—"} />
        <DetailRow label="Connected" value={formatDate(integration.connectedAt)} />
        <DetailRow
          label="Scopes"
          value={integration.scopes.length ? integration.scopes.join(", ") : "—"}
          mono
        />
      </section>

      <section className="flex flex-col gap-4">
        <header className="flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold">Your repositories</h2>
          {repoResult.kind === "ok" ? (
            <span className="text-xs text-text-muted">
              Showing {repoResult.total} (sorted by recently updated)
            </span>
          ) : null}
        </header>

        {repoResult.kind === "ok" ? (
          repoResult.repos.length === 0 ? (
            <p className="rounded-md border border-border-subtle bg-bg-surface p-5 text-sm text-text-secondary">
              No repositories visible with your current scopes.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {repoResult.repos.map((repo) => (
                <li
                  key={repo.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border-subtle bg-bg-surface p-4"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary hover:underline"
                    >
                      <span className="font-mono">{repo.full_name}</span>
                      <ArrowUpRight className="size-3.5 text-text-muted" aria-hidden="true" />
                    </a>
                    {repo.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{repo.description}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                      {repo.language ? <span className="font-mono">{repo.language}</span> : null}
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3" aria-hidden="true" />
                        {repo.stargazers_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GitFork className="size-3" aria-hidden="true" />
                        {repo.forks_count}
                      </span>
                      <span>updated {relative(repo.updated_at)}</span>
                    </div>
                  </div>
                  {repo.private ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]"
                      style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
                    >
                      <Lock className="size-3" aria-hidden="true" />
                      Private
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : repoResult.kind === "rate_limited" ? (
          <p className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: "rgba(245,181,68,0.35)", background: "rgba(245,181,68,0.08)", color: "var(--status-warn)" }}>
            GitHub rate limit reached.{" "}
            {repoResult.reset ? <>Resets at {repoResult.reset.toLocaleTimeString()}.</> : "Try again shortly."}
          </p>
        ) : repoResult.kind === "auth_failed" ? (
          <p className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: "rgba(226,75,74,0.35)", background: "rgba(226,75,74,0.08)", color: "var(--status-error)" }}>
            GitHub rejected the stored token. Disconnect and reconnect to refresh authorization.
          </p>
        ) : (
          <p className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: "rgba(226,75,74,0.35)", background: "rgba(226,75,74,0.08)", color: "var(--status-error)" }}>
            Couldn&apos;t load repositories: {repoResult.message}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border-subtle bg-bg-surface p-5">
        <div>
          <h2 className="text-base font-semibold">Disconnect</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Disconnect GitHub? Your agents will lose access to your repositories. You can reconnect anytime.
          </p>
        </div>
        <form action="/api/integrations/github/disconnect" method="post" className="w-fit">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
            style={{ borderColor: "rgba(226,75,74,0.35)", color: "var(--status-error)" }}
          >
            Disconnect GitHub
          </button>
        </form>
      </section>
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className={`mt-1.5 text-sm text-text-primary ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
