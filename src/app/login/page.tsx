import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/app/login/login-form";
import { getSafeNextPath } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type AuthSearchParams = Record<string, string | string[] | undefined>;
type LoginPageProps = { searchParams?: Promise<AuthSearchParams> };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = getSafeNextPath(firstParam(params.next));
  const errorParam = firstParam(params.error) ?? null;
  const messageParam = firstParam(params.message) ?? null;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Agent Room workspace."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            className="font-medium underline-offset-4 hover:underline"
            href={`/signup?next=${encodeURIComponent(nextPath)}`}
            style={{ color: "#3EE98C" }}
          >
            Sign up
          </Link>
        </>
      }
    >
      {messageParam ? (
        <p
          role="status"
          className="mb-4 rounded-md border px-3 py-2 text-sm leading-5"
          style={{ borderColor: "rgba(62,233,140,0.35)", background: "rgba(62,233,140,0.08)", color: "#3EE98C" }}
        >
          {messageParam}
        </p>
      ) : null}
      <LoginForm nextPath={nextPath} initialError={errorParam} />
    </AuthShell>
  );
}
