# Deployment

## Local

- `pnpm install`
- `pnpm dev`
- `docker compose up`

## Production-oriented assets

- Multi-stage Dockerfiles for `services/api` and `services/notification`
- Docker Compose for PostgreSQL, Redis, API, and notification
- GitHub Actions for install, lint, typecheck, build, and Prisma validate
- Coolify-ready container workflows
- Cloudflare-ready edge/static deployment for frontend apps
