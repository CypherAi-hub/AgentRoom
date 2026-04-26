import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
  title: "About | Agent Room",
  description: "The story behind Agent Room: real machines, real agents, replayable proof.",
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <section className="mx-auto flex min-h-[72vh] w-full max-w-5xl flex-col items-center px-5 pb-24 pt-20 text-center sm:px-8 lg:px-10 lg:pt-28">
        <p className="ar-eyebrow">ABOUT</p>
        <h1 className="ar-headline mt-7 max-w-4xl">
          We got tired of <em>doing</em> it ourselves.
        </h1>

        <div className="mt-14 flex max-w-[62ch] flex-col gap-7 text-left text-[17px] leading-[1.7] text-[var(--ar-text-muted)] sm:text-center">
          <p>
            Agent Room started because we kept losing whole afternoons to work that didn&apos;t need a human. Pulling repos. Running checks. Reading dashboards. Drafting the same email for the fifth time. Work that machines could do, if you trusted them on a real machine.
          </p>
          <p>
            Most agent products are chat windows pretending to be tools. We wanted the opposite: a real Linux desktop, a real shell, a real browser, and an agent that operates them while you watch. No simulation. No demo magic. The same machine your work would run on if you did it yourself.
          </p>
          <p>
            Every run is recorded. Every action is replayable. Every credit is yours. We built it for the version of ourselves that was drowning in tabs at 11pm - and for everyone we know who still is.
          </p>
        </div>

        <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ar-text-faint)]">
          FIG 01 - A Wednesday at 11:47pm, three months in
        </p>

        <Link href="/signup" className="ar-pill-primary mt-9">
          Try it free
        </Link>
      </section>
    </MarketingShell>
  );
}
