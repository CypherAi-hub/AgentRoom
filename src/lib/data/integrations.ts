import { getAdminClient } from "@/lib/data/clients";
import type {
  IntegrationProvider,
  UserIntegration,
  UserIntegrationPublic,
} from "@/lib/data/types";

/**
 * SECURITY
 * --------
 * `user_integrations` rows hold OAuth `access_token` (and refresh tokens).
 * RLS denies all client access; only the service-role client used here can
 * read them. NEVER export raw rows or tokens to a client component.
 *
 * - `getUserIntegrations()`            — public projection, safe for UI
 * - `getUserIntegrationToken()`        — server-only, returns the token
 * - `upsertUserIntegration()`          — write (server-only)
 * - `deleteUserIntegration()`          — disconnect (server-only)
 * - `markIntegrationUsed()`            — bookkeeping (server-only)
 */

type Row = {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  external_account_id: string | null;
  external_account_login: string | null;
  metadata: Record<string, unknown> | null;
  connected_at: string;
  last_used_at: string | null;
};

function toFull(row: Row): UserIntegration {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at,
    scopes: row.scopes ?? [],
    externalAccountId: row.external_account_id,
    externalAccountLogin: row.external_account_login,
    metadata: row.metadata ?? {},
    connectedAt: row.connected_at,
    lastUsedAt: row.last_used_at,
  };
}

function toPublic(row: Row): UserIntegrationPublic {
  return {
    provider: row.provider,
    externalAccountLogin: row.external_account_login,
    scopes: row.scopes ?? [],
    connectedAt: row.connected_at,
    lastUsedAt: row.last_used_at,
  };
}

/** Public projection of all integrations for a user (no tokens). */
export async function getUserIntegrations(userId: string): Promise<UserIntegrationPublic[]> {
  const { data, error } = await getAdminClient()
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .order("connected_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toPublic(row as Row));
}

/** Server-only — never call from a client component. Returns the bearer token. */
export async function getUserIntegrationToken(
  userId: string,
  provider: IntegrationProvider,
): Promise<string | null> {
  const { data, error } = await getAdminClient()
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toFull(data as Row).accessToken;
}

/** Server-only — full row for callers that need scopes / login / metadata. */
export async function getUserIntegration(
  userId: string,
  provider: IntegrationProvider,
): Promise<UserIntegration | null> {
  const { data, error } = await getAdminClient()
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toFull(data as Row);
}

export type IntegrationUpsertInput = {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  scopes?: string[];
  externalAccountId?: string | null;
  externalAccountLogin?: string | null;
  metadata?: Record<string, unknown>;
};

export async function upsertUserIntegration(
  userId: string,
  provider: IntegrationProvider,
  input: IntegrationUpsertInput,
): Promise<void> {
  const payload = {
    user_id: userId,
    provider,
    access_token: input.accessToken,
    refresh_token: input.refreshToken ?? null,
    token_expires_at: input.tokenExpiresAt ?? null,
    scopes: input.scopes ?? [],
    external_account_id: input.externalAccountId ?? null,
    external_account_login: input.externalAccountLogin ?? null,
    metadata: input.metadata ?? {},
    connected_at: new Date().toISOString(),
    last_used_at: null,
  };

  const { error } = await getAdminClient()
    .from("user_integrations")
    .upsert(payload, { onConflict: "user_id,provider" });

  if (error) throw error;
}

export async function deleteUserIntegration(
  userId: string,
  provider: IntegrationProvider,
): Promise<void> {
  const { error } = await getAdminClient()
    .from("user_integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) throw error;
}

export async function markIntegrationUsed(
  userId: string,
  provider: IntegrationProvider,
): Promise<void> {
  const { error } = await getAdminClient()
    .from("user_integrations")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) throw error;
}
