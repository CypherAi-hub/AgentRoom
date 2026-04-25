import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LogIn, ShieldCheck } from "lucide-react";
import { getSafeNextPath } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AuthSearchParams = Record<string, string | string[] | undefined>;

type LoginPageProps = {
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

function loginPath(nextPath: string, params: { error?: string; message?: string } = {}) {
  const search = new URLSearchParams({ next: nextPath });

  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);

  return `/login?${search.toString()}`;
}

async function login(formData: FormData) {
  "use server";

  const { email, password, nextPath } = getCredentials(formData);

  if (!email || !password) {
    redirect(loginPath(nextPath, { error: "Enter your email and password." }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(loginPath(nextPath, { error: "Invalid email or password." }));
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = getSafeNextPath(firstParam(params.next));
  const error = firstParam(params.error);
  const message = firstParam(params.message);

  return (
    <main className="min-h-screen px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-lg border border-white/10 bg-[#080b12]/85 shadow-2xl shadow-black/35 backdrop-blur md:grid-cols-[1fr_0.82fr]">
          <div className="relative min-h-[520px] overflow-hidden border-b border-white/10 bg-[linear-gradient(145deg,rgba(125,211,252,0.14),rgba(16,185,129,0.08)_42%,rgba(244,247,251,0.04))] p-8 md:border-b-0 md:border-r md:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/60 to-transparent" />
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-sky-100">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Supabase Auth
                </div>
                <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">
                  Agent Room
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
                  Sign in to continue to your sandbox workspace and keep agent execution behind a verified session.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                {["Protected dev loop", "Billing ready", "Cookie based SSR"].map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-black/20 px-4 py-3">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 md:p-10">
            <div className="mx-auto flex max-w-md flex-col justify-center">
              <div>
                <div className="flex size-11 items-center justify-center rounded-md border border-white/10 bg-white text-background">
                  <LogIn className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold text-white">Welcome back</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Use your Agent Room account to continue.</p>
              </div>

              {(error || message) && (
                <div
                  className={`mt-6 rounded-md border px-4 py-3 text-sm ${
                    error
                      ? "border-red-300/20 bg-red-400/10 text-red-100"
                      : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                  }`}
                  role={error ? "alert" : "status"}
                >
                  {error || message}
                </div>
              )}

              <form action={login} className="mt-7 flex flex-col gap-4">
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
                    autoComplete="current-password"
                    required
                    className="h-11 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-sky-300/60 focus:ring-2 focus:ring-sky-300/20"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-background transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Sign in
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </form>

              <p className="mt-6 text-sm text-muted-foreground">
                New to Agent Room?{" "}
                <Link className="font-medium text-white hover:text-sky-100" href={`/signup?next=${encodeURIComponent(nextPath)}`}>
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
