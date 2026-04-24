import { NextRequest, NextResponse } from "next/server";
import { getGitHubActivity, shouldForceMock } from "@/lib/integrations/hybrid";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const data = await getGitHubActivity({ forceMock: shouldForceMock(request.nextUrl.searchParams) });
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
