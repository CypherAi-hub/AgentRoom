import { mockActivityEvents, workspaceId } from "@/lib/mock-data";
import { createApprovalFromAction, evaluatePermission } from "@/lib/permissions";
import type { IntegrationAdapter } from "@/lib/integrations/types";
import type { ActivityEvent, IntegrationAction, IntegrationKey, IntegrationResult, IntegrationStatus, PermissionDecision, PermissionLevel, RiskLevel } from "@/types";

type EnvSource = Record<string, string | undefined>;
type HybridMode = "live" | "mock";
type HybridHealth = "healthy" | "degraded" | "failing" | "unknown";
type FallbackReason = "forced_mock" | "missing_env" | "read_failed";

export interface HybridStatus {
  key: "github" | "vercel";
  name: string;
  mode: HybridMode;
  status: IntegrationStatus;
  health: HybridHealth;
  readOnly: true;
  configuredTargets: number;
  source: "live_api" | "mock_data";
  message: string;
  fallbackReason?: FallbackReason;
  lastSyncedAt?: string;
}

export interface HybridActivityResponse {
  integration: "github" | "vercel";
  mode: HybridMode;
  readOnly: true;
  source: "live_api" | "mock_data";
  generatedAt: string;
  events: ActivityEvent[];
  fallback?: {
    used: boolean;
    reason: FallbackReason;
    message: string;
  };
}

interface HybridOptions {
  env?: EnvSource;
  forceMock?: boolean;
}

interface GitHubTarget {
  owner: string;
  repo: string;
}

interface VercelConfig {
  token?: string;
  teamId?: string;
  projectIds: string[];
}

interface FetchJsonResult<T> {
  ok: boolean;
  status: number;
  data?: T;
}

const roomId = "room_fofit";
const githubIntegrationId = "integration_github";
const vercelIntegrationId = "integration_vercel";
const readOnlyPermission: PermissionLevel = "read_only";

function value(env: EnvSource, key: string): string | undefined {
  const raw = env[key];
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
}

function splitList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getGitHubConfig(env: EnvSource = process.env) {
  const token = value(env, "GITHUB_TOKEN") ?? value(env, "GH_TOKEN");
  const owner = value(env, "GITHUB_OWNER") ?? value(env, "GITHUB_REPO_OWNER");
  const rawRepos = [
    ...splitList(value(env, "GITHUB_REPOSITORY")),
    ...splitList(value(env, "GITHUB_REPOS")),
    ...splitList(value(env, "GITHUB_REPO")),
  ];
  const targets = rawRepos
    .map((entry): GitHubTarget | undefined => {
      if (entry.includes("/")) {
        const [targetOwner, targetRepo] = entry.split("/");
        return targetOwner && targetRepo ? { owner: targetOwner, repo: targetRepo } : undefined;
      }
      return owner ? { owner, repo: entry } : undefined;
    })
    .filter((target): target is GitHubTarget => Boolean(target));
  return { token, targets };
}

function getVercelConfig(env: EnvSource = process.env): VercelConfig {
  return {
    token: value(env, "VERCEL_TOKEN"),
    teamId: value(env, "VERCEL_TEAM_ID"),
    projectIds: [
      ...splitList(value(env, "VERCEL_PROJECT_IDS")),
      ...splitList(value(env, "VERCEL_PROJECT_ID")),
      ...splitList(value(env, "VERCEL_PROJECT_NAME")),
    ],
  };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "User-Agent": "Agent-Room-MVP",
  };
}

async function fetchJson<T>(url: string, token: string): Promise<FetchJsonResult<T>> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: authHeaders(token),
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, status: response.status, data: (await response.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

function mockEventsFor(key: IntegrationKey): ActivityEvent[] {
  return mockActivityEvents
    .filter((event) => event.integrationId === `integration_${key}`)
    .map((event) => ({
      ...event,
      payload: { source: "mock_data", readOnly: true },
    }));
}

function fallbackActivity(integration: "github" | "vercel", reason: FallbackReason): HybridActivityResponse {
  return {
    integration,
    mode: "mock",
    readOnly: true,
    source: "mock_data",
    generatedAt: new Date().toISOString(),
    events: mockEventsFor(integration),
    fallback: {
      used: true,
      reason,
      message: reason === "forced_mock" ? "Mock fallback was requested." : reason === "missing_env" ? "Required read-only environment configuration is missing." : "Read-only provider request failed; mock fallback returned.",
    },
  };
}

function statusFallback(key: "github" | "vercel", name: string, configuredTargets: number, reason: FallbackReason): HybridStatus {
  return {
    key,
    name,
    mode: "mock",
    status: reason === "missing_env" ? "needs_setup" : "connected",
    health: "unknown",
    readOnly: true,
    configuredTargets,
    source: "mock_data",
    message: reason === "forced_mock" ? "Mock fallback was requested." : reason === "missing_env" ? "Required read-only environment configuration is missing." : "Read-only provider request failed; using mock data.",
    fallbackReason: reason,
  };
}

type GitHubCommit = {
  sha?: string;
  html_url?: string;
  commit?: {
    message?: string;
    author?: { name?: string; date?: string };
  };
};

type GitHubPullRequest = {
  number?: number;
  title?: string;
  state?: string;
  html_url?: string;
  updated_at?: string;
  user?: { login?: string };
};

function githubUrl(path: string) {
  return `https://api.github.com${path}`;
}

function cleanSummary(value?: string, fallback = "GitHub activity updated."): string {
  const firstLine = (value ?? fallback).split("\n")[0]?.trim();
  return firstLine ? firstLine.slice(0, 160) : fallback;
}

function compareEventDates(a: ActivityEvent, b: ActivityEvent) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

async function getLiveGitHubActivity(env: EnvSource): Promise<HybridActivityResponse | undefined> {
  const { token, targets } = getGitHubConfig(env);
  if (!token || targets.length === 0) return undefined;

  const allEvents: ActivityEvent[] = [];
  for (const target of targets.slice(0, 5)) {
    const commits = await fetchJson<GitHubCommit[]>(githubUrl(`/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/commits?per_page=5`), token);
    if (!commits.ok || !commits.data) return undefined;
    for (const commit of commits.data) {
      const shortSha = commit.sha?.slice(0, 12) ?? "unknown";
      allEvents.push({
        id: `event_github_commit_${shortSha}`,
        workspaceId,
        roomId,
        actorType: "integration",
        actorId: githubIntegrationId,
        integrationId: githubIntegrationId,
        eventType: "github_commit_read",
        title: "GitHub commit read",
        summary: cleanSummary(commit.commit?.message, "Commit activity read from GitHub."),
        riskLevel: "low",
        payload: {
          readOnly: true,
          source: "github_api",
          type: "commit",
          repository: `${target.owner}/${target.repo}`,
          sha: shortSha,
          author: commit.commit?.author?.name,
          url: commit.html_url,
        },
        createdAt: commit.commit?.author?.date ?? new Date().toISOString(),
      });
    }

    const pulls = await fetchJson<GitHubPullRequest[]>(githubUrl(`/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/pulls?state=all&sort=updated&direction=desc&per_page=5`), token);
    if (!pulls.ok || !pulls.data) return undefined;
    for (const pull of pulls.data) {
      const number = pull.number ?? 0;
      allEvents.push({
        id: `event_github_pr_${target.repo}_${number}`,
        workspaceId,
        roomId,
        actorType: "integration",
        actorId: githubIntegrationId,
        integrationId: githubIntegrationId,
        eventType: "github_pull_request_read",
        title: `GitHub PR #${number} read`,
        summary: cleanSummary(pull.title, "Pull request activity read from GitHub."),
        riskLevel: "low",
        payload: {
          readOnly: true,
          source: "github_api",
          type: "pull_request",
          repository: `${target.owner}/${target.repo}`,
          number,
          state: pull.state,
          author: pull.user?.login,
          url: pull.html_url,
        },
        createdAt: pull.updated_at ?? new Date().toISOString(),
      });
    }
  }

  return {
    integration: "github",
    mode: "live",
    readOnly: true,
    source: "live_api",
    generatedAt: new Date().toISOString(),
    events: allEvents.sort(compareEventDates).slice(0, 20),
  };
}

type VercelDeployment = {
  uid?: string;
  name?: string;
  url?: string;
  state?: string;
  target?: string;
  createdAt?: number;
  created?: number;
  creator?: { username?: string; email?: string };
  meta?: { githubCommitMessage?: string; githubCommitSha?: string; githubCommitRef?: string };
};

type VercelDeploymentsResponse = {
  deployments?: VercelDeployment[];
};

function vercelDeploymentsUrl(projectId: string, teamId?: string) {
  const params = new URLSearchParams({ limit: "6", projectId });
  if (teamId) params.set("teamId", teamId);
  return `https://api.vercel.com/v6/deployments?${params.toString()}`;
}

async function getLiveVercelActivity(env: EnvSource): Promise<HybridActivityResponse | undefined> {
  const config = getVercelConfig(env);
  if (!config.token || config.projectIds.length === 0) return undefined;

  const events: ActivityEvent[] = [];
  for (const projectId of config.projectIds.slice(0, 5)) {
    const result = await fetchJson<VercelDeploymentsResponse>(vercelDeploymentsUrl(projectId, config.teamId), config.token);
    if (!result.ok || !result.data?.deployments) return undefined;
    for (const deployment of result.data.deployments) {
      const createdAtMs = deployment.createdAt ?? deployment.created;
      const createdAt = createdAtMs ? new Date(createdAtMs).toISOString() : new Date().toISOString();
      const deploymentId = deployment.uid?.slice(0, 16) ?? "unknown";
      const state = deployment.state ?? "unknown";
      events.push({
        id: `event_vercel_deployment_${deploymentId}`,
        workspaceId,
        roomId,
        actorType: "integration",
        actorId: vercelIntegrationId,
        integrationId: vercelIntegrationId,
        eventType: "vercel_deployment_read",
        title: `Vercel deployment ${state.toLowerCase()}`,
        summary: cleanSummary(deployment.meta?.githubCommitMessage, `${deployment.name ?? "Project"} deployment is ${state}.`),
        riskLevel: state === "ERROR" || state === "CANCELED" ? "medium" : ("low" as RiskLevel),
        payload: {
          readOnly: true,
          source: "vercel_api",
          type: "deployment",
          project: deployment.name,
          target: deployment.target,
          state,
          url: deployment.url ? `https://${deployment.url}` : undefined,
          gitRef: deployment.meta?.githubCommitRef,
          gitSha: deployment.meta?.githubCommitSha?.slice(0, 12),
          creator: deployment.creator?.username,
        },
        createdAt,
      });
    }
  }

  return {
    integration: "vercel",
    mode: "live",
    readOnly: true,
    source: "live_api",
    generatedAt: new Date().toISOString(),
    events: events.sort(compareEventDates).slice(0, 20),
  };
}

export function shouldForceMock(searchParams: URLSearchParams): boolean {
  const mode = searchParams.get("mode") ?? searchParams.get("mock") ?? searchParams.get("forceMock");
  return mode === "mock" || mode === "1" || mode === "true";
}

export async function getGitHubStatus(options: HybridOptions = {}): Promise<HybridStatus> {
  const env = options.env ?? process.env;
  const config = getGitHubConfig(env);
  if (options.forceMock) return statusFallback("github", "GitHub", config.targets.length, "forced_mock");
  if (!config.token || config.targets.length === 0) return statusFallback("github", "GitHub", config.targets.length, "missing_env");
  const first = config.targets[0];
  const result = await fetchJson<Record<string, unknown>>(githubUrl(`/repos/${encodeURIComponent(first.owner)}/${encodeURIComponent(first.repo)}`), config.token);
  if (!result.ok) return statusFallback("github", "GitHub", config.targets.length, "read_failed");
  return {
    key: "github",
    name: "GitHub",
    mode: "live",
    status: "connected",
    health: "healthy",
    readOnly: true,
    configuredTargets: config.targets.length,
    source: "live_api",
    message: "Read-only GitHub access is configured.",
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function getVercelStatus(options: HybridOptions = {}): Promise<HybridStatus> {
  const env = options.env ?? process.env;
  const config = getVercelConfig(env);
  if (options.forceMock) return statusFallback("vercel", "Vercel", config.projectIds.length, "forced_mock");
  if (!config.token || config.projectIds.length === 0) return statusFallback("vercel", "Vercel", config.projectIds.length, "missing_env");
  const result = await fetchJson<VercelDeploymentsResponse>(vercelDeploymentsUrl(config.projectIds[0], config.teamId), config.token);
  if (!result.ok) return statusFallback("vercel", "Vercel", config.projectIds.length, "read_failed");
  return {
    key: "vercel",
    name: "Vercel",
    mode: "live",
    status: "connected",
    health: "healthy",
    readOnly: true,
    configuredTargets: config.projectIds.length,
    source: "live_api",
    message: "Read-only Vercel access is configured.",
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function getHybridStatuses(options: HybridOptions = {}) {
  const [github, vercel] = await Promise.all([getGitHubStatus(options), getVercelStatus(options)]);
  return [github, vercel];
}

export async function getGitHubActivity(options: HybridOptions = {}): Promise<HybridActivityResponse> {
  const env = options.env ?? process.env;
  if (options.forceMock) return fallbackActivity("github", "forced_mock");
  if (!getGitHubConfig(env).token || getGitHubConfig(env).targets.length === 0) return fallbackActivity("github", "missing_env");
  return (await getLiveGitHubActivity(env)) ?? fallbackActivity("github", "read_failed");
}

export async function getVercelActivity(options: HybridOptions = {}): Promise<HybridActivityResponse> {
  const env = options.env ?? process.env;
  if (options.forceMock) return fallbackActivity("vercel", "forced_mock");
  const config = getVercelConfig(env);
  if (!config.token || config.projectIds.length === 0) return fallbackActivity("vercel", "missing_env");
  return (await getLiveVercelActivity(env)) ?? fallbackActivity("vercel", "read_failed");
}

function readOnlyExecuteAction(action: IntegrationAction, permission: PermissionLevel): IntegrationResult {
  const decision = evaluatePermission(action, permission);
  if (decision.requiresApproval) {
    return {
      ok: false,
      status: "approval_required",
      message: "Read-only hybrid mode never mutates external services. This high-risk action was converted into an approval request.",
      approvalRequest: createApprovalFromAction(action, decision),
    };
  }
  if (action.type === "read_activity" || action.type === "sync") {
    return {
      ok: true,
      status: "executed",
      message: "Read-only action accepted. No external mutation was performed.",
    };
  }
  return {
    ok: false,
    status: "blocked",
    message: "Read-only hybrid mode blocks external mutations.",
  };
}

export function createGitHubHybridAdapter(): IntegrationAdapter {
  return {
    id: "github",
    name: "GitHub",
    category: "code",
    connect: async () => undefined,
    disconnect: async () => undefined,
    getStatus: async () => (await getGitHubStatus()).status,
    sync: async () => (await getGitHubActivity()).events,
    getActivity: async () => (await getGitHubActivity()).events,
    createTask: async (input) => ({ ok: true, status: "drafted", message: "Read-only GitHub hybrid mode created a local draft only.", data: { input } }),
    executeAction: async (action) => readOnlyExecuteAction(action, readOnlyPermission),
    validatePermissions: async (action, permission): Promise<PermissionDecision> => evaluatePermission(action, permission),
  };
}

export function createVercelHybridAdapter(): IntegrationAdapter {
  return {
    id: "vercel",
    name: "Vercel",
    category: "deployment",
    connect: async () => undefined,
    disconnect: async () => undefined,
    getStatus: async () => (await getVercelStatus()).status,
    sync: async () => (await getVercelActivity()).events,
    getActivity: async () => (await getVercelActivity()).events,
    createTask: async (input) => ({ ok: true, status: "drafted", message: "Read-only Vercel hybrid mode created a local draft only.", data: { input } }),
    executeAction: async (action) => readOnlyExecuteAction(action, readOnlyPermission),
    validatePermissions: async (action, permission): Promise<PermissionDecision> => evaluatePermission(action, permission),
  };
}
