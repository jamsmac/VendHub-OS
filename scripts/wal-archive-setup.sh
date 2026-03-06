#!/bin/bash
# PostgreSQL WAL Archiving Setup for Point-in-Time Recovery (PITR)
# Run this script on the PostgreSQL server to enable WAL archiving

set -euo pipefail

WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/backups/wal_archive}"
PG_DATA="${PGDATA:-/var/lib/postgresql/data}"

echo "=== VendHub PostgreSQL WAL Archive Setup ==="
echo "Archive directory: $WAL_ARCHIVE_DIR"

mkdir -p "$WAL_ARCHIVE_DIR"

cat << 'PGCONF'

# === Add to postgresql.conf ===
# WAL Archiving for Point-in-Time Recovery
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /backups/wal_archive/%f && cp %p /backups/wal_archive/%f'
archive_timeout = 300

# WAL Settings
max_wal_size = 2GB
min_wal_size = 512MB
wal_keep_size = 1GB

# Recommended for PITR
full_page_writes = on
wal_compression = on

PGCONF

echo ""
echo "After applying config, restart PostgreSQL and verify:"
echo "  SELECT * FROM pg_stat_archiver;"
echo ""
echo "To perform Point-in-Time Recovery:"
echo "  1. Stop PostgreSQL"
echo "  2. Restore base backup: pg_restore -d vendhub latest.dump"
echo "  3. Create recovery.signal file in \$PGDATA"
echo "  4. Set restore_command in postgresql.conf:"
echo "     restore_command = 'cp /backups/wal_archive/%f %p'"
echo "     recovery_target_time = '2026-03-03 12:00:00'"
echo "  5. Start PostgreSQL - it will replay WAL up to target time"
