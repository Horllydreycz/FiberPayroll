# syntax=docker/dockerfile:1

# ── Stage 1: install dependencies ────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# prisma schema is needed because postinstall runs `prisma generate`
COPY prisma ./prisma
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined at build time
ARG NEXT_PUBLIC_FIBER_MODE=rpc
ENV NEXT_PUBLIC_FIBER_MODE=$NEXT_PUBLIC_FIBER_MODE
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholder; the real path is set at runtime
ENV DATABASE_URL="file:/app/data/dev.db"

RUN npx prisma generate && npm run build

# ── Stage 3: runtime ──────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL="file:/app/data/dev.db"

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Prisma CLI for `db push` on startup (creates/updates the SQLite schema)
RUN npm install -g prisma@6.19.3

# Standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Prisma schema + generated engine (belt and braces for the standalone trace)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY docker-entrypoint.sh ./
# Strip Windows line endings so sh can run it, and prep the data dir
RUN sed -i 's/\r$//' docker-entrypoint.sh && \
    mkdir -p /app/data && chown -R nextjs:nodejs /app/data /app/prisma

USER nextjs
EXPOSE 3000
VOLUME /app/data

ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
