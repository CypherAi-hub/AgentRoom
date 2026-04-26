"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AgentRoomLogomark } from "@/components/auth/auth-shell";
import { StepIndicator } from "@/components/onboarding/step-indicator";

function deriveStep(pathname: string | null): 1 | 2 | 3 | 4 {
  if (!pathname) return 1;
  if (pathname.startsWith("/onboarding/done")) return 4;
  if (pathname.startsWith("/onboarding/first-run")) return 3;
  if (pathname.startsWith("/onboarding/connect")) return 2;
  return 1;
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const step = deriveStep(pathname);

  return (
    <main
      className="relative flex min-h-screen w-full flex-col items-center justify-center px-5 py-10"
      style={{
        background: "#0A0A0A",
        color: "#F5F5F5",
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5">
        <Link
          href="/"
          aria-label="Agent Room home"
          className="pointer-events-auto"
        >
          <AgentRoomLogomark />
        </Link>
        <Link
          href="/dashboard"
          className="pointer-events-auto text-sm transition-colors hover:text-white"
          style={{ color: "#888" }}
        >
          Skip
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-8">
        <StepIndicator step={step} />
        {children}
      </div>
    </main>
  );
}
