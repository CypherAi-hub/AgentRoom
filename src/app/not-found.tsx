import Link from "next/link";
import type { Metadata } from "next";
import { tokens } from "@/styles/design-tokens";

export const metadata: Metadata = {
  title: "Page not found · Agent Room",
};

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

export default function NotFound() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-5" style={PAGE_STYLE}>
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{
            borderColor: tokens.color.border.subtle,
            color: tokens.color.text.muted,
            fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
          }}
        >
          404
        </span>
        <h1
          className="mt-6 text-[32px] font-bold leading-tight tracking-tight"
          style={{ color: tokens.color.text.primary }}
        >
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: tokens.color.text.secondary }}>
          The page you&apos;re looking for doesn&apos;t exist or was moved.
        </p>
        <Link href="/dashboard" className="mt-8 transition hover:opacity-90" style={PRIMARY_BTN}>
          Back to dashboard <span aria-hidden="true">→</span>
        </Link>
        <Link href="/" className="hover:underline" style={SECONDARY_LINK}>
          Go to home
        </Link>
      </div>
    </main>
  );
}
