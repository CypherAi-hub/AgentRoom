"use client";

import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MousePointer2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import styles from "@/app/dev/sandbox-test/sandbox.module.css";
import { SkeletonRow } from "./skeleton-vm";

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

export type AgentEvent = {
  ts: number;
  type: AgentEventType;
  payload: unknown;
};

type PayloadRecord = Record<string, unknown>;

function isRecord(value: unknown): value is PayloadRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function payloadRecord(event: AgentEvent) {
  return isRecord(event.payload) ? event.payload : {};
}

function statusText(status: string) {
  return status.replaceAll("_", " ").toUpperCase();
}

function formatTime(value: number | string | null) {
  if (!value) return "--:--:--";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function eventKey(event: AgentEvent) {
  const payload = payloadRecord(event);
  const id = typeof payload.tool_use_id === "string" ? payload.tool_use_id : "";
  const action = typeof payload.action === "string" ? payload.action : "";
  return `${event.ts}:${event.type}:${id}:${action}`;
}

function eventTone(type: AgentEventType, payload: PayloadRecord) {
  if (type === "error" || (type === "tool_result" && payload.ok === false)) return "red";
  if (
    type === "unsupported_action" ||
    type === "stopped_requested" ||
    type === "stopped" ||
    type === "max_iterations_reached" ||
    type === "max_runtime_reached"
  ) {
    return "amber";
  }
  if (
    type === "agent_started" ||
    type === "done" ||
    type === "tool_use" ||
    (type === "tool_result" && payload.ok !== false)
  ) {
    return "green";
  }
  return "muted";
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

function toneBg(tone: string): string {
  if (tone === "green") return "rgba(62,233,140,0.06)";
  if (tone === "amber") return "rgba(245,181,68,0.06)";
  if (tone === "red") return "rgba(226,75,74,0.06)";
  return "#0D0D0D";
}

function toneBorder(tone: string): string {
  if (tone === "green") return "1px solid rgba(62,233,140,0.20)";
  if (tone === "amber") return "1px solid rgba(245,181,68,0.20)";
  if (tone === "red") return "1px solid rgba(226,75,74,0.20)";
  return "1px solid rgba(255,255,255,0.06)";
}

function toneFg(tone: string): string {
  if (tone === "green") return "#3EE98C";
  if (tone === "amber") return "#F5B544";
  if (tone === "red") return "#E24B4A";
  return "#A1A1A1";
}

type ActivityDrawerProps = {
  events: AgentEvent[];
  initialLoading: boolean;
  expandedScreenshots: Set<string>;
  expandedJsonRows: Set<string>;
  setExpandedScreenshots: Dispatch<SetStateAction<Set<string>>>;
  setExpandedJsonRows: Dispatch<SetStateAction<Set<string>>>;
};

export function ActivityDrawer({
  events,
  initialLoading,
  expandedScreenshots,
  expandedJsonRows,
  setExpandedScreenshots,
  setExpandedJsonRows,
}: ActivityDrawerProps) {
  const [open, setOpen] = useState(false);
  const hasAutoExpandedRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-expand on first event arrival.
  useEffect(() => {
    if (!hasAutoExpandedRef.current && events.length > 0) {
      hasAutoExpandedRef.current = true;
      setOpen(true);
    }
  }, [events.length]);

  // Auto-scroll to newest event when open.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [events.length, open]);

  return (
    <section
      className="rounded-lg"
      style={{
        background: "#111111",
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        style={{
          background: "#161616",
          borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none",
          color: "#FAFAFA",
          transition: "background-color 200ms ease",
        }}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          <h2 className="text-sm font-semibold">Agent Activity</h2>
        </div>
        <span
          className="font-mono"
          style={{
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#A1A1A1",
          }}
        >
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              ref={listRef}
              className="grid gap-2 p-3"
              style={{ maxHeight: 480, overflowY: "auto" }}
            >
              {initialLoading && events.length === 0 ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : events.length === 0 ? (
                <div
                  className="rounded-md px-5 py-10 text-center"
                  style={{
                    border: "1px dashed rgba(255,255,255,0.06)",
                    color: "#6B6B6B",
                    fontSize: 13,
                  }}
                >
                  Agent actions will appear here.
                </div>
              ) : (
                events.map((event) => (
                  <EventRow
                    key={eventKey(event)}
                    event={event}
                    expandedJsonRows={expandedJsonRows}
                    expandedScreenshots={expandedScreenshots}
                    setExpandedJsonRows={setExpandedJsonRows}
                    setExpandedScreenshots={setExpandedScreenshots}
                  />
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function EventRow({
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
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-md p-3"
      style={{ background: toneBg(tone), border: toneBorder(tone) }}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded font-mono"
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "4px 8px",
                color: toneFg(tone),
                border: toneBorder(tone),
                background: toneBg(tone),
              }}
            >
              <EventIcon type={event.type} payload={payload} />
              {event.type === "tool_use" ? action : statusText(event.type)}
            </span>
            <span className="font-mono" style={{ fontSize: 10, color: "#6B6B6B" }}>
              {formatTime(event.ts)}
            </span>
          </div>
          <EventBody action={action} event={event} message={message} payload={payload} text={text} />
        </div>
        <button
          type="button"
          onClick={toggleJson}
          className="self-start rounded font-mono"
          style={{
            fontSize: 10,
            padding: "4px 8px",
            color: "#A1A1A1",
            background: "#0D0D0D",
            border: "1px solid rgba(255,255,255,0.06)",
            transition: "color 200ms ease",
          }}
        >
          {isJsonExpanded ? "hide json" : "json"}
        </button>
      </div>

      {event.type === "screenshot" && b64 ? (
        <button type="button" onClick={toggleScreenshot} className="mt-3 block text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Agent screenshot"
            src={`data:image/png;base64,${b64}`}
            className={isScreenshotExpanded ? "max-h-[420px] rounded" : "h-24 rounded"}
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          />
        </button>
      ) : null}

      {isJsonExpanded ? (
        <pre
          className={`mt-3 max-h-72 overflow-auto rounded p-3 ${styles.shimmer ? "" : ""}`}
          style={{
            fontSize: 11,
            lineHeight: 1.5,
            color: "#A1A1A1",
            background: "#0D0D0D",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {jsonPreview(event.payload)}
        </pre>
      ) : null}
    </motion.article>
  );
}

function EventIcon({ type, payload }: { type: AgentEventType; payload: PayloadRecord }) {
  if (type === "screenshot") return <Camera className="size-3" />;
  if (type === "tool_use") return <MousePointer2 className="size-3" />;
  if (type === "tool_result" && payload.ok !== false) return <CheckCircle2 className="size-3" />;
  if (type === "error" || payload.ok === false) return <AlertTriangle className="size-3" />;
  return <Activity className="size-3" />;
}

function EventBody({
  action,
  event,
  message,
  payload,
  text,
}: {
  action: string;
  event: AgentEvent;
  message: string;
  payload: PayloadRecord;
  text: string;
}) {
  if (event.type === "agent_started") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#3EE98C" }}>
        Agent started: {typeof payload.taskPrompt === "string" ? payload.taskPrompt : "task received"}
      </p>
    );
  }
  if (event.type === "assistant_message") {
    return (
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6" style={{ color: "#A1A1A1" }}>
        {text || "Claude is choosing the next desktop action."}
      </p>
    );
  }
  if (event.type === "tool_use") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#3EE98C" }}>
        Action: <span className="font-mono">{action}</span>
        {payload.input ? <span style={{ color: "#6B6B6B" }}> — {inputSummary(payload.input)}</span> : null}
      </p>
    );
  }
  if (event.type === "screenshot") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#A1A1A1" }}>
        Screenshot captured from the live desktop.
      </p>
    );
  }
  if (event.type === "tool_result") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#A1A1A1" }}>
        {payload.ok === false ? `Action failed: ${String(payload.error || "unknown error")}` : "Action completed."}
      </p>
    );
  }
  if (event.type === "unsupported_action") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#F5B544" }}>
        Unsupported action: <span className="font-mono">{action}</span>
      </p>
    );
  }
  if (event.type === "done") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#3EE98C" }}>
        {message || "Agent finished."}
      </p>
    );
  }
  if (event.type === "stopped" || event.type === "stopped_requested") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#F5B544" }}>
        {message || "Agent stop requested."}
      </p>
    );
  }
  if (event.type === "max_iterations_reached") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#F5B544" }}>
        Max iteration safety cap reached.
      </p>
    );
  }
  if (event.type === "max_runtime_reached") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#F5B544" }}>
        Max runtime safety cap reached.
      </p>
    );
  }
  if (event.type === "error") {
    return (
      <p className="mt-2 text-sm" style={{ color: "#E24B4A" }}>
        {message || "Agent error."}
      </p>
    );
  }
  return null;
}
