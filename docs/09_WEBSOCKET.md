# WebSocket

Socket.IO runs as a NestJS Gateway module inside `services/api`.

## Foundation responsibilities

- JWT authentication on handshake
- Tenant room membership (`tenant:{tenantId}`)
- Connection lifecycle logging
- Redis adapter readiness for horizontal scale

## Deferred

Business event handlers such as `order_updates` and `waiter_calls` are not implemented in the foundation phase.
