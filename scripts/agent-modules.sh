#!/bin/bash
# Agent module map: extracts module dependencies as compact JSON.
# Output: one JSON line per module with imports and exports.
# Usage: bash scripts/agent-modules.sh

set -euo pipefail
cd "$(dirname "$0")/.."

MOD_DIR="apps/api/src/modules"

find "$MOD_DIR" -name "*.module.ts" -not -path "*/node_modules/*" | sort | while read -r file; do
  module=$(echo "$file" | sed 's|.*/modules/||;s|/.*||')
  class=$(grep -o 'class [A-Za-z]*Module' "$file" | head -1 | sed 's/class //')

  # Extract imported modules
  imports=$(grep -oE '[A-Z][a-zA-Z]*Module' "$file" | grep -v "^${class}$" | sort -u | tr '\n' ',' | sed 's/,$//')

  # Check if it has controller, service, entity
  has_ctrl=$([ -f "$MOD_DIR/$module/$module.controller.ts" ] && echo "true" || echo "false")
  has_svc=$([ -f "$MOD_DIR/$module/$module.service.ts" ] && echo "true" || echo "false")
  entity_count=$(find "$MOD_DIR/$module/entities" -name "*.entity.ts" 2>/dev/null | wc -l | tr -d ' ')

  echo "{\"module\":\"$module\",\"class\":\"$class\",\"imports\":\"$imports\",\"controller\":$has_ctrl,\"service\":$has_svc,\"entities\":$entity_count}"
done
