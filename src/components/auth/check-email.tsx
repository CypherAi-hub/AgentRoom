import Link from "next/link";
import { Mail } from "lucide-react";
import { AgentRoomLogomark } from "@/components/auth/auth-shell";

export function CheckEmailScreen({ email }: { email: string }) {
  return (
    <main
      className="flex min-h-screen w-full items-center justify-center px-5 py-10"
      style={{
        background: "#0A0A0A",
        color: "#F5F5F5",
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <AgentRoomLogomark />
        </div>

        <section
          className="rounded-[14px] border p-7 text-center"
          style={{ background: "#0F0F0F", borderColor: "#1F1F1F" }}
        >
          <div
            className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full border"
            style={{ background: "#0F2A1A", borderColor: "#1d7c4d", color: "#3EE98C" }}
          >
            <Mail className="size-5" aria-hidden="true" />
          </div>
          <h1 className="text-[22px] font-semibold leading-tight" style={{ color: "#F5F5F5" }}>
            Check your email
          </h1>
          <p
            className="mt-3 break-all font-mono text-sm"
            style={{
              color: "#3EE98C",
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
            }}
          >
            {email}
          </p>
          <p className="mt-4 text-sm leading-6" style={{ color: "#A0A0A0" }}>
            We sent a confirmation link to {email}. Click it to finish setting up your account.
          </p>
        </section>

        <div className="mt-6 text-center text-sm" style={{ color: "#A0A0A0" }}>
          Didn&apos;t get it?{" "}
          <Link
            href="/signup"
            className="font-medium underline-offset-4 hover:underline"
            style={{ color: "#3EE98C" }}
          >
            Try again
          </Link>
        </div>
      </div>
    </main>
  );
}
