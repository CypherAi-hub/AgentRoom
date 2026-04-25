import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { getSafeNextPath } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AuthSearchParams = Record<string, string | string[] | undefined>;

type SignupPageProps = {
  searchParams?: Promise<AuthSearchParams>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  return {
    email: typeof email === "string" ? email.trim().toLowerCase() : "",
    password: typeof password === "string" ? password : "",
    nextPath: getSafeNextPath(formData.get("next")),
  };
}

function signupPath(nextPath: string, error: string) {
  const search = new URLSearchParams({ next: nextPath, error });
  return `/signup?${search.toString()}`;
}

function loginPath(nextPath: string, message: string) {
  const search = new URLSearchParams({ next: nextPath, message });
  return `/login?${search.toString()}`;
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) return origin;

  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

async function signup(formData: FormData) {
  "use server";

  const { email, password, nextPath } = getCredentials(formData);

  if (!email || !password) {
    redirect(signupPath(nextPath, "Enter your email and password."));
  }

  if (password.length < 6) {
    redirect(signupPath(nextPath, "Use at least 6 characters for your password."));
  }

  const origin = await getRequestOrigin();
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    redirect(signupPath(nextPath, "Unable to create an account with those credentials."));
  }

  if (!data.session) {
    redirect(loginPath(nextPath, "Check your email to confirm your account, then sign in."));
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = getSafeNextPath(firstParam(params.next));
  const error = firstParam(params.error);

  return (
    <main className="min-h-screen px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-lg border border-white/10 bg-[#080b12]/85 shadow-2xl shadow-black/35 backdrop-blur md:grid-cols-[0.82fr_1fr]">
          <div className="p-6 sm:p-8 md:p-10">
            <div className="mx-auto flex max-w-md flex-col justify-center">
              <div>
                <div className="flex size-11 items-center justify-center rounded-md border border-white/10 bg-white text-background">
                  <Sparkles className="size-5" aria-hidden="true" />
                </div>
                <h1 className="mt-6 text-2xl font-semibold text-white">Create your account</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Start with a free profile and 10 credits for the protected sandbox.
                </p>
              </div>

              {error && (
                <div className="mt-6 rounded-md border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100" role="alert">
                  {error}
                </div>
              )}

              <form action={signup} className="mt-7 flex flex-col gap-4">
                <input type="hidden" name="next" value={nextPath} />
                <label className="flex flex-col gap-2 text-sm font-medium text-white" htmlFor="email">
                  Email
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="h-11 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-sky-300/60 focus:ring-2 focus:ring-sky-300/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-white" htmlFor="password">
                  Password
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="h-11 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-sky-300/60 focus:ring-2 focus:ring-sky-300/20"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-background transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Create account
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </form>

              <p className="mt-6 text-sm text-muted-foreground">
                Already have access?{" "}
                <Link className="font-medium text-white hover:text-sky-100" href={`/login?next=${encodeURIComponent(nextPath)}`}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <div className="relative min-h-[520px] overflow-hidden border-t border-white/10 bg-[linear-gradient(145deg,rgba(16,185,129,0.11),rgba(125,211,252,0.1)_48%,rgba(244,247,251,0.04))] p-8 md:border-l md:border-t-0 md:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent" />
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-emerald-100">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Profile and billing foundation
                </div>
                <h2 className="mt-8 max-w-xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">
                  Secure by default
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
                  Profiles are created from Supabase Auth and billing fields stay out of client-side update paths.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                {["Free plan", "10 starter credits", "Server billing writes"].map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-black/20 px-4 py-3">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
