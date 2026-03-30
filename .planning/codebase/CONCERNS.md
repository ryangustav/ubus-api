# Codebase Concerns

**Analysis Date:** 2026-03-30

## Tech Debt

**PostgreSQL ENUM Migration Dependency:**
- Issue: Dropping or altering ENUM types (`role_usuario`) fails because table columns depend on them via default values.
- Why: Standard Drizzle migrations don't automatically handle the `DROP DEFAULT` -> `RECREATE TYPE` -> `SET DEFAULT` lifecycle.
- Impact: Deployment failures with error `code: '2BP01'`.
- Fix approach: Manually edit migrations that alter enums to temporarily remove defaults from columns as seen in `drizzle/0001_powerful_freak.sql`.

**Manual .env Generation in CI:**
- Issue: The production `.env` is constructed via a series of `echo` commands in the GitHub Action.
- File: `.github/workflows/deploy.yml`
- Why: Required for mounting a protected read-only volume in the container.
- Impact: High risk of missing new environment variables when adding features.
- Fix approach: Use a dedicated `.env.example` as a template or a more robust secret-to-env mapping tool.

## Security Considerations

**Host Network Mode:**
- Risk: Using `network_mode: "host"` in Docker Compose removes network isolation between the containers and the host.
- File: `docker-compose.prod.yml`
- Current mitigation: Relying on OCI Security Lists and Ubuntu `iptables` to restrict external access to ports.
- Recommendations: Move back to a bridged Docker network and expose only Port 80/443 via Nginx if high isolation is required.

**OCI Secret Injection:**
- Risk: Secrets are fetched at runtime and injected into `process.env`.
- File: `src/config/oci-vault.ts`
- Current mitigation: Only allowed in production if `USE_OCI_VAULT=true`.
- Recommendations: Ensure strict IAM permissions (Instance Principals) so only the specific VPS can fetch the secret OCID.

## Fragile Areas

**Redis Authentication Configuration:**
- Why fragile: Both `RedisModule` and `QueueModule` had to be manually updated to support `REDIS_PASSWORD`.
- Files: `src/shared/redis/redis.module.ts`, `src/shared/queue/queue.module.ts`.
- Common failures: Adding new Redis-dependent modules without passing the password will lead to `NOAUTH` errors.

**Nginx Upstream Resolution:**
- Why fragile: In `host` mode, the Nginx upstream must be `127.0.0.1` instead of the container name `api`.
- File: `nginx/conf.d/default.conf`.
- Safe modification: Do not use Docker DNS (`127.0.0.11`) or service names when `network_mode: host` is active.

## Test Coverage Gaps

**Core Business Logic:**
- What's not tested: Complex trip reservation logic and leaderboard metrics.
- Risk: Regressions in seat booking or point calculation.
- Priority: High.
- Difficulty to test: Requires a mocked Redis and PostgreSQL environment (using `Test.createTestingModule`).

---
*Concerns audit: 2026-03-30*
*Update as issues are fixed or new ones discovered*
