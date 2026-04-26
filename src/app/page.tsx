import Link from "next/link";
import type { Metadata } from "next";
import { Bot, CircleDot, MonitorPlay, Play, ShieldCheck } from "lucide-react";
import { MarketingShell } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
  title: "Agent Room | Get your hours back",
  description:
    "Agent Room runs real work on real machines with AI agents you can watch, control, and replay.",
};

function BrowserFrame({
  children,
  rotate = "-4deg",
  className = "",
}: {
  children: React.ReactNode;
  rotate?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border bg-[rgba(255,255,255,0.035)] p-3 shadow-[0_34px_120px_rgba(0,0,0,0.48)] ${className}`}
      style={{
        borderColor: "rgba(62,233,140,0.18)",
        transform: `rotate(${rotate})`,
      }}
    >
      <div className="overflow-hidden rounded-[18px] border border-[var(--ar-border)] bg-black">
        <div className="flex h-11 items-center gap-2 border-b border-[var(--ar-border)] bg-[#0d0f14] px-4">
          <span className="size-2.5 rounded-full bg-[#E24B4A]" />
          <span className="size-2.5 rounded-full bg-[#F5B544]" />
          <span className="size-2.5 rounded-full bg-[var(--ar-green)]" />
          <span className="ml-4 h-6 w-48 rounded-full bg-white/[0.05] px-4 py-1 font-mono text-[10px] text-[var(--ar-text-faint)]">
            agentroom.app
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="ar-eyebrow mb-5">{children}</p>;
}

const pillars = [
  {
    icon: MonitorPlay,
    title: "Real machines",
    body: "Every agent runs on an actual Linux VM. Not a chat window. Not a sandbox sim. A real desktop you can see, touch, and inherit.",
  },
  {
    icon: ShieldCheck,
    title: "Real proof",
    body: "Every run is recorded, replayable, and exportable. Hand a run to your team, your client, or your future self.",
  },
  {
    icon: Bot,
    title: "Real work",
    body: "Research deep. Code in real repos. Drive a browser end-to-end. The work is the work — the agent just does it while you don't.",
  },
];

const steps = [
  ["Spin up a room", "fresh sandbox, your shell, your tools"],
  ["Hand off the task", "describe the goal in plain language"],
  ["Watch it work", "live screen, live activity log, full control"],
  ["Keep the proof", "replay, export, or rerun any time"],
];

const useCases = [
  "Founders running ten threads at once",
  "Operators stitching tools together",
  "Researchers reading more than they can read",
  "Engineers babysitting flaky pipelines",
  "Solo builders without a team",
  "Anyone whose to-do list is louder than their day",
];

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid w-full max-w-7xl gap-14 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[0.9fr_1.35fr] lg:px-10 lg:pb-32 lg:pt-20">
        <div className="flex flex-col justify-center">
          <div className="ar-eyebrow mb-7 inline-flex w-fit rounded-full border border-[rgba(62,233,140,0.28)] bg-[var(--ar-green-dim)] px-4 py-2">
            FOR PEOPLE WITH TOO MUCH TO DO
          </div>
          <h1 className="ar-headline">
            Get your
            <br />
            hours <em>back</em>.
          </h1>
          <p className="mt-7 max-w-[38ch] text-[17px] leading-[1.55] text-[var(--ar-text-muted)]">
            Agent Room runs real work on real machines with AI agents you can watch, control, and replay. Built for builders, researchers, and operators drowning in tabs.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className="ar-pill-primary">
              Start free
            </Link>
            <Link href="#walkthrough" className="ar-pill-ghost">
              Watch the demo
            </Link>
          </div>
        </div>

        <div className="relative min-h-[320px] lg:min-h-[560px]">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(62,233,140,0.12),transparent_60%)] blur-2xl" />
          <BrowserFrame className="relative mx-auto max-w-[860px] lg:mt-8">
            <video
              src="/demo-loop.mp4"
              autoPlay
              muted
              loop
              playsInline
              poster="/demo-poster.jpg"
              className="aspect-video w-full object-cover"
            />
          </BrowserFrame>
        </div>
      </section>

      <section id="walkthrough" className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>01 / WALKTHROUGH</SectionLabel>
          <h2 className="ar-section-headline">
            Sixty seconds with the <em>agent</em>.
          </h2>
          <p className="mx-auto mt-6 max-w-[60ch] text-[17px] leading-[1.55] text-[var(--ar-text-muted)]">
            A pass through signup, the sandbox, a live agent run, and the proof trail. The product proves itself before the copy asks for belief.
          </p>
        </div>
        <BrowserFrame rotate="2deg" className="mx-auto mt-14 max-w-5xl">
          <video
            src="/demo.mp4"
            controls
            autoPlay
            muted
            loop
            playsInline
            poster="/demo-poster.jpg"
            className="aspect-video w-full object-cover"
          />
        </BrowserFrame>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <SectionLabel>02 / WHAT IT DOES</SectionLabel>
        <h2 className="ar-section-headline max-w-3xl">
          Real work on <em>real</em> machines.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-7">
              <Icon className="size-6 text-[var(--ar-green)]" />
              <h3 className="mt-8 text-[20px] font-semibold text-[var(--ar-text-strong)]">{title}</h3>
              <p className="mt-4 text-[15px] leading-[1.6] text-[var(--ar-text-muted)]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <SectionLabel>03 / HOW IT WORKS</SectionLabel>
        <h2 className="ar-section-headline max-w-3xl">
          From idea to <em>proof</em> in four moves.
        </h2>
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {steps.map(([title, body], index) => (
            <article key={title} className="relative rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-6">
              <div className="font-mono text-xs text-[var(--ar-green)]">0{index + 1}</div>
              <h3 className="mt-8 text-lg font-semibold text-[var(--ar-text-strong)]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--ar-text-muted)]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10">
        <SectionLabel>04 / FOR</SectionLabel>
        <h2 className="ar-section-headline max-w-4xl">
          Built for the people <em>drowning</em> in tabs.
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <article
              key={useCase}
              className="group min-h-[150px] rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(62,233,140,0.28)]"
            >
              <CircleDot className="size-5 text-[var(--ar-green)]" />
              <p className="mt-8 text-lg leading-snug text-[var(--ar-text-strong)]">{useCase}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 py-28 text-center sm:px-8 lg:px-10">
        <Play className="mb-8 size-8 text-[var(--ar-green)]" />
        <h2 className="ar-section-headline">
          Get your hours <em>back</em>.
        </h2>
        <Link href="/signup" className="ar-pill-primary mt-9">
          Start free
        </Link>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ar-text-faint)]">
          10 free credits. No card. Real machines.
        </p>
      </section>
    </MarketingShell>
  );
}
