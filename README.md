# RestaurantOS AI

A multi-tenant restaurant growth platform for dine-in restaurants — menu,
tables, orders, and zero-install QR customer ordering today, with billing,
kitchen/waiter live screens, WhatsApp waitlist, and AI-driven owner insights
on the roadmap. See [`docs/12_PRODUCT_SCOPE.md`](./docs/12_PRODUCT_SCOPE.md)
for the product vision and build order, and
[`CLAUDE.md`](./CLAUDE.md) for how it's built, deployed, and the operational
gotchas already learned the hard way.

## Stack

- Apps: Next.js 15 (`landing`, `web`)
- API: NestJS modular monolith + Socket.IO
- Data: Prisma, PostgreSQL, Redis
- Monorepo: Turborepo + pnpm

## Quick start

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Or run the full stack:

```bash
docker compose up
```

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — engineering log: architecture, what's built,
  deployment, verification process, and bugs already fixed (read this
  first if you're picking up the project)
- [`docs/12_PRODUCT_SCOPE.md`](./docs/12_PRODUCT_SCOPE.md) — product vision
  and near-term build order
- [`docs/13_FUTURE_VISION.md`](./docs/13_FUTURE_VISION.md) — long-term AI /
  growth feature backlog
- [`docs/`](./docs) — foundation-level architecture and standards docs

## Scope

Foundation (auth, tenant, RBAC) plus the first restaurant business modules
are live: menu management, branches/tables, staff order management, and
zero-install QR-code customer self-ordering. See `docs/12_PRODUCT_SCOPE.md`
§6 for what's built vs. what's next.
