#!/usr/bin/env bash
# ==================================================
# VendHub — Seal Secrets for Production
# ==================================================
# Prerequisites:
#   - kubeseal CLI installed
#   - kubectl configured with cluster access
#   - Environment variables set (or .env file sourced)
#
# Usage:
#   export DB_USER=vendhub DB_PASSWORD=... JWT_SECRET=...
#   ./seal-secrets.sh
#
# Or source from .env:
#   source /path/to/.env && ./seal-secrets.sh
# ==================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$SCRIPT_DIR/../base"
OUTPUT="$SCRIPT_DIR/sealed-secrets.yml"

# Required environment variables
REQUIRED_VARS=(
  DB_USER DB_PASSWORD
  REDIS_PASSWORD
  JWT_SECRET JWT_REFRESH_SECRET
  TELEGRAM_BOT_TOKEN
  PAYME_MERCHANT_ID PAYME_SECRET_KEY
  CLICK_MERCHANT_ID CLICK_SERVICE_ID CLICK_SECRET_KEY
  STORAGE_ACCESS_KEY STORAGE_SECRET_KEY
)

echo "=== VendHub Sealed Secrets Generator ==="

# Validate required vars
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: Missing required environment variables:"
  printf '  - %s\n' "${MISSING[@]}"
  echo ""
  echo "Set them before running this script:"
  echo "  source /path/to/.env && $0"
  exit 1
fi

# Check kubeseal is installed
if ! command -v kubeseal &> /dev/null; then
  echo "ERROR: kubeseal is not installed."
  echo "Install: brew install kubeseal (macOS) or see README.md"
  exit 1
fi

# Generate sealed secrets from template
echo "Generating sealed secrets..."

envsubst < "$BASE_DIR/secrets.yml" | kubeseal \
  --controller-name=sealed-secrets \
  --controller-namespace=kube-system \
  --format yaml \
  > "$OUTPUT"

echo "Sealed secrets written to: $OUTPUT"
echo ""
echo "Apply with:"
echo "  kubectl apply -f $OUTPUT"
echo ""
echo "IMPORTANT: Commit sealed-secrets.yml to Git."
echo "           NEVER commit the plain secrets.yml with real values."
