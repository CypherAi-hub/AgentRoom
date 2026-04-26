import Link from "next/link";
import { WelcomeCard } from "@/components/onboarding/welcome-card";

export default function OnboardingDonePage() {
  return (
    <WelcomeCard
      headline="You're set up."
      body="Your dashboard is ready. Start building."
      actions={
        <Link
          href="/dashboard"
          className="inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#3EE98C", color: "#062014" }}
        >
          Go to dashboard &rarr;
        </Link>
      }
    />
  );
}
