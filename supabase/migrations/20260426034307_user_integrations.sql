-- user_integrations: per-user OAuth tokens for third-party services.
--
-- Server-only by design: RLS enabled with NO policies, which means every
-- non-superuser query (anon + authenticated) is denied. The service-role
-- key bypasses RLS, so server-side code in src/lib/data/integrations.ts
-- is the only path to read/write rows here. NEVER expose access_token to
-- the client; expose only the public projection (provider, login, scopes).

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (
    provider in ('github', 'slack', 'linear', 'vercel', 'resend', 'supabase')
  ),
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  external_account_id text,
  external_account_login text,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, provider)
);

create index if not exists user_integrations_user_provider_idx
  on public.user_integrations (user_id, provider);

alter table public.user_integrations enable row level security;

-- Intentionally NO policies: only service-role can SELECT/INSERT/UPDATE/DELETE.
-- Tokens are sensitive; client code reads the public projection through
-- a server function, never directly.

revoke all on public.user_integrations from public, anon, authenticated;
