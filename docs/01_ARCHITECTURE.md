# Architecture

## Frontend

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- React Hook Form + Zod

## Backend

- NestJS modular monolith
- Prisma ORM
- PostgreSQL
- Redis
- Socket.IO gateway (inside `services/api`)
- Swagger / OpenAPI

## Apps

- `apps/landing` — public marketing site
- `apps/web` — single product application with route groups

## Services

- `services/api` — REST + Socket.IO gateway
- `services/notification` — notification worker foundation

## Packages

- `packages/ui`
- `packages/shared`
- `packages/database`
- `packages/types`
- `packages/config`

## Principles

- Clean Architecture inside Nest modules
- Feature-first frontend folders
- Multi-tenant and RBAC ready
- Strict TypeScript, no `any`
- Production-ready only
