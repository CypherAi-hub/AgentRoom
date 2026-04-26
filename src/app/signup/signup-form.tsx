"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/signup/actions";
import {
  AuthInput,
  FormError,
  OAuthButtons,
  OrDivider,
  PrimaryButton,
} from "@/components/auth/auth-form-fields";

export function SignupForm({ nextPath, initialError }: { nextPath: string; initialError: string | null }) {
  const [state, action] = useActionState(signupAction, { error: initialError });
  const error = state.error ?? initialError;
  // Phase 5.6: post-signup users land in onboarding. If a caller explicitly
  // requested a different `next` path (e.g. paywall return), honor it; otherwise
  // route through the 4-step welcome flow at /onboarding.
  const signupNext = nextPath === "/dashboard" ? "/onboarding" : nextPath;

  return (
    <>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={signupNext} />
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
      <OAuthButtons nextPath={signupNext} />
    </>
  );
}
