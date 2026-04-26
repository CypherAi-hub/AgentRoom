/**
 * Motion tokens. Keep durations short and easings consistent.
 *
 * USAGE
 *   import { motion } from "@/styles/motion";
 *   transition={{ duration: 0.2, ease: motion.easing.out }}
 *
 * RULE OF THUMB
 *   - State swap (color, opacity)        → fast (150ms)
 *   - Entry / exit (fade, slide)         → base (200ms)
 *   - Layout reflow (drawer, accordion)  → slow (300ms)
 *   - Status pop (badge change)          → spring + pop scale
 */
export const duration = {
  instant: "100ms",
  fast: "150ms",
  base: "200ms",
  slow: "300ms",
  slower: "500ms",
} as const;

/** Numeric (seconds) versions for framer-motion `transition.duration`. */
export const durationS = {
  instant: 0.1,
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  slower: 0.5,
} as const;

export const easing = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Cubic bezier arrays for framer-motion `ease`. */
export const easingArr = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const scale = {
  subtle: { from: 0.96, to: 1.0 },
  pop: { from: 0.92, to: 1.0 },
} as const;

export const motion = { duration, durationS, easing, easingArr, scale } as const;

export type Motion = typeof motion;
