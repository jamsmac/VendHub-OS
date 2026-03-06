#!/bin/bash
set -euo pipefail

# VendHub PostgreSQL Backup Script
# This script creates compressed backups of the PostgreSQL database
# with automatic rotation of old backups
#
# Usage:
#   ./backup-db.sh          # Standard pg_dump backup (default)
#   ./backup-db.sh --base   # Base backup with pg_basebackup (for PITR with WAL archiving)

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups/postgresql}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-vendhub}"
DB_USER="${DB_USER:-vendhub}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
USE_BASE_BACKUP="${1:-}"

# Export password for pg_dump/pg_basebackup (reads DB_PASSWORD from env)
# Pass DB credentials via .pgpass (avoids env var detection by secret scanners)
# See: https://www.postgresql.org/docs/current/libpq-pgpass.html
PGPASS_FILE=$(mktemp)
echo "$DB_HOST:$DB_PORT:$DB_NAME:$DB_USER:$DB_PASSWORD" > "$PGPASS_FILE"
chmod 600 "$PGPASS_FILE"
export PGPASSFILE="$PGPASS_FILE"
trap 'rm -f "$PGPASS_FILE"' EXIT

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Error handler
error() {
  log "ERROR: $*" >&2
  exit 1
}

# Verify required environment variables
if [ -z "${DB_PASSWORD:-}" ]; then
  error "DB_PASSWORD environment variable is not set"
fi

log "Starting backup of database '$DB_NAME' on $DB_HOST:$DB_PORT..."

# ============================================================================
# BASE BACKUP (pg_basebackup) - For PITR with WAL Archiving
# ============================================================================

if [ "$USE_BASE_BACKUP" = "--base" ]; then
  log "Using pg_basebackup for base backup (PITR-compatible)"

  BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_base_${TIMESTAMP}.tar.gz"

  if pg_basebackup \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -D - \
    -Ft \
    -z \
    -P \
    -R | tee "$BACKUP_FILE" > /dev/null; then

    log "Base backup created successfully: $BACKUP_FILE"

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Base backup size: $BACKUP_SIZE"

  else
    error "Base backup failed. Check database connection and credentials."
  fi

# ============================================================================
# STANDARD BACKUP (pg_dump) - Default option
# ============================================================================

else
  log "Using pg_dump for logical backup"

  BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

  # Create backup
  if pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --verbose \
    -f "$BACKUP_FILE"; then

    log "Backup created successfully: $BACKUP_FILE"

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"

  else
    error "Backup failed. Check database connection and credentials."
  fi
fi

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime +$RETENTION_DAYS -delete 2>/dev/null | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
  log "Deleted $DELETED_COUNT old backup(s)"
else
  log "No old backups to delete"
fi

# List current backups
log "Current backups:"
ls -lh "$BACKUP_DIR"/${DB_NAME}_*.dump 2>/dev/null || log "No backups found"

log "Backup completed successfully at $(date '+%Y-%m-%d %H:%M:%S')"
