# Creem × Supabase — Next.js 14 SaaS Starter

A production-ready starter for billed SaaS products. Clone, configure, deploy,
start selling. Supabase handles auth and data, Creem handles payments.

- ⚡️ **Next.js 14 App Router** + Server Components + Server Actions
- 🔐 **Supabase auth** (email/password and OAuth — Google + GitHub wired up)
- 💳 **Creem payments** — checkout, subscriptions, upgrades/downgrades,
  cancellations, customer portal, one-time credit packs
- 🪙 **Credits wallet** with atomic spend, ledger, and auto top-up on every
  subscription renewal
- 🗄 **Postgres schema** with RLS, triggers, and an `add_credits` SQL
  function for race-free balance mutations
- 🪝 **Signature-verified, idempotent webhooks** (HMAC-SHA256, timing-safe)
- 🎨 **Zero Tailwind** — semantic HTML styled with global CSS variables,
  Miranda Sans and Lilex from Fontsource
- 🧱 **TypeScript strict mode** + **`noUncheckedIndexedAccess`**
- ▲ **Vercel-ready**

MIT licensed. Free to use, modify, ship.

---

## Quick start

```bash
git clone https://github.com/alfrednerstu/creem-next-supabase
cd creem-next-supabase
npm install
cp .env.example .env.local
# fill in the Supabase + Creem values
npm run dev
```

Open http://localhost:3000.

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL and publishable key from **Project Settings → API**.
   Paste them into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the older `ANON_KEY` name also
   works).
3. Copy the **service role** key into `SUPABASE_SERVICE_ROLE_KEY` — this is
   used only by server code (webhooks, admin mutations) and is never exposed
   to the browser.
4. Apply the SQL migration:
   ```bash
   supabase db push
   # or, if you don't use the Supabase CLI, paste the contents of
   # supabase/migrations/0001_init.sql into the SQL editor
   ```
5. (Optional) Enable Google / GitHub providers in **Authentication →
   Providers** and set the redirect URL to
   `https://your-domain/auth/callback`.

### 2. Creem

1. Create products in the [Creem dashboard](https://creem.io/dashboard).
   You'll typically want one recurring product per plan (Starter, Pro,
   Enterprise) plus one or more one-time credit packs.
2. Copy each product's ID into `.env.local`:
   ```
   CREEM_PRODUCT_STARTER=prod_xxx
   CREEM_PRODUCT_PRO=prod_xxx
   CREEM_PRODUCT_ENTERPRISE=prod_xxx
   CREEM_PRODUCT_CREDITS_PACK=prod_xxx
   ```
   These are read by `lib/plans.ts` — adjust names, prices and monthly
   credit grants there to match your real plans.
3. Copy your API key into `CREEM_API_KEY`.
4. In **Developers → Webhooks** create a webhook pointing to
   `https://your-domain/api/webhooks/creem` and copy the signing secret
   into `CREEM_WEBHOOK_SECRET`.

Recommended events to subscribe to:

- `checkout.completed`
- `subscription.created`
- `subscription.updated`
- `subscription.renewed`
- `subscription.canceled`
- `subscription.paused`
- `subscription.resumed`

### 3. Deploy

Push to GitHub and import the repo on [Vercel](https://vercel.com/new).
Set the same environment variables in the Vercel project settings and hit
deploy.

Update `NEXT_PUBLIC_SITE_URL` to your production URL and point the Creem
webhook at `https://your-domain/api/webhooks/creem`.

---

## Architecture

```
app/
├── (auth)/                 sign-in, sign-up, server actions
├── (dashboard)/            protected pages (dashboard, billing, credits, settings)
├── api/
│   ├── billing/            checkout, upgrade, cancel, portal
│   ├── credits/            spend
│   └── webhooks/creem/     signature-verified event handler
├── auth/callback/          OAuth / magic-link exchange
├── pricing/                public pricing page
├── page.tsx                landing
├── layout.tsx
└── globals.css             CSS variables, type scale, no Tailwind

components/SiteHeader.tsx

lib/
├── creem/
│   ├── client.ts           thin wrapper around the Creem REST API
│   └── webhooks.ts         HMAC-SHA256 signature verification
├── db/queries.ts           typed reads for profiles, subs, wallets, ledger
├── supabase/
│   ├── client.ts           browser client
│   ├── server.ts           server client + service-role admin client
│   ├── middleware.ts       session refresh on every request
│   └── types.ts            hand-written DB types
├── env.ts                  centralised env access with friendly errors
└── plans.ts                plan catalogue + credit packs

middleware.ts               route guards (protected vs auth-only prefixes)

supabase/migrations/0001_init.sql
```

### Data model

| Table            | Purpose                                                            |
|------------------|--------------------------------------------------------------------|
| `profiles`       | 1:1 with `auth.users`. Auto-created by trigger. Holds the Creem customer id. |
| `subscriptions`  | One row per Creem subscription with status, period, plan key.     |
| `credit_wallets` | Current balance + lifetime totals. `CHECK (balance >= 0)`.         |
| `credit_ledger`  | Append-only history. Every mutation writes a row.                  |
| `webhook_events` | Idempotency log keyed on `(provider, event_id)`.                   |

All tables have RLS enabled. Users can `SELECT` their own rows; all writes
flow through the service-role key from trusted server code.

The SQL function `public.add_credits(user, delta, reason, metadata)` mutates
the wallet atomically, writes a ledger entry, and returns the new balance.
Negative deltas (spends) are rejected by the `balance >= 0` check — the
`/api/credits/spend` route surfaces that as a 402 so clients know to top up.

### Auth

- Middleware (`middleware.ts`) calls `updateSession` on every request, which
  refreshes the Supabase JWT and re-emits cookies.
- Protected prefixes: `/dashboard`, `/billing`, `/credits`, `/settings` —
  unauthenticated visits are redirected to `/sign-in?next=…`.
- Auth-only prefixes: `/sign-in`, `/sign-up` — authenticated visitors are
  redirected to `/dashboard`.
- Auth mutations use server actions in `app/(auth)/actions.ts`.

### Payments flow

```
[pricing page]
     │
     ▼
POST /api/billing/checkout    ──►  Creem /v1/checkouts
     │                                   │
     │                                   ▼
     │                           user pays → success_url
     ▼                                   │
window.location = checkout_url           ▼
                                  POST /api/webhooks/creem
                                      (checkout.completed,
                                       subscription.created,
                                       subscription.renewed, …)
                                         │
                                         ▼
                                  • verify HMAC signature
                                  • insert into webhook_events (idempotent)
                                  • upsert subscription row
                                  • auto-credit the user's wallet via add_credits()
```

**Upgrades / downgrades.** `POST /api/billing/upgrade` calls Creem's
subscription upgrade endpoint with
`update_behavior: "proration-charge-immediately"`. Creem sends back a
`subscription.updated` event that the webhook persists.

**Cancellation.** `POST /api/billing/cancel` schedules cancellation at
period end. The DB is optimistically updated and later reconciled by the
`subscription.canceled` webhook.

**Customer portal.** `POST /api/billing/portal` exchanges the stored Creem
customer id for a hosted portal URL so users can update payment methods and
download invoices without leaving your app.

### Credits

- Every signup seeds **25 free credits** via the `handle_new_user` trigger.
- Each paid plan sets `monthlyCredits` in `lib/plans.ts`. On every
  `subscription.created` / `subscription.renewed` / upgrade event the
  webhook calls `add_credits(..., "subscription_topup", …)`.
- One-time credit packs are bought via the same checkout flow — the webhook
  detects the product id and calls `add_credits(..., "purchase", …)`.
- Spending: `POST /api/credits/spend { amount, reason }`. Atomic, RLS-safe.
  Returns `402` if the user's balance would go negative.

---

## Environment variables

See `.env.example` for the full list.

| Variable                              | Required | Notes                              |
|---------------------------------------|----------|------------------------------------|
| `NEXT_PUBLIC_SITE_URL`                | ✔︎       | Base URL used in redirects        |
| `NEXT_PUBLIC_SUPABASE_URL`            | ✔︎       |                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`| ✔︎       | Or `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY`           | ✔︎       | Server-only. Never expose.         |
| `CREEM_API_KEY`                       | ✔︎       |                                    |
| `CREEM_API_URL`                       |          | Defaults to `https://api.creem.io/v1` |
| `CREEM_WEBHOOK_SECRET`                | ✔︎       | For HMAC verification              |
| `CREEM_PRODUCT_*`                     |          | Product IDs from the Creem dashboard |

---

## Design system

- **No Tailwind.** Styling lives in `app/globals.css` as CSS variables and
  semantic selectors. Components are HTML-first (`<section>`, `<article>`,
  `<header>`, `<nav>`, `<aside>`).
- **Type scale:** 12, 14, 16, 20, 24, 32, 48.
- **Line heights:** 1.5 body · 1.25 headers · 1.125 large display.
- **Fonts:** [Miranda Sans](https://www.npmjs.com/package/@fontsource/miranda-sans)
  for body text, [Lilex](https://www.npmjs.com/package/@fontsource-variable/lilex)
  for monospace. Both self-hosted via Fontsource.
- **Palette:** soft cream surface, deep-teal ink, bright-teal accent. Change
  the CSS variables at the top of `globals.css` to re-skin the whole app.

---

## Scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run start      # production server
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## Security checklist

- ✅ Webhook body is read as raw text, signature verified with timing-safe
  comparison
- ✅ Webhook events are de-duped via the `webhook_events (provider,
  event_id)` unique constraint
- ✅ All client reads go through RLS; all writes go through the service role
- ✅ `credit_wallets.balance` has a `CHECK (balance >= 0)` so a spend can
  never overdraw
- ✅ `SUPABASE_SERVICE_ROLE_KEY` and `CREEM_*` secrets are server-only
- ✅ Middleware refreshes Supabase sessions on every request

---

## License

[MIT](./LICENSE) — use it, ship it, change it, no attribution required.
