"use client";

import { motion } from "framer-motion";

export type StatusPillKind = "idle" | "starting" | "running" | "done" | "error";

const STYLES: Record<StatusPillKind, { background: string; color: string; border: string; boxShadow?: string }> = {
  idle: {
    background: "transparent",
    color: "#6B6B6B",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  starting: {
    background: "rgba(62,233,140,0.12)",
    color: "#3EE98C",
    border: "1px solid rgba(62,233,140,0.30)",
  },
  running: {
    background: "#3EE98C",
    color: "#0A0A0A",
    border: "1px solid rgba(62,233,140,0.40)",
    boxShadow: "0 0 0 1px rgba(62,233,140,0.20), 0 0 24px rgba(62,233,140,0.15)",
  },
  done: {
    background: "#6FAFE3",
    color: "#FAFAFA",
    border: "1px solid rgba(111,175,227,0.40)",
  },
  error: {
    background: "#E24B4A",
    color: "#FAFAFA",
    border: "1px solid rgba(226,75,74,0.40)",
  },
};

const LABEL: Record<StatusPillKind, string> = {
  idle: "IDLE",
  starting: "STARTING",
  running: "RUNNING",
  done: "DONE",
  error: "ERROR",
};

export function StatusPill({ kind, label }: { kind: StatusPillKind; label?: string }) {
  const s = STYLES[kind];
  return (
    <motion.span
      key={kind}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ type: "spring", stiffness: 320, damping: 18, duration: 0.2 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        padding: "4px 8px",
        borderRadius: 6,
        transition: "background-color 200ms ease, color 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
        ...s,
      }}
      className={kind === "starting" ? "animate-pulse" : ""}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: kind === "running" || kind === "starting" ? "currentColor" : "currentColor",
          opacity: kind === "idle" ? 0.5 : 1,
        }}
      />
      {label ?? LABEL[kind]}
    </motion.span>
  );
}
