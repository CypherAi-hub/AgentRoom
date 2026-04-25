import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { BillingConfigurationError, getRequiredEnv } from "@/lib/billing/errors";
import { getStripeClient, getStripeObjectId } from "@/lib/billing/stripe";

type BillingProfile = {
  id: string;
  email?: string | null;
  stripe_customer_id?: string | null;
  plan?: string | null;
  credits?: number | null;
};

let adminClient: SupabaseClient | null = null;

function isStripeNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error as { statusCode?: number }).statusCode === 404
  );
}

function getSupabaseUrl() {
  return getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
}

function getSupabasePublicKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!key) {
    throw new BillingConfigurationError(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return key;
}

export async function createBillingUserClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export function getSupabaseAdminClient() {
  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl(), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

export async function getAuthenticatedBillingUser() {
  const supabase = await createBillingUserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getOrCreateStripeCustomerId(user: User) {
  const supabase = getSupabaseAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle<BillingProfile>();

  if (error) {
    throw error;
  }

  if (profile?.stripe_customer_id) {
    try {
      const customer = await getStripeClient().customers.retrieve(profile.stripe_customer_id);
      if (!("deleted" in customer && customer.deleted)) {
        return profile.stripe_customer_id;
      }
    } catch (error) {
      if (!isStripeNotFoundError(error)) {
        throw error;
      }
    }
  }

  const customer = await getStripeClient().customers.create({
    email: user.email ?? profile?.email ?? undefined,
    metadata: {
      user_id: user.id,
    },
  });

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? profile?.email ?? "",
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    throw upsertError;
  }

  return customer.id;
}

export async function setProfilePlan(userId: string, plan: "free" | "pro", stripeCustomerId?: string | null) {
  const update: Partial<BillingProfile> & { id: string; updated_at: string } = {
    id: userId,
    plan,
    updated_at: new Date().toISOString(),
  };

  if (stripeCustomerId) {
    update.stripe_customer_id = stripeCustomerId;
  }

  const { error } = await getSupabaseAdminClient().from("profiles").upsert(update, { onConflict: "id" });
  if (error) {
    throw error;
  }
}

export async function incrementProfileCredits(
  userId: string,
  credits: number,
  stripeCustomerId?: string | null,
) {
  const supabase = getSupabaseAdminClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .maybeSingle<BillingProfile>();

  if (error) {
    throw error;
  }

  const currentCredits = typeof profile?.credits === "number" ? profile.credits : 0;
  const update: Partial<BillingProfile> & { id: string; updated_at: string } = {
    id: userId,
    credits: currentCredits + credits,
    updated_at: new Date().toISOString(),
  };

  if (stripeCustomerId) {
    update.stripe_customer_id = stripeCustomerId;
  }

  const { error: updateError } = await supabase.from("profiles").upsert(update, { onConflict: "id" });
  if (updateError) {
    throw updateError;
  }
}

export async function findUserIdForStripeCustomer(stripeCustomerId: string) {
  const { data: profile, error } = await getSupabaseAdminClient()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle<BillingProfile>();

  if (error) {
    throw error;
  }

  return profile?.id ?? null;
}

export function getStripeCustomerIdFromSession(customer: Parameters<typeof getStripeObjectId>[0]) {
  return getStripeObjectId(customer);
}
