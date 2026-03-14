FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Variáveis fixas de ambiente
ENV NODE_ENV=production
ENV PORT=3001
ENV USE_OCI_VAULT=true
# OCID do segredo para o login direto no Vault
ENV OCI_SECRET_OCID=ocid1.vaultsecret.oc1.sa-saopaulo-1.amaaaaaakqk4tzia3i3v3vneo3ir3pdetn3tmqa7yebcwrpzq5v7g25r2nxa

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.js ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
