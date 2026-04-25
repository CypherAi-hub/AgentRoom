"use client";

import { useEffect, useState } from "react";

type SandboxStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "missing_api_key"
  | "stream_unavailable"
  | "creation_failed"
  | "cleanup_failed";

type SandboxState = {
  apiKeyConfigured: boolean;
  sandboxId: string;
  streamUrl: string;
  hasStreamUrl: boolean;
  status: SandboxStatus;
  startedAt: string;
  lastError: string;
};

type LogItem = {
  time: string;
  type: string;
  message: string;
};

const initialState: SandboxState = {
  apiKeyConfigured: false,
  sandboxId: "",
  streamUrl: "",
  hasStreamUrl: false,
  status: "idle",
  startedAt: "",
  lastError: "",
};

function timeStamp() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusText(status: string) {
  return status.replaceAll("_", " ").toUpperCase();
}

function statusBadgeClass(status: SandboxStatus) {
  if (status === "running") {
    return "border-emerald-400/35 bg-emerald-400/10 text-emerald-200";
  }

  if (
    status === "missing_api_key" ||
    status === "creation_failed" ||
    status === "cleanup_failed" ||
    status === "stream_unavailable"
  ) {
    return "border-red-400/40 bg-red-400/10 text-red-200";
  }

  return "border-sky-300/35 bg-sky-300/10 text-sky-200";
}

function valueClass(kind: "ok" | "warn" | "error" | "") {
  if (kind === "ok") return "text-emerald-200";
  if (kind === "warn") return "text-amber-200";
  if (kind === "error") return "text-red-200";
  return "text-foreground";
}

export function SandboxTestClient() {
  const [state, setState] = useState<SandboxState>(initialState);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);

  function addLog(type: string, message: string) {
    setLogs((current) => [{ type, message, time: timeStamp() }, ...current].slice(0, 8));
  }

  async function requestState(path: string, init?: RequestInit) {
    const response = await fetch(path, { cache: "no-store", ...init });
    const nextState = (await response.json().catch(() => initialState)) as SandboxState;
    setState(nextState);

    if (!response.ok) {
      throw new Error(nextState.lastError || "Request failed");
    }

    return nextState;
  }

  async function refresh() {
    const nextState = await requestState("/api/dev/sandbox-test/state");
    addLog("state", `Status refreshed: ${nextState.status}`);
  }

  async function startSandbox() {
    setBusy(true);
    addLog("start", "Creating E2B desktop sandbox.");

    try {
      const nextState = await requestState("/api/dev/sandbox-test/start", { method: "POST" });
      addLog("stream", nextState.hasStreamUrl ? "Live stream URL received." : nextState.lastError || "Sandbox started without stream URL.");
    } catch (error) {
      addLog("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      requestState("/api/dev/sandbox-test/state").catch(() => {});
    }
  }

  async function stopSandbox() {
    setBusy(true);
    addLog("stop", "Cleaning up E2B desktop sandbox.");

    try {
      await requestState("/api/dev/sandbox-test/stop", { method: "POST" });
      addLog("cleanup", "Sandbox cleanup completed.");
    } catch (error) {
      addLog("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dev/sandbox-test/state", { cache: "no-store" })
      .then((response) => response.json())
      .then((nextState: SandboxState) => {
        if (!cancelled) setState(nextState);
      })
      .catch((error) => {
        if (!cancelled) addLog("error", error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statusKind = state.status === "running" ? "ok" : state.lastError ? "error" : "warn";
  const streamReady = state.hasStreamUrl && !state.lastError;
  const showMissingKey = !state.apiKeyConfigured;
  const emptyTitle = showMissingKey
    ? "Missing E2B_API_KEY."
    : state.lastError
      ? "Sandbox smoke test hit an error."
      : state.status === "starting"
        ? "Creating desktop sandbox..."
        : state.status === "stream_unavailable"
          ? "Stream URL unavailable."
          : "Ready to start a desktop sandbox.";
  const emptyCopy = showMissingKey
    ? "Add E2B_API_KEY to .env.local or the shell running npm run dev, then refresh this page."
    : state.lastError
      ? state.lastError
      : state.status === "starting"
        ? "E2B is booting the desktop and starting VNC streaming."
        : state.status === "stream_unavailable"
          ? "The sandbox started, but E2B did not return a stream URL. Try cleanup and start again."
          : "Click Start Sandbox. The live E2B desktop stream will render here when available.";

  return (
    <main className="mx-auto w-[min(1180px,calc(100vw-36px))] px-0 py-8 text-foreground">
      <header className="mb-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-200">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            DEV SMOKE TEST
          </div>
          <h1 className="mt-3 text-[clamp(26px,3.4vw,42px)] font-semibold leading-none tracking-normal">Live VM Stage</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Isolated E2B desktop sandbox validation for the future AgentRoom Live Stage. This page runs inside the Next.js app and does not touch runs,
            agents, tasks, approvals, integrations, Supabase, FoFit, commits, or deployments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="min-h-9 rounded-md border border-emerald-300/40 bg-emerald-300/10 px-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-300/15 disabled:cursor-wait disabled:opacity-50"
            disabled={busy || state.status === "starting" || state.status === "running" || state.status === "stopping"}
            onClick={startSandbox}
            type="button"
          >
            Start Sandbox
          </button>
          <button
            className="min-h-9 rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm font-semibold text-foreground transition hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-50"
            disabled={busy}
            onClick={() => refresh().catch((error) => addLog("error", error instanceof Error ? error.message : String(error)))}
            type="button"
          >
            Refresh
          </button>
          <button
            className="min-h-9 rounded-md border border-red-300/40 bg-red-300/10 px-3 text-sm font-semibold text-red-200 transition hover:bg-red-300/15 disabled:cursor-wait disabled:opacity-50"
            disabled={busy || !state.sandboxId || state.status === "stopping"}
            onClick={stopSandbox}
            type="button"
          >
            Stop / Cleanup
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f]">
        <div className="grid gap-4 border-b border-white/10 px-5 py-4 md:grid-cols-[1fr_auto]">
          <div>
            <div className="text-lg font-semibold">Desktop Sandbox Stream</div>
            <div className="mt-1 text-xs text-muted-foreground">Provider: E2B Desktop SDK - Resolution: 1024x720 - Timeout: 5 minutes</div>
          </div>
          <div className={`self-start rounded border px-2.5 py-1.5 font-mono text-[11px] font-bold ${statusBadgeClass(state.status)}`}>
            {statusText(state.status)}
          </div>
        </div>

        <div className="grid gap-4 bg-[#070707] px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid size-6 shrink-0 place-items-center rounded-full border border-emerald-300/45 bg-emerald-300/10 font-mono text-[10px] font-black text-emerald-200">
                  VM
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Sandbox Desktop</div>
                  <div className="truncate text-[11px] text-muted-foreground">{state.sandboxId || "Waiting for stream URL"}</div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded border border-red-300/35 bg-red-300/10 px-2 py-1 font-mono text-[10px] font-bold text-red-200">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                STREAMING
              </div>
            </div>
            <div className="rounded-[10px] border border-white/15 bg-[#191919] p-2.5">
              <div className="relative aspect-[16/10] overflow-hidden rounded bg-[#0b0b0b]">
                {streamReady ? (
                  <iframe
                    allow="clipboard-read; clipboard-write; fullscreen"
                    className="h-full w-full border-0 bg-[#0b0b0b]"
                    src={state.streamUrl}
                    title="E2B desktop stream"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),#101010] bg-[length:34px_34px] p-6 text-center">
                    <div>
                      <strong className="block text-base">{emptyTitle}</strong>
                      <span className="mt-2 block max-w-xl text-sm leading-6 text-muted-foreground">{emptyCopy}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="grid content-start gap-2.5">
            <StatusCard label="API key" value={state.apiKeyConfigured ? "configured" : "missing E2B_API_KEY"} kind={state.apiKeyConfigured ? "ok" : "error"} />
            <StatusCard label="Sandbox status" value={state.status} kind={statusKind} />
            <StatusCard label="Sandbox ID" value={state.sandboxId || "none"} />
            <StatusCard label="Started at" value={state.startedAt ? new Date(state.startedAt).toLocaleString() : "not started"} />
            <StatusCard label="Stream URL" value={state.hasStreamUrl ? state.streamUrl : "unavailable"} kind={state.hasStreamUrl ? "ok" : "warn"} />
            <StatusCard label="Last error" value={state.lastError || "none"} kind={state.lastError ? "error" : ""} />
          </aside>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <h2 className="mb-3 text-sm font-semibold">Smoke Test Activity</h2>
          <div className="grid gap-2">
            {logs.length ? (
              logs.map((item, index) => (
                <div className="grid items-center gap-2 text-xs text-muted-foreground md:grid-cols-[72px_88px_minmax(0,1fr)]" key={`${item.time}-${item.type}-${index}`}>
                  <code className="font-mono text-[10px] text-muted-foreground">{item.time}</code>
                  <span className="justify-self-start rounded bg-white/10 px-1.5 py-1 font-mono text-[10px] font-bold uppercase text-sky-200">{item.type}</span>
                  <span>{item.message}</span>
                </div>
              ))
            ) : (
              <div className="grid items-center gap-2 text-xs text-muted-foreground md:grid-cols-[72px_88px_minmax(0,1fr)]">
                <code className="font-mono text-[10px] text-muted-foreground">--:--:--</code>
                <span className="justify-self-start rounded bg-white/10 px-1.5 py-1 font-mono text-[10px] font-bold uppercase text-sky-200">ready</span>
                <span>Waiting for smoke test action.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({ label, value, kind = "" }: { label: string; value: string; kind?: "ok" | "warn" | "error" | "" }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-[#0f0f0f] p-3">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className={`truncate font-mono text-xs leading-5 ${valueClass(kind)}`}>{value}</div>
    </div>
  );
}
