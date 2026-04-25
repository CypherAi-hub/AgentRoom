"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/signup/actions";
import {
  AuthInput,
  FormError,
  GithubButton,
  OrDivider,
  PrimaryButton,
} from "@/components/auth/auth-form-fields";

export function SignupForm({ nextPath, initialError }: { nextPath: string; initialError: string | null }) {
  const [state, action] = useActionState(signupAction, { error: initialError });
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
          autoComplete="new-password"
          minLength={6}
          required
        />
        <PrimaryButton pendingLabel="Creating account...">Create account</PrimaryButton>
        <FormError message={error} />
      </form>

      <OrDivider />
      <GithubButton />
    </>
  );
}
