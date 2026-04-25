"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  CircleStop,
  CreditCard,
  Loader2,
  LockKeyhole,
  Monitor,
  MousePointer2,
  Play,
  RefreshCw,
  Square,
  Terminal,
} from "lucide-react";
import { PaywallModal } from "@/components/billing/paywall-modal";

type SandboxStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "missing_api_key"
  | "stream_unavailable"
  | "creation_failed"
  | "cleanup_failed";

type AgentStatus = "idle" | "running" | "stopped" | "error" | "done";

type AgentEventType =
  | "agent_started"
  | "assistant_message"
  | "tool_use"
  | "screenshot"
  | "tool_result"
  | "unsupported_action"
  | "stopped_requested"
  | "stopped"
  | "done"
  | "error"
  | "max_iterations_reached"
  | "max_runtime_reached";

type AgentEvent = {
  ts: number;
  type: AgentEventType;
  payload: unknown;
};

type AgentState = {
  status: AgentStatus;
  taskPrompt: string | null;
  logs: AgentEvent[];
  abortFlag: boolean;
  startedAt: number | null;
  endedAt: number | null;
  lastError: string | null;
  iterationCount: number;
  maxIterations: number;
  maxRuntimeMs: number;
  anthropicKeyConfigured: boolean;
  runtimeMs: number;
};

type SandboxState = {
  apiKeyConfigured: boolean;
  anthropicKeyConfigured: boolean;
  sandboxId: string;
  streamUrl: string;
  hasStreamUrl: boolean;
  status: SandboxStatus;
  startedAt: string;
  lastError: string;
  agent: AgentState;
};

type BillingPlan = "free" | "pro";

type AgentRunLimits = {
  maxIterations: number;
  maxRuntimeMs: number;
};

type BillingProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  plan: BillingPlan;
  credits: number;
};

type AgentApiBody = Partial<AgentState> & {
  agent?: AgentState;
  agentLimits?: AgentRunLimits;
  agentRunCreditCost?: number;
  code?: string;
  error?: string;
  profile?: BillingProfile;
};

type PaywallState = {
  open: boolean;
  profile: BillingProfile | null;
  reason: string | null;
};

type PayloadRecord = Record<string, unknown>;

const initialAgentState: AgentState = {
  status: "idle",
  taskPrompt: null,
  logs: [],
  abortFlag: false,
  startedAt: null,
  endedAt: null,
  lastError: null,
  iterationCount: 0,
  maxIterations: 8,
  maxRuntimeMs: 180_000,
  anthropicKeyConfigured: false,
  runtimeMs: 0,
};

const initialState: SandboxState = {
  apiKeyConfigured: false,
  anthropicKeyConfigured: false,
  sandboxId: "",
  streamUrl: "",
  hasStreamUrl: false,
  status: "idle",
  startedAt: "",
  lastError: "",
  agent: initialAgentState,
};

function isRecord(value: unknown): value is PayloadRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBillingProfile(value: unknown): value is BillingProfile {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.plan === "free" || value.plan === "pro") &&
    typeof value.credits === "number"
  );
}

function isAgentRunLimits(value: unknown): value is AgentRunLimits {
  return isRecord(value) && typeof value.maxIterations === "number" && typeof value.maxRuntimeMs === "number";
}

function profileFromApiBody(body: unknown) {
  return isRecord(body) && isBillingProfile(body.profile) ? body.profile : null;
}

function limitsFromApiBody(body: unknown) {
  return isRecord(body) && isAgentRunLimits(body.agentLimits) ? body.agentLimits : null;
}

function agentFromApiBody(body: unknown) {
  if (isRecord(body) && isRecord(body.agent)) return body.agent as AgentState;
  return body as AgentState;
}

function payloadRecord(event: AgentEvent) {
  return isRecord(event.payload) ? event.payload : {};
}

function statusText(status: string) {
  return status.replaceAll("_", " ").toUpperCase();
}

function formatTime(value: number | string | null) {
  if (!value) return "not started";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateTime(value: number | string | null) {
  if (!value) return "not started";
  return new Date(value).toLocaleString();
}

function formatDuration(ms: number) {
  if (!ms) return "0s";
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatCredits(value: number | null) {
  if (value === null) return "unknown";
  return `${value} ${value === 1 ? "credit" : "credits"}`;
}

function formatPlan(plan: BillingPlan | null) {
  if (!plan) return "unknown";
  return plan.toUpperCase();
}

function maskStreamUrl(url: string) {
  if (!url) return "unavailable";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "stream URL available";
  }
}

function eventKey(event: AgentEvent) {
  const payload = payloadRecord(event);
  const id = typeof payload.tool_use_id === "string" ? payload.tool_use_id : "";
  const action = typeof payload.action === "string" ? payload.action : "";
  return `${event.ts}:${event.type}:${id}:${action}`;
}

function mergeEvents(events: AgentEvent[]) {
  const seen = new Set<string>();
  return events
    .filter((event) => {
      const key = eventKey(event);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.ts - b.ts);
}

function eventTone(type: AgentEventType, payload: PayloadRecord) {
  if (type === "error" || (type === "tool_result" && payload.ok === false)) return "red";
  if (type === "unsupported_action" || type === "stopped_requested" || type === "stopped" || type === "max_iterations_reached" || type === "max_runtime_reached") {
    return "amber";
  }
  if (type === "agent_started" || type === "done" || type === "tool_use" || (type === "tool_result" && payload.ok !== false)) return "green";
  return "muted";
}

function toneClasses(tone: string) {
  if (tone === "green") return "border-emerald-300/20 bg-emerald-300/[0.06]";
  if (tone === "amber") return "border-amber-300/25 bg-amber-300/[0.07]";
  if (tone === "red") return "border-red-300/25 bg-red-300/[0.07]";
  return "border-white/10 bg-white/[0.035]";
}

function pillClasses(tone: string) {
  if (tone === "green") return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
  if (tone === "amber") return "border-amber-300/35 bg-amber-300/10 text-amber-200";
  if (tone === "red") return "border-red-300/35 bg-red-300/10 text-red-200";
  return "border-white/15 bg-white/10 text-slate-300";
}

function statusPillClass(kind: "idle" | "running" | "working" | "error") {
  if (kind === "working") return "border-emerald-300/40 bg-emerald-300/10 text-emerald-100";
  if (kind === "running") return "border-sky-300/35 bg-sky-300/10 text-sky-100";
  if (kind === "error") return "border-red-300/40 bg-red-300/10 text-red-100";
  return "border-white/15 bg-white/[0.04] text-slate-300";
}

function inputSummary(input: unknown) {
  if (!isRecord(input)) return "";
  const bits: string[] = [];
  if (Array.isArray(input.coordinate)) bits.push(`xy ${input.coordinate.join(",")}`);
  if (Array.isArray(input.start_coordinate)) bits.push(`from ${input.start_coordinate.join(",")}`);
  if (Array.isArray(input.end_coordinate)) bits.push(`to ${input.end_coordinate.join(",")}`);
  if (typeof input.text === "string") bits.push(`text ${input.text.length} chars`);
  if (typeof input.key === "string") bits.push(`key ${input.key}`);
  if (typeof input.scroll_direction === "string") bits.push(`scroll ${input.scroll_direction}`);
  return bits.join(" - ");
}

function jsonPreview(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function SandboxTestClient() {
  const [state, setState] = useState<SandboxState>(initialState);
  const [taskPrompt, setTaskPrompt] = useState("Take a screenshot of the desktop.");
  const [busy, setBusy] = useState<"sandbox" | "agent" | "cleanup" | null>(null);
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null);
  const [agentRunLimits, setAgentRunLimits] = useState<AgentRunLimits | null>(null);
  const [agentRunCreditCost, setAgentRunCreditCost] = useState(1);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [paywallState, setPaywallState] = useState<PaywallState>({
    open: false,
    profile: null,
    reason: null,
  });
  const [agentLogs, setAgentLogs] = useState<AgentEvent[]>([]);
  const [expandedScreenshots, setExpandedScreenshots] = useState<Set<string>>(new Set());
  const [expandedJsonRows, setExpandedJsonRows] = useState<Set<string>>(new Set());
  const activityRef = useRef<HTMLDivElement>(null);

  const applyBillingBody = useCallback((body: unknown) => {
    const nextProfile = profileFromApiBody(body);
    const nextLimits = limitsFromApiBody(body);

    if (nextProfile) setBillingProfile(nextProfile);
    if (nextLimits) setAgentRunLimits(nextLimits);
    if (isRecord(body) && typeof body.agentRunCreditCost === "number") {
      setAgentRunCreditCost(body.agentRunCreditCost);
    }

    return nextProfile;
  }, []);

  const refreshState = useCallback(async () => {
    const response = await fetch("/api/dev/sandbox-test/state", { cache: "no-store" });
    const nextState = (await response.json().catch(() => initialState)) as SandboxState;
    setState(nextState);
    setAgentLogs(nextState.agent?.logs || []);
    return nextState;
  }, []);

  const refreshBillingProfile = useCallback(async () => {
    const response = await fetch("/api/dev/sandbox-test/agent/start", { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as AgentApiBody;
    const nextProfile = applyBillingBody(body);

    if (!response.ok) {
      if (!nextProfile) setBillingProfile(null);
      const message = body.code === "AUTH_REQUIRED" ? "Sign in required" : body.error || "Billing unavailable";
      setBillingError(message);
      return null;
    }

    if (!nextProfile) setBillingProfile(null);
    setBillingError(null);
    return nextProfile;
  }, [applyBillingBody]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dev/sandbox-test/state", { cache: "no-store" })
      .then((response) => response.json())
      .then((nextState: SandboxState) => {
        if (cancelled) return;
        setState(nextState);
        setAgentLogs(nextState.agent?.logs || []);
      })
      .catch(() => {});
    const billingTimer = window.setTimeout(() => {
      if (!cancelled) refreshBillingProfile().catch(() => {});
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(billingTimer);
    };
  }, [refreshBillingProfile]);

  useEffect(() => {
    const source = new EventSource("/api/dev/sandbox-test/agent/events");

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as AgentEvent;
        setAgentLogs((current) => mergeEvents([...current, event]));
        refreshState().catch(() => {});
      } catch {
        // Ignore malformed dev SSE payloads.
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [refreshState]);

  useEffect(() => {
    const node = activityRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [agentLogs.length]);

  async function requestSandbox(path: string, method = "GET") {
    const response = await fetch(path, { method, cache: "no-store" });
    const nextState = (await response.json().catch(() => initialState)) as SandboxState;
    setState(nextState);
    setAgentLogs(nextState.agent?.logs || []);
    if (!response.ok) throw new Error(nextState.lastError || "Sandbox request failed");
    return nextState;
  }

  async function startSandbox() {
    setBusy("sandbox");
    try {
      await requestSandbox("/api/dev/sandbox-test/start", "POST");
    } finally {
      setBusy(null);
      refreshState().catch(() => {});
    }
  }

  async function stopAgent() {
    setBusy("agent");
    try {
      const response = await fetch("/api/dev/sandbox-test/agent/stop", { method: "POST", cache: "no-store" });
      const nextAgent = (await response.json().catch(() => initialAgentState)) as AgentState;
      setState((current) => ({ ...current, agent: nextAgent }));
      setAgentLogs(nextAgent.logs || []);
      if (!response.ok) throw new Error(nextAgent.lastError || "Stop Agent failed");
    } finally {
      setBusy(null);
      refreshState().catch(() => {});
    }
  }

  async function stopSandbox() {
    setBusy("cleanup");
    try {
      if (state.agent.status === "running") {
        await fetch("/api/dev/sandbox-test/agent/stop", { method: "POST", cache: "no-store" }).catch(() => {});
      }
      await requestSandbox("/api/dev/sandbox-test/stop", "POST");
    } finally {
      setBusy(null);
      refreshState().catch(() => {});
    }
  }

  async function startAgent() {
    setBusy("agent");
    setAgentLogs([]);
    setExpandedScreenshots(new Set());
    setExpandedJsonRows(new Set());
    try {
      const response = await fetch("/api/dev/sandbox-test/agent/start", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskPrompt }),
      });
      const body = (await response.json().catch(() => ({}))) as AgentApiBody;
      const nextProfile = applyBillingBody(body);
      const nextAgent = agentFromApiBody(body);
      setState((current) => ({ ...current, agent: nextAgent }));
      setAgentLogs(nextAgent.logs || []);
      if (!response.ok) {
        if (body.code === "NO_CREDITS") {
          setPaywallState({
            open: true,
            profile: nextProfile || billingProfile,
            reason: body.code,
          });
        }
        const message = body.error || nextAgent.lastError || "Start Agent failed";
        throw new Error(message);
      }
      setPaywallState((current) => ({ ...current, open: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAgentLogs((current) =>
        mergeEvents([
          ...current,
          {
            ts: Date.now(),
            type: "error",
            payload: { message },
          },
        ]),
      );
    } finally {
      setBusy(null);
      refreshState().catch(() => {});
      refreshBillingProfile().catch(() => {});
    }
  }

  const overallStatus = useMemo(() => {
    if (state.lastError || state.agent.status === "error") return { label: "ERROR", kind: "error" as const };
    if (state.agent.status === "running") return { label: "AGENT WORKING", kind: "working" as const };
    if (state.status === "running") return { label: "RUNNING", kind: "running" as const };
    return { label: "IDLE", kind: "idle" as const };
  }, [state.agent.status, state.lastError, state.status]);

  const streamReady = state.hasStreamUrl && !state.lastError;
  const sandboxRunning = state.status === "running" && streamReady;
  const taskReady = taskPrompt.trim().length > 0;
  const canStartAgent = sandboxRunning && taskReady && state.agent.status !== "running" && busy !== "agent";
  const canStopAgent = state.agent.status === "running" && busy !== "agent";
  const lastEvent = agentLogs.at(-1);
  const activeAgentLimits = agentRunLimits || {
    maxIterations: state.agent.maxIterations,
    maxRuntimeMs: state.agent.maxRuntimeMs,
  };
  const billingCredits = billingProfile ? billingProfile.credits : null;
  const billingTone = billingProfile?.credits === 0 ? "red" : billingProfile ? "green" : billingError ? "amber" : "muted";
  const emptyTitle = !state.apiKeyConfigured
    ? "Missing E2B_API_KEY."
    : state.lastError
      ? "Sandbox smoke test hit an error."
      : state.status === "starting"
        ? "Waiting for stream URL..."
        : "Ready to start a desktop sandbox.";
  const emptyCopy = !state.apiKeyConfigured
    ? "Add E2B_API_KEY to .env.local or the shell running npm run dev, then refresh this page."
    : state.lastError
      ? state.lastError
      : state.status === "starting"
        ? "E2B is booting a cloud desktop and starting noVNC."
        : "Start a sandbox to bring a live cloud desktop online.";

  return (
    <main className="min-h-screen bg-[#050607] text-foreground">
      <div className="mx-auto w-[min(1440px,calc(100vw-28px))] py-6">
        <header className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-300/25 bg-emerald-300/[0.08] px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-200">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              DEV SMOKE TEST
            </div>
            <h1 className="mt-3 text-[clamp(28px,4vw,52px)] font-semibold leading-none tracking-normal">Live VM Stage</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Start a sandbox, give the agent a task, and watch it operate a real cloud desktop.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <button
              className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 font-mono text-xs font-bold transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-70 ${pillClasses(billingTone)}`}
              disabled={!billingProfile}
              onClick={() =>
                setPaywallState({
                  open: true,
                  profile: billingProfile,
                  reason: billingProfile?.credits === 0 ? "NO_CREDITS" : "BALANCE",
                })
              }
              type="button"
            >
              <CreditCard className="size-3.5" />
              {billingProfile ? formatCredits(billingProfile.credits) : billingError || "Checking credits"}
            </button>
            <div className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 font-mono text-xs font-bold ${statusPillClass(overallStatus.kind)}`}>
              {state.agent.status === "running" ? <Loader2 className="size-3.5 animate-spin" /> : <Activity className="size-3.5" />}
              {overallStatus.label}
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0d0f12] shadow-2xl shadow-black/30">
              <div className="flex flex-col gap-3 border-b border-white/10 bg-[#101318] px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-md border border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200">
                    <Monitor className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Sandbox Desktop</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{state.sandboxId || "No sandbox active"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded border px-2 py-1 font-mono text-[10px] font-bold ${streamReady ? "border-red-300/35 bg-red-300/10 text-red-200" : "border-white/10 bg-white/[0.04] text-muted-foreground"}`}>
                    {streamReady ? "REC / STREAMING" : "OFFLINE"}
                  </span>
                  <span className="rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-[10px] text-muted-foreground">1024 x 720</span>
                </div>
              </div>

              <div className="bg-[#050607] p-3">
                <div className="rounded-md border border-white/10 bg-[#181b20] p-3">
                  <div className="relative aspect-[16/10] overflow-hidden rounded bg-[#08090a]">
                    {streamReady ? (
                      <iframe
                        allow="clipboard-read; clipboard-write; fullscreen"
                        className="h-full w-full border-0 bg-[#08090a]"
                        src={state.streamUrl}
                        title="E2B desktop stream"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),#0b0d10] bg-[length:34px_34px] p-6 text-center">
                        <div className="max-w-md">
                          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-muted-foreground">
                            {state.lastError ? <AlertTriangle className="size-5 text-red-200" /> : <Monitor className="size-5" />}
                          </div>
                          <strong className="block text-base">{emptyTitle}</strong>
                          <span className="mt-2 block text-sm leading-6 text-muted-foreground">{emptyCopy}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-[#0d0f12]">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#101318] px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold">Agent Activity</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{lastEvent ? `Last event: ${statusText(lastEvent.type)}` : "Start an agent to watch actions stream here."}</p>
                </div>
                <div className="rounded border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] text-muted-foreground">{agentLogs.length} events</div>
              </div>
              <div className="max-h-[520px] overflow-y-auto p-3" ref={activityRef}>
                {agentLogs.length ? (
                  <div className="grid gap-2">
                    {agentLogs.map((event) => (
                      <AgentEventRow
                        event={event}
                        expandedJsonRows={expandedJsonRows}
                        expandedScreenshots={expandedScreenshots}
                        key={eventKey(event)}
                        setExpandedJsonRows={setExpandedJsonRows}
                        setExpandedScreenshots={setExpandedScreenshots}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid place-items-center rounded-md border border-dashed border-white/10 bg-white/[0.025] px-5 py-12 text-center">
                    <div>
                      <Terminal className="mx-auto size-5 text-muted-foreground" />
                      <p className="mt-3 text-sm text-muted-foreground">Start an agent to watch actions stream here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </section>

          <aside className="grid content-start gap-4">
            <Panel title="Billing">
              {billingError ? (
                <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300/25 bg-amber-300/[0.07] p-3 text-xs leading-5 text-amber-100">
                  <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
                  <span>{billingError}</span>
                </div>
              ) : null}
              <Metric label="plan" tone={billingProfile?.plan === "pro" ? "green" : "amber"} value={formatPlan(billingProfile?.plan || null)} />
              <Metric label="credits" tone={billingTone} value={formatCredits(billingCredits)} />
              <Metric label="run cost" value={formatCredits(agentRunCreditCost)} />
              <Metric label="agent cap" value={`${activeAgentLimits.maxIterations} / ${formatDuration(activeAgentLimits.maxRuntimeMs)}`} />
              <button
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!billingProfile}
                onClick={() =>
                  setPaywallState({
                    open: true,
                    profile: billingProfile,
                    reason: billingProfile?.credits === 0 ? "NO_CREDITS" : "BALANCE",
                  })
                }
                type="button"
              >
                <CreditCard className="size-4" />
                Manage credits
              </button>
            </Panel>

            <Panel title="Controls">
              <div className="grid grid-cols-2 gap-2">
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-45" disabled={busy !== null || state.status === "starting" || state.status === "running" || state.status === "stopping"} onClick={startSandbox} type="button">
                  {busy === "sandbox" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  Start
                </button>
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-red-300/35 bg-red-300/10 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-45" disabled={busy !== null || (!state.sandboxId && state.status !== "running")} onClick={stopSandbox} type="button">
                  {busy === "cleanup" ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
                  Cleanup
                </button>
              </div>
              <button
                className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={busy !== null}
                onClick={() => {
                  refreshState().catch(() => {});
                  refreshBillingProfile().catch(() => {});
                }}
                type="button"
              >
                <RefreshCw className="size-4" />
                Refresh state
              </button>
            </Panel>

            <Panel title="Task for the agent">
              <textarea
                className="min-h-28 w-full resize-none rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-emerald-300/35"
                onChange={(event) => setTaskPrompt(event.target.value)}
                placeholder="e.g. Take a screenshot of the desktop"
                value={taskPrompt}
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Keep tasks simple. No logins, secrets, deletes, or external accounts.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-45" disabled={!canStartAgent} onClick={startAgent} type="button">
                  {busy === "agent" && state.agent.status !== "running" ? <Loader2 className="size-4 animate-spin" /> : <MousePointer2 className="size-4" />}
                  Start Agent
                </button>
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-300/35 bg-amber-300/10 px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-45" disabled={!canStopAgent} onClick={stopAgent} type="button">
                  <CircleStop className="size-4" />
                  Stop Agent
                </button>
              </div>
            </Panel>

            <Panel title="Environment">
              <Metric label="E2B key" tone={state.apiKeyConfigured ? "green" : "red"} value={state.apiKeyConfigured ? "configured" : "missing"} />
              <Metric label="Anthropic key" tone={state.anthropicKeyConfigured ? "green" : "red"} value={state.anthropicKeyConfigured ? "configured" : "missing"} />
            </Panel>

            <Panel title="Sandbox">
              <Metric label="status" tone={state.status === "running" ? "green" : state.lastError ? "red" : "amber"} value={state.status} />
              <Metric label="sandbox id" value={state.sandboxId || "none"} />
              <Metric label="started at" value={state.startedAt ? formatDateTime(state.startedAt) : "not started"} />
              <Metric label="stream url" tone={state.hasStreamUrl ? "green" : "amber"} value={maskStreamUrl(state.streamUrl)} />
              <Metric label="last error" tone={state.lastError ? "red" : "muted"} value={state.lastError || "none"} />
            </Panel>

            <Panel title="Agent">
              <Metric label="status" tone={state.agent.status === "running" ? "green" : state.agent.status === "error" ? "red" : "amber"} value={state.agent.status} />
              <Metric label="iterations" value={`${state.agent.iterationCount} / ${state.agent.maxIterations}`} />
              <Metric label="runtime" value={`${formatDuration(state.agent.runtimeMs)} / ${formatDuration(state.agent.maxRuntimeMs)}`} />
              <Metric label="last event" value={lastEvent ? statusText(lastEvent.type) : "none"} />
              <Metric label="last error" tone={state.agent.lastError ? "red" : "muted"} value={state.agent.lastError || "none"} />
            </Panel>
          </aside>
        </div>
      </div>
      <PaywallModal
        credits={paywallState.profile?.credits ?? billingProfile?.credits ?? 0}
        onClose={() => setPaywallState((current) => ({ ...current, open: false }))}
        open={paywallState.open}
      />
    </main>
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#0d0f12] p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value, tone = "muted" }: { label: string; value: string; tone?: "green" | "amber" | "red" | "muted" }) {
  const toneClass = tone === "green" ? "text-emerald-200" : tone === "amber" ? "text-amber-200" : tone === "red" ? "text-red-200" : "text-foreground";
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-t border-white/10 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <div className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className={`min-w-0 truncate text-right font-mono text-xs ${toneClass}`}>{value}</div>
    </div>
  );
}

function AgentEventRow({
  event,
  expandedJsonRows,
  expandedScreenshots,
  setExpandedJsonRows,
  setExpandedScreenshots,
}: {
  event: AgentEvent;
  expandedJsonRows: Set<string>;
  expandedScreenshots: Set<string>;
  setExpandedJsonRows: Dispatch<SetStateAction<Set<string>>>;
  setExpandedScreenshots: Dispatch<SetStateAction<Set<string>>>;
}) {
  const payload = payloadRecord(event);
  const key = eventKey(event);
  const tone = eventTone(event.type, payload);
  const isJsonExpanded = expandedJsonRows.has(key);
  const isScreenshotExpanded = expandedScreenshots.has(key);
  const action = typeof payload.action === "string" ? payload.action : event.type;
  const message = typeof payload.message === "string" ? payload.message : "";
  const text = typeof payload.text === "string" ? payload.text : "";
  const b64 = typeof payload.b64 === "string" ? payload.b64 : "";

  function toggleJson() {
    setExpandedJsonRows((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleScreenshot() {
    setExpandedScreenshots((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <article className={`rounded-md border p-3 ${toneClasses(tone)}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] font-bold uppercase ${pillClasses(tone)}`}>
              {eventIcon(event.type, payload)}
              {event.type === "tool_use" ? action : statusText(event.type)}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{formatTime(event.ts)}</span>
          </div>
          <EventBody action={action} event={event} message={message} payload={payload} text={text} />
        </div>
        <button className="self-start rounded border border-white/10 bg-black/20 px-2 py-1 font-mono text-[10px] text-muted-foreground transition hover:text-foreground" onClick={toggleJson} type="button">
          {isJsonExpanded ? "hide json" : "json"}
        </button>
      </div>

      {event.type === "screenshot" && b64 ? (
        <button className="mt-3 block text-left" onClick={toggleScreenshot} type="button">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Agent screenshot" className={isScreenshotExpanded ? "max-h-[420px] rounded border border-white/10" : "h-24 rounded border border-white/10"} src={`data:image/png;base64,${b64}`} />
        </button>
      ) : null}

      {isJsonExpanded ? <pre className="mt-3 max-h-72 overflow-auto rounded border border-white/10 bg-black/30 p-3 text-[11px] leading-5 text-slate-300">{jsonPreview(event.payload)}</pre> : null}
    </article>
  );
}

function eventIcon(type: AgentEventType, payload: PayloadRecord) {
  if (type === "screenshot") return <Camera className="size-3" />;
  if (type === "tool_use") return <MousePointer2 className="size-3" />;
  if (type === "tool_result" && payload.ok !== false) return <CheckCircle2 className="size-3" />;
  if (type === "error" || payload.ok === false) return <AlertTriangle className="size-3" />;
  return <Activity className="size-3" />;
}

function EventBody({ action, event, message, payload, text }: { action: string; event: AgentEvent; message: string; payload: PayloadRecord; text: string }) {
  if (event.type === "agent_started") {
    return <p className="mt-2 text-sm text-emerald-100">Agent started: {typeof payload.taskPrompt === "string" ? payload.taskPrompt : "task received"}</p>;
  }

  if (event.type === "assistant_message") {
    return <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{text || "Claude is choosing the next desktop action."}</p>;
  }

  if (event.type === "tool_use") {
    return <p className="mt-2 text-sm text-emerald-100">Action: <span className="font-mono">{action}</span>{payload.input ? <span className="text-muted-foreground"> - {inputSummary(payload.input)}</span> : null}</p>;
  }

  if (event.type === "screenshot") {
    return <p className="mt-2 text-sm text-muted-foreground">Screenshot captured from the live desktop.</p>;
  }

  if (event.type === "tool_result") {
    return <p className="mt-2 text-sm text-muted-foreground">{payload.ok === false ? `Action failed: ${String(payload.error || "unknown error")}` : "Action completed."}</p>;
  }

  if (event.type === "unsupported_action") {
    return <p className="mt-2 text-sm text-amber-100">Unsupported action: <span className="font-mono">{action}</span></p>;
  }

  if (event.type === "done") {
    return <p className="mt-2 text-sm text-emerald-100">{message || "Agent finished."}</p>;
  }

  if (event.type === "stopped" || event.type === "stopped_requested") {
    return <p className="mt-2 text-sm text-amber-100">{message || "Agent stop requested."}</p>;
  }

  if (event.type === "max_iterations_reached") {
    return <p className="mt-2 text-sm text-amber-100">Max iteration safety cap reached.</p>;
  }

  if (event.type === "max_runtime_reached") {
    return <p className="mt-2 text-sm text-amber-100">Max runtime safety cap reached.</p>;
  }

  if (event.type === "error") {
    return <p className="mt-2 text-sm text-red-100">{message || "Agent error."}</p>;
  }

  return null;
}
