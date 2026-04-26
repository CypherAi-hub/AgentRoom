"use client";

import { type ReactNode } from "react";

/**
 * Cross-fades the runs list when filter state changes. Uses the `key` prop on
 * the inner wrapper so React remounts it on filter change, re-running the CSS
 * keyframe animation.
 */
export function RunsListAnimator({
  filterKey,
  children,
}: {
  filterKey: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div
        key={filterKey}
        className="motion-safe:animate-[runsFade_150ms_ease-out_both]"
      >
        {children}
      </div>
      <style jsx>{`
        @keyframes runsFade {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
