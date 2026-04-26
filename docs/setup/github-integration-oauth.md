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

## Steps (do this once, on github.com)

1. Go to https://github.com/settings/developers → **New OAuth App**.
2. Fill in:
   - **Application name**: `Agent Room — Integrations`
   - **Homepage URL**: `https://agentroom.app`
   - **Authorization callback URL**: `https://agentroom.app/api/integrations/github/callback`
   - **Application description** (optional): "Agent Room reads your
     repositories so AI agents can work on them. Read-only access."
3. Click **Register application**.
4. On the resulting page:
   - Copy the **Client ID**.
   - Click **Generate a new client secret** → copy it immediately (it's
     shown once).

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
