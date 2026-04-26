"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Monitor, AlertTriangle } from "lucide-react";
import { SkeletonVM } from "./skeleton-vm";

type VmViewportProps = {
  streamUrl: string;
  streamReady: boolean;
  starting: boolean;
  sandboxId: string;
  errorMessage: string | null;
  onStart: () => void;
  startDisabled?: boolean;
};

/**
 * VM stage. Three states:
 *  - empty   → centered "Ready when you are." copy + Start CTA
 *  - loading → SkeletonVM with shimmer
 *  - live    → fades in noVNC iframe (200ms)
 */
export function VmViewport({
  streamUrl,
  streamReady,
  starting,
  sandboxId,
  errorMessage,
  onStart,
  startDisabled,
}: VmViewportProps) {
  const showLive = streamReady && Boolean(streamUrl);
  const showSkeleton = !showLive && starting;

  return (
    <section
      className="overflow-hidden rounded-lg"
      style={{
        background: "#111111",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{
          background: "#161616",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="grid place-items-center rounded-md"
            style={{
              width: 32,
              height: 32,
              background: "rgba(62,233,140,0.12)",
              color: "#3EE98C",
              border: "1px solid rgba(62,233,140,0.30)",
            }}
          >
            <Monitor className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: "#FAFAFA" }}>
              Sandbox Desktop
            </div>
            <div
              className="truncate font-mono"
              style={{ fontSize: 11, color: "#6B6B6B" }}
            >
              {sandboxId || "No sandbox active"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 6,
              border: streamReady ? "1px solid rgba(226,75,74,0.30)" : "1px solid rgba(255,255,255,0.06)",
              background: streamReady ? "rgba(226,75,74,0.10)" : "transparent",
              color: streamReady ? "#E24B4A" : "#6B6B6B",
            }}
          >
            {streamReady ? "REC / STREAMING" : "OFFLINE"}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#6B6B6B",
            }}
          >
            1024 x 720
          </span>
        </div>
      </div>

      <div className="p-3" style={{ background: "#0A0A0A" }}>
        <AnimatePresence mode="wait" initial={false}>
          {showLive ? (
            <motion.div
              key="live"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full overflow-hidden rounded-md"
              style={{ aspectRatio: "16 / 10", background: "#0D0D0D" }}
            >
              <iframe
                allow="clipboard-read; clipboard-write; fullscreen"
                sandbox="allow-scripts allow-same-origin"
                className="h-full w-full border-0"
                src={streamUrl}
                title="E2B desktop stream"
                style={{ background: "#0D0D0D" }}
              />
            </motion.div>
          ) : showSkeleton ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <SkeletonVM />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative grid w-full place-items-center overflow-hidden rounded-md"
              style={{
                aspectRatio: "16 / 10",
                background: "#0D0D0D",
                border: "1px solid rgba(255,255,255,0.06)",
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            >
              <div className="max-w-md px-6 text-center">
                <div
                  className="mx-auto mb-4 grid place-items-center rounded-md"
                  style={{
                    width: 44,
                    height: 44,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "#111111",
                    color: "#A1A1A1",
                  }}
                >
                  {errorMessage ? (
                    <AlertTriangle className="size-5" style={{ color: "#E24B4A" }} />
                  ) : (
                    <Monitor className="size-5" />
                  )}
                </div>
                <h2
                  className="font-semibold"
                  style={{ fontSize: 24, lineHeight: 1.25, color: "#FAFAFA" }}
                >
                  Ready when you are.
                </h2>
                <p
                  className="mt-2 leading-6"
                  style={{ fontSize: 14, color: "#A1A1A1" }}
                >
                  {errorMessage ??
                    "Start a sandbox to spin up a real cloud desktop. Give the agent a task and watch it work — every click, keystroke, and screenshot is captured below."}
                </p>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={onStart}
                  disabled={startDisabled}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    height: 40,
                    background: "#3EE98C",
                    color: "#0A0A0A",
                    border: "1px solid rgba(62,233,140,0.40)",
                    transition: "background-color 200ms ease, box-shadow 200ms ease",
                  }}
                >
                  Start sandbox
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
