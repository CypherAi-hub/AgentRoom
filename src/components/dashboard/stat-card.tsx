"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type StatCardProps = {
  value: number;
  label: string;
  delta?: number;
};

/**
 * Phase 5.3 dashboard stat card.
 *
 * Renders a numeric metric with an animated count-up on mount, an
 * uppercase caption label, and an optional ↑/↓ delta with semantic
 * color (green = up, red = down).
 */
export function StatCard({ value, label, delta }: StatCardProps) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 600;
    const target = Number.isFinite(value) ? value : 0;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [value]);

  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const up = hasDelta && (delta as number) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-border-subtle bg-bg-surface p-6"
    >
      <p className="text-[12px] uppercase tracking-[0.16em] text-text-muted">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-[32px] font-bold leading-none text-text-primary tabular-nums">
          {display.toLocaleString()}
        </span>
        {hasDelta ? (
          <span
            className={
              "text-xs font-semibold " +
              (up ? "text-accent-hero" : "text-status-error")
            }
          >
            {up ? "↑" : "↓"} {Math.abs(delta as number).toFixed(1)}%
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

/** Skeleton shimmer placeholder used while stats load. */
export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-6">
      <div className="ar-shimmer h-3 w-24 animate-pulse rounded bg-white/5" />
      <div className="ar-shimmer mt-3 h-8 w-20 animate-pulse rounded bg-white/5" />
    </div>
  );
}
