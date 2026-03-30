# Phase 1: Infrastructure & Versioning - CONTEXT

## Decisions

- **Domain**: `ubus.me` will be pointed to `163.176.165.51`.
- **Subdomain**: The API will be served via `api.ubus.me`.
- **Versioning**: All NestJS routes will be prefixed with `/api/v1` (`app.setGlobalPrefix('api/v1')`).
- **Swagger**: Documentation UI moved to `https://api.ubus.me/api/v1/docs` for consistency.
- **SSL**: Transition to HTTPS using **Certbot** (Let's Encrypt) once the DNS settles.
- **Nginx**: Configured with `server_name api.ubus.me` and proxy to local port 3001.

## Codebase Status

- `src/main.ts`: Prefix `/api/v1` and Swagger path updated.
- `nginx/conf.d/default.conf`: `server_name` set to `api.ubus.me`.
- `scripts/setup-ssl.sh`: Initialized to handle SSL setup tomorrow.

## Deployment Timeline

- **Today**: Backend logic and Nginx proxy are ready.
- **Tomorrow (User)**: Point `api.ubus.me` to the public IP.
- **Tomorrow (Agent/User)**: Run `scripts/setup-ssl.sh` to activate HTTPS.

---
*Created after gsd:discuss-phase 1*
