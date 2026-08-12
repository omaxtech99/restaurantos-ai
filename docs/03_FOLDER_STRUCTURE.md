# Folder Structure

```text
apps/
  landing/                 # Public marketing site (Next.js 15)
  web/                     # Product app (Next.js 15)
    app/
      (app)/               # Reserved product shell
      (auth)/              # Auth routes (implemented in foundation)
      (admin)/             # Future
      (customer)/          # Future
      (kitchen)/           # Future
      (waiter)/            # Future
      (cashier)/           # Future
      (super-admin)/       # Future

packages/
  ui/                      # Design system (shadcn/ui)
  shared/                  # Shared utilities and API helpers
  database/                # Prisma schema and client
  types/                   # Shared TypeScript contracts
  config/                  # Env schemas and tooling presets

services/
  api/                     # NestJS modular monolith + Socket.IO
  notification/            # Notification worker foundation

docs/
```

## API modules (modular monolith)

- Config
- Database
- Redis
- Auth
- Tenant
- RBAC
- Health
- Audit
- Gateway (Socket.IO)
- Notification (outbound hooks / contracts)

Do not create a separate websocket microservice.
