"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { PaywallModal } from "@/components/billing/paywall-modal";
import styles from "@/app/dev/sandbox-test/sandbox.module.css";
import { ActivityDrawer, type AgentEvent } from "./activity-drawer";
import { ControlDock } from "./control-dock";
import { StatusPill, type StatusPillKind } from "./status-pill";
import { VmViewport } from "./vm-viewport";

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

function formatDuration(ms: number) {
  if (!ms) return "0s";
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatCredits(value: number | null) {
  if (value === null) return "—";
  return `${value} ${value === 1 ? "credit" : "credits"}`;
}

type Props = {
  /** Onboarding hand-off from /onboarding (Agent 6). When set, prefill task and auto-start once the sandbox is ready. */
  onboardingTask?: string | null;
  onboarding?: boolean;
};

export function SandboxTestClient({ onboardingTask = null, onboarding = false }: Props) {
  const [state, setState] = useState<SandboxState>(initialState);
  const [taskPrompt, setTaskPrompt] = useState(
    onboardingTask && onboardingTask.trim().length > 0 ? onboardingTask : "Take a screenshot of the desktop.",
  );
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
  const [activityInitialLoading, setActivityInitialLoading] = useState(true);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const onboardingAutoStartedRef = useRef(false);

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
        setActivityInitialLoading(false);
      })
      .catch(() => {
        if (!cancelled) setActivityInitialLoading(false);
      });
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

  async function requestSandbox(path: string, method = "GET") {
    const response = await fetch(path, { method, cache: "no-store" });
    const nextState = (await response.json().catch(() => initialState)) as SandboxState;
    setState(nextState);
    setAgentLogs(nextState.agent?.logs || []);
    if (!response.ok) throw new Error(nextState.lastError || "Sandbox request failed");
    return nextState;
  }

  const startSandbox = useCallback(async () => {
    setBusy("sandbox");
    try {
      await requestSandbox("/api/dev/sandbox-test/start", "POST");
    } finally {
      setBusy(null);
      refreshState().catch(() => {});
    }
  }, [refreshState]);

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

  function startNewRun() {
    setTaskPrompt("");
    setAgentLogs([]);
    setExpandedScreenshots(new Set());
    setExpandedJsonRows(new Set());
    setState((current) => ({
      ...current,
      agent: {
        ...current.agent,
        status: "idle",
        logs: [],
        iterationCount: 0,
        runtimeMs: 0,
        startedAt: null,
        endedAt: null,
        lastError: null,
        abortFlag: false,
      },
    }));
    promptRef.current?.focus();
  }

  const startAgent = useCallback(async () => {
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
  }, [applyBillingBody, billingProfile, refreshBillingProfile, refreshState, taskPrompt]);

  const streamReady = state.hasStreamUrl && !state.lastError;
  const sandboxRunning = state.status === "running" && streamReady;

  // Onboarding contract:
  //   /dev/sandbox-test?onboarding=true&task=<urlencoded prompt>
  //   1. Decode `task` and prefill the textarea (handled in initial useState).
  //   2. If no sandbox is running, auto-Start the sandbox.
  //   3. Once `streamReady` flips true, auto-trigger Start Agent (once per page load).
  // Coordinated with Agent 6 (onboarding flow). See src/app/dev/sandbox-test/page.tsx for the wiring.
  useEffect(() => {
    if (!onboarding) return;
    if (onboardingAutoStartedRef.current) return;
    if (busy) return;
    if (state.status === "idle" && !state.lastError && state.apiKeyConfigured) {
      onboardingAutoStartedRef.current = true;
      const timer = window.setTimeout(() => {
        startSandbox().catch(() => {});
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [onboarding, busy, state.status, state.lastError, state.apiKeyConfigured, startSandbox]);

  useEffect(() => {
    if (!onboarding) return;
    if (!sandboxRunning) return;
    if (state.agent.status === "running") return;
    if (state.agent.status === "done" || state.agent.status === "stopped" || state.agent.status === "error") return;
    if (busy) return;
    if (!taskPrompt.trim()) return;
    // Auto-start the agent run once the sandbox stream is live.
    if (!onboardingAutoStartedRef.current) return; // we only auto-run inside the same auto-start session
    onboardingAutoStartedRef.current = false; // ensure we only fire once
    const timer = window.setTimeout(() => {
      startAgent().catch(() => {});
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onboarding, sandboxRunning, state.agent.status, busy, taskPrompt, startAgent]);

  const statusKind: StatusPillKind = useMemo(() => {
    if (state.lastError || state.agent.status === "error") return "error";
    if (state.agent.status === "done") return "done";
    if (state.agent.status === "running" || state.status === "running") return "running";
    if (state.status === "starting" || busy === "sandbox") return "starting";
    return "idle";
  }, [busy, state.agent.status, state.lastError, state.status]);

  const sandboxStatusKind: "idle" | "starting" | "running" | "error" = useMemo(() => {
    if (state.lastError) return "error";
    if (state.status === "running") return "running";
    if (state.status === "starting") return "starting";
    return "idle";
  }, [state.lastError, state.status]);

  const agentLifecycle: "idle" | "running" | "finished" =
    state.agent.status === "running"
      ? "running"
      : state.agent.status === "done" || state.agent.status === "stopped" || state.agent.status === "error"
        ? "finished"
        : "idle";

  const taskReady = taskPrompt.trim().length > 0;
  const canStartSandbox =
    busy === null && state.status !== "starting" && state.status !== "running" && state.status !== "stopping";
  const canStopSandbox = busy === null && (Boolean(state.sandboxId) || state.status === "running");
  const canStartAgent = sandboxRunning && taskReady && state.agent.status !== "running" && busy !== "agent";
  const canStopAgent = state.agent.status === "running" && busy !== "agent";

  const activeAgentLimits = agentRunLimits || {
    maxIterations: state.agent.maxIterations,
    maxRuntimeMs: state.agent.maxRuntimeMs,
  };

  const billingCredits = billingProfile ? billingProfile.credits : null;
  const creditPillLabel = billingProfile
    ? formatCredits(billingCredits)
    : billingError || "Checking credits";

  const envOk = state.apiKeyConfigured && state.anthropicKeyConfigured;
  const envMessage = !state.apiKeyConfigured
    ? "Missing E2B_API_KEY. Add it to .env.local and restart."
    : !state.anthropicKeyConfigured
      ? "Missing ANTHROPIC_API_KEY. Add it to .env.local and restart."
      : null;

  const sandboxStatusLabel = state.lastError
    ? "error"
    : state.status === "running"
      ? "live"
      : state.status === "starting"
        ? "booting"
        : state.status === "stopping"
          ? "stopping"
          : "idle";

  return (
    <main className={`${styles.scope} min-h-screen`}>
      <div className="mx-auto w-[min(1440px,calc(100vw-28px))] py-6">
        {/* ───── Header ───── */}
        <header
          className="mb-5 flex flex-wrap items-center justify-between gap-4 pb-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-text-secondary hover:text-text-primary transition-colors duration-200"
              style={{ color: "#A1A1A1", fontSize: 13 }}
            >
              ← Dashboard
            </a>
            <h1
              className="font-semibold"
              style={{
                fontSize: "clamp(18px, 2.4vw, 24px)",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "#FAFAFA",
              }}
            >
              Live VM Stage
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={!billingProfile}
              onClick={() =>
                setPaywallState({
                  open: true,
                  profile: billingProfile,
                  reason: billingProfile?.credits === 0 ? "NO_CREDITS" : "BALANCE",
                })
              }
              className="inline-flex items-center gap-2 rounded-md font-mono disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 10px",
                color: billingProfile?.credits === 0 ? "#E24B4A" : "#3EE98C",
                background: billingProfile?.credits === 0 ? "rgba(226,75,74,0.10)" : "rgba(62,233,140,0.12)",
                border: billingProfile?.credits === 0 ? "1px solid rgba(226,75,74,0.30)" : "1px solid rgba(62,233,140,0.30)",
                transition: "background-color 200ms ease, color 200ms ease, border-color 200ms ease",
              }}
            >
              <CreditCard className="size-3.5" />
              <span>{billingProfile ? `${billingProfile.plan.toUpperCase()} · ${creditPillLabel}` : creditPillLabel}</span>
            </motion.button>
            <StatusPill kind={statusKind} />
          </div>
        </header>

        {/* ───── Main grid: VM viewport (≈70%) + Control dock (360px) ───── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <VmViewport
              streamUrl={state.streamUrl}
              streamReady={streamReady}
              starting={state.status === "starting" || busy === "sandbox"}
              sandboxId={state.sandboxId}
              errorMessage={state.lastError || null}
              onStart={startSandbox}
              startDisabled={!canStartSandbox}
            />
          </div>
          <ControlDock
            sandboxId={state.sandboxId}
            sandboxStatus={sandboxStatusLabel}
            sandboxStatusKind={sandboxStatusKind}
            envOk={envOk}
            envMessage={envMessage}
            taskPrompt={taskPrompt}
            setTaskPrompt={setTaskPrompt}
            promptRef={promptRef}
            agentLifecycle={agentLifecycle}
            busy={busy}
            canStartSandbox={canStartSandbox}
            canStopSandbox={canStopSandbox}
            canStartAgent={canStartAgent}
            canStopAgent={canStopAgent}
            runCostLabel={formatCredits(agentRunCreditCost)}
            agentCapLabel={`${activeAgentLimits.maxIterations} iter · ${formatDuration(activeAgentLimits.maxRuntimeMs)}`}
            onStartSandbox={startSandbox}
            onStopSandbox={stopSandbox}
            onStartAgent={startAgent}
            onStopAgent={stopAgent}
            onNewRun={startNewRun}
            onRefresh={() => {
              refreshState().catch(() => {});
              refreshBillingProfile().catch(() => {});
            }}
          />
        </div>

        {/* ───── Activity drawer ───── */}
        <div className="mt-5">
          <ActivityDrawer
            events={agentLogs}
            initialLoading={activityInitialLoading}
            expandedScreenshots={expandedScreenshots}
            expandedJsonRows={expandedJsonRows}
            setExpandedScreenshots={setExpandedScreenshots}
            setExpandedJsonRows={setExpandedJsonRows}
          />
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
