import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/site-chrome";
import { CreditPackCard } from "@/components/pricing/credit-pack-card";
import { FaqSection, type FaqItem } from "@/components/pricing/faq-section";
import { PlanCard } from "@/components/pricing/plan-card";

export const metadata: Metadata = {
  title: "Pricing | Agent Room",
  description: "Simple credits for real agent work on real machines.",
};

const plans = [
  {
    eyebrow: "FREE",
    price: "$0",
    priceSuffix: "/month",
    description: "A real trial, not a fake tour. Start with enough credits to watch an agent run.",
    features: ["10 credits included", "1 room", "Live VM Stage", "No card required"],
    ctaLabel: "Start free",
    ctaHref: "/signup",
  },
  {
    eyebrow: "PRO",
    price: "$20",
    priceSuffix: "/month",
    description: "For builders who want agents working across more rooms, longer runs, and real proof trails.",
    features: ["Monthly credit refresh", "Unlimited rooms", "Higher agent limits", "Priority sandbox starts"],
    ctaLabel: "Upgrade to Pro",
    ctaHref: "/signup?next=%2Fbilling%3Fintent%3Dupgrade&plan=pro",
    highlighted: true,
    badge: "MOST POPULAR",
  },
  {
    eyebrow: "CREDITS",
    price: "Top",
    priceSuffix: "up",
    description: "Buy more agent time any time. Good for one-off pushes, demos, and heavy research days.",
    features: ["Credits never expire", "Works with Free or Pro", "No seat math", "Use only what you need"],
    ctaLabel: "Buy credits",
    ctaHref: "/signup?next=%2Fbilling%3Fintent%3Dcredits&intent=credits",
  },
];

const creditPacks = [
  { price: "$5", credits: "50 credits", minutesEstimate: "small tasks and tests", ctaHref: "/signup?intent=credits" },
  {
    price: "$10",
    credits: "120 credits",
    minutesEstimate: "a focused build session",
    ctaHref: "/signup?intent=credits",
    highlighted: true,
    badge: "POPULAR",
  },
  { price: "$20", credits: "300 credits", minutesEstimate: "longer research or QA runs", ctaHref: "/signup?intent=credits" },
];

const faqItems: FaqItem[] = [
  {
    q: "What's a credit?",
    a: "One credit is roughly one minute of agent runtime on a sandbox. Long-running tasks burn more, short ones burn less.",
  },
  {
    q: "What happens when I run out?",
    a: "Your room pauses. Buy more credits or wait for the monthly refresh on Pro.",
  },
  {
    q: "Can I cancel?",
    a: "Anytime, from /billing. Pro stops at the end of the period. Credits you've already bought never expire.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes - 10 credits a month, one room, every feature. No card.",
  },
  {
    q: "Do you train on my data?",
    a: "No. Your runs, your repos, your data. Sandboxes are isolated and torn down after every session.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-16 text-center sm:px-8 lg:px-10 lg:pt-24">
        <p className="ar-eyebrow">PRICING</p>
        <h1 className="ar-section-headline mx-auto mt-6 max-w-3xl">
          Simple credits. Real <em>work</em>.
        </h1>
        <p className="mx-auto mt-6 max-w-[50ch] text-[17px] leading-[1.55] text-[var(--ar-text-muted)]">
          Start free with 10 credits. Upgrade to Pro for unlimited rooms and more credits a month. Buy more credits any time.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-5 sm:px-8 md:grid-cols-3 lg:px-10">
        {plans.map((plan) => (
          <PlanCard key={plan.eyebrow} {...plan} />
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="ar-eyebrow">ADD MORE TIME</p>
            <h2 className="ar-section-headline mt-5 text-left">Credit packs.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[var(--ar-text-muted)]">
            One-time top-ups for big days, strange bugs, and late-night shipping windows.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {creditPacks.map((pack) => (
            <CreditPackCard key={pack.price} {...pack} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8 lg:px-10">
        <p className="ar-eyebrow">FAQ</p>
        <h2 className="ar-section-headline mt-5">Questions before you run.</h2>
        <div className="mt-8">
          <FaqSection items={faqItems} />
        </div>
      </section>
    </MarketingShell>
  );
}
