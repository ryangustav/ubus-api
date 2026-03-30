# Ubus API

## What This Is

UBUS is a University Bus Seat Reservation API designed to manage and optimize student transportation. It allows users to reserve seats, track fleet metrics, and provides management interfaces for various organizations (prefeituras).

## Core Value

Efficient and reliable seat reservation management to ensure university students have guaranteed transportation.

## Requirements

### Validated

- ✓ **Modular API Architecture** - NestJS based modular structure implemented.
- ✓ **Database Persistence** - PostgreSQL with Drizzle ORM configured.
- ✓ **Authentication** - JWT-based auth with Role-Based Access Control.
- ✓ **Containerization** - Docker and Docker Compose setup for dev/prod.
- ✓ **Secrets Management** - OCI Vault integration for secure credential handling.

### Active

- [ ] **Infrastructure Finalization** - Point `api.ubus.me` to the server IP and configure Nginx.
- [ ] **API Versioning** - Implement `/api/v1` prefix for all routes.
- [ ] **SSL Configuration** - Setup Certbot for secure HTTPS access on `api.ubus.me`.
- [ ] **Swagger Documentation** - Expose documentation at `https://api.ubus.me/api/v1/docs`.

### Out of Scope

- **Mobile App Implementation** - This repo focuses exclusively on the Backend API.
- **Frontend Management UI** - External consumers will build the UI.

## Context

- The project is deployed on Oracle Cloud (Ampere A1).
- Uses `network_mode: host` for simplified container communication.
- Database and Redis are managed within the same host via Docker.

## Constraints

- **Tech Stack**: NestJS, Drizzle ORM, PostgreSQL, Redis, BullMQ.
- **Infrastructure**: OCI (Oracle Cloud), Nginx.
- **Security**: Must use SSL (HTTPS) for all production traffic.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NestJS Modular | Scalability and separation of concerns | ✓ Good |
| Drizzle ORM | Type-safety and performance over TypeORM/Prisma | ✓ Good |
| Host Networking | Simplifies Nginx-to-API communication in OCI | ✓ Good |
| API Versioning | Future-proof the API for breaking changes | — Pending |

---
*Last updated: 2026-03-30 after gsd-map-codebase*
