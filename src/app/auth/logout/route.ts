import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("message", "Signed out.");

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    loginUrl.searchParams.set("error", "Signed out locally. Supabase session cleanup was unavailable.");
  }

  return NextResponse.redirect(loginUrl, { status: 303 });
}
