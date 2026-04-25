"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSafeNextPath } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const nextPath = getSafeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}
