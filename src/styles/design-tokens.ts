/**
 * Design tokens — single source of truth for Agent Room visual language.
 *
 * USAGE
 * ─────
 *   import { tokens } from "@/styles/design-tokens";
 *
 *   <div style={{ background: tokens.color.bg.surface, padding: tokens.space[4] }}>
 *
 * Or via Tailwind utilities (mapped in globals.css @theme):
 *   <div className="bg-surface p-4 text-primary">
 *
 * RULE: never hardcode hex codes, rgb()/rgba() values, or arbitrary px sizes
 * in components. If you need a value that isn't here, add it to this file.
 *
 * The legacy.* palette is DEPRECATED — kept only so old code still compiles.
 * Migrate callers to color.accent.* and remove legacy in Session 6.
 */

/**
 * Color tokens.
 * - bg.*       surfaces and panels (dark base + raised levels)
 * - border.*   1px hairlines; pick by emphasis
 * - text.*     foreground text by emphasis
 * - accent.*   THE single brand accent. Use only for primary CTAs,
 *              active states, success, "live" indicators. Never decorative.
 * - status.*   semantic only (error/warn/info), never decorative
 * - legacy.*   deprecated; do not use in new code
 */
export const color = {
  bg: {
    base: "#0A0A0A",
    surface: "#111111",
    surfaceHi: "#161616",
    input: "#0D0D0D",
  },
  border: {
    subtle: "rgba(255,255,255,0.06)",
    default: "rgba(255,255,255,0.10)",
    strong: "rgba(255,255,255,0.16)",
    focus: "rgba(62,233,140,0.40)",
  },
  text: {
    primary: "#FAFAFA",
    secondary: "#A1A1A1",
    muted: "#6B6B6B",
    disabled: "#4A4A4A",
  },
  accent: {
    hero: "#3EE98C",
    heroDim: "rgba(62,233,140,0.12)",
    heroFg: "#0A0A0A",
  },
  status: {
    error: "#E24B4A",
    warn: "#F5B544",
    info: "#6FAFE3",
  },
  /** DEPRECATED — do not use in new code. */
  legacy: {
    purple: "#C589FF",
    blue: "#6FAFE3",
  },
} as const;

/**
 * Typography scale. Inter for UI, JetBrains Mono for IDs / numbers / code.
 * Use mono for: sandbox IDs, run IDs, credit counts, durations, dimensions.
 */
export const typography = {
  display: { size: "32px", lineHeight: "1.2", weight: 700, family: "Inter" },
  h1: { size: "24px", lineHeight: "1.25", weight: 600, family: "Inter" },
  h2: { size: "20px", lineHeight: "1.3", weight: 600, family: "Inter" },
  h3: { size: "16px", lineHeight: "1.4", weight: 500, family: "Inter" },
  body: { size: "14px", lineHeight: "1.5", weight: 400, family: "Inter" },
  bodySmall: { size: "13px", lineHeight: "1.5", weight: 400, family: "Inter" },
  caption: { size: "12px", lineHeight: "1.4", weight: 400, family: "Inter" },
  mono: { size: "13px", lineHeight: "1.5", weight: 400, family: "JetBrains Mono" },
  monoSmall: { size: "11px", lineHeight: "1.4", weight: 500, family: "JetBrains Mono" },
} as const;

/**
 * Spacing — 4px grid. These are the ONLY allowed values for padding,
 * margin, and gap. If you need 7px, you don't. Use 8.
 */
export const space = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

/** Border radii. `full` for pills, `lg`/`xl` for cards, `md` for buttons. */
export const radius = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

/**
 * Shadows. `glow` is reserved for hero/active accent states only —
 * use sparingly so it stays meaningful.
 */
export const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.4)",
  md: "0 4px 12px rgba(0,0,0,0.5)",
  lg: "0 12px 32px rgba(0,0,0,0.6)",
  glow: "0 0 0 1px rgba(62,233,140,0.20), 0 0 24px rgba(62,233,140,0.15)",
} as const;

export const tokens = {
  color,
  typography,
  space,
  radius,
  shadow,
} as const;

export type Tokens = typeof tokens;
