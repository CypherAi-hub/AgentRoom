import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedBillingUser } from "@/lib/billing/supabase";
import { upsertUserIntegration } from "@/lib/data/integrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_COOKIE = "gh_int_state";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

type GitHubTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
};

type GitHubUser = {
  id?: number;
  login?: string;
  name?: string | null;
  avatar_url?: string | null;
  html_url?: string | null;
};

function fail(request: NextRequest, code: string) {
  const url = new URL("/integrations", request.nextUrl.origin);
  url.searchParams.set("error", `github_${code}`);
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const ghError = request.nextUrl.searchParams.get("error");
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;

  if (ghError) {
    return fail(request, ghError);
  }
  if (!code || !state) {
    return fail(request, "missing_params");
  }
  if (!cookieState || cookieState !== state) {
    return fail(request, "state_mismatch");
  }

  const user = await getAuthenticatedBillingUser();
  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("next", "/integrations");
    return NextResponse.redirect(loginUrl);
  }

  const clientId = process.env.GITHUB_INTEGRATION_CLIENT_ID;
  const clientSecret = process.env.GITHUB_INTEGRATION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail(request, "not_configured");
  }

  let tokenJson: GitHubTokenResponse;
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    if (!tokenRes.ok) {
      console.error("[github.integration.token]", { status: tokenRes.status });
      return fail(request, "token_exchange_failed");
    }
    tokenJson = (await tokenRes.json()) as GitHubTokenResponse;
  } catch (err) {
    console.error("[github.integration.token]", err);
    return fail(request, "token_exchange_failed");
  }

  if (tokenJson.error || !tokenJson.access_token) {
    console.error("[github.integration.token.body]", tokenJson.error, tokenJson.error_description);
    return fail(request, tokenJson.error || "no_token");
  }

  const accessToken = tokenJson.access_token;
  const scopes = (tokenJson.scope || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let ghUser: GitHubUser = {};
  try {
    const userRes = await fetch(USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (userRes.ok) {
      ghUser = (await userRes.json()) as GitHubUser;
    } else {
      console.error("[github.integration.user]", { status: userRes.status });
    }
  } catch (err) {
    console.error("[github.integration.user]", err);
  }

  try {
    await upsertUserIntegration(user.id, "github", {
      accessToken,
      refreshToken: tokenJson.refresh_token ?? null,
      tokenExpiresAt: tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
        : null,
      scopes,
      externalAccountId: ghUser.id != null ? String(ghUser.id) : null,
      externalAccountLogin: ghUser.login ?? null,
      metadata: {
        avatar_url: ghUser.avatar_url ?? null,
        html_url: ghUser.html_url ?? null,
        name: ghUser.name ?? null,
      },
    });
  } catch (err) {
    console.error("[github.integration.persist]", err);
    return fail(request, "persist_failed");
  }

  const success = new URL("/integrations/github", request.nextUrl.origin);
  success.searchParams.set("connected", "1");
  const response = NextResponse.redirect(success);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
