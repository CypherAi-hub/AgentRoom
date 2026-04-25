"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";
import {
  AuthInput,
  FormError,
  GithubButton,
  OrDivider,
  PrimaryButton,
} from "@/components/auth/auth-form-fields";

export function LoginForm({ nextPath, initialError }: { nextPath: string; initialError: string | null }) {
  const [state, action] = useActionState(loginAction, { error: initialError });
  const error = state.error ?? initialError;

  return (
    <>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={nextPath} />
        <AuthInput id="email" name="email" type="email" label="Email" autoComplete="email" required />
        <AuthInput
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
        />
        <PrimaryButton pendingLabel="Signing in...">Sign in</PrimaryButton>
        <FormError message={error} />
      </form>

      <OrDivider />
      <GithubButton />
    </>
  );
}
