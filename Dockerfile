FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

ARG TARGETPLATFORM

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM --platform=$TARGETPLATFORM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.js ./

EXPOSE 3001

CMD ["node", "dist/main.js"]
