"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const TOKEN = {
  surface: "#0F0F0F",
  borderSubtle: "#1F1F1F",
  accentHero: "#3EE98C",
  accentHeroFg: "#0A0A0A",
  textPrimary: "#F5F5F5",
  textMuted: "#A0A0A0",
  textDim: "#888",
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
};

export type CreditPackCardProps = {
  price: string;
  credits: string;
  minutesEstimate: string;
  badge?: string;
  ctaLabel?: string;
  ctaHref?: string;
  highlighted?: boolean;
};

export function CreditPackCard({
  price,
  credits,
  minutesEstimate,
  badge,
  ctaLabel = "Buy pack",
  ctaHref = "/signup?intent=credits",
  highlighted = false,
}: CreditPackCardProps) {
  const cardStyle: React.CSSProperties = highlighted
    ? {
        background:
          "linear-gradient(180deg, rgba(62,233,140,0.05), rgba(62,233,140,0.02))",
        borderColor: "rgba(62,233,140,0.45)",
      }
    : {
        background: TOKEN.surface,
        borderColor: TOKEN.borderSubtle,
      };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative flex flex-col rounded-2xl border p-5"
      style={cardStyle}
    >
      {badge ? (
        <span
          className="absolute -top-2.5 left-5 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-[0.18em]"
          style={{
            ...MONO,
            background: TOKEN.accentHero,
            borderColor: TOKEN.accentHero,
            color: TOKEN.accentHeroFg,
          }}
        >
          {badge}
        </span>
      ) : null}

      <div className="flex items-baseline justify-between gap-3">
        <span
          className="text-3xl font-semibold"
          style={{ color: TOKEN.textPrimary }}
        >
          {price}
        </span>
        <span style={{ color: TOKEN.textMuted, fontSize: 13 }}>{credits}</span>
      </div>

      <p
        className="mt-2"
        style={{ color: TOKEN.textDim, fontSize: 12, ...MONO }}
      >
        {minutesEstimate}
      </p>

      <Link
        href={ctaHref}
        className="mt-5 inline-flex w-full items-center justify-center transition hover:opacity-90"
        style={{
          height: 38,
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          background: highlighted ? TOKEN.accentHero : "transparent",
          border: highlighted ? "none" : `1px solid ${TOKEN.borderSubtle}`,
          color: highlighted ? TOKEN.accentHeroFg : TOKEN.textPrimary,
        }}
      >
        {ctaLabel}
      </Link>
    </motion.div>
  );
}

export default CreditPackCard;
