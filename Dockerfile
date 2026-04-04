# ── Stage 1: Builder ──────────────────────────────────────────────
# Runs on the NATIVE architecture of the CI runner (x86_64 on GitHub Actions)
# Used for TypeScript compilation (nest build)
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build
RUN echo "=== Build output ===" && ls dist/

# ── Stage 2: Prod Dependencies ───────────────────────────────────
# Also runs NATIVELY on x86_64 — avoids QEMU emulation entirely.
# All deps in this project are pure JavaScript (no native C++ addons),
# so node_modules built on x86 works identically on ARM64.
FROM --platform=$BUILDPLATFORM node:20-alpine AS prod-deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts

# drizzle-kit uses esbuild (native binary). npm installed the x86 version,
# but the final image runs on ARM64 (Oracle Ampere).
# Download ARM64 binary directly from npm registry (bypasses peer dep conflicts):
RUN ESBUILD_VER=$(node -p "require('esbuild/package.json').version") \
    && rm -rf node_modules/@esbuild/linux-x64 \
    && wget -q -O - "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-${ESBUILD_VER}.tgz" \
       | tar xz -C /tmp \
    && mv /tmp/package node_modules/@esbuild/linux-arm64

# ── Stage 3: Runner (ARM64 target) ───────────────────────────────
# This stage does NOT run npm at all — only copies pre-built artifacts.
# No QEMU emulation of npm/node-gyp, so no "Illegal instruction" crashes.
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy prod-only node_modules (built natively on x86, pure JS = arch-agnostic)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./

# Copy build artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.js ./

RUN echo "=== Drizzle directory ===" && ls -R drizzle/

RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
RUN chown -R app:app /app
USER app

EXPOSE 3001

CMD ["node", "dist/main.js"]
