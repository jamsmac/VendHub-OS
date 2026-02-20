#!/bin/bash

# ==================================================
# VendHub Database Backup Script
# ==================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="vendhub_backup_${TIMESTAMP}"

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

# Telegram notification (optional)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Send Telegram notification
send_telegram() {
    local message="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST \
            "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            -d text="${message}" \
            -d parse_mode="HTML" > /dev/null 2>&1 || true
    fi
}

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"
}

# Backup PostgreSQL database
backup_postgres() {
    log_info "Starting PostgreSQL backup..."

    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}_postgres.sql.gz"

    export PGPASSWORD

    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="${BACKUP_DIR}/${BACKUP_NAME}_postgres.dump" \
    2>&1 | tee -a "${BACKUP_DIR}/${BACKUP_NAME}.log"

    # Also create SQL dump for emergency restore
    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
    | gzip > "$backup_file"

    log_info "PostgreSQL backup completed: ${backup_file}"

    unset PGPASSWORD
}

# Backup Redis data
backup_redis() {
    log_info "Starting Redis backup..."

    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"
    local redis_password="${REDIS_PASSWORD:-}"

    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}_redis.rdb"

    if [ -n "$redis_password" ]; then
        redis-cli -h "$redis_host" -p "$redis_port" -a "$redis_password" BGSAVE
        sleep 5
        redis-cli -h "$redis_host" -p "$redis_port" -a "$redis_password" --rdb "$backup_file"
    else
        redis-cli -h "$redis_host" -p "$redis_port" BGSAVE
        sleep 5
        redis-cli -h "$redis_host" -p "$redis_port" --rdb "$backup_file"
    fi

    gzip "$backup_file"

    log_info "Redis backup completed: ${backup_file}.gz"
}

# Create backup archive
create_archive() {
    log_info "Creating backup archive..."

    local archive_file="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

    cd "$BACKUP_DIR"
    tar -czf "$archive_file" \
        "${BACKUP_NAME}_postgres.dump" \
        "${BACKUP_NAME}_postgres.sql.gz" \
        "${BACKUP_NAME}_redis.rdb.gz" \
        "${BACKUP_NAME}.log" \
    2>/dev/null || tar -czf "$archive_file" \
        "${BACKUP_NAME}_postgres.dump" \
        "${BACKUP_NAME}_postgres.sql.gz" \
        "${BACKUP_NAME}.log"

    # Calculate checksum
    sha256sum "$archive_file" > "${archive_file}.sha256"

    # Get file size
    local size=$(du -h "$archive_file" | cut -f1)

    log_info "Archive created: ${archive_file} (${size})"

    # Cleanup individual files
    rm -f "${BACKUP_DIR}/${BACKUP_NAME}_postgres.dump"
    rm -f "${BACKUP_DIR}/${BACKUP_NAME}_postgres.sql.gz"
    rm -f "${BACKUP_DIR}/${BACKUP_NAME}_redis.rdb.gz"
    rm -f "${BACKUP_DIR}/${BACKUP_NAME}.log"

    echo "$archive_file"
}

# Upload to S3
upload_to_s3() {
    local archive_file="$1"

    if [ -z "$S3_BUCKET" ]; then
        log_warn "S3_BUCKET not configured, skipping S3 upload"
        return
    fi

    log_info "Uploading backup to S3..."

    aws s3 cp "$archive_file" "s3://${S3_BUCKET}/${S3_PREFIX}/" \
        --region "$AWS_REGION" \
        --storage-class STANDARD_IA

    aws s3 cp "${archive_file}.sha256" "s3://${S3_BUCKET}/${S3_PREFIX}/" \
        --region "$AWS_REGION"

    log_info "Backup uploaded to S3: s3://${S3_BUCKET}/${S3_PREFIX}/"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    # Local cleanup
    find "$BACKUP_DIR" -name "vendhub_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "vendhub_backup_*.sha256" -mtime +$RETENTION_DAYS -delete

    # S3 cleanup
    if [ -n "$S3_BUCKET" ]; then
        local cutoff_date=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d)
        aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" \
            --region "$AWS_REGION" \
        | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_name=$(echo "$line" | awk '{print $4}')
            if [[ "$file_date" < "$cutoff_date" ]]; then
                aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${file_name}" \
                    --region "$AWS_REGION"
                log_info "Deleted old S3 backup: ${file_name}"
            fi
        done
    fi

    log_info "Cleanup completed"
}

# Main function
main() {
    local start_time=$(date +%s)

    log_info "=========================================="
    log_info "VendHub Backup Started"
    log_info "=========================================="

    send_telegram "🔄 <b>VendHub Backup Started</b>

📅 Date: $(date '+%Y-%m-%d %H:%M:%S')
🗄️ Database: ${DB_NAME}"

    # Create backup directory
    create_backup_dir

    # Backup PostgreSQL
    backup_postgres

    # Backup Redis (optional)
    if command -v redis-cli &> /dev/null; then
        backup_redis
    else
        log_warn "redis-cli not found, skipping Redis backup"
    fi

    # Create archive
    local archive_file=$(create_archive)

    # Upload to S3
    upload_to_s3 "$archive_file"

    # Cleanup old backups
    cleanup_old_backups

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local size=$(du -h "$archive_file" | cut -f1)

    log_info "=========================================="
    log_info "VendHub Backup Completed"
    log_info "Duration: ${duration} seconds"
    log_info "Archive: ${archive_file}"
    log_info "Size: ${size}"
    log_info "=========================================="

    send_telegram "✅ <b>VendHub Backup Completed</b>

📅 Date: $(date '+%Y-%m-%d %H:%M:%S')
⏱️ Duration: ${duration} seconds
📦 Size: ${size}
📁 File: ${BACKUP_NAME}.tar.gz"
}

# Run main function
main "$@"
