import { NextRequest, NextResponse } from "next/server";
import {
  AGENT_RUN_CREDIT_COST,
  deductAgentRunCredit,
  getAgentRunLimits,
  getAuthenticatedBillingProfile,
  requireAvailableCredit,
  type BillingProfile,
  type CreditGateFailure,
} from "@/lib/billing/credits";
import { runAgentLoop } from "@/lib/dev/agent-loop";
import {
  appendAgentLog,
  getActiveSandbox,
  getAgentState,
  getSandboxState,
  isAgentRunning,
  isDevSandboxRouteEnabled,
  resetAgentState,
  startAgentState,
} from "@/lib/dev/e2b-sandbox-store";
import { createRunAdmin } from "@/lib/data/runs";
import { insertUsageLogAdmin } from "@/lib/data/usage-logs";
import { ensureUserHasRoom } from "@/lib/data/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function billingPayload(profile: BillingProfile) {
  return {
    agentLimits: getAgentRunLimits(profile.plan),
    agentRunCreditCost: AGENT_RUN_CREDIT_COST,
    profile,
  };
}

function errorResponse(
  message: string,
  status = 400,
  options: {
    code?: string;
    profile?: BillingProfile;
  } = {},
) {
  return NextResponse.json(
    {
      error: message,
      ...(options.code ? { code: options.code } : {}),
      ...(options.profile ? billingPayload(options.profile) : {}),
      agent: getAgentState(),
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function creditGateResponse(failure: CreditGateFailure) {
  return errorResponse(failure.message, failure.status, {
    code: failure.code,
    profile: failure.profile,
  });
}

export async function GET(request: NextRequest) {
  if (!isDevSandboxRouteEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const billing = await getAuthenticatedBillingProfile(request);
  if (!billing.ok) return creditGateResponse(billing);

  return NextResponse.json(
    {
      ...billingPayload(billing.profile),
      agent: getAgentState(),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(request: NextRequest) {
  if (!isDevSandboxRouteEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { taskPrompt?: unknown } | null;
  const taskPrompt = typeof body?.taskPrompt === "string" ? body.taskPrompt.trim() : "";

  const billing = await getAuthenticatedBillingProfile(request);
  if (!billing.ok) return creditGateResponse(billing);

  if (!taskPrompt) {
    return errorResponse("Task prompt is required.", 400, {
      profile: billing.profile,
    });
  }

  const sandboxState = getSandboxState();
  if (!getActiveSandbox() || sandboxState.status !== "running" || !sandboxState.hasStreamUrl) {
    return errorResponse("Start a running E2B sandbox before starting the agent.", 400, {
      profile: billing.profile,
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return errorResponse("Missing ANTHROPIC_API_KEY. Add it to .env.local or the shell running npm run dev.", 400, {
      profile: billing.profile,
    });
  }

  if (isAgentRunning()) {
    return errorResponse("Agent is already running.", 409, {
      profile: billing.profile,
    });
  }

  const noCredits = requireAvailableCredit(billing.profile);
  if (noCredits) return creditGateResponse(noCredits);

  const charged = await deductAgentRunCredit(billing);
  if (!charged.ok) return creditGateResponse(charged);

  const agentLimits = getAgentRunLimits(charged.profile.plan);

  let runId: string | null = null;
  try {
    const room = await ensureUserHasRoom(charged.profile.id);
    const created = await createRunAdmin(charged.profile.id, {
      taskPrompt,
      roomId: room.id,
      sandboxId: sandboxState.sandboxId || null,
      streamUrl: sandboxState.streamUrl || null,
    });
    runId = created.id;
    await insertUsageLogAdmin(charged.profile.id, {
      runId,
      type: "sandbox_start",
      creditsUsed: AGENT_RUN_CREDIT_COST,
    });
  } catch {
    // Persistence failure should not block the live agent run.
  }

  resetAgentState();
  startAgentState(
    taskPrompt,
    agentLimits.maxIterations,
    agentLimits.maxRuntimeMs,
  );
  appendAgentLog({
    type: "agent_started",
    payload: {
      taskPrompt,
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      maxIterations: getAgentState().maxIterations,
      maxRuntimeMs: getAgentState().maxRuntimeMs,
      creditCost: AGENT_RUN_CREDIT_COST,
      remainingCredits: charged.profile.credits,
      plan: charged.profile.plan,
      runId,
    },
  });

  const runContext = runId ? { userId: charged.profile.id, runId } : null;
  runAgentLoop(taskPrompt, runContext).catch((error) => {
    const message = error instanceof Error ? error.message : String(error || "Unknown agent loop error");
    appendAgentLog({ type: "error", payload: { message } });
  });

  return NextResponse.json(
    {
      ...getAgentState(),
      ...billingPayload(charged.profile),
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
