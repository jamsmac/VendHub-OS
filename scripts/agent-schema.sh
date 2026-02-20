#!/bin/bash
# Agent schema dump: extracts entity schema as compact JSON.
# Output: one JSON line per entity with columns and relations.
# Usage: bash scripts/agent-schema.sh [module-name]

set -euo pipefail
cd "$(dirname "$0")/.."

MODULE_FILTER="${1:-}"
ENTITY_DIR="apps/api/src/modules"

find "$ENTITY_DIR" -name "*.entity.ts" -not -path "*/node_modules/*" | sort | while read -r file; do
  module=$(echo "$file" | sed 's|.*/modules/||;s|/.*||')

  # Filter by module if specified
  if [ -n "$MODULE_FILTER" ] && [ "$module" != "$MODULE_FILTER" ]; then
    continue
  fi

  # Extract entity name
  entity=$(grep -o '@Entity("[^"]*")' "$file" | sed 's/@Entity("//;s/")//' || echo "unknown")
  class=$(grep -o 'class [A-Za-z]*' "$file" | head -1 | sed 's/class //')

  # Extract columns (non-relation)
  columns=$(grep -E '@Column|@PrimaryColumn|@CreateDateColumn|@UpdateDateColumn|@DeleteDateColumn' "$file" -A1 | grep -E '^\s+\w+[\?:]' | sed 's/[;].*//;s/^\s*//' | tr '\n' '|' | sed 's/|$//')

  # Extract relations
  relations=$(grep -E '@ManyToOne|@OneToMany|@ManyToMany|@OneToOne' "$file" | sed 's/.*@//' | sed 's/(.*//' | tr '\n' '|' | sed 's/|$//')

  echo "{\"module\":\"$module\",\"class\":\"$class\",\"table\":\"$entity\",\"columns\":\"$columns\",\"relations\":\"$relations\"}"
done
