#!/bin/bash
# Agent endpoint map: extracts all API routes as compact JSON.
# Output: one JSON line per endpoint.
# Usage: bash scripts/agent-endpoints.sh [module-name]

set -euo pipefail
cd "$(dirname "$0")/.."

MODULE_FILTER="${1:-}"
CTRL_DIR="apps/api/src/modules"

find "$CTRL_DIR" -name "*.controller.ts" -not -path "*/node_modules/*" | sort | while read -r file; do
  module=$(echo "$file" | sed 's|.*/modules/||;s|/.*||')

  if [ -n "$MODULE_FILTER" ] && [ "$module" != "$MODULE_FILTER" ]; then
    continue
  fi

  # Extract controller route prefix
  prefix=$(grep -o '@Controller("[^"]*")' "$file" | sed 's/@Controller("//;s/")//' || echo "$module")

  # Extract endpoints: @Get/@Post/@Patch/@Put/@Delete with optional path
  grep -nE '@(Get|Post|Patch|Put|Delete)\(' "$file" | while read -r line; do
    lineno=$(echo "$line" | cut -d: -f1)
    method=$(echo "$line" | grep -o '@\(Get\|Post\|Patch\|Put\|Delete\)' | sed 's/@//')
    path=$(echo "$line" | grep -o '"[^"]*"' | head -1 | tr -d '"' || echo "")

    # Check for @Roles on preceding lines (up to 5 lines before)
    start=$((lineno - 5))
    [ "$start" -lt 1 ] && start=1
    roles=$(sed -n "${start},${lineno}p" "$file" | grep -o '@Roles([^)]*' | sed 's/@Roles(//' | tr -d '"' || echo "")

    # Check for @Public
    is_public=$(sed -n "${start},${lineno}p" "$file" | grep -c '@Public()' || echo "0")

    full_path="/api/v1/${prefix}${path:+/$path}"
    full_path=$(echo "$full_path" | sed 's|//|/|g')

    echo "{\"module\":\"$module\",\"method\":\"$method\",\"path\":\"$full_path\",\"roles\":\"$roles\",\"public\":$is_public}"
  done
done
