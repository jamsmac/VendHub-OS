# ==================================================
# VendHub Web (Admin Panel) - Production Dockerfile
# Next.js with standalone output
# ==================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ==================================================
# Stage 2: Development (for docker-compose dev mode)
FROM node:20-alpine AS development
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "--filter", "@vendhub/web", "dev"]

# ==================================================
# Stage 3: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source
COPY apps/web ./apps/web
COPY packages ./packages
COPY tsconfig.base.json ./

# Build shared package first (web imports from @vendhub/shared)
RUN pnpm --filter @vendhub/shared build

# Build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build web
RUN pnpm --filter @vendhub/web build

# ==================================================
# Stage 4: Production Runner (MUST be last for Railway)
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install production essentials
RUN apk add --no-cache dumb-init

# Environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static assets into the correct monorepo path within standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Set correct permissions for prerender cache
RUN mkdir -p apps/web/.next && chown nextjs:nodejs apps/web/.next

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Use dumb-init to handle signals properly
# In monorepo standalone, server.js may be at root or apps/web/server.js
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "if [ -f server.js ]; then exec node server.js; else exec node apps/web/server.js; fi"]
