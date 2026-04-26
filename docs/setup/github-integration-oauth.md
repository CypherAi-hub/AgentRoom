# GitHub Integration OAuth — Setup

The integration that lets users connect their GitHub account to Agent Room
(repo list, issue read, etc.) needs its **own** OAuth app, separate from
the one Supabase uses for sign-in/sign-up.

## Why a second OAuth app?

The Supabase auth flow currently requests `read:user` + `user:email` only
— minimal scopes so the signup screen feels light. The integration needs
`repo` so agents can act on the user's repositories. Forcing every signup
through a `repo`-scoped consent screen is intimidating, conflates auth with
authorization, and expands the blast radius of a Supabase auth-cookie leak.

So: two apps, two callbacks, two pairs of credentials.

## OAuth App vs GitHub App — pick one

This integration works with either:

- **OAuth App** (`Iv1.*` Client ID) — classic, simpler. User grants
  `read:user` + `repo` once and the token can list every repo they
  can see. **Recommended for this MVP.**
- **GitHub App** (`Iv23l*` Client ID) — newer, more granular. Permissions
  configured on the App itself (the `scope=` query param is ignored).
  User must **install** the App on each account/org they want exposed
  before any user-to-server token sees those repos.

Our `/api/integrations/github/connect` and `/callback` routes work for
both. Pick OAuth App if you want zero install ceremony; pick GitHub App
if you want per-org install controls.

## Steps (OAuth App — recommended)

1. Go to https://github.com/settings/applications/new
   (or `https://github.com/settings/developers` → **OAuth Apps** tab →
   **New OAuth App** — *not* the **GitHub Apps** tab).
2. Fill in:
   - **Application name**: `Agent Room — Integrations`
   - **Homepage URL**: `https://www.agentroom.app`
   - **Authorization callback URL**: `https://www.agentroom.app/api/integrations/github/callback`
     **(must include the `www.` prefix — production redirects apex → www
     and GitHub does an exact-match check on the callback URL.)**
   - **Application description** (optional): "Agent Room reads your
     repositories so AI agents can work on them. Read-only access."
3. Click **Register application**.
4. On the resulting page:
   - Copy the **Client ID**.
   - Click **Generate a new client secret** → copy it immediately (it's
     shown once).

## Steps (GitHub App — alternative)

If you'd rather use a GitHub App:

1. https://github.com/settings/apps/new
2. Same name + homepage as above.
3. **Identifying and authorizing users → Callback URL**:
   `https://www.agentroom.app/api/integrations/github/callback` (with
   `www.`).
4. Check **Request user authorization (OAuth) during installation**.
5. Permissions:
   - **Repository → Metadata: Read-only** (default — leave it)
   - Optional: **Issues: Read-only** if you plan to read issues
6. **Where can this GitHub App be installed?** → **Any account** (so
   users besides you can install it).
7. Uncheck **Active** under Webhook (we don't use webhooks for this MVP).
8. Click **Create GitHub App**, then copy the Client ID and click
   **Generate a new client secret**.

For GitHub Apps users will see an extra "Install on" step before
authorize on first connect.

## Vercel env vars

In the Vercel dashboard for `agent-room` (Settings → Environment Variables),
add **two new variables**, both marked **Sensitive**, target **Production**
and **Preview**:

| Name | Value |
| --- | --- |
| `GITHUB_INTEGRATION_CLIENT_ID` | the Client ID from step 4 |
| `GITHUB_INTEGRATION_CLIENT_SECRET` | the Client Secret from step 4 |

Then trigger a redeploy of main so the new env vars are picked up.

## Local dev (.env.local)

Append the same two variables to `/Users/kenanlarry/Desktop/AgentRoom/.env.local`
so `npm run dev` can complete the OAuth round-trip locally:

```
GITHUB_INTEGRATION_CLIENT_ID=<paste here>
GITHUB_INTEGRATION_CLIENT_SECRET=<paste here>
```

`.env.local` is gitignored — no risk of committing.

For local-only testing you may also want to register a **second** OAuth app
with callback `http://localhost:3000/api/integrations/github/callback` and
swap those credentials in for local dev. Optional — if you only test the
flow on production, skip this.

## What runs on these credentials

- `GET /api/integrations/github/connect` — generates state token, redirects
  the signed-in user to GitHub's authorize page.
- `GET /api/integrations/github/callback` — receives `?code=` + `?state=`,
  exchanges the code for an `access_token`, calls `/user` to learn the
  GitHub login + id, persists everything in `public.user_integrations`,
  redirects to `/integrations/github`.
- `POST /api/integrations/github/disconnect` — deletes the row.

The token is stored in Supabase's `public.user_integrations.access_token`
column under RLS that denies all client access; only the service-role
key reads it. UI components only ever see the public projection
(`provider`, `externalAccountLogin`, `scopes`, timestamps).

## Verifying setup

Once env vars are in place:

```
$ vercel env pull .env.production.local   # optional sanity check
$ grep GITHUB_INTEGRATION .env.local
GITHUB_INTEGRATION_CLIENT_ID=Iv1.abcd1234
GITHUB_INTEGRATION_CLIENT_SECRET=...
```

Then sign in to agentroom.app, visit `/integrations`, click **Connect
GitHub** on the GitHub card. You should bounce to GitHub, authorize, and
land back on `/integrations/github` showing your handle and a list of
your repos.
