import { NextRequest, NextResponse } from "next/server";
import { getHybridStatuses, shouldForceMock } from "@/lib/integrations/hybrid";

export const dynamic = "force-dynamic";

function json(data: unknown) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  const integrations = await getHybridStatuses({ forceMock: shouldForceMock(request.nextUrl.searchParams) });
  return json({
    mode: "hybrid_read_only",
    readOnly: true,
    mutationsDisabled: true,
    generatedAt: new Date().toISOString(),
    integrations,
  });
}
