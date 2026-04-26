"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Github, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSafeNextPath } from "@/lib/supabase/config";

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

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.65 4.1-5.5 4.1-3.32 0-6.02-2.74-6.02-6.12s2.7-6.12 6.02-6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.86 3.49 14.66 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12s4.26 9.5 9.5 9.5c5.48 0 9.12-3.85 9.12-9.27 0-.62-.07-1.1-.16-1.57H12z"
      />
      <path
        fill="#4285F4"
        d="M21.12 12.23c0-.62-.07-1.1-.16-1.57H12v3.94h5.5c-.11.7-.71 1.96-2.05 2.91l3.16 2.45c1.85-1.71 2.51-4.22 2.51-7.73z"
      />
      <path
        fill="#FBBC05"
        d="M5.98 14.18A6.07 6.07 0 0 1 5.66 12c0-.76.13-1.5.32-2.18L2.78 7.4A9.46 9.46 0 0 0 2.5 12c0 1.55.37 3.02 1.04 4.32l2.44-2.14z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.66 0 4.86-.88 6.48-2.39l-3.16-2.45c-.86.59-2.02 1.01-3.32 1.01-2.55 0-4.71-1.69-5.49-4.04l-2.44 2.14C5.66 19.55 8.6 21.5 12 21.5z"
      />
    </svg>
  );
}

type OAuthProvider = "github" | "google";

function friendlyOAuthMessage(rawMessage: string, provider: OAuthProvider): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes("popup") || lower.includes("blocked")) {
    return "Pop-up was blocked. Allow pop-ups for agentroom.app and try again.";
  }
  if (lower.includes("rate")) {
    return "Too many sign-in attempts. Try again in a minute.";
  }
  const providerLabel = provider === "github" ? "GitHub" : "Google";
  return `We couldn't reach ${providerLabel}. Try again or use email + password.`;
}

function OAuthButton({
  provider,
  label,
  icon,
  nextPath,
}: {
  provider: OAuthProvider;
  label: string;
  icon: ReactNode;
  nextPath?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const safeNext = getSafeNextPath(nextPath);
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (oauthError) {
        console.error("OAuth sign-in error", { provider, message: oauthError.message });
        setError(friendlyOAuthMessage(oauthError.message, provider));
        setPending(false);
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Unable to start sign-in.";
      console.error("OAuth sign-in threw", { provider, error: err });
      setError(friendlyOAuthMessage(rawMessage, provider));
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition hover:bg-[#141414] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: "transparent", borderColor: "#1F1F1F", color: "#F5F5F5" }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
        <span>{pending ? "Redirecting..." : label}</span>
      </button>
      {error ? <FormError message={error} /> : null}
    </>
  );
}

export function OAuthButtons({ nextPath }: { nextPath?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      <OAuthButton provider="google" label="Continue with Google" icon={<GoogleMark />} nextPath={nextPath} />
      <OAuthButton
        provider="github"
        label="Continue with GitHub"
        icon={<Github className="size-4" aria-hidden="true" />}
        nextPath={nextPath}
      />
    </div>
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
