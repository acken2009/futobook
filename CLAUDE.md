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
2. If `requiresPayment=true` → POST `/api/stripe/checkout` → returns Stripe Checkout URL
3. Checkout session is created on the **store's connected Stripe account** with `application_fee_amount`
4. On success → Stripe fires `payment_intent.succeeded` → Connect webhook (`/api/webhooks/stripe-connect`) → updates reservation to `confirmed`, sends confirmation email with cancel link
5. **Cancel flow**: customer clicks link → `/store/[slug]/reserve/cancel?token=...` → POST `/api/reservations/cancel` → Stripe refund + status update + email

### Data Flow: Platform Plan Billing

1. Store owner selects plan → POST `/api/stripe/platform-subscription`
2. Free plan (スターター): cancels existing Stripe subscription + sets `platform_plan_id` directly
3. Paid plan: creates Stripe Checkout session (platform account, not Connect)
4. Billing page **always syncs from Stripe on every load** (not webhook-dependent) — queries active subscriptions and updates `platform_plan_id`

### Supabase Client Usage

- `lib/supabase/server.ts` — server components and API routes for authenticated user operations (respects RLS)
- `lib/supabase/admin.ts` (`supabaseAdmin`) — bypasses RLS; used in all API routes and webhooks that need cross-tenant access
- `lib/supabase/client.ts` — browser client for client components

### Stripe Integration

- **Two webhook endpoints**:
  - `/api/webhooks/stripe` — platform account events (platform subscriptions, account updates)
  - `/api/webhooks/stripe-connect` — connected account events (customer payments, customer subscriptions)
- Both use idempotency via `webhook_events` table (unique on `stripe_event_id`)
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

### Rate Limiting

`lib/rate-limit.ts` — in-memory (per-process) rate limiter. Two presets: `reservationRateLimit` (10 req/10min per IP) and `checkoutRateLimit` (5 req/1min per IP).

## Environment Variables

See `.env.local.example` for all required variables. Key ones:
- `NEXT_PUBLIC_APP_URL` — used in email cancel links and Stripe success/cancel URLs
- `NEXT_PUBLIC_APP_DOMAIN` — used for subdomain routing (e.g. `futobook.vercel.app`)
- `STRIPE_CONNECT_WEBHOOK_SECRET` — separate from `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` — for `supabaseAdmin` (never expose to client)
