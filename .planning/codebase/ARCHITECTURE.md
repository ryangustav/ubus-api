# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Modular Monolith (NestJS)

**Key Characteristics:**
- Feature-based modularity (`src/modules/`)
- Separation of concerns (Controllers, Services, Schemas)
- Shared Infrastructure (Redis, BullMQ, Database)
- Deployment-ready architecture (Docker, Nginx, OCI)

## Layers

**API Layer (Controllers):**
- Purpose: Handle HTTP requests and return responses
- Contains: Route handlers, Input validation (via Zod/Nest), Logic orchestration
- Location: `src/modules/*/trips.controller.ts`, etc.
- Depends on: Service layer for business logic
- Used by: External clients (Nginx reverse proxy)

**Service Layer (Business Logic):**
- Purpose: Execute core domain logic and data transformations
- Contains: Business rules, data access calls, integration logic
- Location: `src/modules/*/application/*.service.ts`
- Depends on: Shared database, redis, and other modules
- Used by: Controllers

**Data Layer (Drizzle/Postgres):**
- Purpose: Persistence and data integrity
- Contains: Table definitions, Relation mapping, Seeding
- Location: `src/shared/database/schema/*.ts`
- Depends on: PostgreSQL (driver: pg)
- Used by: Service layer

**Shared Layer (Cross-cutting Concerns):**
- Purpose: Reusable utilities and infrastructure integrations
- Contains: Email, Guards, Redis, Queues, Database configuration
- Location: `src/shared/`
- Depends on: External libraries and environment configuration
- Used by: Entire application

## Data Flow

**Typical HTTP Request Lifecycle:**

1.  **Request Entry**: Nginx (Port 80/443) -> API (Port 3001).
2.  **Guards/Middleware**: Global or route-specific guards (e.g., `AuthGuard`, `LiderOnibusGuard`) validate the token or roles.
3.  **Controller**: Extracts data (params, query, body), performs basic Zod validation.
4.  **Service**: Handles the business logic (e.g., creating a reservation, starting a trip).
5.  **Persistence**: Interacts with the database via Drizzle ORM.
6.  **Background Tasks**: (Optional) Service pushes jobs to BullMQ (managed by Redis).
7.  **Response**: Controller returns the result to the user.

**State Management:**
- Persistent state lives in **PostgreSQL**.
- Transient state (sessions, queues, temporary data) lives in **Redis**.

## Key Abstractions

**Modules:**
- Purpose: Encapsulate features into reusable units.
- Examples: `AppModule`, `UsersModule`, `TripsModule`.
- Pattern: NestJS Module System.

**Guards:**
- Purpose: Authorization and role-based access control.
- Examples: `JwtAuthGuard`, `LiderOnibusGuard`.
- Pattern: NestJS Guards.

**Schemas (Drizzle):**
- Purpose: Type-safe database definitions.
- Examples: `user.schema.ts`, `trips.schema.ts`.
- Pattern: Drizzle ORM Schema definition.

## Entry Points

**Main Entry:**
- Location: `src/main.ts`
- Triggers: Node.js start command.
- Responsibilities: Load secrets (OCI Vault), Initialize Nest instance, configure global pipes, start HTTP listener.

**Background Workers:**
- (Implicit in `QueueModule`)
- Responsibilities: Process BullMQ tasks for reservations and notifications.

## Error Handling

**Strategy:** Global Exception Filter / Exception Bubbling.

**Patterns:**
- Services throw `BadRequestException`, `NotFoundException`, etc.
- Drizzle errors are typically handled or surfaced via NestJS built-in filters.

## Cross-Cutting Concerns

**Logging:**
- Internal NestJS Logger (`src/main.ts`).
- Console-based logs, captured by Docker/OCI.

**Authentication:**
- JWT Strategy + Passport.
- Token generation and verification in `AuthService`.

**Secret Management:**
- OCI Vault fetching during bootstrap (`src/config/oci-vault.ts`).

---
*Architecture analysis: 2026-03-30*
*Update when major patterns change*
