import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeNextPath, getSupabaseConfig } from "@/lib/supabase/config";

const PROTECTED_PAGE_PREFIXES = ["/dev/sandbox-test", "/billing"] as const;
const PROTECTED_API_PREFIXES = ["/api/dev/sandbox-test", "/api/billing"] as const;

function hasPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isProtectedPagePath(pathname: string) {
  return PROTECTED_PAGE_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix));
}

function isProtectedApiPath(pathname: string) {
  return PROTECTED_API_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix));
}

function copyAuthCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });

  for (const headerName of ["cache-control", "expires", "pragma"]) {
    const headerValue = from.headers.get(headerName);
    if (headerValue) {
      to.headers.set(headerName, headerValue);
    }
  }

  return to;
}

function unauthenticatedResponse(request: NextRequest, supabaseResponse: NextResponse) {
  const nextPath = getSafeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`);

  if (isProtectedApiPath(request.nextUrl.pathname)) {
    return copyAuthCookies(
      supabaseResponse,
      NextResponse.json(
        { error: "Authentication required.", loginUrl: `/login?next=${encodeURIComponent(nextPath)}` },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", nextPath);

  return copyAuthCookies(supabaseResponse, NextResponse.redirect(loginUrl));
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let supabaseResponse = NextResponse.next({ request });
  let config: ReturnType<typeof getSupabaseConfig>;

  try {
    config = getSupabaseConfig();
  } catch {
    if (isProtectedApiPath(pathname)) {
      return NextResponse.json(
        { error: "Supabase auth environment variables are not configured." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (isProtectedPagePath(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", getSafeNextPath(`${pathname}${request.nextUrl.search}`));
      loginUrl.searchParams.set("error", "supabase_env_missing");
      return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub) && !error;

  if (!isAuthenticated && (isProtectedPagePath(pathname) || isProtectedApiPath(pathname))) {
    return unauthenticatedResponse(request, supabaseResponse);
  }

  return supabaseResponse;
}
