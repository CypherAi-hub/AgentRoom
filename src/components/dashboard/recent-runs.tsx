"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";

type RunRow = {
  id: string;
  status: string;
  taskPrompt: string;
  createdAt: string | null | undefined;
};

function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "—";
  const diffMs = Date.now() - ts;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") {
    return <Check className="size-4 text-accent-hero" aria-hidden />;
  }
  if (status === "error" || status === "failed") {
    return <X className="size-4 text-status-error" aria-hidden />;
  }
  // running / pending / stopped → warn-tinted spinner
  return (
    <Loader2
      className="size-4 animate-spin text-[color:var(--color-status-warn,#F5B544)]"
      aria-hidden
    />
  );
}

export function RecentRuns({ runs }: { runs: RunRow[] }) {
  if (!runs.length) {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-6 text-sm text-text-secondary">
        No runs yet.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
      <ul className="divide-y divide-[var(--color-border-subtle,rgba(255,255,255,0.06))]">
        {runs.map((run, i) => (
          <motion.li
            key={run.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: i * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Link
              href={`/runs/${run.id}`}
              className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-bg-surface-hi"
            >
              <StatusIcon status={run.status} />
              <span className="font-mono text-xs text-text-muted truncate max-w-[7rem]">
                {run.id.slice(0, 8)}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-primary">
                {run.taskPrompt}
              </span>
              <span className="shrink-0 text-xs text-text-muted">
                {relativeTime(run.createdAt)}
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function RecentRunsSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
      <ul className="divide-y divide-[var(--color-border-subtle,rgba(255,255,255,0.06))]">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 px-4 py-3"
          >
            <div className="ar-shimmer size-4 animate-pulse rounded-full bg-white/5" />
            <div className="ar-shimmer h-3 w-20 animate-pulse rounded bg-white/5" />
            <div className="ar-shimmer h-3 flex-1 animate-pulse rounded bg-white/5" />
            <div className="ar-shimmer h-3 w-12 animate-pulse rounded bg-white/5" />
          </li>
        ))}
      </ul>
    </div>
  );
}
