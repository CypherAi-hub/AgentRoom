import Link from "next/link";
import { WelcomeCard } from "@/components/onboarding/welcome-card";

export default function OnboardingWelcomePage() {
  return (
    <WelcomeCard
      headline="Welcome to Agent Room."
      body="Give your agents a real cloud desktop. Watch them work. Pay only for results."
      actions={
        <Link
          href="/onboarding/connect"
          className="inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#3EE98C", color: "#062014" }}
        >
          Let&apos;s go &rarr;
        </Link>
      }
    />
  );
}
