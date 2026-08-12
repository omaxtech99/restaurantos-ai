# Project Overview

## Goal

Build a production-ready multi-tenant RestaurantOS AI for dine-in restaurants.

## Architecture style

Modular monolith. NestJS modules inside `services/api`. Do not split into microservices.

## Build first

- Monorepo (Turborepo + pnpm)
- Authentication
- RBAC
- Tenant system
- Design system
- Database foundation
- API foundation
- Socket.IO gateway foundation
- Notification service foundation
- Docker + GitHub Actions

## Do not build yet

- Menu
- Orders
- Kitchen
- Waiter
- Analytics
- Billing / Payments product flows
- AI features
- Inventory, POS, Reservations, Loyalty, CRM
