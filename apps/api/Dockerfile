# ==================================================
# VendHub API - Production Dockerfile
# Multi-stage build for optimal image size
# ==================================================

ARG PNPM_VERSION=9.15.0

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# ==================================================
# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY packages ./packages
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./

# Build
ENV NODE_ENV=production
RUN pnpm --filter @vendhub/api build

# Prune to production-only dependencies
RUN pnpm --filter @vendhub/api deploy --prod /app/pruned

# ==================================================
# Stage 3: Production Runner
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

RUN apk add --no-cache dumb-init

# Copy pruned production dependencies + built output
COPY --from=builder --chown=nestjs:nodejs /app/pruned/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./

# Environment
ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Switch to non-root user
USER nestjs

EXPOSE 4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

# ==================================================
# Stage 4: Development
FROM node:20-alpine AS development
WORKDIR /app

ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install

COPY . .

EXPOSE 4000

CMD ["pnpm", "--filter", "@vendhub/api", "dev"]
