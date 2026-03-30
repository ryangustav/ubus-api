# Roadmap: Ubus API

## Overview

The journey from a locally running NestJS backend to a secured, production-ready API with versioning and domain management on Oracle Cloud.

## Phases

- [ ] **Phase 1: Infrastructure & Versioning** - Domain pointing, v1 prefixing, and SSL setup.
- [ ] **Phase 2: Authentication Hardening** - Implementation of refresh tokens and audit logs.
- [ ] **Phase 3: Core Features - Reservations** - Finalizing seat booking logic and concurrency control.
- [ ] **Phase 4: Monitoring & Metrics** - Dashboard data and performance tracking.

## Phase Details

### Phase 1: Infrastructure & Versioning
**Goal**: Point `api.ubus.me` to the server, implement `/api/v1` versioning, and secure with SSL.
**Depends on**: Nothing (initial phase)
**Success Criteria**:
  1. `https://api.ubus.me/api/v1/docs` is accessible externally.
  2. All internal routes are prefixed with `/api/v1`.
  3. SSL certificate is active via Certbot.
**Plans**: 3 plans

Plans:
- [ ] 01-01: API Versioning and Swagger update.
- [ ] 01-02: Nginx configuration for subdomain and proxy.
- [ ] 01-03: SSL setup and automation.

### Phase 2: Authentication Hardening
**Goal**: Secure user sessions beyond basic JWT.
**Depends on**: Phase 1
**Success Criteria**:
  1. Refresh token rotation is implemented.
  2. Failed login attempts are logged in the database.
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure | 0/3 | In progress | - |
| 2. Auth Hardening | 0/TBD | Not started | - |

---
*Last updated: 2026-03-30*
