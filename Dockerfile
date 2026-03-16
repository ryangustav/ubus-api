# Builder stage runs on the native architecture of the runner (x86_64)
# Only used for TypeScript compilation (nest build)
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build
RUN echo "=== Build output ===" && ls dist/

# Target stage for the final image (ARM64)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy package files first, then install prod deps NATIVELY on ARM64
# --ignore-scripts avoids running postinstall scripts that might crash under QEMU
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts

# Rebuild esbuild specifically so it downloads the correct ARM64 binary
RUN npm rebuild esbuild 2>/dev/null || true

# Copy build artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.js ./

# Ensure drizzle meta/_journal.json exists (required by drizzle-kit migrate)
RUN mkdir -p drizzle/meta && cat > drizzle/meta/_journal.json << 'JOURNAL'
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {"idx": 0, "version": "7", "when": 1700000000000, "tag": "0000_aromatic_thing", "breakpoints": true},
    {"idx": 1, "version": "7", "when": 1700000001000, "tag": "0001_powerful_freak", "breakpoints": true},
    {"idx": 2, "version": "7", "when": 1700000002000, "tag": "0001_indexes", "breakpoints": true},
    {"idx": 3, "version": "7", "when": 1700000003000, "tag": "0002_good_carmella_unuscione", "breakpoints": true},
    {"idx": 4, "version": "7", "when": 1700000004000, "tag": "0003_flashy_dreadnoughts", "breakpoints": true}
  ]
}
JOURNAL
RUN echo "=== Drizzle directory ===" && ls -R drizzle/

EXPOSE 3001

CMD ["node", "dist/main.js"]
