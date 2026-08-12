# RestaurantOS AI

Production-grade multi-tenant SaaS foundation for dine-in restaurants.

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

See [`docs/`](./docs) for architecture and foundation standards.

## Scope

This repository currently contains the **foundation only** (auth, tenant, RBAC, shared packages, infra). Restaurant business modules are intentionally not included.
