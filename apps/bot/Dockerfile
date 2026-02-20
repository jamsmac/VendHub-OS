# ==================================================
# VendHub Telegram Bot - Production Dockerfile
# ==================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ==================================================
# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/bot/node_modules ./apps/bot/node_modules

# Copy source
COPY apps/bot ./apps/bot
COPY packages ./packages
COPY tsconfig.base.json ./

# Build
ENV NODE_ENV=production
RUN pnpm --filter @vendhub/bot build

# ==================================================
# Stage 3: Production Runner
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 botuser

# Install production essentials
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder --chown=botuser:nodejs /app/apps/bot/dist ./dist
COPY --from=builder --chown=botuser:nodejs /app/apps/bot/package.json ./
COPY --from=builder --chown=botuser:nodejs /app/node_modules ./node_modules

# Environment
ENV NODE_ENV=production

# Switch to non-root user
USER botuser

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

# ==================================================
# Stage 4: Development
FROM node:20-alpine AS development
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install

COPY . .

CMD ["pnpm", "--filter", "@vendhub/bot", "dev"]
