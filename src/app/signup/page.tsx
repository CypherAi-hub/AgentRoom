import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { CheckEmailScreen } from "@/components/auth/check-email";
import { SignupForm } from "@/app/signup/signup-form";
import { getSafeNextPath } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type AuthSearchParams = Record<string, string | string[] | undefined>;
type SignupPageProps = { searchParams?: Promise<AuthSearchParams> };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = getSafeNextPath(firstParam(params.next));
  const errorParam = firstParam(params.error) ?? null;
  const confirm = firstParam(params.confirm) ?? null;

  if (confirm) {
    return <CheckEmailScreen email={confirm} />;
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start with 10 free credits and a real cloud sandbox."
      footer={
        <>
          Already have an account?{" "}
          <Link
            className="font-medium underline-offset-4 hover:underline"
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            style={{ color: "#3EE98C" }}
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm nextPath={nextPath} initialError={errorParam} />
    </AuthShell>
  );
}
