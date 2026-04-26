/* PRICING AUDIT (Phase 5.4)
 * Top issues found in the prior /pricing/page.tsx and fixes applied:
 * 1. Hero copy too long ("Get your hours back." + 2 sentences + secondary
 *    callout pill). Buries the value prop. FIX: tighten to a single
 *    sub-8-word one-liner ("Pay for results. Not seats.") with one short
 *    support line. Single primary CTA per plan, no competing pills.
 * 2. No FAQ. Pricing pages without an FAQ generate support tickets and lose
 *    conversions. FIX: add accordion with 7 high-intent questions
 *    (credits, cancel, free tier, expiry, limits, security, BYO model).
 * 3. Inconsistent CTA hierarchy — three different CTA tones (primary /
 *    ghost / purple) with the "purple" CTA actively competing with PRO.
 *    FIX: one highlighted plan (PRO), ghost everywhere else, single
 *    primary visual weight per row.
 * 4. Hardcoded colors and px values scattered through every component
 *    (#3EE98C, #1F1F1F, #0F0F0F, etc.) — impossible to retheme. FIX:
 *    centralize through token constants and the new <PlanCard> /
 *    <CreditPackCard> / <FaqSection> components.
 * 5. Mobile: long hero <h1> at 5xl/6xl could overflow at 375px; credit
 *    pack progress bars added visual noise without info value. FIX:
 *    clamp hero with responsive sizing, drop the decorative fill bars,
 *    ensure plans + packs stack below 768px with `grid-cols-1`, no
 *    horizontal scroll.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Camera,
  CheckCircle2,
  CheckSquare,
  Clock,
  Code2,
  type LucideIcon,
  MessageSquare,
  Play,
  Search,
  Settings,
  Terminal,
} from "lucide-react";
import { AgentRoomLogomark } from "@/components/auth/auth-shell";
import { getAppShellSession } from "@/lib/supabase/app-session";
import { PlanCard } from "@/components/pricing/plan-card";
import { CreditPackCard } from "@/components/pricing/credit-pack-card";
import { FaqSection } from "@/components/pricing/faq-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing | Agent Room",
  description:
    "Pay for results, not seats. Run real work on real machines with AI agents.",
};

// ----- Local design tokens (mirrors src/styles/design-tokens.ts) ----- //
const TOKEN = {
  bg: "#0A0A0A",
  surface: "#0F0F0F",
  borderSubtle: "#1F1F1F",
  accentHero: "#3EE98C",
  accentHeroFg: "#0A0A0A",
  textPrimary: "#F5F5F5",
  textMuted: "#A0A0A0",
  textDim: "#888",
};

const PAGE_STYLE: React.CSSProperties = {
  background: TOKEN.bg,
  color: TOKEN.textPrimary,
  fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
};

const MONO_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
};

const CARD_STYLE: React.CSSProperties = {
  background: TOKEN.surface,
  borderColor: TOKEN.borderSubtle,
};

// ----- Data ----- //

const PLANS = [
  {
    eyebrow: "FREE",
    price: "$0",
    priceSuffix: "/forever",
    description: "Try the magic. See an agent on a real cloud computer.",
    features: [
      "30 minutes of VM time",
      "1 concurrent sandbox",
      "Watch agents work live",
      "No credit card required",
    ],
    ctaLabel: "Try it live",
    ctaHref: "/signup?next=%2Fdashboard",
  },
  {
    eyebrow: "PRO",
    price: "$20",
    priceSuffix: "/month",
    description: "For builders who need agents working all week.",
    subDescription: "≈ replaces ~$60+ of manual work",
    pill: "INCLUDES $15 IN USAGE",
    features: [
      "100 minutes of VM time",
      "3 concurrent sandboxes",
      "Priority queue · faster boot",
      "Run recordings saved 30 days",
    ],
    footnote: "Overage: $0.15/min after included usage",
    ctaLabel: "Start building faster",
    // P1 #2 — preserve the upgrade intent through signup so the user lands on
    // /billing?intent=upgrade after auth instead of being stranded on /dashboard.
    ctaHref: "/signup?next=%2Fbilling%3Fintent%3Dupgrade&plan=pro",
    highlighted: true,
    badge: "MOST POPULAR",
  },
  {
    eyebrow: "CREDITS",
    price: "Pay",
    priceSuffix: "as you go",
    description: "No subscription. Buy credits, use them whenever.",
    features: [
      "Credits never expire",
      "Same agent power as Pro",
      "Top up anytime",
      "Perfect for one-off projects",
    ],
    ctaLabel: "Buy credits",
    ctaHref: "/signup?next=%2Fbilling%3Fintent%3Dcredits&intent=credits",
  },
];

const CREDIT_PACKS = [
  {
    price: "$10",
    credits: "100 credits",
    minutesEstimate: "≈ 50 minutes of agent work",
  },
  {
    price: "$25",
    credits: "300 credits",
    minutesEstimate: "≈ 2.5 hours of agent work",
    badge: "BEST VALUE",
    highlighted: true,
  },
  {
    price: "$50",
    credits: "700 credits",
    minutesEstimate: "≈ 6 hours of agent work",
  },
];

type Step = { icon: LucideIcon; label: string; meta: string };
const STEPS: Step[] = [
  { icon: Play, label: "Start", meta: "5 credits" },
  { icon: Clock, label: "Running", meta: "2 credits/min" },
  { icon: CheckSquare, label: "Working", meta: "1 credit / action" },
  { icon: Camera, label: "Capturing", meta: "1 credit / shot" },
];

type UseCase = { icon: LucideIcon; label: string };
const USE_CASES: UseCase[] = [
  { icon: Code2, label: "Fixing bugs automatically" },
  { icon: Settings, label: "Running long scripts overnight" },
  { icon: Terminal, label: "Debugging environments" },
  { icon: CheckCircle2, label: "QA testing workflows" },
  { icon: Search, label: "Data scraping at scale" },
  { icon: MessageSquare, label: "Repetitive client tasks" },
];

const TRUST_ITEMS = [
  { strong: "Auto-stop", rest: " when idle. No surprise bills." },
  { strong: "Cancel anytime.", rest: " Keep your credits." },
  { strong: "No hidden fees.", rest: " Ever." },
];

// ----- Page ----- //

export default async function PricingPage() {
  const session = await getAppShellSession();
  if (session.user) {
    redirect("/billing");
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden" style={PAGE_STYLE}>
      <div className="mx-auto w-full max-w-[1100px] px-5 py-10 md:px-8 md:py-14">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Agent Room home"
          >
            <AgentRoomLogomark />
            <span className="flex flex-col">
              <span
                className="text-sm font-semibold"
                style={{ color: TOKEN.textPrimary }}
              >
                Agent Room
              </span>
              <span
                className="text-[11px]"
                style={{ ...MONO_STYLE, color: TOKEN.textDim }}
              >
                agentroom.app
              </span>
            </span>
          </Link>
          <span
            className="text-[11px] font-medium tracking-[0.22em]"
            style={{ ...MONO_STYLE, color: TOKEN.textDim }}
          >
            PRICING · 2026
          </span>
        </header>

        {/* Hero */}
        <section className="mt-14 flex flex-col items-center text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.22em]"
            style={{
              ...MONO_STYLE,
              background: "rgba(62,233,140,0.08)",
              borderColor: "rgba(62,233,140,0.35)",
              color: TOKEN.accentHero,
            }}
          >
            <span
              className="inline-block size-1.5 rounded-full"
              style={{ background: TOKEN.accentHero }}
            />
            TIME · RECLAIMED
          </span>

          <h1
            className="mt-7 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
            style={{ color: TOKEN.textPrimary, lineHeight: 1.05 }}
          >
            Pay for{" "}
            <span style={{ color: TOKEN.accentHero }}>results.</span> Not seats.
          </h1>

          <p
            className="mt-5 max-w-xl text-base leading-7"
            style={{ color: TOKEN.textMuted }}
          >
            Real agents on real machines. You only pay for the minutes they
            actually work.
          </p>

          <Link
            href="/signup?next=%2Fdashboard"
            className="mt-7 inline-flex items-center justify-center transition hover:opacity-90"
            style={{
              height: 44,
              padding: "0 22px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              background: TOKEN.accentHero,
              color: TOKEN.accentHeroFg,
            }}
          >
            Start free →
          </Link>
        </section>

        {/* Plans */}
        <section className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.eyebrow} {...plan} />
          ))}
        </section>

        {/* Credit packs */}
        <section className="mt-20">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                className="text-2xl font-semibold"
                style={{ color: TOKEN.textPrimary }}
              >
                Need more?
              </h2>
              <p className="mt-1 text-sm" style={{ color: TOKEN.textMuted }}>
                One-time credit packs. No subscription. Never expire.
              </p>
            </div>
            <span
              className="text-[11px] font-medium tracking-[0.22em]"
              style={{ ...MONO_STYLE, color: TOKEN.textDim }}
            >
              TIME, VISUALIZED
            </span>
          </header>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <CreditPackCard key={pack.price} {...pack} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          className="mt-16 rounded-[14px] border p-6 md:p-8"
          style={CARD_STYLE}
        >
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h2
              className="text-xl font-semibold"
              style={{ color: TOKEN.textPrimary }}
            >
              How it works
            </h2>
            <span
              className="text-[11px] font-medium tracking-[0.22em]"
              style={{ ...MONO_STYLE, color: TOKEN.textDim }}
            >
              PAY ONLY FOR WHAT YOU USE
            </span>
          </header>

          <div className="mt-7 grid grid-cols-2 gap-y-8 sm:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center text-center">
                    <span
                      aria-hidden="true"
                      className="flex size-12 items-center justify-center rounded-md border"
                      style={{
                        background: "rgba(62,233,140,0.08)",
                        borderColor: "rgba(62,233,140,0.35)",
                        color: TOKEN.accentHero,
                      }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div
                      className="mt-3 text-sm font-semibold"
                      style={{ color: TOKEN.textPrimary }}
                    >
                      {step.label}
                    </div>
                    <div
                      className="mt-1 text-xs"
                      style={{ ...MONO_STYLE, color: TOKEN.textDim }}
                    >
                      {step.meta}
                    </div>
                  </div>
                  {index < STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="hidden flex-1 sm:block"
                      style={{
                        height: 1,
                        background: TOKEN.borderSubtle,
                        minWidth: 24,
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Use cases */}
        <section className="mt-20">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h2
              className="text-2xl font-semibold"
              style={{ color: TOKEN.textPrimary }}
            >
              What people use Agent Room for
            </h2>
            <span
              className="text-[11px] font-medium tracking-[0.22em]"
              style={{ ...MONO_STYLE, color: TOKEN.textDim }}
            >
              REAL WORK, NOT DEMOS
            </span>
          </header>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {USE_CASES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[12px] border px-4 py-3"
                style={CARD_STYLE}
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-md border"
                  style={{
                    background: "rgba(62,233,140,0.08)",
                    borderColor: "rgba(62,233,140,0.35)",
                    color: TOKEN.accentHero,
                  }}
                >
                  <Icon className="size-4" />
                </span>
                <span className="text-sm" style={{ color: TOKEN.textPrimary }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Trust signals */}
        <section className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.strong}
              className="flex items-start gap-2.5 rounded-[12px] border px-4 py-3"
              style={CARD_STYLE}
            >
              <span
                aria-hidden="true"
                className="mt-1.5 inline-block size-2 shrink-0 rounded-full"
                style={{ background: TOKEN.accentHero }}
              />
              <p
                className="text-sm leading-6"
                style={{ color: TOKEN.textMuted }}
              >
                <span
                  className="font-semibold"
                  style={{ color: TOKEN.textPrimary }}
                >
                  {item.strong}
                </span>
                {item.rest}
              </p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h2
              className="text-2xl font-semibold"
              style={{ color: TOKEN.textPrimary }}
            >
              Frequently asked
            </h2>
            <span
              className="text-[11px] font-medium tracking-[0.22em]"
              style={{ ...MONO_STYLE, color: TOKEN.textDim }}
            >
              ANSWERS
            </span>
          </header>
          <div className="mt-6">
            <FaqSection />
          </div>
        </section>

        {/* Footer CTA */}
        <section className="mt-20 flex flex-col items-center text-center">
          <h2
            className="text-2xl font-semibold sm:text-3xl"
            style={{ color: TOKEN.textPrimary }}
          >
            Stop paying for seats. Start paying for{" "}
            <span style={{ color: TOKEN.accentHero }}>results.</span>
          </h2>
          <Link
            href="/signup?next=%2Fdashboard"
            className="mt-6 inline-flex items-center justify-center transition hover:opacity-90"
            style={{
              height: 48,
              padding: "0 26px",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              background: TOKEN.accentHero,
              color: TOKEN.accentHeroFg,
            }}
          >
            Start free →
          </Link>
          <p className="mt-3 text-xs" style={{ color: TOKEN.textDim }}>
            No credit card required.
          </p>
        </section>

        {/* Footer */}
        <footer
          className="mt-16 flex flex-col items-center justify-between gap-2 border-t pt-6 text-[11px] sm:flex-row"
          style={{
            borderColor: TOKEN.borderSubtle,
            ...MONO_STYLE,
            color: TOKEN.textDim,
          }}
        >
          <span>agentroom.app · cypherai-hub</span>
        </footer>
      </div>
    </main>
  );
}
