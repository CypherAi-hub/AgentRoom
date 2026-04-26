"use client";

import { useEffect } from "react";
import Link from "next/link";
import { tokens } from "@/styles/design-tokens";

const PAGE_STYLE: React.CSSProperties = {
  background: tokens.color.bg.base,
  color: tokens.color.text.primary,
  fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
};

const PRIMARY_BTN: React.CSSProperties = {
  background: tokens.color.accent.hero,
  color: tokens.color.accent.heroFg,
  borderRadius: tokens.radius.md,
  padding: `${tokens.space[3]} ${tokens.space[5]}`,
  fontWeight: 600,
  fontSize: "14px",
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.space[2],
};

const SECONDARY_LINK: React.CSSProperties = {
  color: tokens.color.text.secondary,
  fontSize: "13px",
  marginTop: tokens.space[4],
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[app error boundary]", error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen w-full items-center justify-center px-5" style={PAGE_STYLE}>
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{
            borderColor: tokens.color.border.subtle,
            color: tokens.color.status.error,
            fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
          }}
        >
          ERROR
        </span>
        <h1
          className="mt-6 text-[32px] font-bold leading-tight tracking-tight"
          style={{ color: tokens.color.text.primary }}
        >
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: tokens.color.text.secondary }}>
          We hit an unexpected error rendering this page. Try again, or head back to your dashboard.
        </p>
        {error.digest ? (
          <code
            className="mt-4 inline-block rounded-md border px-2.5 py-1 text-[11px]"
            style={{
              borderColor: tokens.color.border.subtle,
              color: tokens.color.text.muted,
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
            }}
          >
            digest: {error.digest}
          </code>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 cursor-pointer transition hover:opacity-90"
          style={PRIMARY_BTN}
        >
          Try again <span aria-hidden="true">↻</span>
        </button>
        <Link href="/dashboard" className="hover:underline" style={SECONDARY_LINK}>
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
