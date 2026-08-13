# RestaurantOS AI — Engineering Log & Project Memory

This file is for whoever (human or Claude) picks this project up next. It
explains what exists, why it's built the way it is, how it's deployed, and
the mistakes already made and fixed — so they don't get made twice. Product
direction lives in [`docs/12_PRODUCT_SCOPE.md`](./docs/12_PRODUCT_SCOPE.md)
(near-term roadmap) and
[`docs/13_FUTURE_VISION.md`](./docs/13_FUTURE_VISION.md) (long-term AI
vision). This file is the *engineering* record: architecture, what's
actually built, how it was verified, and operational gotchas.

## What this is

A multi-tenant SaaS platform for dine-in restaurants, built to compete with
Petpooja (India's dominant restaurant-ops platform) by matching its
operational strengths while being meaningfully better on customer
experience. The restaurant is the paying client — every customer-facing
feature exists to make the restaurant more successful, not as a standalone
consumer product. See `docs/12_PRODUCT_SCOPE.md` §1–2 for the full product
framing.

The founder is non-technical (doesn't write code directly) and builds this
entirely through Claude Code sessions. That shapes how this project runs:
every feature is scoped in plain language first, built, verified end-to-end
with real infrastructure (never just "it typechecks"), and only then shipped
— because there's no second pair of technical eyes to catch a broken feature
before a real customer does.

## Architecture

**Monorepo**: Turborepo + pnpm.
```
apps/landing        marketing site (Next.js)
apps/web             the actual product — staff dashboard + public
                      customer pages (Next.js)
services/api         NestJS modular monolith (all business logic)
services/notification  notification worker (email/WhatsApp, queue-driven)
packages/ui          shared design-system components (shadcn-style)
packages/shared      Zod schemas, permission constants, cross-cutting
                      validation shared by API and web
packages/database    Prisma schema + migrations + generated client
packages/types       shared TypeScript types (API response shapes, entities)
packages/config      shared env/config loading
```

**API style**: NestJS **modular monolith**, not microservices — see
`docs/01_ARCHITECTURE.md`. Every business module under
`services/api/src/modules/<name>/` follows the same Clean-Architecture-lite
folder convention:
```
<module>/
  <module>.module.ts
  application/   services — business logic, talks to Prisma
  presentation/  controllers, DTOs, guards
  domain/        module-local types (when needed)
```
New modules should copy this shape exactly (see `menu`, `branch`, `order`,
`public` for reference implementations).

**Multi-tenancy**: every business table has a `tenantId` column. Tenant
isolation is enforced at the query level in each service — every Prisma
query for an authenticated route is scoped by `req.user.tenantId`. There is
no row-level-security fallback; forgetting to scope a query is a real bug
class, so new endpoints should be checked against existing ones (e.g.
`branch.service.ts`, `order.service.ts`) for the pattern.

**Auth & RBAC**: JWT access/refresh tokens (`JwtAuthGuard`). Permissions are
string constants in `packages/shared`'s `PERMISSIONS` object (e.g.
`menu:manage`, `branch:read`), checked via `@RequirePermissions(...)` +
`PermissionsGuard`. New permissions must be added to `PERMISSIONS` **and**
backfilled onto existing tenants' roles — see "RBAC permission sync" below,
this has bitten us before.

**API response envelope**: every response is
`{ success, data, meta, error }`, auto-wrapped by a global
`ResponseInterceptor` — controllers just return the raw payload. Exception:
a few endpoints (delete, logout) return `{ success: true }` directly and the
interceptor detects and passes that through unwrapped.

**Public (unauthenticated) endpoints**: the `public` module
(`services/api/src/modules/public/`) has no auth guard. Tenant safety is
enforced differently here — by resolving `tenantId` strictly from the
looked-up `Table` record (an unguessable UUID), not from a JWT. This is the
pattern for any future anonymous-customer endpoint (e.g. anonymous feedback
submission): scope by an unguessable resource ID handed only to the
legitimate holder, never by trusting client input for `tenantId`.

**Frontend state**: Zustand (`useAuthStore` in `apps/web/src/lib/api.ts`),
persisted to `localStorage` via `zustand/middleware`'s `persist`. **Critical
pattern**: gate any auth-dependent redirect on `hasHydrated`, not just on
`accessToken` being null — see "Auth hydration race" below.

**Data fetching**: TanStack Query. `apiRequest()` in `apps/web/src/lib/api.ts`
is the one fetch wrapper — pass `{ auth: true }` to attach the JWT, omit it
for public/anonymous calls (see `apps/web/src/app/(customer)/t/[tableId]/`
for the public-page pattern).

**Realtime**: Socket.IO gateway (`gateway` module) is wired to real order
events. `OrderService` (in `order` module) injects `EventsGateway` and calls
`emitOrderUpdate(tenantId, order)` after every create/addItems/status change
— whether the order came from staff or from an anonymous customer via the
public ordering flow — emitting to the `tenant:${tenantId}` room the gateway
already places connected staff sockets into on JWT-authenticated connect.
`apps/web/src/lib/use-order-updates.ts` is the one client-side hook that
subscribes; the Kitchen (`/kitchen`), Waiter (`/waiter`), and staff Orders
(`/orders`) pages all use it instead of a tight poll interval (each still
keeps a 30s poll as a fallback in case the socket drops). The customer-facing
public order-status page is **not** on this socket — it has no JWT to
authenticate a connection with — and still polls every 5s; wiring public/
anonymous realtime (e.g. a per-table or per-order room) is unscoped future
work, not a gap in what shipped.

## What's built so far

1. **Foundation** — monorepo, auth (signup/login/refresh/verify-email/reset
   password), multi-tenant RBAC, Prisma + Postgres + Redis, Socket.IO
   gateway scaffold, notification service scaffold, Docker, CI.
2. **Menu** (`modules/menu`) — categories + items, full CRUD, staff UI at
   `apps/web/src/app/(app)/menu/`.
3. **Branches, Tables, Orders** (`modules/branch`, `modules/order`) —
   branches and tables (with QR-code ordering links), orders with line
   items and a status state machine (`ORDER_STATUS_TRANSITIONS` in
   `packages/shared`), staff UI at `apps/web/src/app/(app)/branches/` and
   `.../orders/`. Every tenant gets a default "Main" branch created inline
   during signup (`auth.service.ts`, to avoid a circular
   `AuthModule ↔ BranchModule` dependency).
4. **Customer self-ordering** (`modules/public`) — the first fully
   zero-install customer-facing flow. Staff generate a QR code + link per
   table (client-side, via the `qrcode` npm package) from the Branches page.
   Scanning it opens `apps/web/src/app/(customer)/t/[tableId]/page.tsx`: no
   login, browse the live menu, build a cart, place a real `Order`. Order
   status is stored in the browser's `sessionStorage` (keyed by table ID)
   so a page reload doesn't lose the customer's place, and polls every 5s
   for status updates (kitchen → ready → served).
5. **Kitchen + Waiter live screens** (`apps/web/.../kitchen/`,
   `.../waiter/`) — real-time replacements for refresh-to-check. Kitchen
   shows open/in-kitchen orders oldest-first with an elapsed-wait timer,
   limited to "Accept order" / "Mark ready". Waiter shows ready/served
   orders, limited to "Mark served" / "Mark paid (cash)" — no order-taking,
   editing, or cancelling — and as of the next item below, this is now a
   real API-enforced boundary, not just which buttons render.
6. **PIN-login staff accounts** (`modules/staff`, `/staff`, `/switch-user`)
   — closes the gap noted above. Staff have no email/password; the Owner
   creates them with just a name + role (`waiter`/`kitchen`) + 4-digit PIN
   from `/staff`. `POST /auth/pin-login` (guarded by `JwtAuthGuard` — the
   *device* must already hold a valid session, staff can't log in from
   scratch) swaps the current session to that staff member's own token via
   the same `issueSession()` used by normal login, so `/switch-user` is a
   same-device "hand it to the next person" flow, not a fresh sign-in.
   Waiter/Kitchen roles get `order:read`, `branch:read`, `staff:read` (to
   see who to hand off to), and exactly one narrow order permission each
   (`order:serve` / `order:kitchen`) — never `order:manage`. Two new
   endpoints, `PATCH /orders/:id/kitchen-status` and `.../waiter-status`,
   are gated by those narrow permissions **and** additionally allow-list
   the exact transitions each accepts (kitchen: open→in_kitchen,
   in_kitchen→ready; waiter: ready→served, served→paid) — so even a
   compromised or buggy frontend can't be used to reach `order:manage`-only
   actions like create/cancel through these routes. Verified with curl
   directly against the API (not just the UI) that a waiter token gets 403
   on order creation, the generic `/status` endpoint, and the kitchen
   endpoint. `User.email`/`passwordHash` are now nullable (PIN accounts
   have neither); `User.pinHash` is new.
7. **Special instructions + "call waiter" ping** — per-item free-text notes
   on the customer ordering page (no schema change, reuses `OrderItem.notes`
   which already existed and was already rendered on staff screens). Plus a
   "Call waiter" button hitting `POST /public/tables/:tableId/call-waiter`,
   which emits the `waiter_calls` Socket.IO event the gateway had reserved
   since the foundation phase; rate-limited to once per 5 minutes per table
   via a Redis `SET ... NX EX 300` key (enforced server-side, not just a
   disabled button) — see `PublicService.callWaiter`. Tip-at-checkout was
   requested alongside this but needs the Razorpay/online-payment
   integration first; it's captured in `docs/12_PRODUCT_SCOPE.md` Pillar 2
   for that phase, not built yet.
8. **Waitlist + WhatsApp** (`modules/waitlist`, `/waitlist`) — reception
   adds a walk-in (name, phone, party size) to a branch's queue; a
   WhatsApp message goes out the moment a table **actually frees up**, not
   ~15 minutes ahead of time as originally described. That predictive
   version needs real historical table-turnover data (see "Table
   Intelligence" in `docs/13_FUTURE_VISION.md`) that doesn't exist yet —
   notifying on release is the reliable version buildable today, and was
   confirmed as the right call before building it. `OrderService.updateStatus`
   calls `WaitlistService.notifyNextInQueue(tenantId, order.branchId)`
   right after flipping a table back to `available` (i.e. on `paid` or
   `cancelled`); it finds the longest-waiting party and fires their
   notification. WhatsApp sending itself follows the exact same
   Redis-queue-plus-worker pattern the email notifications already used —
   `NotificationService.enqueueWhatsApp` (services/api) pushes a job,
   `WhatsAppWorkerService` + `WhatsAppTransportService`
   (services/notification, a separately-deployed worker) pick it up and
   call the Meta Cloud API. **No real WhatsApp credentials were available
   when this was built** — `WhatsAppTransportService.send()` checks
   `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` and, if either is
   missing, logs exactly what it would have sent (recipient, template,
   payload) instead of throwing, verified by triggering the real flow
   end-to-end and reading that log line. Wiring in real sending is just
   setting those two env vars (plus `WHATSAPP_TEMPLATE_NAME`, defaults to
   Meta's sample `hello_world` template) on the notification service's
   deploy — no code change needed.
9. **Online payment + tip** (`modules/payment`) — once an order is
   `served` (same point the waiter's cash "Mark paid" already appears),
   the customer can pay online from their own device instead, with an
   optional 0/5/10/15% tip. Two public endpoints:
   `POST /public/orders/:orderId/create-payment` (409s if the order isn't
   served yet) creates a Razorpay order for total+tip;
   `POST /public/orders/:orderId/verify-payment` independently recomputes
   the HMAC-SHA256 signature server-side (`createHmac('sha256',
   keySecret).update(razorpayOrderId + '|' + razorpayPaymentId)`) before
   trusting a payment succeeded — **never trust the frontend's claim
   alone**, a tampered client could otherwise mark any order paid for
   free. On success it calls the existing `OrderService.updateStatus`,
   so table release and the waitlist auto-notify hook fire identically
   whether payment was online or cash. `Order.paymentMethod` is now set
   on the cash path too (`updateWaiterStatus` tags it `'cash'` right
   before the status flip), so the field means something either way.
   Same no-credentials posture as WhatsApp: without
   `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` configured, create-payment
   returns `{configured: false}` instead of throwing, and the customer
   sees "ask your waiter for the bill" instead of a broken button —
   verified this degrades cleanly with a full Playwright run, plus curl
   checks of both the "not served yet" 409 and a garbage-signature 400.
10. **Rich dish content** (`modules/ai`, `modules/media`, Menu page's
    "Dish content" dialog) — the "help customers understand unfamiliar
    food" feature from the original vision. Staff click "Auto-fill with
    AI" and `AiService.suggestDishContent` (`modules/ai`) calls OpenAI
    with just the dish name, asking for strict JSON (description, a
    0–5 spicy/sweet/sour/salty/umami taste profile, an estimated
    nutrition breakdown, dietary tags) — this only ever returns a
    *suggestion*; nothing is written to the menu until staff edits and
    clicks Save on the existing item-update endpoint, matching the
    "staff reviews before publishing" requirement from day one. Photos
    and a short prep video upload straight from the browser to
    Cloudflare R2 via a short-lived presigned PUT URL
    (`MediaService.presignUpload`, `modules/media`) — the file never
    passes through the API server. Customers see the photo, video,
    taste profile (as a bar chart), nutrition, and dietary badges in a
    detail view before ordering — verified end-to-end with a full
    Playwright run (staff filling in content by hand, customer viewing
    it) plus a direct curl check that AI-suggest correctly attempts a
    real OpenAI call using real credentials (blocked only by this
    sandbox's own network policy, not a code issue). Both OpenAI and R2
    degrade gracefully when not configured, same posture as WhatsApp/
    Razorpay — `menu_items` gains `tasteProfile`/`nutritionInfo` (JSON),
    `dietaryTags` (string array), `photoUrl`, `videoUrl`.

Not yet built: everything else in `docs/12_PRODUCT_SCOPE.md`'s build order
— feedback/ratings is next.

## Deployment

| Piece | Where | Notes |
|---|---|---|
| `apps/web`, `apps/landing` | Vercel | `NEXT_PUBLIC_*` env vars are **inlined at build time**, not read at runtime — changing them requires a rebuild, not just a restart/redeploy of the same build. |
| `services/api`, `services/notification` | Render (Docker, `render.yaml` Blueprint) | Render's egress is IPv4-only. |
| Postgres | Supabase | Must use the **session pooler** connection string (`*.pooler.supabase.com:5432`), not the direct connection — Supabase's direct connection is IPv6-only and Render can't reach it. |
| Redis | Upstash | |
| Email | Resend (SMTP) | |

**Migrations are not automatic.** `services/api/Dockerfile` builds and runs
`node dist/main.js` only — there is no `prisma migrate deploy` step in the
deploy pipeline. Every schema change needs `pnpm db:deploy` (wraps `prisma
migrate deploy` with `dotenv-cli` pointed at the root `.env`) run manually
against the production `DATABASE_URL` after merging. **If working from a
Claude Code web/remote sandbox**: raw Postgres connections (port 5432) are
blocked by the sandbox's network policy — only HTTPS egress is allowed, so
`pnpm db:deploy` cannot reach Supabase from inside such a session. In that
situation, generate the equivalent raw SQL from the new migration file(s)
under `packages/database/prisma/migrations/`, plus matching
`INSERT INTO "_prisma_migrations" (...)` rows (checksum = sha256 of the
migration.sql file — `sha256sum <file>`) so Prisma's migration history
stays consistent, and have the founder run it once via the Supabase
dashboard's SQL Editor (wrap in `BEGIN; ... COMMIT;` so a partial failure
rolls back cleanly). **Always check current state first** — query
`information_schema.tables` and `SELECT migration_name FROM
"_prisma_migrations"` before assuming nothing's applied; a migration can
already be live from an earlier session even if the local `.env` is gone.

**RBAC permission sync**: `main.ts` calls
`app.get(RbacService).seedPermissions()` on every boot, which (via
`syncOwnerRolePermissions()` in `rbac.service.ts`) backfills any new
permission codes onto every existing tenant's OWNER role. This means adding
a new `PERMISSIONS` entry is safe to ship without a separate data
migration — it self-heals on next deploy.

## Verification methodology

Every feature is verified against **real infrastructure** before being
called done — never just typecheck/build. The pattern:

1. Spin up real local Postgres + Redis.
2. Run the actual NestJS API against them, `curl` every new endpoint
   (including tenant-isolation and 404/conflict cases).
3. Build the actual Next.js app with the **correct** `NEXT_PUBLIC_API_URL`
   baked in (see the build-time-inlining gotcha above — this specifically
   bit us once), run it, and drive it with real headless-browser Playwright
   tests simulating actual user flows (not component tests) — Chromium is
   pre-installed in Claude Code sandboxes at
   `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, load Playwright via
   `NODE_PATH=/opt/node22/lib/node_modules node script.js`.
4. Only after that passes: `pnpm typecheck` across the whole monorepo as a
   final regression net, then commit and push directly to `main` (this
   project pushes straight to `main` once verified — no PR-per-feature
   workflow; see "Git workflow" below).
5. If deploying a schema change, also verify production migration state
   directly (see Deployment section) rather than assuming a push succeeded.

This process has caught real bugs before they reached production — see
"Bugs found and fixed" below. Skipping steps has cost real debugging time
more than once; don't skip them.

## Git workflow

This project pushes **directly to `main`** once a feature is scoped, built,
and verified end-to-end — no long-lived feature branches or PR-per-feature
process. This was an explicit founder decision partway through the project
(earlier features did go through feature branches). Don't revert to feature
branches without checking first.

## Bugs found and fixed (read before repeating them)

- **`valueAsNumber` + optional number field → silent form failure.**
  `react-hook-form`'s `register(name, { valueAsNumber: true })` converts an
  *empty* input to `NaN`, not `undefined`. Zod's `.optional()` accepts
  `undefined` but rejects `NaN`, so validation fails silently and
  `shouldFocusError` (default `true`) just focuses the field with no visible
  error message if that field doesn't render one — from the user's
  perspective, the whole form does nothing on submit. Fixed in the table
  "capacity" field (`apps/web/src/app/(app)/branches/page.tsx`) with
  `setValueAs: (v) => (v === '' ? undefined : Number(v))`. Check any other
  optional numeric field before using `valueAsNumber` directly.
- **Migration ordering.** An auto-generated migration timestamp sorted
  before a hand-written one it actually depended on via foreign key (new
  `order_items` → `menu_items`). Prisma applies migrations in filename
  (timestamp) order, so this would have failed on a clean deploy. Caught by
  reviewing the migration folder before applying, fixed by renaming the
  folder to a later timestamp. Always check migration ordering against
  actual FK dependencies, not just chronological creation order.
- **Auth hydration race.** Zustand's `persist` middleware rehydrates
  `accessToken` from `localStorage` asynchronously. A redirect guard of the
  form `useEffect(() => { if (!accessToken) router.replace('/login') })`
  fires before hydration completes on a hard reload, incorrectly bouncing a
  logged-in user to `/login`. Fixed by adding `hasHydrated` state (set via
  `onRehydrateStorage`) to `useAuthStore` and gating every protected page's
  guard on `hasHydrated && !accessToken`, not just `!accessToken`. This
  pattern must be copied into every new protected page.
- **`@types/node` phantom dependency.** `packages/config` and
  `packages/database` used `process.env` / `NodeJS.ProcessEnv` without
  declaring `@types/node` themselves, relying on hoisting from other
  workspace packages in a full `pnpm install`. Docker's partial build
  context (only copies the packages a given Dockerfile needs) doesn't
  include those other packages, so the build failed there but not locally.
  Fixed by adding `@types/node` explicitly to both packages'
  `devDependencies`. Any new package that touches `process.env` needs this
  dependency declared explicitly, not assumed via hoisting.
- **Prisma CLI not loading root `.env`.** Running `prisma migrate deploy`
  via `pnpm --filter` sets cwd to the package directory
  (`packages/database`), so Prisma's own env loading never finds the
  repo-root `.env`. Fixed by wrapping the migrate/studio scripts in
  `packages/database/package.json` with `dotenv-cli`:
  `dotenv -e ../../.env -- prisma migrate deploy`.
- **Leaked Supabase DB password.** The original `.env.example` commit
  included a real (not placeholder) database password, still visible in git
  history. **This has not been rotated as of the last engineering session**
  — treat it as still-live sensitive data until confirmed otherwise, and
  don't add real secrets to any file that gets committed, ever, even
  "example" files.
- **A narrow UI is not narrow RBAC.** The first version of the Waiter/
  Kitchen screens only hid buttons for actions those roles "shouldn't" do
  — but since every login was still the Owner (no staff-invite system
  existed yet), the same person could just open `/orders` directly and do
  anything. Hiding a button is not a permission boundary; only a
  `@RequirePermissions` check the account genuinely lacks is. Any future
  "narrow screen for a role" feature needs the real account/permission
  split from the start, not as a follow-up — see "PIN-login staff
  accounts" above for the fix once this was caught.

## Where to look next

- Current build order / what's next: `docs/12_PRODUCT_SCOPE.md` §6.
- Long-term feature backlog: `docs/13_FUTURE_VISION.md`.
- Foundation-level architecture docs (pre-dates business modules):
  `docs/00_PROJECT_OVERVIEW.md` through `docs/11_DEPLOYMENT.md`.
