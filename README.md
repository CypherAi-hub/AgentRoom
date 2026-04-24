# Agent Room

Agent Room is a mock-first AI command center for builders who are tired of scattered tools. Every project gets its own operating room with agents, tools, workflows, approvals, tasks, and live activity.

FoFit is the flagship room for this MVP.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`.

Checks:

```bash
npm run lint
npm run build
```

## Routes

`/dashboard`, `/rooms`, `/rooms/fofit`, `/rooms/fofit/agents`, `/rooms/fofit/tasks`, `/rooms/fofit/activity`, `/rooms/fofit/workflows`, `/rooms/fofit/approvals`, `/integrations`, `/agents`, `/settings`.

## Mocked

The MVP uses typed mock data in `src/lib/mock-data.ts`: 3 rooms, 8 agents, 12 integrations, 20 tasks, 20 activity events, 8 approvals, and 6 workflows.

No real API keys, auth, billing, database connection, deployments, or external side effects are active.

## Real-ready foundation

Integration adapters live in `src/lib/integrations/` and expose `connect`, `disconnect`, `getStatus`, `sync`, `getActivity`, `createTask`, `executeAction`, and `validatePermissions`.

Risk and approval logic lives in `src/lib/permissions.ts`. High-risk actions always require approval: production deploys, PR merges, database deletes, DNS changes, Stripe product changes, external messages, env var changes, auth/security changes, billing changes, and user data deletion.

The future Supabase schema and RLS intent live in `supabase/schema.sql`. Environment placeholders live in `.env.example`.

## Legacy prototype

The original Express/local live-feed prototype is preserved in `legacy/local-live-feed/`. It can become a future read-only Local Agent Feed adapter.

## Next steps

1. Verify every route in browser on desktop and mobile.
2. Add Supabase Auth and workspace sessions.
3. Wire read-only GitHub activity sync.
4. Wire Vercel deployment status.
5. Wire Supabase project health.
6. Wire Stripe read-only product/subscription status.
7. Wire Sentry issue sync.
8. Persist approvals and audit logs.
9. Add workflow run history.
10. Add background jobs/webhooks.
