# RestaurantOS AI — Product Scope & Roadmap

This document is the source of truth for what RestaurantOS AI is, who it's for,
and what gets built next. It supersedes the informal scope discussed in chat —
future work should be planned against this document.

## 1. Vision

A multi-tenant SaaS platform for dine-in restaurants that competes directly
with Petpooja (the dominant restaurant-ops platform in India) by matching its
operational strengths (billing, KOT, inventory, staff management) while being
meaningfully better on the customer-experience side, which most restaurant-ops
platforms treat as an afterthought.

**The restaurant is the paying client.** Every customer-facing feature exists
to make the restaurant more successful — more covers, better reviews, fewer
no-shows, happier diners — not as a standalone consumer product competing for
attention in its own right.

## 2. Two-sided product

### Restaurant side (primary client — staff/owner)
Menu management, order management, billing, payments, inventory, staff,
kitchen operations, multi-branch management, analytics.

### Customer side (diner — serves the restaurant's growth)
Three jobs, none requiring the diner to already be at the restaurant:

1. **Discover & compare restaurants** — cross-restaurant browsing ranked by
   verified feedback (only from customers who actually ordered).
2. **Book a table** ahead of arrival.
3. **Understand unfamiliar food before ordering** — the core empathy driver
   of the rich-menu-content feature: someone unfamiliar with a cuisine (e.g.
   walking into a Korean restaurant) sees a dish's flavor/taste profile, a
   short prep video, and real photos, so they can order with confidence
   instead of guessing.

## 3. Architecture principles

Carried forward from the existing foundation docs — see `01_ARCHITECTURE.md`
and `08_API_FOUNDATION.md` for full detail. Key points repeated here because
they constrain every feature below:

- Modular monolith (NestJS inside `services/api`), never split into
  microservices — including WebSocket, which stays inside the same service.
- Every business table is tenant-scoped; tenant isolation is non-negotiable
  and enforced at the query level, not just the UI.
- Real-time features (order updates, waiter calls, kitchen feed) are driven
  by the Socket.IO gateway already scaffolded in `services/api`, using the
  events named in `09_WEBSOCKET.md`: `notifications`, `order_updates`,
  `waiter_calls`.
- **Zero-install customer flow is a hard requirement.** A customer never
  installs an app — QR scan opens directly in their phone's browser. This is
  the single most important lesson from researching Meituan's WeChat
  mini-program model: friction at the point of ordering kills adoption.
- New external services this scope introduces, beyond what's already wired
  up (Supabase, Upstash, Resend, Render, Vercel):
  - **Cloudflare R2** — dish photos and prep videos (`R2_BUCKET`, already
    reserved as an env var).
  - **OpenAI (or equivalent)** — AI auto-fill of dish description / taste
    profile / nutrition from just the dish name; later, owner insights and
    customer recommendations (`OPENAI_API_KEY`, already reserved).
  - **Razorpay** — in-app bill payment (`RAZORPAY_KEY_ID`, already reserved).
  - **Meta WhatsApp Cloud API** — waitlist notifications, feedback requests,
    re-engagement campaigns. New integration, not previously reserved;
    requires Meta Business + WhatsApp Business Account verification, which
    only the account owner can complete.

## 4. Explicit non-goals

- **AI-generated dish photos/videos.** Description, taste profile, and
  nutrition may be AI-estimated from the dish name; photos and prep videos
  are always real uploads from the restaurant. Authenticity matters — a
  customer trusts a real photo of the actual dish, not a generated one.
- **Waiter-assisted order-taking.** Industry norm (including Foodics' 2025
  Waiter App) lets waiters take orders on a tablet. This product deliberately
  does the opposite: the customer always places their own order; the waiter's
  only actions are marking an order "served" and marking a cash payment as
  "paid." This is a considered differentiation, not an oversight.
- **Aggregator integration** (Zomato/Swiggy order sync) and **accounting
  software integration** (Tally) — real, valid needs, but deferred until the
  core product is solid and real restaurants are asking for them.

## 5. Feature pillars

Status legend: ✅ done · 🔜 next · ⏳ planned

### Pillar 1 — Core Operations ✅
- Multi-tenant auth, RBAC, audit logging (foundation)
- Menu: categories + items, tenant-isolated CRUD
- Branches + Tables (multi-location from day one)
- Orders: full lifecycle (`open → in_kitchen → ready → served → paid`, or
  `cancelled`), price-snapshotted line items, table occupancy auto-synced

### Pillar 2 — Billing & Payments ⏳
- GST-compliant billing/invoicing (India tax compliance — not optional)
- Multi-mode payment collection (cash / card / UPI), split bills
- Razorpay integration; order auto-flips to "paid" on successful in-app
  payment
- Cash payments: **only the waiter** can manually mark an order "paid" —
  there's no digital signal to trigger it automatically
- Day-end / night-audit reconciliation reports

### Pillar 3 — Inventory & Kitchen Ops ⏳
- Inventory with recipe-based stock deduction (ordering a dish deducts its
  ingredients), low-stock alerts, purchase orders
- KOT (Kitchen Order Ticket) printing/routing to kitchen stations — many
  kitchens still need a physical ticket, not just a screen
- Kitchen live-order screen — orders appear the instant a customer places
  them, pushed via `order_updates`; no manual entry or polling

### Pillar 4 — Staff & Waiter ⏳
- Staff management: shifts, attendance, PIN-based POS login (distinct from
  account-based auth)
- Waiter role — deliberately narrow permissions:
  - Mark an order "served" (only valid from "ready")
  - Mark a cash payment as "paid"
  - Nothing else — no order creation, no other status transitions
- Staff performance visibility tied to customer feedback ratings

### Pillar 5 — Customer Experience ⏳
- Customer self-ordering via QR: scan → browser-based menu (zero install) →
  cart → place order directly (this *is* how orders get created — not staff
  data entry)
- Live order status on the customer's own screen, pushed via `order_updates`
- **Rich dish content** (the "understand unfamiliar food" feature):
  - Photo (mandatory — proven to be how people decide when they can't read
    the menu) and short prep video, uploaded to R2 by the restaurant
  - Taste profile (spicy/sweet/tangy/etc.) and nutrition (protein, vitamins)
    — AI-generated from just the dish name, staff reviews/edits before
    publishing
  - Dietary/allergen filters (vegetarian, vegan, halal, gluten-free, etc.)
- **"Call waiter"** button — maps to the `waiter_calls` event
- **Feedback/ratings** — gated to customers who actually ordered (verified,
  not open to anyone); auto-requested via WhatsApp right after payment, so
  the loop closes without staff having to ask
- **Reservations** — table booking ahead of time, with an optional
  deposit / no-show protection option
- **Waitlist** — walk-in customer leaves their phone number, gets a WhatsApp
  message ~15 minutes before a table frees up (see Pillar 7 — powered by
  real table-turnover data, not a staff guess); reception staff manage the
  same queue from their side
- **Guest profile memory** — remembers allergies, preferences, and special
  occasions across visits; flags repeat/VIP customers to staff

### Pillar 6 — Discovery & Growth ⏳
- Cross-restaurant discovery — a real public directory, browsable before a
  diner has chosen where to eat, ranked by verified feedback
- AI owner insights: best/worst sellers, sentiment from reviews, **menu
  engineering** (classic profitability × popularity matrix — which dishes to
  promote, reprice, or cut)
- AI customer recommendations ("for you" style, based on ratings/preferences)
- AI-suggested combos/upsells ("customers who ordered X also ordered Y")
- WhatsApp re-engagement campaigns ("haven't seen you in 30 days")
- This pillar is the near-term slice of a much larger AI/growth surface —
  see [`13_FUTURE_VISION.md`](./13_FUTURE_VISION.md) for the full backlog
  (AI Restaurant Manager, dynamic pricing, predictive inventory, complaint
  detection, revenue leak detection, AI business coach, and more) that this
  pillar will keep expanding into over time.

### Pillar 7 — Scale & Reliability ⏳
- Multi-branch consolidated reporting for owners with several locations
- Table turnover time tracking per table/branch — real data feeding the
  Waitlist's "~15 min before" prediction and helping Reservations avoid
  overbooking
- Offline-resilient POS — billing/ordering keeps working through a brief
  connectivity drop and syncs after; a real reliability requirement during
  actual rush hours, not an edge case
- Multi-language UI (staff and customer-facing) — e.g. Hindi/regional
  languages for India, Arabic for UAE-style markets

## 6. Build order

Dependency-ordered, not just priority-ordered — each slice builds on data or
infrastructure the previous one established.

1. ✅ Foundation (auth, tenant, RBAC)
2. ✅ Menu
3. ✅ Branches, Tables, Orders (staff-side)
4. ✅ Customer self-ordering (QR → menu → order → live status) — re-prioritized
   ahead of Waitlist so there was a demoable, sellable customer-facing flow
   as early as possible; see `CLAUDE.md` for how it was built and verified
5. ✅ Kitchen + Waiter live screens — Socket.IO `order_updates` wired to
   real events so kitchen/waiter see new orders instantly instead of
   polling/refreshing; waiter screen is deliberately narrow (mark served,
   mark cash paid — no order-taking, by design)
6. 🔜 **Waitlist + WhatsApp** — highest real-world priority for reception-area
   rush (Mumbai walk-ins); builds on existing Branch/Table data; Meta
   WhatsApp Cloud API already tested by the founder, not a blocker
7. Simple non-GST billing + Razorpay (GST deferred — see §4 non-goals)
8. Rich dish content (AI auto-fill + R2 media + taste/flavor profile +
   nutrition + dietary filters)
9. Feedback/ratings (verified, WhatsApp-triggered)
10. Discovery (cross-restaurant, depends on 8 and 9)
11. Reservations (shares patterns with Waitlist)
12. Full GST-compliant Billing & Payments
13. Inventory & Kitchen Ops (KOT, recipe-based stock tracking)
14. Staff & Waiter granular permissions (PIN login, shifts, roles beyond the
    narrow default)
15. AI insights & growth (owner insights, recommendations, upsells,
    campaigns — first slice of the much larger backlog in
    [`13_FUTURE_VISION.md`](./13_FUTURE_VISION.md))
16. Scale & reliability (multi-branch reporting, offline resilience,
    multi-language, table turnover analytics)

This order reflects the actual re-prioritization agreed mid-project (ship a
demoable customer-facing flow before GST/full billing), not the original
draft order. Update this list as priorities shift — it, not chat history,
is the source of truth for "what's next."

Each slice is scoped, built, and verified end-to-end (real database, real
browser walkthrough) before the next one starts — the same process used for
Menu and Orders, which caught real bugs (a Prisma env-loading gap, a
`@types/node` build landmine, an auth-hydration redirect bug) before they
reached production.
