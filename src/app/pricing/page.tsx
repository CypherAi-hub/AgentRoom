import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Camera,
  CheckCircle2,
  CheckSquare,
  Clock,
  Code2,
  MessageSquare,
  Play,
  Search,
  Settings,
  Terminal,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import { AgentRoomLogomark } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Pricing | Agent Room",
  description: "Run real work on real machines with AI agents. Time, reclaimed.",
};

const PAGE_STYLE: React.CSSProperties = {
  background: "#0A0A0A",
  color: "#F5F5F5",
  fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
};

const MONO_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
};

const CARD_STYLE: React.CSSProperties = {
  background: "#0F0F0F",
  borderColor: "#1F1F1F",
};

const PRO_CARD_STYLE: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(62,233,140,0.06), rgba(62,233,140,0.02))",
  borderColor: "rgba(62,233,140,0.45)",
  boxShadow: "0 24px 80px rgba(62,233,140,0.10)",
};

type PlanFeature = { label: string };

type Plan = {
  eyebrow: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: PlanFeature[];
  cta: { label: string; href: string; tone: "ghost" | "primary" | "purple" };
  highlight?: boolean;
  badge?: string;
  subDescription?: string;
  pill?: string;
  footnote?: string;
};

const PLANS: Plan[] = [
  {
    eyebrow: "FREE",
    price: "$0",
    priceSuffix: "/forever",
    description: "Try the magic. See an agent on a real cloud computer.",
    features: [
      { label: "30 minutes of VM time" },
      { label: "1 concurrent sandbox" },
      { label: "Watch agents work live" },
      { label: "No credit card required" },
    ],
    cta: { label: "Try it live", href: "/signup", tone: "ghost" },
  },
  {
    eyebrow: "PRO",
    price: "$20",
    priceSuffix: "/month",
    description: "For builders who need agents working all week.",
    subDescription: "≈ replaces ~$60+ of manual work",
    pill: "✓ INCLUDES $15 IN USAGE",
    features: [
      { label: "100 minutes of VM time" },
      { label: "3 concurrent sandboxes" },
      { label: "Priority queue · faster boot" },
      { label: "Run recordings saved 30 days" },
    ],
    footnote: "Overage: $0.15/min after included usage",
    cta: { label: "Start building faster", href: "/signup?plan=pro", tone: "primary" },
    highlight: true,
    badge: "MOST POPULAR",
  },
  {
    eyebrow: "CREDITS",
    price: "Pay",
    priceSuffix: "as you go",
    description: "No subscription. Buy credits, use them whenever.",
    features: [
      { label: "Credits never expire" },
      { label: "Same agent power as Pro" },
      { label: "Top up anytime" },
      { label: "Perfect for one-off projects" },
    ],
    cta: { label: "Add more time", href: "/signup?intent=credits", tone: "purple" },
  },
];

type CreditPack = {
  price: string;
  credits: string;
  caption: string;
  fillPercent: number;
  badge?: string;
  tone: "green" | "purple";
};

const CREDIT_PACKS: CreditPack[] = [
  { price: "$10", credits: "100 credits", caption: "~50 min of agent work", fillPercent: 22, tone: "green" },
  { price: "$25", credits: "300 credits", caption: "~2.5 hours of agent work", fillPercent: 50, tone: "purple", badge: "BEST VALUE" },
  { price: "$50", credits: "700 credits", caption: "~6 hours of agent work", fillPercent: 100, tone: "purple" },
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

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className="relative flex flex-col rounded-[14px] border p-6"
      style={plan.highlight ? PRO_CARD_STYLE : CARD_STYLE}
    >
      {plan.badge ? (
        <span
          className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-[0.18em]"
          style={{
            ...MONO_STYLE,
            background: "#3EE98C",
            borderColor: "#3EE98C",
            color: "#0A0A0A",
          }}
        >
          {plan.badge}
        </span>
      ) : null}

      <div className="text-[11px] font-bold tracking-[0.22em]" style={{ ...MONO_STYLE, color: "#888" }}>
        {plan.eyebrow}
      </div>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-5xl font-semibold leading-none" style={{ color: "#F5F5F5" }}>
          {plan.price}
        </span>
        <span className="text-base" style={{ color: "#A0A0A0" }}>
          {plan.priceSuffix}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6" style={{ color: "#A0A0A0" }}>
        {plan.description}
      </p>

      {plan.subDescription ? (
        <>
          <div className="mt-4 h-px" style={{ background: "#1F1F1F" }} />
          <p className="mt-3 text-sm" style={{ color: "#3EE98C" }}>
            {plan.subDescription}
          </p>
        </>
      ) : null}

      {plan.pill ? (
        <span
          className="mt-3 inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-[0.16em]"
          style={{
            ...MONO_STYLE,
            background: "rgba(62,233,140,0.08)",
            borderColor: "rgba(62,233,140,0.35)",
            color: "#3EE98C",
          }}
        >
          {plan.pill}
        </span>
      ) : null}

      <ul className="mt-5 flex flex-col gap-2.5 text-sm">
        {plan.features.map((feature) => (
          <li key={feature.label} className="flex items-start gap-2.5">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
              style={{ color: "#3EE98C" }}
            />
            <span style={{ color: "#F5F5F5" }}>{feature.label}</span>
          </li>
        ))}
      </ul>

      {plan.footnote ? (
        <p className="mt-4 text-xs" style={{ color: "#888" }}>
          {plan.footnote}
        </p>
      ) : null}

      <div className="mt-6 flex-1" />
      <PlanCta cta={plan.cta} />
    </div>
  );
}

function PlanCta({ cta }: { cta: Plan["cta"] }) {
  const baseStyle: React.CSSProperties = {
    height: 44,
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
  };
  const tones: Record<Plan["cta"]["tone"], React.CSSProperties> = {
    primary: { background: "#3EE98C", color: "#0A0A0A" },
    ghost: { background: "#0A0A0A", border: "1px solid #1F1F1F", color: "#F5F5F5" },
    purple: { background: "#1A0F2A", border: "1px solid #4c1d95", color: "#c4b5fd" },
  };
  return (
    <Link
      href={cta.href}
      className="inline-flex w-full items-center justify-center gap-2 transition hover:opacity-90"
      style={{ ...baseStyle, ...tones[cta.tone] }}
    >
      {cta.label}
    </Link>
  );
}

function VmPreview() {
  const headerLight = (color: string) => (
    <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: color }} />
  );
  return (
    <div
      className="relative mt-12 w-full max-w-[680px] overflow-hidden rounded-[12px] border shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      style={{ background: "#0F0F0F", borderColor: "#1F1F1F" }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{ borderColor: "#1F1F1F", background: "#0B0B0B" }}
      >
        <div className="flex items-center gap-2">
          {headerLight("#FF5F57")}
          {headerLight("#FEBC2E")}
          {headerLight("#28C840")}
          <span className="ml-3 text-[12px]" style={{ ...MONO_STYLE, color: "#888" }}>
            engineer-agent · sandbox-2af7
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold tracking-[0.14em]"
          style={{
            ...MONO_STYLE,
            background: "rgba(226,75,74,0.08)",
            borderColor: "rgba(226,75,74,0.35)",
            color: "#E24B4A",
          }}
        >
          <span className="inline-block size-1.5 animate-pulse rounded-full" style={{ background: "#E24B4A" }} />
          REC · LIVE
        </span>
      </div>

      <div className="px-5 py-5 text-[13px] leading-7" style={{ ...MONO_STYLE, color: "#F5F5F5" }}>
        <div>
          <span style={{ color: "#3EE98C" }}>$</span> git checkout -b fix/auth-redirect
        </div>
        <div style={{ color: "#888" }}>Switched to a new branch &apos;fix/auth-redirect&apos;</div>
        <div>
          <span style={{ color: "#3EE98C" }}>$</span> code app/screens/AuthScreen.tsx
        </div>
        <div style={{ color: "#7dd3fc" }}>› Editing line 18 — adding await before route change</div>
        <div>
          <span style={{ color: "#3EE98C" }}>$</span> npm test --watch
        </div>
        <div style={{ color: "#3EE98C" }}>✓ 47 tests passed</div>
        <div style={{ color: "#7dd3fc" }} className="ar-cursor">
          › Drafting PR description
        </div>
      </div>

      <span
        className="absolute right-4 top-4 hidden items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium md:inline-flex"
        style={{
          background: "rgba(62,233,140,0.10)",
          borderColor: "rgba(62,233,140,0.45)",
          color: "#3EE98C",
        }}
      >
        <Zap className="size-3" aria-hidden="true" />
        Fixing login bug
      </span>
    </div>
  );
}

function CreditPackCard({ pack }: { pack: CreditPack }) {
  const fillColor = pack.tone === "purple" ? "#a855f7" : "#3EE98C";
  const cardStyle: React.CSSProperties =
    pack.tone === "purple"
      ? {
          background: "linear-gradient(180deg, rgba(168,85,247,0.06), rgba(168,85,247,0.02))",
          borderColor: "rgba(168,85,247,0.35)",
        }
      : CARD_STYLE;
  return (
    <div className="relative rounded-[14px] border p-5" style={cardStyle}>
      {pack.badge ? (
        <span
          className="absolute -top-2.5 left-5 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-[0.18em]"
          style={{
            ...MONO_STYLE,
            background: "#1A0F2A",
            borderColor: "#a855f7",
            color: "#c4b5fd",
          }}
        >
          {pack.badge}
        </span>
      ) : null}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-3xl font-semibold" style={{ color: "#F5F5F5" }}>
          {pack.price}
        </span>
        <span className="text-sm" style={{ color: "#A0A0A0" }}>
          {pack.credits}
        </span>
      </div>
      <p className="mt-2 text-xs" style={{ color: "#888" }}>
        {pack.caption}
      </p>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#1F1F1F" }}>
        <div className="h-full rounded-full" style={{ width: `${pack.fillPercent}%`, background: fillColor }} />
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen w-full" style={PAGE_STYLE}>
      <div className="mx-auto w-full max-w-[1100px] px-5 py-10 md:px-8 md:py-14">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="Agent Room home">
            <AgentRoomLogomark />
            <span className="flex flex-col">
              <span className="text-sm font-semibold" style={{ color: "#F5F5F5" }}>
                Agent Room
              </span>
              <span className="text-[11px]" style={{ ...MONO_STYLE, color: "#888" }}>
                agentroom.app
              </span>
            </span>
          </Link>
          <span className="text-[11px] font-medium tracking-[0.22em]" style={{ ...MONO_STYLE, color: "#888" }}>
            PRICING · 2026
          </span>
        </header>

        <section className="mt-14 flex flex-col items-center text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.22em]"
            style={{
              ...MONO_STYLE,
              background: "rgba(62,233,140,0.08)",
              borderColor: "rgba(62,233,140,0.35)",
              color: "#3EE98C",
            }}
          >
            <span className="inline-block size-1.5 rounded-full" style={{ background: "#3EE98C" }} />
            TIME · RECLAIMED
          </span>

          <h1 className="mt-7 text-5xl font-semibold tracking-tight md:text-6xl" style={{ color: "#F5F5F5" }}>
            Get your hours <span style={{ color: "#3EE98C" }}>back.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "#A0A0A0" }}>
            Run real work on real machines with AI agents. Watch them code, debug, and execute tasks while you focus on
            what matters.
          </p>

          <span
            className="mt-7 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
            style={{
              background: "rgba(168,85,247,0.06)",
              borderColor: "rgba(168,85,247,0.35)",
              color: "#c4b5fd",
            }}
          >
            <Zap className="size-3.5" aria-hidden="true" />
            Agents run 24/7 — your credits keep them working.
          </span>

          <div className="flex w-full justify-center">
            <VmPreview />
          </div>
        </section>

        <section className="mt-20 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard key={plan.eyebrow} plan={plan} />
          ))}
        </section>

        <section className="mt-20">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold" style={{ color: "#F5F5F5" }}>
              Credit packs
            </h2>
            <span className="text-[11px] font-medium tracking-[0.22em]" style={{ ...MONO_STYLE, color: "#888" }}>
              TIME, VISUALIZED
            </span>
          </header>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <CreditPackCard key={pack.price} pack={pack} />
            ))}
          </div>
        </section>

        <section
          className="mt-16 rounded-[14px] border p-6 md:p-8"
          style={CARD_STYLE}
        >
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold" style={{ color: "#F5F5F5" }}>
              How it works
            </h2>
            <span className="text-[11px] font-medium tracking-[0.22em]" style={{ ...MONO_STYLE, color: "#888" }}>
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
                        background: "#0F2A1A",
                        borderColor: "#1d7c4d",
                        color: "#3EE98C",
                      }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="mt-3 text-sm font-semibold" style={{ color: "#F5F5F5" }}>
                      {step.label}
                    </div>
                    <div className="mt-1 text-xs" style={{ ...MONO_STYLE, color: "#888" }}>
                      {step.meta}
                    </div>
                  </div>
                  {index < STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="hidden flex-1 sm:block"
                      style={{ height: 1, background: "#1F1F1F", minWidth: 24 }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-20">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold" style={{ color: "#F5F5F5" }}>
              What people use Agent Room for
            </h2>
            <span className="text-[11px] font-medium tracking-[0.22em]" style={{ ...MONO_STYLE, color: "#888" }}>
              REAL WORK, NOT DEMOS
            </span>
          </header>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {USE_CASES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[12px] border px-4 py-3"
                style={CARD_STYLE}
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-md border"
                  style={{ background: "#0F2A1A", borderColor: "#1d7c4d", color: "#3EE98C" }}
                >
                  <Icon className="size-4" />
                </span>
                <span className="text-sm" style={{ color: "#F5F5F5" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-3 sm:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.strong}
              className="flex items-start gap-2.5 rounded-[12px] border px-4 py-3"
              style={CARD_STYLE}
            >
              <span
                aria-hidden="true"
                className="mt-1.5 inline-block size-2 shrink-0 rounded-full"
                style={{ background: "#3EE98C" }}
              />
              <p className="text-sm leading-6" style={{ color: "#A0A0A0" }}>
                <span className="font-semibold" style={{ color: "#F5F5F5" }}>
                  {item.strong}
                </span>
                {item.rest}
              </p>
            </div>
          ))}
        </section>

        <footer
          className="mt-16 flex flex-col items-center justify-between gap-2 border-t pt-6 text-[11px] sm:flex-row"
          style={{ borderColor: "#1F1F1F", ...MONO_STYLE, color: "#888" }}
        >
          <span>agentroom.app · cypherai-hub</span>
          <span>Pricing v3 · Apr 2026</span>
        </footer>
      </div>
    </main>
  );
}
