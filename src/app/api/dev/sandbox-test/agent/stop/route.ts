import { NextResponse } from "next/server";
import {
  appendAgentLog,
  getAgentState,
  isAgentRunning,
  isDevSandboxRouteEnabled,
  requestAgentStop,
  setAgentStatus,
} from "@/lib/dev/e2b-sandbox-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!isDevSandboxRouteEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  requestAgentStop();
  appendAgentLog({ type: "stopped_requested", payload: { reason: "user_request" } });

  if (isAgentRunning()) {
    setAgentStatus("stopped");
    appendAgentLog({ type: "stopped", payload: { message: "Agent stopped." } });
  }

  return NextResponse.json(getAgentState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
