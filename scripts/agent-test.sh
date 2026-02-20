#!/bin/bash
# Agent test runner: runs tests with JSON output for machine parsing.
# Usage: bash scripts/agent-test.sh [module-name]
# Example: bash scripts/agent-test.sh payments

set -euo pipefail
cd "$(dirname "$0")/.."

MODULE="${1:-}"

if [ -n "$MODULE" ]; then
  # Run tests for specific module
  npx jest --passWithNoTests --projects apps/api \
    --testPathPattern="modules/$MODULE" \
    --json --silent 2>/dev/null | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
print(json.dumps({
  'module': '$MODULE',
  'suites': data.get('numPassedTestSuites', 0),
  'passed': data.get('numPassedTests', 0),
  'failed': data.get('numFailedTests', 0),
  'time': round(data.get('testResults', [{}])[0].get('perfStats', {}).get('runtime', 0) / 1000, 1) if data.get('testResults') else 0
}))
" 2>/dev/null || echo "{\"module\":\"$MODULE\",\"status\":\"error\"}"
else
  # Run all tests, output summary
  npx jest --passWithNoTests --projects apps/api --json --silent 2>/dev/null | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
print(json.dumps({
  'suites_passed': data.get('numPassedTestSuites', 0),
  'suites_failed': data.get('numFailedTestSuites', 0),
  'tests_passed': data.get('numPassedTests', 0),
  'tests_failed': data.get('numFailedTests', 0),
  'time_seconds': round((data.get('testResults', [{}])[-1].get('perfStats', {}).get('end', 0) - data.get('startTime', 0)) / 1000, 1) if data.get('testResults') else 0
}))
" 2>/dev/null || echo "{\"status\":\"error\"}"
fi
