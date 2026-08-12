# RestaurantOS AI

Multi-tenant restaurant operations platform.

## Stack

- **Frontend:** Next.js 15 (`apps/landing`)
- **API:** Express service (`services/api`)
- **Database:** PostgreSQL + Prisma (`packages/database`)
- **Cache:** Redis
- **Monorepo:** pnpm workspaces + Turborepo

## Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 16
- Redis 7

## Setup

```bash
cp .env.example .env
./scripts/cloud-agent-start.sh
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
```

## Development

```bash
pnpm dev
```

- Landing app: http://localhost:3000
- API health: http://localhost:4000/health

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start API and landing app |
| `pnpm build` | Build all packages |
| `pnpm lint` | Type-check and lint |
| `pnpm db:push` | Apply Prisma schema |
| `pnpm db:seed` | Seed demo tenant data |

## Cloud Agent environment

Repository-managed configuration lives in `.cursor/environment.json`.

- `install`: `./scripts/cloud-agent-install.sh`
- `start`: `./scripts/cloud-agent-start.sh`
- `terminals`: API on port 4000, landing on port 3000
