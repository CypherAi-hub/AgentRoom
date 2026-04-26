"use client";

import Link from "next/link";
import { useState } from "react";
import { Github } from "lucide-react";
import { WelcomeCard } from "@/components/onboarding/welcome-card";

export default function OnboardingConnectPage() {
  const [showNote, setShowNote] = useState(false);

  return (
    <WelcomeCard
      headline="Connect your tools (optional)."
      body="Agents can act on your GitHub repos. You can do this later."
      actions={
        <>
          <Link
            href="/onboarding/first-run"
            className="inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#3EE98C", color: "#062014" }}
          >
            Continue &rarr;
          </Link>
          <Link
            href="/onboarding/first-run"
            className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm transition-colors hover:text-white"
            style={{ color: "#888" }}
          >
            Skip for now
          </Link>
        </>
      }
    >
      <div
        className="rounded-lg border p-4"
        style={{ background: "#0A0A0A", borderColor: "#1F1F1F" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Github size={20} style={{ color: "#F5F5F5" }} aria-hidden="true" />
            <span className="text-sm font-medium" style={{ color: "#F5F5F5" }}>
              GitHub
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "#2A2A2A", color: "#F5F5F5" }}
          >
            Connect GitHub
          </button>
        </div>
        {showNote ? (
          <p className="mt-3 text-xs" style={{ color: "#888" }}>
            Coming soon &mdash; we&apos;ll wire this up shortly.
          </p>
        ) : null}
      </div>
    </WelcomeCard>
  );
}
