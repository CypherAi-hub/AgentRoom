import { NextResponse } from "next/server";
import { isDevSandboxRouteEnabled, stopSandbox } from "@/lib/dev/e2b-sandbox-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!isDevSandboxRouteEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(await stopSandbox(), {
    headers: { "Cache-Control": "no-store" },
  });
}
