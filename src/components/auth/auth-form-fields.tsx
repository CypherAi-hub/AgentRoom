"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, Github } from "lucide-react";
import type { ReactNode } from "react";

const FIELD_STYLE: React.CSSProperties = {
  background: "#0A0A0A",
  borderColor: "#1F1F1F",
  color: "#F5F5F5",
  fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
};

const LABEL_STYLE: React.CSSProperties = { color: "#A0A0A0" };

export function AuthInput({
  id,
  name,
  type,
  label,
  autoComplete,
  defaultValue,
  required,
  minLength,
}: {
  id: string;
  name: string;
  type: "email" | "password" | "text";
  label: string;
  autoComplete: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor={id} style={LABEL_STYLE}>
      <span>{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        minLength={minLength}
        className="auth-input h-11 rounded-md border px-3 text-sm outline-none transition focus:shadow-[0_8px_24px_rgba(62,233,140,0.15)]"
        style={FIELD_STYLE}
      />
    </label>
  );
}

export function PrimaryButton({
  pendingLabel,
  children,
}: {
  pendingLabel: string;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
      style={{ background: "#3EE98C", color: "#0A0A0A" }}
    >
      <span>{pending ? pendingLabel : children}</span>
      {!pending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden="true">
      <div className="h-px flex-1" style={{ background: "#1F1F1F" }} />
      <span className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: "#888" }}>
        or
      </span>
      <div className="h-px flex-1" style={{ background: "#1F1F1F" }} />
    </div>
  );
}

export function GithubButton() {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
      style={{ background: "transparent", borderColor: "#1F1F1F", color: "#F5F5F5" }}
    >
      <Github className="size-4" aria-hidden="true" />
      <span>Continue with GitHub</span>
      <span className="ml-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: "#888" }}>
        soon
      </span>
    </button>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-3 rounded-md border px-3 py-2 text-sm leading-5"
      style={{ borderColor: "rgba(226,75,74,0.35)", background: "rgba(226,75,74,0.08)", color: "#E24B4A" }}
    >
      {message}
    </p>
  );
}
