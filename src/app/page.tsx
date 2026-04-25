import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) {
      redirect("/dashboard");
    }
  } catch {
    // Supabase env not configured — fall through to /pricing.
  }
  redirect("/pricing");
}
