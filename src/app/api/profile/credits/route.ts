import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("credits, plan")
      .eq("id", user.id)
      .maybeSingle<{ credits: number | null; plan: string | null }>();

    if (error) {
      return NextResponse.json({ error: "profile_read_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json(
      {
        credits: typeof data?.credits === "number" ? data.credits : 0,
        plan: data?.plan === "pro" ? "pro" : "free",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
