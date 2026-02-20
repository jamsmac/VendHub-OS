#!/bin/bash
# Agent self-check: quick validation of project health.
# Output: machine-parseable JSON lines. Exit 0 = all ok, 1 = failures.
# Usage: bash scripts/agent-check.sh [--full]

set -euo pipefail
cd "$(dirname "$0")/.."

FULL="${1:-}"
FAIL=0

check() {
  local name="$1" cmd="$2"
  if result=$(eval "$cmd" 2>&1); then
    echo "{\"check\":\"$name\",\"status\":\"ok\",\"detail\":\"$result\"}"
  else
    echo "{\"check\":\"$name\",\"status\":\"fail\",\"detail\":\"$(echo "$result" | head -3 | tr '\n' ' ')\"}"
    FAIL=1
  fi
}

# Phase 1: TypeScript compilation (all apps)
for app in api web client bot mobile; do
  tsconfig="apps/$app/tsconfig.json"
  if [ -f "$tsconfig" ]; then
    errs=$(npx tsc --noEmit -p "$tsconfig" 2>&1 | grep -c "error TS" || true)
    if [ "$errs" = "0" ]; then
      echo "{\"check\":\"ts:$app\",\"status\":\"ok\",\"errors\":0}"
    else
      echo "{\"check\":\"ts:$app\",\"status\":\"fail\",\"errors\":$errs}"
      FAIL=1
    fi
  fi
done

# Phase 2: Tests (API only, fast)
if [ "$FULL" = "--full" ]; then
  test_out=$(npx jest --passWithNoTests --projects apps/api --json 2>/dev/null || true)
  suites=$(echo "$test_out" | grep -o '"numPassedTestSuites":[0-9]*' | grep -o '[0-9]*' || echo "0")
  tests=$(echo "$test_out" | grep -o '"numPassedTests":[0-9]*' | grep -o '[0-9]*' || echo "0")
  failed=$(echo "$test_out" | grep -o '"numFailedTests":[0-9]*' | grep -o '[0-9]*' || echo "0")
  echo "{\"check\":\"tests\",\"status\":\"$([ "$failed" = "0" ] && echo ok || echo fail)\",\"suites\":$suites,\"passed\":$tests,\"failed\":$failed}"
  [ "$failed" != "0" ] && FAIL=1
fi

# Phase 3: Key metrics
any_count=$(grep -r ": any" apps/api/src --include="*.ts" --exclude-dir=migrations --exclude="*.spec.ts" -c 2>/dev/null | awk -F: '$2>0{sum+=$2}END{print sum+0}')
entity_count=$(find apps/api/src/modules -name "*.entity.ts" 2>/dev/null | wc -l | tr -d ' ')
controller_count=$(find apps/api/src/modules -name "*.controller.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "{\"check\":\"metrics\",\"any_types\":$any_count,\"entities\":$entity_count,\"controllers\":$controller_count}"

# Phase 4: Docker services (if running)
if command -v docker &>/dev/null && docker compose ps --format json &>/dev/null 2>&1; then
  running=$(docker compose ps --format json 2>/dev/null | grep -c '"running"' || echo "0")
  echo "{\"check\":\"docker\",\"running_services\":$running}"
fi

exit $FAIL
