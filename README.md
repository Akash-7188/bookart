# 📚 Bookart

**A hyperlocal marketplace to buy, rent and sell books, notes and study material.**
Flipkart-style commerce, specialised for educational and reading resources — with peer-to-peer sellers, registered bookshops and lending libraries, distance-radius discovery, and a real security-deposit rental engine.

> Buy from a shop 2 km away · Rent a semester guide with a refundable deposit · Sell what you've already finished.

---

## ✨ What's inside

| Area | Highlights |
| --- | --- |
| **Landing & home** | GPS / pincode location detector ("Deliver to"), global search, buy-vs-rent split CTAs, category tiles, distance-ranked "within 25 km" grid, deposit explainer with live example table |
| **Marketplace** | Server-rendered catalogue with URL-driven filters: radius (5/10/25/100 km/anywhere), transaction type, condition, format, item type, seller type, price slider, 4 bucket presets, 6 sort modes, facets with counts, pagination |
| **Product page** | 4-image gallery (front / back / spine / sample inner page), full bibliographic data, condition report with disclosed defects, schematic distance map, seller trust card, rental tiers, buyer ratings + rating form, similar copies |
| **Rental engine** | Deposit = full item value held in escrow · 7/15/30/90-day tiers · damage grading (0 / 10 / 35 / 100%) · late fee 10% of daily rate capped at 60% of deposit · refund = deposit − fee − penalty − late |
| **Seller portal** | 5-step listing wizard (React Hook Form + Zod) with live buyer preview, condition grading, defect checklist, rental pricing with auto-generated tiers, GPS/manual pickup point |
| **Dashboards** | Buyer orders with stage tracker, rental & deposit ledger with return requests, seller console (listings CRUD, rental ledger, inspection + refund release calculator, payouts), admin console (verification queue, escrow exposure, disputes) |
| **Auth & roles** | Email/password with scrypt hashing + Google OAuth entry point, buyer → seller upgrade, GSTIN / registration-ID verification for bookshops & libraries |
| **Geo engine** | Haversine great-circle distance, bounding-box pre-filter, natural distance labels ("2.4 km away"), pincode index, GPS reverse-lookup to nearest city |

Everything is mobile-first responsive, with a sticky bottom tab bar on phones and a full desktop layout above `lg`.

---

## 🧱 Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router, Server Components, Server Actions), React 19 |
| Styling | **Tailwind CSS v4** with a token-based theme, Lucide icons, shadcn-style primitives hand-rolled in `src/components/ui` |
| State & forms | **Zustand** (cart, location), **React Hook Form + Zod** (listing wizard, auth) |
| Validation | Zod schemas shared between client forms and server actions |
| Auth | Supabase Auth for hosted email/password and optional Google sign-in; local demo sessions without Supabase configuration |
| Data | Local demo JSON store (`.data/bookart.json`) or Supabase/Postgres with Row Level Security when configured |
| Geo | Haversine in TypeScript; `supabase/schema.sql` ships the equivalent `ST_DWithin` PostGIS queries |

**Why keep the JSON store?** It makes the demo boot with a single `npm run dev` and no database. When the Supabase environment variables are set, the app uses the hosted data layer in `src/lib/hosted-data.ts`; without them, it uses `.data/bookart.json`.

> **Hosted launch status:** Supabase Auth and hosted database paths are implemented, but the schema has not yet been run against or tested in your Supabase project. Follow the setup below, then test the hosted flows before deploying. The hosted catalog starts empty; demo seed data is local-only. Online payments, wallet funding, shipping, and real rental escrow are not implemented. Do not accept real orders or payments yet.

---

## 🚀 Getting started

```bash
cd bookart
npm install
npm run seed      # generates .data/bookart.json (75 listings, 16 users, live rentals)
npm run dev       # http://localhost:3000
```

The app self-seeds on first request, so `npm run seed` is optional. To wipe and regenerate:

```bash
npm run db:reset
```

### Connect your Supabase project

Do this in a **new Supabase project** before adding real data. The SQL schema is a one-time initial setup, not a repeatable migration; if it reports an error, stop and resolve that error before running it again.

1. In the Supabase dashboard, open **SQL Editor**, create a query, paste the complete contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the tables, Auth profile trigger, policies, and checkout/return functions.
2. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` for local testing, and add `http://localhost:3000/auth/callback` to the redirect URLs. Add your eventual production domain and its `/auth/callback` URL there when you deploy.
3. In the project **Connect** or **API Keys** settings, copy the Project URL and the publishable key (or legacy `anon` key). Create `.env.local` in the project root with:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Do not put a `service_role` or secret key in this file or expose it to the browser. The app does not need that key.
4. Restart the app after saving `.env.local` (`npm run dev`). Create an account with **Sign up**, confirm the email if Supabase requests it, then sign in. The profile should be created automatically.
5. To use the admin console, first create and confirm your own account. In **SQL Editor**, replace the email below with that account's email and run the statement once:

   ```sql
   update public.users
   set role = 'admin'
   where id = (
     select id from auth.users
     where lower(email) = lower('you@example.com')
   );
   ```

   Sign out and back in, then open `/admin`. Never promote a user you do not control.
6. To list a book, sign in, open the seller flow, and complete individual-seller setup. A hosted catalog does not include the local demo listings; add listings through the app.
7. Verify sign-up/sign-in, profile updates, listing creation, marketplace search, cart, and a cash-on-delivery test order. UPI/card checkout is deliberately rejected until a payment provider is integrated; rentals cannot be funded until wallet top-ups/payments are implemented.

Google sign-in is optional. To enable it, configure the Google provider under Supabase **Authentication → Providers** and add the callback URL shown by Supabase to the Google OAuth client's authorized redirect URIs. The local demo's mock Google sign-in is not used when Supabase is configured.

To return to the local demo, remove or rename `.env.local` and restart the app. Do not run `npm run seed` expecting it to populate Supabase; it only creates local demo data.

### Demo accounts (password `demo1234`)

| Role | Email | What to look at |
| --- | --- | --- |
| Buyer | `buyer@bookart.in` | Orders, active + overdue rentals, deposit refund ledger, wallet |
| Seller | `seller@bookart.in` | Listings table, rental ledger with a return awaiting inspection, payout summary |
| Admin | `admin@bookart.in` | Verification queue (Nalanda Books pending GSTIN review), escrow exposure, disputes |

Every seeded account shares the password `demo1234`; the login page has one-click buttons that fill the form.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0:3000` |
| `npm run build` / `npm start` | Production build & serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Generate the mock store (books, notes, sellers, geo-coordinates) |
| `npm run db:reset` | Delete `.data` and re-seed |
| `npm run test:flows` | **38-check domain test suite** — geo, radius, search, rental engine, full rental lifecycle, checkout re-pricing, listing creation, filter combos |

---

## 🗂 Folder structure

```
bookart/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # header + footer + mobile tab bar shell
│  │  ├─ page.tsx                # landing dashboard
│  │  ├─ marketplace/page.tsx    # catalogue with server-side filters
│  │  ├─ product/[id]/page.tsx   # PDP (gallery, condition, seller, rent box)
│  │  ├─ cart/ checkout/         # cart page + escrow-aware checkout
│  │  ├─ orders/ rentals/        # buyer order + deposit dashboards
│  │  ├─ sell/ seller/           # listing wizard + seller console
│  │  ├─ admin/                  # trust & safety console
│  │  ├─ login/ signup/ account/ # auth + profile & verification
│  │  ├─ api/location/route.ts   # persists client GPS into a cookie for SSR
│  │  └─ actions/                # server actions (auth, marketplace, rental)
│  ├─ components/
│  │  ├─ ui/                     # button, card, form, sheet, badge, misc primitives
│  │  ├─ layout/                 # header, search, location picker, cart drawer, tab bar
│  │  ├─ domain/                 # badges, product card, gallery, PDP actions, distance map
│  │  ├─ marketplace/            # filter rail, results toolbar, URL filter hook
│  │  ├─ rental/                 # buyer rental + deposit ledger
│  │  ├─ seller/                 # listing wizard + seller console
│  │  ├─ checkout/ cart/ admin/ auth/ account/
│  ├─ lib/
│  │  ├─ rental.ts               # ★ deposit / fee / penalty / refund engine
│  │  ├─ geo.ts                  # ★ Haversine, bounding box, pincode index
│  │  ├─ db.ts                   # data access layer (mirrors the SQL schema)
│  │  ├─ seed-data.ts            # catalogue + sellers + live demo orders
│  │  ├─ covers.ts               # procedural cover art (4 views per listing)
│  │  ├─ types.ts                # domain types (mirror of the SQL schema)
│  │  └─ constants.ts, listing-schema.ts, auth-schema.ts, session.ts, utils.ts
│  └─ store/                     # zustand: cart, location
├─ scripts/seed.ts               # seed CLI
├─ scripts/test-flows.ts         # domain test suite
├─ supabase/schema.sql           # ★ Postgres + PostGIS production schema (RLS, views)
└─ prisma/schema.prisma          # Prisma mirror of the same model
```

---

## 🔐 Data model (key entities)

```
User        id · name · email · role(buyer|seller|admin) · sellerKind(individual|bookstore|library)
            occupation · age · gender · address · city · pincode · latitude · longitude
            rating · ratingsCount · walletBalance · verifiedSeller · verification{gstin, registrationId, status}

Product     id · sellerId · kind(book|notes|bundle) · title · author · publisher · edition · year · isbn
            language · pages · subject · course · category · format · condition · conditionNotes[]
            purchasedOn · mrp · buyPrice · isRentable · rentalBaseRate · rentalTiers[] · depositMultiplier
            latitude · longitude · pickupArea/City/Pincode · status(available|rented|sold|draft)

RentalOrder id · buyerId · sellerId · productId · days · tierLabel
            depositPaid · rentalFee · lateFee · penaltyPct · penaltyAmount · refundAmount
            startDate · dueDate · returnRequestedAt · returnedAt · refundedAt · refundMethod
            status(active|return_requested|returned_inspected|refunded|overdue|cancelled) · timeline[]

PurchaseOrder / Cart / Review / Session  — as in src/lib/types.ts
```

Full DDL, indexes, PostGIS distance function, escrow ledger and RLS policies: [`supabase/schema.sql`](supabase/schema.sql).

---

## 💰 The rental engine (`src/lib/rental.ts`)

```
deposit      = (buyPrice ?? mrp) × depositMultiplier      # full item value, held in escrow
tier fee     = rentalBaseRate × days × (1 − tier discount) # 7d 0%, 15d 8%, 30d 15%, 90d 30%
             → clamped to a share of item value:           7d 12%, 15d 22%, 30d 35%, 90d 60%
             → rounded to ₹5, floor ₹20
late fee     = rentalBaseRate × 0.1 × overdueDays          # capped at 60% of deposit
penalty      = deposit × { ok 0%, minor 10%, major 35%, lost 100% }
refund       = max(0, deposit − rentalFee − penalty − lateFee)
```

Worked example — ₹620 copy, ₹9/day rate:

| Tier | Fee | Refunded on verified return |
| --- | --- | --- |
| 7 days | ₹65 (₹9.3/day) | ₹555 |
| 15 days | ₹125 (₹8.3/day) | ₹495 |
| 30 days | ₹215 (₹7.2/day) | ₹405 |
| 1 semester / 90 days | ₹370 (₹4.1/day) | ₹250 |

Longer tiers win on the daily rate; the 90-day fee is clamped to 60% of the copy's value, so a semester rental can never cost more than the book itself. These exact numbers are rendered live on the landing page and asserted by `npm run test:flows`.

The engine is pure and deterministic, and `npm run test:flows` asserts: deposit equals item value, longer tiers are cheaper per day, refund reconciles with the settlement breakdown, penalties scale 0/10/35/100%, late fees cap at 60%, and tiers never exceed a rational share of the item's value.

### Lifecycle

```
active ──request return──▶ return_requested ──seller inspects──▶ refunded
   │                              │                                 │
   └── past due date ──▶ overdue ─┘        refund → buyer wallet, fee + penalty → seller
                                           listing flips back to `available`
```

---

## 📍 The location engine (`src/lib/geo.ts`)

* **Haversine** great-circle distance on every listing ↔ buyer pair.
* **Bounding-box pre-filter** before the trig (`boundingBox()`), which is exactly how a PostGIS `ST_DWithin` query stays index-friendly.
* **Radius options**: 5 km, 10 km, 25 km, 100 km, Anywhere (courier ₹49).
* **Labels**: `<1 km → "850 m away"`, `≥1 km → "2.4 km away"`, `>400 km → "Courier delivery"`.
* **Location sources**: browser Geolocation API → nearest indexed city; pincode/city lookup; saved default. The chosen origin is mirrored into a cookie (`/api/location`) so **server components** run the radius filter with the same origin the client shows.

---

## 🔑 Auth, roles & verification

1. **Buyer** — email/password or Google. Registration captures name, email, phone, occupation, age, gender, address + pincode (pincode → coordinates).
2. **Seller** — automatic upgrade the moment a buyer lists an item. Individuals are KYC auto-approved.
3. **Registered bookstore** — GSTIN required; verification `pending` until an admin approves. Verified badge appears on cards, PDP and seller console.
4. **Registered library** — registration/licence ID required; same review flow.
5. **Admin** — reviews the verification queue, monitors escrow exposure, disputes and penalty history.

Demo auth notes: passwords are hashed with `scrypt` (`salt:hash`), sessions are httpOnly cookies with 30-day expiry stored in the session table. `googleAuthAction` documents exactly where to plug real OAuth credentials (see `.env.example`) — without them it completes a mock handshake so the flow stays walkable.

---

## 🧪 Verification performed

```
$ npm run typecheck     → clean (strict TS)
$ npm run build         → 15 routes, compiled successfully
$ npm run test:flows    → ✅ 38 passed, 0 failed
```

The suite caught and we fixed three genuine bugs during development: ISBN search failing on hyphenated input, rental tiers able to exceed the item's own value, and a double wallet debit when a rental was started.

---

## 🛠 Production migration path

| Demo build | Production |
| --- | --- |
| `.data/bookart.json` local demo | Supabase Auth/Postgres paths in `src/lib/hosted-data.ts` and `supabase/schema.sql` |
| Haversine in TS | `ST_DWithin(geography)` + GiST index (SQL provided) |
| Local demo sessions | Supabase Auth (implemented; project configuration still required) |
| Procedural SVG covers | Supabase Storage / S3 uploads with signed URLs (3–6 photos per listing) |
| Payments, wallet funding & escrow | Payment provider, verified webhooks, and compliant deposit/refund handling (not implemented) |
| Hosted persistence | Supabase Auth and database paths (implemented; apply schema and test in your project) |

Recommended next features: ISBN barcode scanning, bulk CSV listing for shops, wishlist alerts when a rented copy returns, semester-end rental reminders, and courier partner integration for the "Anywhere" radius.

---

## 📄 License

Demo project — mock inventory, simulated payments and refunds. Book covers are procedurally generated SVG art, so no real cover imagery is redistributed.
