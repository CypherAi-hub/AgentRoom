import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/rooms/:path*",
    "/agents/:path*",
    "/runs/:path*",
    "/integrations/:path*",
    "/settings/:path*",
    "/dev/sandbox-test/:path*",
    "/billing/:path*",
    "/api/dev/sandbox-test/:path*",
    "/api/billing/:path*",
    "/api/profile/:path*",
  ],
};
