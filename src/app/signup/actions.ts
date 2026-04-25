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
    return { error: "Unable to create an account with those credentials." };
  }

  if (!data.session) {
    const params = new URLSearchParams({ next: nextPath, confirm: email });
    redirect(`/signup?${params.toString()}`);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}
