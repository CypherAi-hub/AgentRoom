"use client";

import { useEffect, useState, type ReactNode } from "react";

type WelcomeCardProps = {
  headline: string;
  body: string;
  children?: ReactNode;
  actions?: ReactNode;
};

export function WelcomeCard({ headline, body, children, actions }: WelcomeCardProps) {
  // Page transition: 200ms fade/slide-up on mount (no framer-motion dep).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      className="mx-auto w-full max-w-[480px] rounded-xl border p-8"
      style={{
        background: "#0F0F0F",
        borderColor: "#1F1F1F",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 200ms ease, transform 200ms ease",
      }}
    >
      <h1
        className="text-[28px] font-semibold leading-tight"
        style={{ color: "#F5F5F5" }}
      >
        {headline}
      </h1>
      <p className="mt-3 text-sm leading-6" style={{ color: "#A0A0A0" }}>
        {body}
      </p>
      {children ? <div className="mt-6">{children}</div> : null}
      {actions ? <div className="mt-8 flex flex-col gap-3">{actions}</div> : null}
    </section>
  );
}
