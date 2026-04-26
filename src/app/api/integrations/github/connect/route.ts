import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAuthenticatedBillingUser } from "@/lib/billing/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const SCOPES = "read:user repo";
const STATE_COOKIE = "gh_int_state";
const STATE_COOKIE_MAX_AGE_S = 60 * 10; // 10 minutes

function getRedirectUri(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  const origin = configured ? new URL(configured).origin : request.nextUrl.origin;
  return `${origin}/api/integrations/github/callback`;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedBillingUser();
  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("next", "/integrations");
    return NextResponse.redirect(loginUrl);
  }

  const clientId = process.env.GITHUB_INTEGRATION_CLIENT_ID;
  if (!clientId) {
    const url = new URL("/integrations", request.nextUrl.origin);
    url.searchParams.set("error", "github_not_configured");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = getRedirectUri(request);

  const authorizeUrl = new URL(GITHUB_AUTHORIZE);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", SCOPES);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("allow_signup", "false");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_COOKIE_MAX_AGE_S,
  });
  return response;
}
