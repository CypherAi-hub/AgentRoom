import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/dev/sandbox-test/:path*", "/billing/:path*", "/api/dev/sandbox-test/:path*", "/api/billing/:path*"],
};
