"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSafeNextPath } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignupState = { error: string | null };

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) return origin;
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function signupAction(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const nextPath = getSafeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  if (password.length < 6) {
    return { error: "Use at least 6 characters for your password." };
  }

  const origin = await getRequestOrigin();
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) {
    // P1 #3 — surface distinct messages so the user can act on them rather
    // than retrying the same form blind.
    const message = (error.message || "").toLowerCase();
    const status = typeof error.status === "number" ? error.status : 0;

    if (
      message.includes("already registered") ||
      message.includes("already been registered") ||
      message.includes("user already") ||
      status === 422
    ) {
      return { error: "An account with that email already exists. Try signing in instead." };
    }

    if (message.includes("password")) {
      // Supabase password policy errors (length, strength, etc.).
      return { error: error.message };
    }

    if (message.includes("rate") || status === 429) {
      return { error: "Too many signup attempts. Wait a moment and try again." };
    }

    if (message.includes("invalid") && message.includes("email")) {
      return { error: "Enter a valid email address." };
    }

    if (error.message) {
      return { error: error.message };
    }

    return { error: "Unable to create an account with those credentials." };
  }

  if (!data.session) {
    const params = new URLSearchParams({ next: nextPath, confirm: email });
    redirect(`/signup?${params.toString()}`);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}
