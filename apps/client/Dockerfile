# ==================================================
# VendHub Client (Telegram Mini App) - Production Dockerfile
# Vite + React with nginx
# ==================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/client/package.json ./apps/client/
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
COPY --from=deps /app/apps/client/node_modules ./apps/client/node_modules

# Copy source
COPY apps/client ./apps/client
COPY packages ./packages
COPY tsconfig.base.json ./

# Build environment
ENV NODE_ENV=production

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_TELEGRAM_BOT_NAME
ARG VITE_APP_ENV=production

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TELEGRAM_BOT_NAME=$VITE_TELEGRAM_BOT_NAME
ENV VITE_APP_ENV=$VITE_APP_ENV

# Build
RUN pnpm --filter @vendhub/client build

# ==================================================
# Stage 3: Production Runner (nginx, non-root)
FROM nginx:alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# Configure nginx to run as non-root
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Add health check script
RUN echo '#!/bin/sh' > /docker-healthcheck.sh && \
    echo 'wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1' >> /docker-healthcheck.sh && \
    chmod +x /docker-healthcheck.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD /docker-healthcheck.sh

# Run as non-root nginx user
USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ==================================================
# Stage 4: Development
FROM node:20-alpine AS development
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/client/package.json ./apps/client/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "--filter", "@vendhub/client", "dev", "--host"]
