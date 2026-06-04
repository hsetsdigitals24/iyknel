# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project summary

A B2B e-commerce platform for fast-moving consumer goods (FMCG), targeting the Nigerian market. Registered businesses browse products, build carts, and submit orders. Payment is **manual bank transfer** — no online payment SDKs. Each order generates an invoice that includes a computed logistics cost. Admin back office is notified by email at submission, approves orders, verifies bank transfers, and marks invoices PAID. Inventory is restocked manually or via CSV bulk upload.

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **DB / ORM:** PostgreSQL + Prisma
- **Auth:** NextAuth (Auth.js) — credentials provider + Prisma adapter
- **UI:** Tailwind CSS + shadcn/ui; `Inter` for UI, a serif (`Fraunces` or `Instrument Serif`) for headings
- **Email:** nodemailer
- **SMS:** BulkSMS Nigeria
- **Invoice PDF:** `@react-pdf/renderer`
- **File storage:** Cloudflare R2 
- **Validation:** Zod (every API input)
- **CSV parsing:** papaparse
- **Motion:** Framer Motion — restrained, page transitions + cart drawer only

## Commands

```bash
npm run dev                   # local dev server
npm run build                 # production build
npm run lint                  # eslint
npm run typecheck             # tsc --noEmit
npm test                      # vitest / jest
npx prisma migrate dev        # apply migrations
npx prisma db seed            # seed vehicles, distance bands, logistics costs, admin user
npx prisma studio             # DB browser
```

## Directory map

```
app/            # Next.js App Router (routes, layouts, server components)
  (public)/     # landing, products, auth pages
  (customer)/   # dashboard, cart, wishlist, checkout, orders, account
  (admin)/      # admin back office (role-gated)
  api/          # route handlers
components/
  ui/           # shadcn primitives
  ...           # feature components (product-card, cart-drawer, etc.)
lib/
  auth.ts       # NextAuth config
  db.ts         # Prisma client singleton
  mail.ts       # nodemailer + templated senders
  sms.ts        # BulkSMS NG client wrapper
  r2.ts         # R2/S3 client + signed-URL upload
  logistics.ts  # vehicle picker + cost lookup
  invoice/      # PDF renderer
  csv.ts        # bulk-upload parsing + validation
prisma/
  schema.prisma
  seed.ts       # seeds logistics matrix from reference CSVs
emails/         # React Email templates
public/
```

## Environment variables

Required (loaded via `.env.local`, never `NEXT_PUBLIC_*` for secrets):

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
BULKSMS_NG_API_TOKEN
BULKSMS_NG_SENDER_ID
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_PUBLIC_BASE_URL
ADMIN_NOTIFY_EMAIL
CONTACT_EMAIL
CONTACT_PHONE
CONTACT_WHATSAPP
BANK_NAME
BANK_ACCOUNT_NAME
BANK_ACCOUNT_NUMBER
```

## Domain rules

### Accounts
- **B2B only.** Signup collects: business name, RC number, contact person, phone, email, delivery address. No individual/consumer signup.
- Roles: `CUSTOMER`, `ADMIN`. Role is server-checked on every admin route.

### Order state machine
`DRAFT → SUBMITTED → AWAITING_APPROVAL → AWAITING_PAYMENT → PAYMENT_REVIEW → PAID → DISPATCHED → DELIVERED`. Any state may transition to `CANCELLED` with a reason. Transitions are server-only and write to an `AuditLog`.

Triggers:
- `SUBMITTED` → email admin (`ADMIN_NOTIFY_EMAIL`).
- Admin sets distance band → vehicle auto-resolved → invoice PDF generated and uploaded to R2.
- `AWAITING_PAYMENT` → email + SMS customer with bank details.
- Customer clicks "I have paid" → state moves to `PAYMENT_REVIEW`.
- Admin marks PAID → email + SMS customer.

### Logistics
- Vehicle is **auto-selected** by total order weight: smallest vehicle whose `tonnage_kg ≥ order_weight_kg`.
- Distance band is **set by admin** after reviewing the submitted address (not by the customer).
- Cost = `logistics_costs[vehicle_id, band_id].cost_naira` (preloaded matrix from the reference CSV — do not recompute from fuel/km in code).
- Overflow case: if order weight > largest vehicle's tonnage, split into ceil(weight / max_tonnage) trips of the largest vehicle. Flag for admin review.
- Logistics matrix is **edited only via the admin UI** (`/admin/logistics`), never hardcoded.

### Money
- All monetary amounts stored as **integer kobo** (1 NGN = 100 kobo). Format only at the view boundary.

### Order line snapshots
- On order submission, copy `price` and `weight_kg` from the `Product` onto the `OrderItem`. Never read live product values when computing an existing order's totals.

### Inventory
- All stock changes (restocks, sales, manual adjustments, bulk uploads) write a `StockMovement` row. The `Product.stock` field is derived/reconciled from movements.
- Bulk upload CSV columns: `sku, name, category, price_naira, weight_kg, stock_delta, description`. Reject the whole upload on any invalid row; report per-row errors.

## Conventions

- **Server Components by default.** Add `"use client"` only when interactivity demands it.
- **All API input goes through Zod.** No `as any`, no trusting `req.body` shape.
- **All DB access through Prisma.** No raw SQL except in migrations.
- **Never trust client-supplied prices, weights, or totals.** Always recompute on the server from product IDs + quantities.
- **Role checks happen on the server**, in route handlers and server actions — never gate admin features by hiding UI alone.
- **Idempotency:** order submission, payment-mark, and admin approvals should be safe to retry (use an idempotency key or check current state before transitioning).
- **PII:** phone/email/address are PII — never log them.
- **Secrets:** no `NEXT_PUBLIC_*` for anything sensitive; client never sees SMTP, R2, or BulkSMS credentials.
- **File names:** kebab-case for files, PascalCase for components.

## Do-nots

- Do **not** integrate any online payment SDK (Paystack/Flutterwave/Stripe). Payment is manual bank transfer only.
- Do **not** hardcode the logistics cost matrix in application code — it lives in the DB and is admin-editable.
- Do **not** add client-only role checks for admin pages.
- Do **not** store product images in the DB or `/public` — always R2.
- Do **not** compute order totals on the client.
- Do **not** edit `prisma/migrations/` by hand — use `prisma migrate dev`.

## Reference data

The two CSVs at the repo root (`Supply Logistics Cost - Sheet1.csv`, `Sheet2.csv`) are the source of truth for seeding `vehicles`, `distance_bands`, and `logistics_costs`. Vehicles & tonnage:

| Vehicle      | Tonnage (kg) |
|--------------|--------------|
| Korope       | 700          |
| Toyota Hiace | 1,500        |
| Chevy        | 3,000        |
| Ford Transit | 3,000        |
| Benz Truck   | 7,500        |

Distance bands: 2-5km, 6-10km, 11-15km, 15-20km, 25-30km, 35-40km, 40-50km, 50-60km. Spot-check after seed: `Benz Truck × 50-60km = ₦112,750`.

## Out of scope

- Online payments
- Multi-warehouse / multi-currency
- Real-time delivery tracking
- Customer messaging / chat
