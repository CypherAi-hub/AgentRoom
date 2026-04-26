"use client";

import { useState } from "react";
import { relativeTime } from "@/components/dashboard/dashboard-shared";

export type TimelineEvent = {
  id: string;
  toolName: string;
  toolInput?: string | null;
  toolResult?: string | null;
  timestamp: string;
  /** Color category. Maps to dot color. */
  category?: "screenshot" | "click" | "type" | "bash" | "error" | "default";
};

const DOT_COLOR: Record<NonNullable<TimelineEvent["category"]>, string> = {
  screenshot: "bg-sky-300 ring-sky-300/30",
  click: "bg-emerald-300 ring-emerald-300/30",
  type: "bg-emerald-300 ring-emerald-300/30",
  bash: "bg-amber-300 ring-amber-300/30",
  error: "bg-red-300 ring-red-300/30",
  default: "bg-muted-foreground ring-white/10",
};

export function EventTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card/40 px-4 py-6 text-sm text-muted-foreground">
        No events recorded for this run.
      </p>
    );
  }

  return (
    <ol className="relative ml-2 border-l pl-6 [border-color:var(--border)]">
      {events.map((evt, idx) => (
        <TimelineItem key={evt.id} event={evt} index={idx} />
      ))}
    </ol>
  );
}

function TimelineItem({ event, index }: { event: TimelineEvent; index: number }) {
  const category = event.category ?? "default";
  const dot = DOT_COLOR[category];
  return (
    <li
      className="relative pb-6 last:pb-0 motion-safe:animate-[fadeInUp_300ms_ease-out_both]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span
        className={`absolute -left-[33px] top-1 inline-block size-2.5 rounded-full ring-4 ${dot}`}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-foreground">
            {event.toolName}
          </h3>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {relativeTime(event.timestamp)}
          </span>
        </div>
        {event.toolInput ? (
          <pre className="overflow-x-auto rounded-md border bg-secondary/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
            <code>{event.toolInput}</code>
          </pre>
        ) : null}
        {event.toolResult ? <CollapsibleResult result={event.toolResult} /> : null}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </li>
  );
}

function CollapsibleResult({ result }: { result: string }) {
  const [open, setOpen] = useState(false);
  const isLong = result.length > 200 || result.split("\n").length > 4;
  if (!isLong) {
    return (
      <pre className="overflow-x-auto rounded-md border border-dashed bg-card/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
        <code>{result}</code>
      </pre>
    );
  }
  const preview = open ? result : result.slice(0, 200) + "…";
  return (
    <div className="flex flex-col gap-1.5">
      <pre className="overflow-x-auto rounded-md border border-dashed bg-card/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
        <code>{preview}</code>
      </pre>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="self-start text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition hover:text-foreground"
      >
        {open ? "Collapse" : "Expand"}
      </button>
    </div>
  );
}
