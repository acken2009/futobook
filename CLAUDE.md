# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Futobook** — a multi-tenant SaaS platform where store owners manage reservations, subscriptions, and billing. Built with Next.js 15 App Router + Supabase + Stripe Connect + Tailwind CSS.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (runs type checks)
npm run typecheck    # TypeScript check only (npx tsc --noEmit)
npm run lint         # ESLint
npm run test:unit    # Vitest unit tests
npm run test:unit:watch  # Vitest watch mode
npm run test:e2e     # Playwright E2E tests (requires running dev server)
npm run test:e2e:ui  # Playwright UI mode
npm run db:migrate   # supabase db push (requires npx supabase link first)
```

**Run a single unit test file:**
```bash
npx vitest run tests/unit/billing.test.ts
```

**Run a single E2E spec:**
```bash
npx playwright test tests/e2e/billing.spec.ts
```

**Apply DB migrations when supabase CLI is not linked:**
Run the SQL directly in Supabase Dashboard → SQL Editor.

## Architecture

### Route Groups

| Group | Path | Purpose |
|---|---|---|
| `(store-admin)` | `/dashboard/**` | Store owner management (auth-gated by middleware) |
| `(customer-facing)` | `/store/[slug]/**` | Public-facing store pages, reservation & subscription flows |
| `(platform-admin)` | `/admin/**` | Platform admin (auth-gated) |

### Data Flow: Reservation with Payment

1. Customer fills `reserve-form.tsx` → POST `/api/reservations` (creates reservation with status `pending`, generates `cancel_token`)
   - Server-side validation in `lib/reservations/validate.ts`: future datetime, business hours, slot grid, party size — **all in JST** (the client also generates slots as JST `+09:00` regardless of browser timezone)
   - Monthly plan limit (`max_reservations_per_month`) is enforced here
2. If `requiresPayment=true` → POST `/api/stripe/checkout` → returns Stripe Checkout URL (session `expires_at` = 30 min)
3. Checkout session is created on the **store's connected Stripe account** with `application_fee_amount`
4. On success → Stripe fires `payment_intent.succeeded` → Connect webhook (`/api/webhooks/stripe-connect`) → updates reservation to `confirmed`, sends confirmation email with cancel link
   - **Important**: with current Stripe API versions, `session.payment_intent` is `null` at session creation, so the `payments` row is created with a null intent ID; the webhook reconciles by `metadata.reservation_id` and backfills the intent ID
   - If the reservation was already cancelled (cron timeout / token cancel) or the slot was taken (unique violation on confirm), the webhook auto-refunds in full (`refundOrphanedPayment`, idempotency key `auto_refund_{reservationId}`)
   - `checkout.session.expired` cancels the still-pending reservation to free the slot
5. **Cancel flow**: customer clicks link → `/store/[slug]/reserve/cancel?token=...` → POST `/api/reservations/cancel` → Stripe refund (idempotency key `cancel_refund_{reservationId}`) + conditional status update + email

### Data Flow: Platform Plan Billing

1. Store owner selects plan → POST `/api/stripe/platform-subscription`
2. Free plan (スターター): cancels existing Stripe subscription + sets `platform_plan_id` directly
3. Paid plan: creates Stripe Checkout session (platform account, not Connect)
4. Billing page **always syncs from Stripe on every load** (not webhook-dependent) — queries active subscriptions and updates `platform_plan_id`

### Supabase Client Usage

- `lib/supabase/server.ts` — server components and API routes for authenticated user operations (respects RLS)
- `lib/supabase/admin.ts` (`supabaseAdmin`) — bypasses RLS; used in all API routes and webhooks that need cross-tenant access
- `lib/supabase/client.ts` — browser client for client components
- `supabaseAdmin`, `stripe` (server), and Resend are **lazily initialized** so `next build` works without secrets; missing env vars throw at first use with a clear message

### Stripe Integration

- **Two webhook endpoints**:
  - `/api/webhooks/stripe` — platform account events (platform subscriptions, account updates)
  - `/api/webhooks/stripe-connect` — connected account events (customer payments, customer subscriptions)
- Both use idempotency via `webhook_events` table (unique on `stripe_event_id`); on processing failure the row is deleted (`unmarkEventAsProcessed`) so Stripe's retry can reprocess
- Connect webhook events include `stripe-account` header → stored as `{accountId}_{eventId}` for uniqueness
- Platform fee calculation is in `lib/stripe/fees.ts` (imported by `lib/stripe/client.ts`) — keep fee logic here to enable unit testing without Stripe SDK initialization

### Key DB Notes

- `payments` table stores `reservation_id` in the `metadata` JSONB column (not a direct FK column) — query with `.contains("metadata", { reservation_id: id })`
- `cancel_token` and `cancel_token_expires_at` were added in migration `0004` (ALTER TABLE) — expiry = `reserved_at - 2 hours`
- Refund policy: 24h+ before = 100%, 2–24h before = 50%, under 2h = not cancellable
- Platform plan sync: billing page queries Stripe directly rather than relying on webhooks

### Email

`lib/email/templates.tsx` — plain HTML string templates (no React Email dependency at runtime). `reservationConfirmationEmail` conditionally renders a cancel button if `cancelUrl` is provided. Emails sent via Resend through `lib/email/send.ts` which also logs to `notification_log` table.

### Subdomain Routing

`middleware.ts` rewrites `{slug}.{APP_DOMAIN}` → `/store/{slug}`. Disabled for `localhost:3000`. Store slug is injected as `x-store-slug` response header.

### Platform Plans & Feature Fences

Pricing (as of 2026-07): スターター ¥0 (30 reservations/mo, 4.9% fee) / ベーシック ¥2,980 (unlimited, 2.9%) / スタンダード ¥9,800 (unlimited, 1.9%). Yearly billing = monthly × 10 (2 months free); the yearly Stripe Price lives on the same Product and is looked up by interval at checkout (no schema change).

- Plan definitions: `app/api/admin/init-plans/route.ts` (idempotent upsert; safe to re-run)
- Feature gating: `lib/plans/features.ts` — `getStoreFeatures(storeId)` / `checkFeature()`. Free tier: no LINE notifications, no product sales, no analytics, "Powered by futobook" footer shown. customerSubscriptions (月額会員) is standard-only.
- Site customization (templates, colors, logo/cover/gallery) is open to **all plans** since 2026-09 (`customization: true` for free); the free-tier strip logic in `store-customizations` POST is kept but is currently a no-op
- Gates are enforced server-side in API routes; dashboard pages show `components/upgrade-notice.tsx`

### Store Site Builder (業種別テンプレート + セクション編集)

The public store page `/store/[slug]` is rendered from a per-store `SiteConfig` stored in `store_customizations.site_config` (JSONB, migration `0010`). NULL = the "simple" template, which reproduces the pre-builder layout.

- `lib/site/sections.ts` — section types (hero, concept, coupon, menu, staff, gallery, plans, voices, news, faq, hours, access, cta, sns) and their **field definitions**. The editor form and the zod validation schema are both generated from these definitions — add/change a field here only
- `lib/site/config.ts` — `SiteConfig` type, `siteConfigSchema` (strict; used by `PUT /api/site-config`), `normalizeSiteConfig` (lenient; drops only broken sections so the public page always renders), theme palettes/contrast helpers
- `lib/site/templates.ts` — industry templates (currently 美容室・理容室 ×4 + 汎用). To add an industry: add a `TEMPLATE_CATEGORIES` entry and templates. `applyTemplate` keeps store-entered content when switching templates. Template sample copy must be generic — store-specific facts (coupons, staff, FAQ answers) start empty; empty sections are auto-hidden on the public page
- `components/site/site-renderer.tsx` — shared renderer (no hooks/server-only imports) used by the public page and the editor preview. Colors are CSS variables (`--c-*`); user text is rendered as React text only
- Menu/gallery/hours/access/SNS sections read existing data (service_items, store_images, availability_schedules, store_customizations) — no duplication in `site_config`
- Editor: `/dashboard/site` (`site-editor.tsx`) with a live preview iframe at `/site-preview` (auth-gated, receives unsaved drafts via same-origin `postMessage`, see `lib/site/preview-protocol.ts`). `middleware.ts` sends `X-Frame-Options: SAMEORIGIN` for `/site-preview` only
- Section images upload via `POST /api/store-images` with `type=section` (returns URL, no DB row)

### Rate Limiting

`lib/rate-limit.ts` — in-memory (per-process) rate limiter. Two presets: `reservationRateLimit` (10 req/10min per IP) and `checkoutRateLimit` (5 req/1min per IP).

### Cron Jobs (Hobby plan constraint)

The Vercel project is on the **Hobby plan**, which only allows cron jobs to run once per day. Both crons in `vercel.json` are scheduled daily:
- `cancel-pending-reservations` (03:00 UTC) — backup cleanup only; the primary mechanism for releasing an abandoned reservation's slot is the `checkout.session.expired` Stripe webhook (instant)
- `send-reminders` (00:00 UTC) — uses a 24h-wide detection window (+12h to +36h from now) instead of a narrow ±30min window, so a once-daily run doesn't miss reservations; `reminder_sent_at IS NULL` prevents duplicate sends across days

If the plan is ever upgraded to Pro, these can revert to finer-grained schedules (e.g. `*/5 * * * *` and `0 * * * *`) and the reminder window can shrink back to ±30min.

## Environment Variables

See `.env.local.example` for all required variables. Key ones:
- `NEXT_PUBLIC_APP_URL` — used in email cancel links and Stripe success/cancel URLs
- `NEXT_PUBLIC_APP_DOMAIN` — used for subdomain routing (e.g. `futobook.vercel.app`)
- `STRIPE_CONNECT_WEBHOOK_SECRET` — separate from `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` — for `supabaseAdmin` (never expose to client)
