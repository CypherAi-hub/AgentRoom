import { notFound } from "next/navigation";
import { SandboxTestClient } from "@/components/dev/sandbox-test-client";
import { isDevSandboxRouteEnabled } from "@/lib/dev/e2b-sandbox-store";

export const dynamic = "force-dynamic";

/**
 * Onboarding contract (coordinated with Agent 6 / onboarding flow):
 *
 *   /dev/sandbox-test?onboarding=true&task=<urlencoded-prompt>
 *
 *   - `onboarding=true` toggles auto-start behavior in the client.
 *   - `task` is decoded and used to prefill the textarea.
 *   - When the sandbox stream becomes ready, the client auto-triggers Start Agent
 *     ONCE per page load. Subsequent runs are manual (user clicks Start Agent).
 *
 * Both params are optional. If absent, the page behaves as a normal manual stage.
 */
type SearchParams = Record<string, string | string[] | undefined>;

export default async function SandboxTestPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  if (!isDevSandboxRouteEnabled()) {
    notFound();
  }

  const sp = (await searchParams) ?? {};
  const onboarding = sp.onboarding === "true" || sp.onboarding === "1";
  const rawTask = Array.isArray(sp.task) ? sp.task[0] : sp.task;
  const onboardingTask = typeof rawTask === "string" && rawTask.trim().length > 0 ? rawTask : null;

  return <SandboxTestClient onboarding={onboarding} onboardingTask={onboardingTask} />;
}
