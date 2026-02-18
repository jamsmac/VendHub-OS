# ==================================================
# VendHub Site (Landing Page) - Production Dockerfile
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
COPY apps/site/package.json ./apps/site/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ==================================================
# Stage 2: Development (for docker-compose dev mode)
FROM node:20-alpine AS development
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/site/node_modules ./apps/site/node_modules

COPY apps/site ./apps/site
COPY packages ./packages
COPY tsconfig.base.json ./

ENV NODE_ENV=development
ENV PORT=3100

EXPOSE 3100

CMD ["pnpm", "--filter", "@vendhub/site", "dev", "-p", "3100"]

# ==================================================
# Stage 3: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/site/node_modules ./apps/site/node_modules

# Copy source
COPY apps/site ./apps/site
COPY packages ./packages
COPY tsconfig.base.json ./

# Build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build
RUN pnpm --filter @vendhub/site build

# ==================================================
# Stage 4: Production Runner
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
ENV PORT=3100

# Copy static files
COPY --from=builder /app/apps/site/public ./public

# Set correct permissions for prerender cache
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/public ./public

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/ || exit 1

# Switch to non-root user
USER nextjs

EXPOSE 3100

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
