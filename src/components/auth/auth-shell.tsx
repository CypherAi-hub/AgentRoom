import Link from "next/link";
import type { ReactNode } from "react";

export function AgentRoomLogomark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-md border font-mono font-bold"
      style={{
        width: size,
        height: size,
        background: "#0F2A1A",
        borderColor: "#1d7c4d",
        color: "#3EE98C",
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        fontSize: Math.round(size * 0.4),
        letterSpacing: "0.05em",
      }}
    >
      AR
    </span>
  );
}

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
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
          <Link href="/" aria-label="Agent Room home">
            <AgentRoomLogomark />
          </Link>
        </div>

        <section
          className="rounded-[14px] border p-7"
          style={{ background: "#0F0F0F", borderColor: "#1F1F1F" }}
        >
          <header className="mb-6 text-center">
            <h1 className="text-[24px] font-semibold leading-tight" style={{ color: "#F5F5F5" }}>
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6" style={{ color: "#888" }}>
              {subtitle}
            </p>
          </header>

          {children}
        </section>

        <div className="mt-6 text-center text-sm" style={{ color: "#A0A0A0" }}>
          {footer}
        </div>
      </div>
    </main>
  );
}
