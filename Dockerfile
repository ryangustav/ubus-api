# Builder stage runs on the native architecture of the runner (x86_64)
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build
RUN ls -R dist

# Install production dependencies on the native platform as well
RUN npm ci --omit=dev --legacy-peer-deps

# Target stage for the final image (ARM64)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.js ./

EXPOSE 3001

CMD ["node", "dist/main.js"]
