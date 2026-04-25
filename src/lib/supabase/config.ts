export const DEFAULT_AUTH_REDIRECT_PATH = "/dev/sandbox-test";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, key };
}

export function getSafeNextPath(value: FormDataEntryValue | string | string[] | null | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const path = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  try {
    const parsed = new URL(path, "https://agent-room.local");
    if (parsed.origin !== "https://agent-room.local") {
      return DEFAULT_AUTH_REDIRECT_PATH;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }
}
