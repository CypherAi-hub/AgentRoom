"use client";

import styles from "@/app/dev/sandbox-test/sandbox.module.css";

/**
 * Placeholder for the VM viewport while the stream is connecting.
 * Matches the 16:10 aspect ratio of the live iframe and uses the
 * shared shimmer keyframes so the page never shows a spinner.
 */
export function SkeletonVM() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-md"
      style={{
        aspectRatio: "16 / 10",
        background: "#0D0D0D",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className={`absolute inset-0 ${styles.shimmer}`} aria-hidden />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div
      className="rounded-md"
      style={{
        height: 56,
        border: "1px solid rgba(255,255,255,0.06)",
        background: "#111111",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div className={`absolute inset-0 ${styles.shimmer}`} aria-hidden />
    </div>
  );
}
