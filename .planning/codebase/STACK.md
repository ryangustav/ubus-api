# Technology Stack

**Analysis Date:** 2026-03-30

## Languages

**Primary:**
- TypeScript ^5.7.3 - All application code (NestJS)

**Secondary:**
- JavaScript - Build scripts (`drizzle.config.js`), Nginx config

## Runtime

**Environment:**
- Node.js ^22.10.7 (LTS)
- Docker (Alpine-based images)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- NestJS ^11.0.1 - Backend API framework
- Express - Underlining HTTP server for NestJS

**Testing:**
- Jest ^30.0.0 - Unified testing framework
- Supertest ^7.0.0 - E2E testing

**Build/Dev:**
- Nest CLI ^11.0.0 - Build and development orchestration
- TypeScript Compiler (tsc) - Transpilation
- Drizzle Kit ^0.28.0 - CLI for migrations and DB management

## Key Dependencies

**Critical:**
- Drizzle ORM ^0.36.0 - Type-safe ORM for PostgreSQL
- @nestjs/bullmq ^10.2.0 - Queue system integration
- @nestjs-modules/ioredis ^2.0.0 - Redis client for NestJS
- Zod ^3.24.1 - Schema validation and type inference
- Passport / Jwt - Authentication and strategy management

**Infrastructure:**
- pg ^8.13.0 - PostgreSQL client for Node.js
- oci-secrets / oci-common ^2.126.1 - Oracle Cloud Infrastructure SDK for secrets management
- Nodemailer ^6.9.0 - Email delivery

## Configuration

**Environment:**
- `.env` file (gitignored, mounted as read-only volume in production)
- OCI Vault (secrets fetched at startup via Instance Principals)
- `dotenv` for local development

**Build:**
- `tsconfig.json` - TypeScript configuration
- `drizzle.config.js` - Database migration configuration
- `docker-compose.yml` / `docker-compose.prod.yml` - Container orchestration

## Platform Requirements

**Development:**
- Docker & Docker Compose
- Node.js 22+
- Local PostgreSQL and Redis (via Docker)

**Production:**
- Linux (Ubuntu on Oracle Cloud Ampere)
- Docker Engine
- Nginx (Reverse Proxy)

---
*Stack analysis: 2026-03-30*
