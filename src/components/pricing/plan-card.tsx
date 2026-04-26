"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

// Local design tokens (mirrors src/styles/design-tokens.ts intent).
const TOKEN = {
  bg: "#0A0A0A",
  surface: "#0F0F0F",
  borderSubtle: "#1F1F1F",
  accentHero: "#3EE98C",
  accentHeroFg: "#0A0A0A",
  textPrimary: "#F5F5F5",
  textMuted: "#A0A0A0",
  textDim: "#888",
  shadowGlow: "0 24px 80px rgba(62,233,140,0.18)",
  radiusLg: 14,
  radiusMd: 8,
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
};

export type PlanCardProps = {
  eyebrow: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
  badge?: string;
  pill?: string;
  subDescription?: string;
  footnote?: string;
};

export function PlanCard({
  eyebrow,
  price,
  priceSuffix,
  description,
  features,
  ctaLabel,
  ctaHref,
  highlighted = false,
  badge,
  pill,
  subDescription,
  footnote,
}: PlanCardProps) {
  const cardStyle: React.CSSProperties = highlighted
    ? {
        background:
          "linear-gradient(180deg, rgba(62,233,140,0.06), rgba(62,233,140,0.02))",
        borderColor: TOKEN.accentHero,
        boxShadow: TOKEN.shadowGlow,
      }
    : {
        background: TOKEN.surface,
        borderColor: TOKEN.borderSubtle,
      };

  const ctaStyle: React.CSSProperties = highlighted
    ? { background: TOKEN.accentHero, color: TOKEN.accentHeroFg }
    : {
        background: "transparent",
        border: `1px solid ${TOKEN.borderSubtle}`,
        color: TOKEN.textPrimary,
      };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative flex flex-col rounded-[14px] border p-6"
      style={cardStyle}
    >
      {badge ? (
        <span
          className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-[0.18em]"
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

      <div
        className="text-[11px] font-bold tracking-[0.22em]"
        style={{ ...MONO, color: TOKEN.textDim }}
      >
        {eyebrow}
      </div>

      <div className="mt-5 flex items-baseline gap-1">
        <span
          className="text-5xl font-semibold leading-none"
          style={{ color: TOKEN.textPrimary }}
        >
          {price}
        </span>
        <span style={{ color: TOKEN.textMuted, fontSize: 16 }}>
          {priceSuffix}
        </span>
      </div>

      <p
        className="mt-4 leading-6"
        style={{ color: TOKEN.textMuted, fontSize: 14 }}
      >
        {description}
      </p>

      {subDescription ? (
        <>
          <div
            className="mt-4 h-px"
            style={{ background: TOKEN.borderSubtle }}
          />
          <p className="mt-3" style={{ color: TOKEN.accentHero, fontSize: 14 }}>
            {subDescription}
          </p>
        </>
      ) : null}

      {pill ? (
        <span
          className="mt-3 inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-[0.16em]"
          style={{
            ...MONO,
            background: "rgba(62,233,140,0.08)",
            borderColor: "rgba(62,233,140,0.35)",
            color: TOKEN.accentHero,
          }}
        >
          {pill}
        </span>
      ) : null}

      <ul className="mt-5 flex flex-col gap-2.5">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5"
            style={{ fontSize: 14 }}
          >
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
              style={{ color: TOKEN.accentHero }}
            />
            <span style={{ color: TOKEN.textPrimary }}>{feature}</span>
          </li>
        ))}
      </ul>

      {footnote ? (
        <p className="mt-4 text-xs" style={{ color: TOKEN.textDim }}>
          {footnote}
        </p>
      ) : null}

      <div className="mt-6 flex-1" />

      <Link
        href={ctaHref}
        className="inline-flex w-full items-center justify-center gap-2 transition hover:opacity-90"
        style={{
          height: 44,
          borderRadius: TOKEN.radiusMd,
          fontWeight: 600,
          fontSize: 14,
          ...ctaStyle,
        }}
      >
        {ctaLabel}
      </Link>
    </motion.div>
  );
}

export default PlanCard;
