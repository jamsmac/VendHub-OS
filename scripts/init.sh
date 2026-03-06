#!/bin/bash

# ==============================================================================
# VendHub OS - Project Initialization Script
# ==============================================================================
# This script sets up a fresh development environment for VendHub OS
# Run this script after cloning the repository
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        return 1
    fi
    log_success "$1 is installed"
    return 0
}

# ==============================================================================
# Banner
# ==============================================================================

show_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
 __     __         _ _   _       _       ___  ____
 \ \   / /__ _ __ | | | | |_   _| |__   / _ \/ ___|
  \ \ / / _ \ '_ \| | |_| | | | | '_ \ | | | \___ \
   \ V /  __/ | | | |  _  | |_| | |_) || |_| |___) |
    \_/ \___|_| |_|_|_| |_|\__,_|_.__/  \___/|____/

    Vending Machine Management Platform

EOF
    echo -e "${NC}"
    echo -e "Version: 1.0.0"
    echo -e "Environment: Development"
    echo ""
}

# ==============================================================================
# Prerequisites Check
# ==============================================================================

check_prerequisites() {
    log_step "Checking Prerequisites"

    local missing=0

    # Node.js
    if check_command node; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 20 ]; then
            log_warning "Node.js version should be 20+. Current: $(node -v)"
            missing=1
        fi
    else
        missing=1
    fi

    # pnpm
    if ! check_command pnpm; then
        log_info "Installing pnpm..."
        npm install -g pnpm
        if check_command pnpm; then
            log_success "pnpm installed successfully"
        else
            missing=1
        fi
    fi

    # Docker
    if check_command docker; then
        if ! docker info &> /dev/null; then
            log_warning "Docker is installed but not running. Please start Docker."
            missing=1
        fi
    else
        missing=1
    fi

    # Docker Compose
    if ! docker compose version &> /dev/null; then
        if ! check_command docker-compose; then
            missing=1
        fi
    else
        log_success "Docker Compose is available"
    fi

    # Git
    check_command git || missing=1

    if [ $missing -eq 1 ]; then
        log_error "Some prerequisites are missing. Please install them and try again."
        exit 1
    fi

    log_success "All prerequisites are satisfied!"
}

# ==============================================================================
# Environment Setup
# ==============================================================================

setup_environment() {
    log_step "Setting Up Environment"

    cd "$PROJECT_ROOT"

    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        log_info "Creating .env file from template..."
        cp .env.example .env

        # Generate secure secrets
        log_info "Generating secure secrets..."

        # Generate JWT secrets
        JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
        JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')

        # Generate database password
        DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr -d '/')

        # Generate Redis password
        REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr -d '/')

        # Update .env file with generated secrets
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
            sed -i '' "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}/" .env
            sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env
            sed -i '' "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" .env
        else
            # Linux
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
            sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}/" .env
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env
            sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" .env
        fi

        log_success ".env file created with generated secrets"
    else
        log_info ".env file already exists, skipping..."
    fi

    # Create uploads directory
    mkdir -p uploads
    log_success "Uploads directory created"

    # Create logs directory
    mkdir -p logs
    log_success "Logs directory created"
}

# ==============================================================================
# Dependencies Installation
# ==============================================================================

install_dependencies() {
    log_step "Installing Dependencies"

    cd "$PROJECT_ROOT"

    log_info "Installing npm packages with pnpm..."
    pnpm install

    log_success "Dependencies installed successfully!"
}

# ==============================================================================
# Docker Infrastructure
# ==============================================================================

start_infrastructure() {
    log_step "Starting Docker Infrastructure"

    cd "$PROJECT_ROOT"

    log_info "Starting PostgreSQL, Redis, and MinIO..."

    # Use docker compose (v2) or docker-compose (v1)
    if docker compose version &> /dev/null; then
        docker compose up -d postgres redis minio
    else
        docker-compose up -d postgres redis minio
    fi

    log_info "Waiting for services to be ready..."

    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker compose exec -T postgres pg_isready -U vendhub &> /dev/null; then
            log_success "PostgreSQL is ready!"
            break
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        log_error "PostgreSQL failed to start. Check docker logs."
        exit 1
    fi

    # Wait for Redis
    log_info "Waiting for Redis..."
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker compose exec -T redis redis-cli ping &> /dev/null; then
            log_success "Redis is ready!"
            break
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        log_warning "Redis might not be fully ready, continuing anyway..."
    fi

    log_success "Infrastructure services are running!"
}

# ==============================================================================
# Database Setup
# ==============================================================================

setup_database() {
    log_step "Setting Up Database"

    cd "$PROJECT_ROOT"

    log_info "Running database migrations..."
    pnpm db:migrate || {
        log_warning "Migration failed, database might already be set up"
    }

    log_info "Seeding initial data..."
    pnpm db:seed || {
        log_warning "Seeding failed, data might already exist"
    }

    log_success "Database setup complete!"
}

# ==============================================================================
# VSCode Setup
# ==============================================================================

setup_vscode() {
    log_step "Setting Up VSCode"

    cd "$PROJECT_ROOT"

    # Create .vscode directory
    mkdir -p .vscode

    # Create settings.json
    if [ ! -f .vscode/settings.json ]; then
        log_info "Creating VSCode settings..."
        cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
EOF
        log_success "VSCode settings created"
    fi

    # Create extensions.json
    if [ ! -f .vscode/extensions.json ]; then
        log_info "Creating recommended extensions list..."
        cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "mikestead.dotenv",
    "redhat.vscode-yaml",
    "hashicorp.terraform",
    "ms-kubernetes-tools.vscode-kubernetes-tools"
  ]
}
EOF
        log_success "Recommended extensions list created"
    fi

    # Create launch.json for debugging
    if [ ! -f .vscode/launch.json ]; then
        log_info "Creating debug configuration..."
        cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "start:debug"],
      "cwd": "${workspaceFolder}/apps/api",
      "console": "integratedTerminal",
      "restart": true,
      "sourceMaps": true
    },
    {
      "name": "Debug Web",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/apps/web"
    },
    {
      "name": "Debug Client",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/apps/client"
    }
  ]
}
EOF
        log_success "Debug configuration created"
    fi

    log_success "VSCode setup complete!"
}

# ==============================================================================
# Git Hooks Setup
# ==============================================================================

setup_git_hooks() {
    log_step "Setting Up Git Hooks"

    cd "$PROJECT_ROOT"

    # Initialize husky if not already
    if [ ! -d .husky ]; then
        log_info "Initializing Husky..."
        pnpm husky install 2>/dev/null || {
            log_info "Setting up Husky manually..."
            mkdir -p .husky
        }
    fi

    # Create pre-commit hook
    if [ ! -f .husky/pre-commit ]; then
        log_info "Creating pre-commit hook..."
        cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
EOF
        chmod +x .husky/pre-commit
        log_success "Pre-commit hook created"
    fi

    # Create commit-msg hook for conventional commits
    if [ ! -f .husky/commit-msg ]; then
        log_info "Creating commit-msg hook..."
        cat > .husky/commit-msg << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Simple conventional commit check
commit_msg=$(cat "$1")
pattern="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
    echo "ERROR: Invalid commit message format."
    echo "Use: type(scope): description"
    echo "Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
    echo "Example: feat(auth): add 2FA support"
    exit 1
fi
EOF
        chmod +x .husky/commit-msg
        log_success "Commit-msg hook created"
    fi

    log_success "Git hooks setup complete!"
}

# ==============================================================================
# Final Summary
# ==============================================================================

show_summary() {
    log_step "Setup Complete!"

    echo -e "${GREEN}"
    cat << 'EOF'

 ╔═══════════════════════════════════════════════════════════════╗
 ║                   VendHub OS is Ready!                        ║
 ╠═══════════════════════════════════════════════════════════════╣
 ║                                                               ║
 ║  Start development:                                           ║
 ║    pnpm dev                                                   ║
 ║                                                               ║
 ║  Access applications:                                         ║
 ║    API:        http://localhost:4000                          ║
 ║    API Docs:   http://localhost:4000/docs                     ║
 ║    Admin:      http://localhost:3000                          ║
 ║    Mini App:   http://localhost:5173                          ║
 ║                                                               ║
 ║  Default credentials:                                         ║
 ║    Email:      admin@vendhub.uz                               ║
 ║    Password:   admin123                                       ║
 ║                                                               ║
 ║  Useful commands:                                             ║
 ║    pnpm dev              - Start all apps                     ║
 ║    pnpm build            - Build all apps                     ║
 ║    pnpm test             - Run tests                          ║
 ║    pnpm lint             - Run linter                         ║
 ║    pnpm db:migrate       - Run migrations                     ║
 ║    pnpm db:seed          - Seed database                      ║
 ║                                                               ║
 ║  Docker commands:                                             ║
 ║    docker compose up -d  - Start all services                 ║
 ║    docker compose down   - Stop all services                  ║
 ║    docker compose logs   - View logs                          ║
 ║                                                               ║
 ╚═══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    echo -e "\n${YELLOW}Note: Don't forget to configure Telegram bot token in .env${NC}"
    echo -e "${YELLOW}      for full functionality.${NC}\n"
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    show_banner

    # Parse arguments
    SKIP_DOCKER=false
    SKIP_DB=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-docker)
                SKIP_DOCKER=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-docker  Skip Docker infrastructure setup"
                echo "  --skip-db      Skip database migration and seeding"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    check_prerequisites
    setup_environment
    install_dependencies

    if [ "$SKIP_DOCKER" = false ]; then
        start_infrastructure
    fi

    if [ "$SKIP_DB" = false ] && [ "$SKIP_DOCKER" = false ]; then
        setup_database
    fi

    setup_vscode
    setup_git_hooks
    show_summary
}

# Run main function
main "$@"
