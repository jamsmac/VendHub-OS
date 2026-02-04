#!/bin/bash

# ============================================================================
# VendHub OS Quick Start Script
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   ██╗   ██╗███████╗███╗   ██╗██████╗ ██╗  ██╗██╗   ██╗██████╗  ║"
echo "║   ██║   ██║██╔════╝████╗  ██║██╔══██╗██║  ██║██║   ██║██╔══██╗ ║"
echo "║   ██║   ██║█████╗  ██╔██╗ ██║██║  ██║███████║██║   ██║██████╔╝ ║"
echo "║   ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║██║  ██║██╔══██║██║   ██║██╔══██╗ ║"
echo "║    ╚████╔╝ ███████╗██║ ╚████║██████╔╝██║  ██║╚██████╔╝██████╔╝ ║"
echo "║     ╚═══╝  ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ║"
echo "║                                                                ║"
echo "║                      Quick Start Script                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 is installed${NC}"
        return 0
    fi
}

MISSING=0
check_command "docker" || MISSING=1
check_command "docker-compose" || check_command "docker compose" || MISSING=1
check_command "node" || MISSING=1
check_command "pnpm" || {
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm
}

if [ $MISSING -eq 1 ]; then
    echo -e "\n${RED}Please install missing prerequisites and try again.${NC}"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js version 20+ required (current: $(node -v))${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Setup environment
echo -e "\n${YELLOW}Setting up environment...${NC}"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env from .env.example${NC}"
else
    echo -e "${GREEN}✅ .env already exists${NC}"
fi

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
pnpm install

# Start infrastructure
echo -e "\n${YELLOW}Starting infrastructure (PostgreSQL, Redis, MinIO)...${NC}"
docker-compose up -d postgres redis minio

# Wait for services
echo -e "\n${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check PostgreSQL
echo -n "Waiting for PostgreSQL"
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U vendhub -d vendhub &> /dev/null; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Check Redis
echo -n "Waiting for Redis"
for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Run migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
pnpm --filter @vendhub/api db:migrate || {
    echo -e "${YELLOW}Migrations may have already been applied${NC}"
}

# Seed demo data
echo -e "\n${YELLOW}Seeding demo data...${NC}"
pnpm --filter @vendhub/api db:seed || {
    echo -e "${YELLOW}Demo data may have already been seeded${NC}"
}

# Success message
echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   🎉 Setup Complete! 🎉                        ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  Start development servers:                                    ║"
echo "║  $ pnpm dev                                                    ║"
echo "║                                                                ║"
echo "║  Or start individual apps:                                     ║"
echo "║  $ pnpm --filter @vendhub/api dev      # API on :4000          ║"
echo "║  $ pnpm --filter @vendhub/web dev      # Admin on :3000        ║"
echo "║  $ pnpm --filter @vendhub/client dev   # Mini App on :5173     ║"
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  📧 Admin Login: admin@vendhub.uz                              ║"
echo "║  🔑 Password: demo123456                                       ║"
echo "║                                                                ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  🌐 URLs:                                                       ║"
echo "║  • API:          http://localhost:4000                         ║"
echo "║  • API Docs:     http://localhost:4000/docs                    ║"
echo "║  • Admin Panel:  http://localhost:3000                         ║"
echo "║  • Mini App:     http://localhost:5173                         ║"
echo "║  • MinIO:        http://localhost:9001 (minioadmin/minioadmin) ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
