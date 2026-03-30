# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- `kebab-case.ts` for general utilities and schemas.
- `name.module.ts`, `name.controller.ts`, `name.service.ts` for NestJS components.
- `*.schema.ts` for database table definitions.

**Functions:**
- `camelCase` for all functions and methods.
- `handleEventName` for specific logic triggers (if applicable).
- No special prefix for `async` functions.

**Variables:**
- `camelCase` for variables and parameters.
- `UPPER_SNAKE_CASE` for environment variables and global constants.

**Types:**
- `PascalCase` for Interfaces, Types, and Classes (no `I` prefix for interfaces).
- `PascalCase` for Enums, `UPPER_CASE` for values (e.g., `UserRole.ADMIN`).

## Code Style

**Formatting:**
- Prettier with default NestJS configuration.
- Single quotes for strings.
- Semicolons required.
- 2-space indentation.

**Linting:**
- ESLint with `@typescript-eslint/recommended`.
- `npm run lint` to verify.
- No `console.log` in production-ready modules (use `Logger`).

## Import Organization

**Order:**
1. NestJS and external packages (`@nestjs/common`, `rxjs`, etc.).
2. Shared modules and infrastructure (`src/shared/*`).
3. Local module components (relative imports).
4. Type-only imports (`import type { ... }`).

**Grouping:**
- Blank line between external and internal imports.
- Alphabetical sorting within groups (handled by ESLint/Prettier).

## Error Handling

**Strategy:** Exception Bubbling to NestJS Built-in Filters.

**Patterns:**
- Throw specific `HttpException` variants (e.g., `BadRequestException`, `UnauthorizedException`).
- Use `try/catch` only when specific cleanup or logging is needed before bubbling.
- Custom error messages preferred for user-facing API responses.

## Logging

**Framework:**
- Built-in NestJS `Logger`.
- Context-aware logging (passing class name to the logger).

**Patterns:**
- Log critical lifecycle events in `main.ts`.
- Log database connection and secret loading status.
- Avoid verbose logging in hot paths (trips, reservations).

## Module Design

**Exports:**
- Named exports only.
- Barrel files (`index.ts`) used in `shared/database/schema` for centralizing entity access.

**Dependencies:**
- Use Constructor Injection for all services and providers.
- Prefer `@InjectRedis` and `@InjectQueue` decorators for infrastructure.

---
*Convention analysis: 2026-03-30*
*Update when patterns change*
