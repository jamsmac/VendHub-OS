#!/bin/bash

# ==================================================
# VendHub Database Restore Script
# ==================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-vendhub}"
DB_USER="${DB_USER:-vendhub}"
PGPASSWORD="${DB_PASSWORD:-}"

# S3 configuration (optional)
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-backups/vendhub}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -f, --file FILE       Restore from local backup file
    -s, --s3 KEY          Download and restore from S3
    -l, --list            List available backups
    -d, --dry-run         Show what would be done without executing
    -y, --yes             Skip confirmation prompts
    -h, --help            Show this help message

Examples:
    $0 --file /backups/vendhub_backup_20240115_120000.tar.gz
    $0 --s3 vendhub_backup_20240115_120000.tar.gz
    $0 --list

EOF
    exit 1
}

# List available backups
list_backups() {
    log_info "Available local backups:"
    echo ""
    if ls -la "${BACKUP_DIR}"/vendhub_backup_*.tar.gz 2>/dev/null; then
        echo ""
    else
        log_warn "No local backups found in ${BACKUP_DIR}"
    fi

    if [ -n "$S3_BUCKET" ]; then
        echo ""
        log_info "Available S3 backups:"
        echo ""
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" \
            --region "$AWS_REGION" \
        | grep -E "\.tar\.gz$" \
        | sort -r \
        | head -20
    fi
}

# Download from S3
download_from_s3() {
    local s3_key="$1"
    local local_file="${BACKUP_DIR}/${s3_key}"

    log_step "Downloading backup from S3..."

    aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/${s3_key}" "$local_file" \
        --region "$AWS_REGION"

    # Download and verify checksum
    if aws s3 cp "s3://${S3_BUCKET}/${S3_PREFIX}/${s3_key}.sha256" "${local_file}.sha256" \
        --region "$AWS_REGION" 2>/dev/null; then
        log_step "Verifying checksum..."
        cd "$BACKUP_DIR"
        if sha256sum -c "${local_file}.sha256"; then
            log_info "Checksum verified"
        else
            log_error "Checksum verification failed!"
            exit 1
        fi
    else
        log_warn "No checksum file found, skipping verification"
    fi

    echo "$local_file"
}

# Extract backup archive
extract_backup() {
    local archive_file="$1"
    local extract_dir="${BACKUP_DIR}/restore_$(date +%s)"

    log_step "Extracting backup archive..."

    mkdir -p "$extract_dir"
    tar -xzf "$archive_file" -C "$extract_dir"

    echo "$extract_dir"
}

# Restore PostgreSQL
restore_postgres() {
    local extract_dir="$1"
    local dump_file=$(find "$extract_dir" -name "*_postgres.dump" | head -1)
    local sql_file=$(find "$extract_dir" -name "*_postgres.sql.gz" | head -1)

    if [ -z "$dump_file" ] && [ -z "$sql_file" ]; then
        log_error "No PostgreSQL backup found in archive!"
        exit 1
    fi

    export PGPASSWORD

    log_step "Terminating existing connections..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

    log_step "Dropping and recreating database..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "DROP DATABASE IF EXISTS ${DB_NAME};"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

    log_step "Restoring PostgreSQL data..."

    if [ -n "$dump_file" ]; then
        pg_restore \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --verbose \
            --no-owner \
            --no-acl \
            "$dump_file"
    elif [ -n "$sql_file" ]; then
        gunzip -c "$sql_file" | psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME"
    fi

    unset PGPASSWORD

    log_info "PostgreSQL restore completed"
}

# Restore Redis
restore_redis() {
    local extract_dir="$1"
    local rdb_file=$(find "$extract_dir" -name "*_redis.rdb.gz" | head -1)

    if [ -z "$rdb_file" ]; then
        log_warn "No Redis backup found, skipping Redis restore"
        return
    fi

    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"
    local redis_password="${REDIS_PASSWORD:-}"

    log_step "Restoring Redis data..."

    # Decompress
    gunzip -c "$rdb_file" > "${extract_dir}/dump.rdb"

    # Stop Redis, replace RDB, start Redis
    log_warn "Redis restore requires manual intervention:"
    echo "  1. Stop Redis server"
    echo "  2. Copy ${extract_dir}/dump.rdb to Redis data directory"
    echo "  3. Start Redis server"

    log_info "Redis RDB file extracted: ${extract_dir}/dump.rdb"
}

# Main restore function
restore() {
    local archive_file="$1"
    local dry_run="${2:-false}"
    local skip_confirm="${3:-false}"

    if [ ! -f "$archive_file" ]; then
        log_error "Backup file not found: ${archive_file}"
        exit 1
    fi

    log_info "=========================================="
    log_info "VendHub Restore"
    log_info "=========================================="
    log_info "Backup file: ${archive_file}"
    log_info "Target database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
    log_info "=========================================="

    if [ "$dry_run" = "true" ]; then
        log_warn "DRY RUN - No changes will be made"
        log_info "Would extract: ${archive_file}"
        log_info "Would restore to: ${DB_NAME}"
        return
    fi

    if [ "$skip_confirm" != "true" ]; then
        echo ""
        log_warn "⚠️  WARNING: This will DESTROY all existing data in ${DB_NAME}!"
        echo ""
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi

    local start_time=$(date +%s)

    # Extract backup
    local extract_dir=$(extract_backup "$archive_file")

    # Restore PostgreSQL
    restore_postgres "$extract_dir"

    # Restore Redis (optional)
    restore_redis "$extract_dir"

    # Cleanup
    log_step "Cleaning up temporary files..."
    rm -rf "$extract_dir"

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log_info "=========================================="
    log_info "VendHub Restore Completed"
    log_info "Duration: ${duration} seconds"
    log_info "=========================================="
}

# Parse arguments
BACKUP_FILE=""
S3_KEY=""
LIST_MODE=false
DRY_RUN=false
SKIP_CONFIRM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        -s|--s3)
            S3_KEY="$2"
            shift 2
            ;;
        -l|--list)
            LIST_MODE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRM=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Execute
if [ "$LIST_MODE" = true ]; then
    list_backups
elif [ -n "$S3_KEY" ]; then
    BACKUP_FILE=$(download_from_s3 "$S3_KEY")
    restore "$BACKUP_FILE" "$DRY_RUN" "$SKIP_CONFIRM"
elif [ -n "$BACKUP_FILE" ]; then
    restore "$BACKUP_FILE" "$DRY_RUN" "$SKIP_CONFIRM"
else
    usage
fi
