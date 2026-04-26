import Link from "next/link";
import { WelcomeCard } from "@/components/onboarding/welcome-card";

// Param contract for /dev/sandbox-test (read by Agent 2 / sandbox-test page):
//   - `onboarding=true`  signals this run originated from the onboarding flow
//                        so the sandbox page can show the onboarding return UI.
//   - `task=<string>`    pre-fills the task input. URL-encoded.
// Keep these names stable; downstream consumers depend on them.
const DEMO_TASK = "Take a screenshot of the desktop and describe what you see.";
const RUN_HREF = `/dev/sandbox-test?onboarding=true&task=${encodeURIComponent(DEMO_TASK)}`;

export default function OnboardingFirstRunPage() {
  return (
    <WelcomeCard
      headline="Try your first agent."
      body="We'll spin up a sandbox and run a quick demo task. Takes about 30 seconds."
      actions={
        <>
          <Link
            href={RUN_HREF}
            className="inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#3EE98C", color: "#062014" }}
          >
            Run demo &rarr;
          </Link>
          <Link
            href="/onboarding/done"
            className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm transition-colors hover:text-white"
            style={{ color: "#888" }}
          >
            Skip
          </Link>
        </>
      }
    >
      <div
        className="rounded-lg border p-4 font-mono text-xs leading-6"
        style={{
          background: "#0A0A0A",
          borderColor: "#1F1F1F",
          color: "#E4E8F0",
          fontFamily:
            "var(--font-jetbrains-mono), var(--font-mono), ui-monospace, monospace",
        }}
      >
        {DEMO_TASK}
      </div>
    </WelcomeCard>
  );
}
