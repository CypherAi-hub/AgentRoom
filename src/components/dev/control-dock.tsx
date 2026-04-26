"use client";

import { motion } from "framer-motion";
import {
  CircleStop,
  Loader2,
  MousePointer2,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import styles from "@/app/dev/sandbox-test/sandbox.module.css";

const EXAMPLE_PROMPTS = [
  "Take a screenshot of the desktop",
  "Open Firefox and go to news.ycombinator.com",
  "Open a terminal and run 'ls -la'",
  "Search for 'climate change' in DuckDuckGo",
] as const;

const TEXTAREA_MIN_ROWS = 3;
const TEXTAREA_MAX_ROWS = 12;
const TEXTAREA_LINE_HEIGHT_PX = 24;
const TEXTAREA_VERTICAL_PADDING_PX = 16;

type SandboxStatusKind = "idle" | "starting" | "running" | "error";
type AgentLifecycle = "idle" | "running" | "finished";

type ControlDockProps = {
  sandboxId: string;
  sandboxStatus: string;
  sandboxStatusKind: SandboxStatusKind;
  envOk: boolean;
  envMessage: string | null;
  taskPrompt: string;
  setTaskPrompt: (value: string) => void;
  promptRef: RefObject<HTMLTextAreaElement | null>;
  agentLifecycle: AgentLifecycle;
  busy: "sandbox" | "agent" | "cleanup" | null;
  canStartSandbox: boolean;
  canStopSandbox: boolean;
  canStartAgent: boolean;
  canStopAgent: boolean;
  runCostLabel: string;
  agentCapLabel: string;
  onStartSandbox: () => void;
  onStopSandbox: () => void;
  onStartAgent: () => void;
  onStopAgent: () => void;
  onNewRun: () => void;
  onRefresh: () => void;
};

export function ControlDock(props: ControlDockProps) {
  const {
    sandboxId,
    sandboxStatus,
    sandboxStatusKind,
    envOk,
    envMessage,
    taskPrompt,
    setTaskPrompt,
    promptRef,
    agentLifecycle,
    busy,
    canStartSandbox,
    canStopSandbox,
    canStartAgent,
    canStopAgent,
    runCostLabel,
    agentCapLabel,
    onStartSandbox,
    onStopSandbox,
    onStartAgent,
    onStopAgent,
    onNewRun,
    onRefresh,
  } = props;

  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const ref = promptRef ?? localRef;
  const [showRunDetails, setShowRunDetails] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    const maxHeightPx = TEXTAREA_LINE_HEIGHT_PX * TEXTAREA_MAX_ROWS + TEXTAREA_VERTICAL_PADDING_PX;
    node.style.height = `${Math.min(node.scrollHeight, maxHeightPx)}px`;
  }, [taskPrompt, ref]);

  const agentRunning = agentLifecycle === "running";
  const startGlow = busy === "agent" && agentRunning ? styles.pulseGlow : "";

  return (
    <aside className="flex flex-col gap-4">
      <Card title="Sandbox">
        <Row label="status" value={sandboxStatus} tone={sandboxStatusKind} />
        <Row label="sandbox id" value={sandboxId || "none"} mono />
        {envMessage ? (
          <p
            className="mt-2 rounded-md p-2 text-xs leading-5"
            style={{
              border: "1px solid rgba(245,181,68,0.25)",
              background: "rgba(245,181,68,0.08)",
              color: "#F5B544",
            }}
          >
            {envMessage}
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <DockButton
            onClick={onStartSandbox}
            disabled={!canStartSandbox}
            tone="primary"
            ariaLabel="Start sandbox"
          >
            {busy === "sandbox" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Start
          </DockButton>
          <DockButton
            onClick={onStopSandbox}
            disabled={!canStopSandbox}
            tone="danger"
            ariaLabel="Stop sandbox"
          >
            {busy === "cleanup" ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
            Cleanup
          </DockButton>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy !== null}
          className="mt-2 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md font-mono text-xs disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "transparent",
            color: "#A1A1A1",
            border: "1px solid rgba(255,255,255,0.06)",
            transition: "color 200ms ease, border-color 200ms ease",
          }}
        >
          <RefreshCw className="size-3.5" />
          Refresh state
        </button>
      </Card>

      <Card title="Task for the agent">
        <textarea
          ref={ref}
          className="w-full resize-none overflow-y-auto rounded-md px-3 py-2 text-sm leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "#0D0D0D",
            color: "#FAFAFA",
            border: "1px solid rgba(255,255,255,0.06)",
            transition: "border-color 200ms ease",
          }}
          onChange={(event) => setTaskPrompt(event.target.value)}
          placeholder="Tell the agent what to do. Be specific. Example: 'Open Firefox, navigate to github.com, search for typescript repos sorted by stars.'"
          value={taskPrompt}
          rows={TEXTAREA_MIN_ROWS}
          disabled={agentRunning}
        />

        {!agentRunning && agentLifecycle !== "finished" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <motion.button
                key={prompt}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setTaskPrompt(prompt)}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs"
                style={{
                  background: "#161616",
                  color: "#A1A1A1",
                  border: "1px solid rgba(255,255,255,0.06)",
                  transition: "color 200ms ease, border-color 200ms ease, background-color 200ms ease",
                }}
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        ) : null}

        <p className="mt-3 text-xs leading-5" style={{ color: "#6B6B6B" }}>
          Keep tasks simple. No logins, secrets, deletes, or external accounts.
        </p>

        {agentLifecycle === "finished" ? (
          <DockButton onClick={onNewRun} tone="primary" className="mt-3 w-full">
            <RefreshCw className="size-4" />
            Start a new run
          </DockButton>
        ) : agentRunning ? (
          <DockButton
            onClick={onStopAgent}
            disabled={!canStopAgent}
            tone="danger"
            className="mt-3 w-full"
          >
            {busy === "agent" ? <Loader2 className="size-4 animate-spin" /> : <CircleStop className="size-4" />}
            Stop run
          </DockButton>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onStartAgent}
            disabled={!canStartAgent}
            className={`mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              busy === "agent" ? startGlow : ""
            }`}
            style={{
              background: "#3EE98C",
              color: "#0A0A0A",
              border: "1px solid rgba(62,233,140,0.40)",
              transition: "background-color 200ms ease, box-shadow 200ms ease",
            }}
          >
            {busy === "agent" ? <Loader2 className="size-4 animate-spin" /> : <MousePointer2 className="size-4" />}
            Start Agent
          </motion.button>
        )}

        <button
          type="button"
          className="mt-3 inline-flex w-full items-center justify-between rounded-md px-2 py-1 text-xs"
          style={{ color: "#6B6B6B" }}
          onClick={() => setShowRunDetails((v) => !v)}
        >
          <span>{showRunDetails ? "Hide run details" : "Run details"}</span>
          <span className="font-mono">{showRunDetails ? "−" : "+"}</span>
        </button>
        {showRunDetails ? (
          <div
            className="mt-2 rounded-md p-3"
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              background: "#0D0D0D",
            }}
          >
            <Row label="run cost" value={runCostLabel} mono />
            <Row label="agent cap" value={agentCapLabel} mono />
            <Row label="env" value={envOk ? "ready" : "missing"} tone={envOk ? "running" : "error"} />
          </div>
        ) : null}
      </Card>
    </aside>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-lg p-4"
      style={{
        background: "#111111",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <h2 className="mb-3 text-sm font-semibold" style={{ color: "#FAFAFA" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  tone = "muted",
  mono,
}: {
  label: string;
  value: string;
  tone?: SandboxStatusKind | "muted";
  mono?: boolean;
}) {
  const color =
    tone === "running"
      ? "#3EE98C"
      : tone === "error"
        ? "#E24B4A"
        : tone === "starting"
          ? "#F5B544"
          : "#FAFAFA";
  return (
    <div
      className="flex min-w-0 items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#6B6B6B",
        }}
      >
        {label}
      </div>
      <div
        className={`min-w-0 truncate text-right ${mono ? "font-mono" : ""}`}
        style={{ fontSize: 12, color }}
      >
        {value}
      </div>
    </div>
  );
}

function DockButton({
  children,
  onClick,
  disabled,
  tone = "primary",
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "danger" | "ghost";
  className?: string;
  ariaLabel?: string;
}) {
  const styles_: Record<typeof tone, React.CSSProperties> = {
    primary: {
      background: "#3EE98C",
      color: "#0A0A0A",
      border: "1px solid rgba(62,233,140,0.40)",
    },
    danger: {
      background: "rgba(226,75,74,0.10)",
      color: "#E24B4A",
      border: "1px solid rgba(226,75,74,0.40)",
    },
    ghost: {
      background: "transparent",
      color: "#A1A1A1",
      border: "1px solid rgba(255,255,255,0.06)",
    },
  };
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        ...styles_[tone],
        transition: "background-color 200ms ease, color 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
      }}
    >
      {children}
    </motion.button>
  );
}
