import { notFound } from "next/navigation";
import { SandboxTestClient } from "@/components/dev/sandbox-test-client";
import { isDevSandboxRouteEnabled } from "@/lib/dev/e2b-sandbox-store";

export const dynamic = "force-dynamic";

export default function SandboxTestPage() {
  if (!isDevSandboxRouteEnabled()) {
    notFound();
  }

  return <SandboxTestClient />;
}
