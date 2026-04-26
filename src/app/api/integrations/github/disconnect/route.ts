import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedBillingUser } from "@/lib/billing/supabase";
import { deleteUserIntegration } from "@/lib/data/integrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedBillingUser();
  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("next", "/integrations");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  try {
    await deleteUserIntegration(user.id, "github");
  } catch (err) {
    console.error("[github.integration.disconnect]", err);
    const failed = new URL("/integrations", request.nextUrl.origin);
    failed.searchParams.set("error", "github_disconnect_failed");
    return NextResponse.redirect(failed, { status: 303 });
  }

  const success = new URL("/integrations", request.nextUrl.origin);
  success.searchParams.set("disconnected", "github");
  return NextResponse.redirect(success, { status: 303 });
}
