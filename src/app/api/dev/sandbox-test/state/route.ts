import { NextResponse } from "next/server";
import { getSandboxState, isDevSandboxRouteEnabled } from "@/lib/dev/e2b-sandbox-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  if (!isDevSandboxRouteEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(getSandboxState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
