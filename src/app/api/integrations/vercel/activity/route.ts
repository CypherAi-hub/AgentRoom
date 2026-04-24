import { NextRequest, NextResponse } from "next/server";
import { getVercelActivity, shouldForceMock } from "@/lib/integrations/hybrid";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const data = await getVercelActivity({ forceMock: shouldForceMock(request.nextUrl.searchParams) });
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
