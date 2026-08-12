# Database Foundation

## Models

- Tenant
- User
- Role
- Permission
- RolePermission
- UserRole
- Session
- Subscription
- AuditLog

## Conventions

- UUID primary keys
- `createdAt` and `updatedAt` on every table
- Soft delete (`deletedAt`) where appropriate (Tenant, User)
- Every tenant-scoped model includes `tenantId`
- Indexes on foreign keys and common lookup columns

## Out of scope

Restaurant, Branch, Tables, Menu, Orders, and all other business domain tables.
