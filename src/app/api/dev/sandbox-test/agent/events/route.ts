import { NextRequest, NextResponse } from "next/server";
import {
  addAgentSseClient,
  isDevSandboxRouteEnabled,
  removeAgentSseClient,
  type AgentLogEvent,
} from "@/lib/dev/e2b-sandbox-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: NextRequest) {
  if (!isDevSandboxRouteEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  let client: { send: (event: AgentLogEvent) => void; close: () => void } | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      client = {
        send(event) {
          if (closed) return;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        },
        close() {
          if (closed) return;
          closed = true;
          if (keepAlive) clearInterval(keepAlive);
          controller.close();
        },
      };

      addAgentSseClient(client);

      keepAlive = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        }
      }, 15_000);

      request.signal.addEventListener("abort", () => {
        if (!client) return;
        if (keepAlive) clearInterval(keepAlive);
        removeAgentSseClient(client);
        closed = true;
      });
    },
    cancel() {
      if (!client) return;
      if (keepAlive) clearInterval(keepAlive);
      removeAgentSseClient(client);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
