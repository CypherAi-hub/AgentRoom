# Bug Hunt — 2026-04-25 (Phase 5.8, Agent 8)

Static, code-based audit of `src/app`, `src/components`, and `src/lib`. No interactive runs. All filenames absolute-rooted at the repo. Severity definitions per the audit brief: P0 blocks core flow, P1 degrades it, P2 edge case / polish, P3 nitpick.

---

## Status as of 2026-04-25 (Phase 6 sweep)

**Started**: 5 P0, 11 P1 = 16 critical findings (10 P1 headings actually present).
**Fixed in Phase 6**: 3 P0 + 10 P1 = 13.
**Remaining**: 2 P0 + 0 P1 + 10 P2 + 10 P3 = 22.

### P0 fixed
- ✅ **P0 #2** Root layout viewport / theme color — fixed in `4f9d54c` (Phase 6.1.C)
- ✅ **P0 #3** Global `not-found.tsx` / `error.tsx` / `global-error.tsx` — fixed in `4f9d54c` (Phase 6.1.B)
- ✅ **P0 #5** `/api/billing/checkout` 502 masking — fixed in `b271b35` (Phase 6.4); now classifies `config_error`/`invalid_request`/`stripe_unavailable`/`internal` and emits a `requestId`.

### P0 NOT fixed (deferred with reason)
- ⏭️ **P0 #1** Auth proxy / middleware not invoked — **false positive**. Next.js 16.2.4 renamed `middleware.ts` → `proxy.ts`. The build log confirms `ƒ Proxy (Middleware)` is live. Skipped per Phase 6 brief; rename for clarity is a future polish.
- ⏭️ **P0 #4** Sign-out POST has no `revalidatePath` — defensive only ("practically this is fine" per the original audit). Deferred per Phase 6 brief.

### True P0 not in this doc (but blocking)
- ✅ **Computer-use tool version** — `agent-loop.ts` was using `computer_20250124` + beta `computer-use-2025-01-24`, which `claude-sonnet-4-6` does not support. Bumped to `computer_20251124` + beta `computer-use-2025-11-24` per the latest Anthropic docs. Fixed in `4f9d54c` (Phase 6.1.A).

### P1 fixed (all 10 headings)
- ✅ **P1 #1** `(app)` layout auth guard — `d7e6c38` (6.2)
- ✅ **P1 #2** `next` query param lost on signup-from-pricing — `d7e6c38` (6.2)
- ✅ **P1 #3** `signupAction` generic error — `d7e6c38` (6.2)
- ✅ **P1 #4** Login redirect skips profile bootstrap — `d7e6c38` (6.2); added `ensureProfile` in `lib/billing/credits.ts`
- ✅ **P1 #5** Sidebar active highlighting — `ef6a020` (6.5)
- ✅ **P1 #6** CheckoutButton error flash on retry — `b271b35` (6.4)
- ✅ **P1 #7** `EventSource` no reconnect — `82a0fc0` (6.3); exponential backoff 1s→30s
- ✅ **P1 #8** Sandbox iframe missing `sandbox` attribute + CSP — `82a0fc0` (6.3); allowlists `*.e2b.app`/`*.e2b.dev`
- ✅ **P1 #9** Topbar credits poller in background tabs — `ef6a020` (6.5); pause on `document.hidden`
- ✅ **P1 #10** AUTH_REQUIRED no login link — `82a0fc0` (6.3)

### Remaining work
P2 (10) and P3 (10) remain. See entries below — none of them block product flow. Migrated to `docs/bug-hunt-remaining.md` for clarity.

---

## [P0] Auth proxy / middleware — Next.js never invokes `src/proxy.ts`
- **What**: The session-protection logic lives in `src/proxy.ts` exporting `proxy()`. Next.js only auto-wires a file named `middleware.ts` (project root or `src/`). Nothing imports `proxy.ts`. There is no `middleware.ts` anywhere in the repo.
- **Steps to reproduce**: code path — `find` for `middleware.ts` returns nothing. The exported function in `proxy.ts` has no caller.
- **Expected**: All routes in `PROTECTED_PAGE_PREFIXES` / `PROTECTED_API_PREFIXES` should bounce unauthenticated requests to `/login`. Logged-out users hitting `/dashboard` should never see a flash of the protected page or 500 from a `redirect("/login?next=…")` server-side hook.
- **Actual**: The proxy never runs. Every protected page relies solely on the in-page `redirect("/login?next=…")` guard. API routes under `/api/dev/sandbox-test/*` and `/api/billing/checkout` rely on their own `getAuthenticatedBillingProfile`/`getAuthenticatedBillingUser` checks. The `PUBLIC_API_PATHS` carve-out for `/api/billing/webhook` is also moot — but the webhook does its own signature check, so that part still works.
- **File(s)**: `src/proxy.ts:1-23`, `src/lib/supabase/proxy.ts:1-126`. Missing: `src/middleware.ts`.
- **Suggested fix**: Rename `src/proxy.ts` → `src/middleware.ts` and rename the exported `proxy` function to `middleware`. Audit any docs that reference "proxy" naming.

## ~~[P0] Root layout missing `<head>`/viewport + theme color — likely FOUC and missing PWA hints~~ ✅ FIXED
- **What**: `src/app/layout.tsx` defines `metadata.title` and `description` only; no `viewport`, `themeColor`, `icons`, or favicon. The body has `className="antialiased"` but no background — every page sets its own dark background, so any unstyled flash is white.
- **Expected**: Initial paint matches the dark theme. Mobile shows correct viewport scaling.
- **Actual**: First-paint flash of white on slow connections, especially on `/dashboard` where the `(app)` layout's bg only kicks in after hydration.
- **File(s)**: `src/app/layout.tsx:1-24`.
- **Suggested fix**: Add `export const viewport: Viewport = { themeColor: "#0A0A0A" }` and a `<body className="antialiased bg-[#0A0A0A] text-foreground">`.

## ~~[P0] No global `not-found.tsx` or `error.tsx` — 404/500 use Next default white pages~~ ✅ FIXED
- **What**: Repo has no `src/app/not-found.tsx`, no `src/app/error.tsx`, no `src/app/global-error.tsx`. Every `notFound()` call (`/runs/[runId]`, `/rooms/[roomId]`) renders Next's stock unstyled 404. Any thrown render error renders the stock dev-mode error overlay in dev and a plain 500 in prod.
- **Steps to reproduce**: Visit `/runs/invalid-id` while logged in → unstyled white "404 not found".
- **Expected**: Branded dark 404 with a "Back to dashboard" CTA. Branded error boundary.
- **Actual**: White-on-white default Next pages — visually broken vs the rest of the dark UI.
- **File(s)**: missing — `src/app/not-found.tsx`, `src/app/error.tsx`.
- **Suggested fix**: Add both, styled with the existing tokens (`#0A0A0A`, `#3EE98C`).

## [P0] Sign-out POST has no `revalidatePath`, so cached `(app)` shell may show stale email
- **What**: `src/app/auth/logout/route.ts` calls `signOut()` then redirects to `/login`. It does not call `revalidatePath("/", "layout")`. The `(app)/layout.tsx` reads `getAppShellSession()` server-side; with `force-dynamic` on each page it's mostly fine, but the protected pages rely on per-page `dynamic = "force-dynamic"`. Combined with a missing middleware, brief navigation back via the browser cache after logout can render the topbar with the prior email until the next hard navigation.
- **Expected**: After logout, every protected route immediately bounces to `/login`.
- **Actual**: Without `middleware.ts` (see P0 above), `/dashboard` only redirects via in-page `redirect`. If the user opens a stale tab and clicks a sidebar link, the request still goes server-side, so practically this is fine — but the missing `revalidatePath` is still a latent issue once any cached fetch is added.
- **File(s)**: `src/app/auth/logout/route.ts:1-19`.
- **Suggested fix**: Call `revalidatePath("/", "layout")` before the redirect.

## ~~[P0] `/api/billing/checkout` returns 502 for any unexpected error, masking root cause~~ ✅ FIXED
- **What**: The `catch` block returns `"Billing checkout unavailable."` with status 502 for everything except `BillingConfigurationError`. Stripe rate-limit, network, or invalid price config all surface identically.
- **Steps to reproduce**: code path — see `src/app/api/billing/checkout/route.ts:120-124`.
- **Expected**: Distinct status codes (4xx for client, 5xx for server, 503 for Stripe outage), and a request-id forwarded to the client for support.
- **Actual**: User sees the generic "Checkout could not start." toast; no signal in the UI about what to do next.
- **File(s)**: `src/app/api/billing/checkout/route.ts:120-124`, `src/components/billing/checkout-button.tsx:22-35`.
- **Suggested fix**: Distinguish error classes; surface a request id (`session.id` or a uuid) and log it.

---

## ~~[P1] `(app)` layout has no auth guard at the layout level~~ ✅ FIXED
- **What**: `src/app/(app)/layout.tsx` does not redirect unauthenticated users; each child page repeats `if (!user) redirect("/login?next=…")`. Easy to forget on a new page.
- **Expected**: One choke-point in the layout (in addition to middleware).
- **Actual**: Five identical `redirect("/login?next=...")` blocks in dashboard, rooms, runs, agents, integrations, settings.
- **File(s)**: `src/app/(app)/layout.tsx:1-7`, `src/app/(app)/dashboard/page.tsx:24-25`, `src/app/(app)/runs/page.tsx:18-19`, `src/app/(app)/rooms/page.tsx:13-15`, `src/app/(app)/agents/page.tsx:11-13`, `src/app/(app)/integrations/page.tsx:18-21`, `src/app/(app)/settings/page.tsx:8-11`.
- **Suggested fix**: Move the guard into `(app)/layout.tsx`.

## ~~[P1] `next` query parameter not preserved on signup-from-pricing flow~~ ✅ FIXED
- **What**: `/pricing` redirects authed users to `/billing`, but unauthed CTAs link to `/signup` (or `/signup?plan=pro`). After signup, the user lands on `/dashboard` (the default `DEFAULT_AUTH_REDIRECT_PATH`), losing the `?plan=pro` intent — they never see Stripe checkout.
- **File(s)**: `src/app/pricing/page.tsx:77-109`, `src/lib/supabase/config.ts:1`.
- **Suggested fix**: Pass `next=/billing?intent=upgrade` or read `?plan=` on the next page and auto-open the paywall.

## ~~[P1] `signupAction` returns generic error on every Supabase failure~~ ✅ FIXED
- **What**: `src/app/signup/actions.ts:46-48` collapses all `supabase.auth.signUp` errors into `"Unable to create an account with those credentials."`. Rate limit, weak password (server-side), email already registered — all look identical.
- **Expected**: Distinct messages for "email already registered" (link to `/login`) vs other failures.
- **Actual**: Confused user retries forever.
- **File(s)**: `src/app/signup/actions.ts:46-48`.
- **Suggested fix**: Map `error.message` / `error.status` to copy. At minimum surface "email already registered" with a sign-in link.

## ~~[P1] Login redirect after success uses `next` without sanity-checking the user has a profile~~ ✅ FIXED
- **What**: After login, the user is redirected to `next` (default `/dashboard`). The dashboard then queries `profiles` with `maybeSingle()`. If a profile row hasn't been seeded yet (new OAuth signup, edge case), `credits` becomes `0` and the user sees a blank state with no explanation.
- **File(s)**: `src/app/(app)/dashboard/page.tsx:27-33`, `src/lib/billing/credits.ts:221-244` (which auto-creates a profile but only inside the agent endpoint, not on dashboard).
- **Suggested fix**: Add a profile-bootstrap call at the `(app)/layout.tsx` level using the service-role client, or a Postgres trigger on `auth.users` insert.

## ~~[P1] `Sidebar.active` highlighting is wrong for `/dashboard` ↔ `/`~~ ✅ FIXED
- **What**: `pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))` — when on `/dashboard`, the active match is fine, but on `/dashboard/anything-deep` (none today, but planned) the dashboard item won't highlight. Small but a future trap.
- **File(s)**: `src/components/shell/sidebar.tsx:41`.
- **Suggested fix**: Treat `/dashboard` like the other prefixes once nested routes exist.

## ~~[P1] `CheckoutButton` shows checkout error for 1 second then disappears on retry~~ ✅ FIXED
- **What**: When `startCheckout` fails, `error` is set and `loading` is reset to false. But on next click, `setError(null)` runs first; if the new request is fast (cached), the error state flashes off and back on with a different message. Minor visual jitter.
- **File(s)**: `src/components/billing/checkout-button.tsx:41-67`.
- **Suggested fix**: Keep the previous error visible until the new request resolves successfully.

## ~~[P1] `EventSource` for sandbox events has no reconnect logic~~ ✅ FIXED
- **What**: `src/components/dev/sandbox-test-client.tsx:383-403` opens an `EventSource`. On `onerror` it calls `source.close()` and never reopens. Any transient network blip (Vercel cold-start, mobile reconnect) silently kills the live activity feed for the rest of the session.
- **Expected**: Auto-reconnect with backoff.
- **Actual**: Activity drawer stops streaming; user has to refresh the page.
- **File(s)**: `src/components/dev/sandbox-test-client.tsx:396-398`.
- **Suggested fix**: On `onerror`, schedule a reopen with exponential backoff (1s → 5s → 15s).

## ~~[P1] Sandbox iframe lacks `sandbox` attribute and could be CSP-tightened~~ ✅ FIXED
- **What**: The noVNC iframe is loaded with `allow="clipboard-read; clipboard-write; fullscreen"` but no `sandbox` attribute. The src is an E2B-hosted URL (trusted) but the page has no CSP. Risk: an upstream E2B compromise could inject scripts into our origin via clipboard or postMessage.
- **File(s)**: `src/components/dev/sandbox-test-client.tsx:622-627`.
- **Suggested fix**: Add `sandbox="allow-scripts allow-same-origin allow-forms"` (or stricter), and add a CSP header in `next.config.ts`.

## ~~[P1] Topbar credits poller fires every 30s for every authenticated tab~~ ✅ FIXED
- **What**: `src/components/shell/topbar.tsx:47` sets a 30s interval `fetch("/api/profile/credits")`. With multiple tabs open this multiplies. No `visibilitychange` gate, so it polls in background tabs too.
- **File(s)**: `src/components/shell/topbar.tsx:42-54`.
- **Suggested fix**: Pause the interval when `document.hidden`. Use `visibilitychange` to refresh on tab focus.

## ~~[P1] `Sign in to use the sandbox agent` error surfaced as "Sign in required" on the client~~ ✅ FIXED
- **What**: `src/components/dev/sandbox-test-client.tsx:352` maps `body.code === "AUTH_REQUIRED"` to `"Sign in required"`, but it doesn't link to `/login?next=/dev/sandbox-test`. The user sees a flat error.
- **File(s)**: `src/components/dev/sandbox-test-client.tsx:350-355`.
- **Suggested fix**: When the code is `AUTH_REQUIRED`, render an inline `Link` to login.

---

## [P2] `getSafeNextPath` accepts `///foo` only by accident
- **What**: The check `path.startsWith("//")` blocks scheme-relative URLs, but `path.startsWith("///")` is also caught (since it starts with `//`). However, an attacker-controlled path like `/\\evil.com` is allowed as a relative path; the second `URL` parse normalizes it. Probably fine, but worth a unit test.
- **File(s)**: `src/lib/supabase/config.ts:18-36`.
- **Suggested fix**: Add tests for `\\evil.com`, `/\\evil.com`, and `%2F%2Fevil.com`.

## [P2] Dashboard "Welcome back, {email-prefix}" leaks raw email prefix
- **What**: `Welcome back, ${user.email.split("@")[0]}` for an email like `firstname.lastname+test@gmail.com` becomes `Welcome back, firstname.lastname+test`. Cosmetic, but messy.
- **File(s)**: `src/app/(app)/dashboard/page.tsx:49`.
- **Suggested fix**: Prefer `display_name` if present, else clean the prefix (strip `+...`, capitalize).

## [P2] Checkout success/cancel routes use query strings the `/billing` page may not parse
- **What**: `success_url: /billing?checkout=success`, `cancel_url: /billing?checkout=cancelled`, `credits-success`, `credits-cancelled`. The `BillingPage` component (`src/app/billing/page.tsx`) doesn't read `searchParams`, so the toast/banner UX promised by these query params is missing.
- **File(s)**: `src/app/api/billing/checkout/route.ts:69-95`, `src/app/billing/page.tsx:35-44`.
- **Suggested fix**: Pass `searchParams` through to `BillingPageClient` and render a "Payment received — credits added" banner.

## [P2] PaywallModal traps focus visually but not programmatically
- **What**: `src/components/billing/paywall-modal.tsx` listens for Escape and renders an overlay button, but no focus trap or `aria-hidden` on background content. Tabbing out of the modal escapes into the underlying page.
- **File(s)**: `src/components/billing/paywall-modal.tsx:15-73`.
- **Suggested fix**: Use a focus-trap library or move focus to the close button on open and restore on close.

## [P2] `CreateRoomDialog` doesn't reset form state on close, doesn't trap focus
- **What**: Same as the paywall — Esc handling absent (only the overlay click closes). Form values persist across opens.
- **File(s)**: `src/components/rooms/create-room-form.tsx:18-89`.
- **Suggested fix**: Add Escape key handler; reset form on close (`<form key={open}>`).

## [P2] OAuth button error shows raw Supabase message
- **What**: `OAuthButton` surfaces `oauthError.message` directly. Supabase messages are sometimes verbose / link to internal docs.
- **File(s)**: `src/components/auth/auth-form-fields.tsx:139-145`.
- **Suggested fix**: Wrap with friendlier copy.

## [P2] Sandbox activity feed re-fetches full state on every SSE event
- **What**: `src/components/dev/sandbox-test-client.tsx:386-394` calls `refreshState()` after every `onmessage` — that hits `/api/dev/sandbox-test/state` for every tool_use, screenshot, etc. With ~8 iterations and many micro-events, this is dozens of redundant fetches per run.
- **File(s)**: `src/components/dev/sandbox-test-client.tsx:386-394`.
- **Suggested fix**: Debounce `refreshState` to once per second, or have the SSE event itself carry the merged state.

## [P2] `BillingProfile.email` may show `null`/`undefined` in the topbar pill
- **What**: `email = session?.profile?.email ?? session?.user?.email ?? null`. If both are nullish, the truncated div shows `null` (it's coerced through React, so empty). Edge case for OAuth users without verified email.
- **File(s)**: `src/components/shell/topbar.tsx:56,90-92`.
- **Suggested fix**: Hide the email pill entirely when nullish.

## [P2] Run detail page shows "Live" stream pill but no link
- **What**: The "Stream" field renders `Live` text but no link back to `/dev/sandbox-test` or to the noVNC URL. Users can't actually reopen a live stream from the run detail.
- **File(s)**: `src/app/(app)/runs/[runId]/page.tsx:51-55`.
- **Suggested fix**: When `run.status === "running"`, render a `Link` to `/dev/sandbox-test`.

---

## [P3] Inline emoji checkmark in pricing pill (`✓ INCLUDES $15 IN USAGE`)
- **What**: Pricing copy uses a literal `✓`. Project guideline is to avoid emoji. Use an icon component.
- **File(s)**: `src/app/pricing/page.tsx:85`.
- **Suggested fix**: Replace with `<CheckCircle2 className="size-3" />`.

## [P3] Logout button label visible only on `sm` breakpoint
- **What**: The `Logout` text is hidden below `sm`. On a phone the icon is alone. Acceptable, but the `aria-label="Log out"` is on the button — fine for SR users; cosmetic only.
- **File(s)**: `src/components/shell/topbar.tsx:94-98`.
- **Suggested fix**: Either always show "Logout" or compress the topbar more.

## [P3] Footer copy says "Pricing v3 · Apr 2026" — version stamp
- **What**: Hardcoded version date in the pricing footer. Will go stale.
- **File(s)**: `src/app/pricing/page.tsx:567`.
- **Suggested fix**: Drop the version stamp or pull from build env.

## [P3] Tab order from sandbox prompt to "Start Agent" is reasonable but `Refresh state` button intercepts focus
- **What**: After typing in the textarea, Tab moves to the example-prompt chips, then to the "Start Agent" button — but on smaller screens the right column reorders, putting `Refresh state` between the prompt and the start button.
- **File(s)**: `src/components/dev/sandbox-test-client.tsx:597-805`.
- **Suggested fix**: Use `tabIndex` on the start button or restructure DOM order.

## [P3] No `alt` on Agent screenshot is fine, but the alt is the literal word "Agent screenshot"
- **What**: Could include the iteration / action context.
- **File(s)**: `src/components/dev/sandbox-test-client.tsx:919`.
- **Suggested fix**: `alt={\`Screenshot from action ${action} at ${formatTime(event.ts)}\`}`.

## [P3] `Settings` page only shows ID, plan, credits — no "Change password" or "Delete account"
- **What**: Not a bug but a glaring gap for a paid product.
- **File(s)**: `src/app/(app)/settings/page.tsx:1-49`.
- **Suggested fix**: Stub these into a future phase.

## [P3] `Topbar` Pricing link uses `<Link>` to `/billing` (not `/pricing`) when signed in
- **What**: Intentional, but the icon is a price tag — confusing for users who expect "Pricing" to take them to the marketing page.
- **File(s)**: `src/components/shell/topbar.tsx:73-78`.
- **Suggested fix**: Rename label to "Billing" when signed in, "Pricing" when signed out.

## [P3] `<img>` tag in agent screenshot row uses `next/no-img-element` ESLint disable
- **What**: Reasonable (base64 data URL won't benefit from `next/image`), but the comment is in-line. Pull into a small `Base64Img` component to avoid disables sprinkled in.
- **File(s)**: `src/components/dev/sandbox-test-client.tsx:918-919`.
- **Suggested fix**: Wrap in component.

## [P3] `inputSummary` joins with `" - "` (space-dash-space) which trips up screen readers
- **File(s)**: `src/components/dev/sandbox-test-client.tsx:286`.
- **Suggested fix**: Use a `·` separator and add `aria-label` with full sentence.

---

## Summary

| Severity | Count |
| -------- | ----- |
| P0       | 5     |
| P1       | 11    |
| P2       | 10    |
| P3       | 10    |

Total: 36 findings.
