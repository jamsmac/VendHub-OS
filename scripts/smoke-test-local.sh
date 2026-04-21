#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# VendHub OS — Local Smoke Test Runner
# Usage: bash scripts/smoke-test-local.sh
#
# Checks that both the API and web are running locally, then runs the
# Playwright predictive-refill smoke test against localhost.
# ---------------------------------------------------------------------------

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
fail() { echo -e "${RED}✗${RESET} $*"; }
info() { echo -e "${CYAN}→${RESET} $*"; }
hr()   { echo -e "${BOLD}────────────────────────────────────────────────────${RESET}"; }

# ── Configuration ─────────────────────────────────────────────────────────────
API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
API_HEALTH="${API_URL}/api/v1/health"
PLAYWRIGHT_SPEC="e2e/web/predictive-refill.spec.ts"
PLAYWRIGHT_PROJECT="web-chromium"

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
hr
echo -e "${BOLD}  VendHub OS — Predictive Refill Smoke Test${RESET}"
hr
echo ""

# ── Step 1: Check API health ──────────────────────────────────────────────────
info "Checking API on ${API_HEALTH} ..."

API_STATUS=$(curl --silent --max-time 5 --write-out "%{http_code}" --output /dev/null "${API_HEALTH}" 2>/dev/null || echo "000")

if [ "${API_STATUS}" = "200" ]; then
  ok "API is healthy (HTTP ${API_STATUS})"
  API_OK=true
else
  fail "API not reachable — got HTTP ${API_STATUS} from ${API_HEALTH}"
  warn "Next steps to start the API:"
  echo "   pnpm --filter api start:dev"
  echo "   # or"
  echo "   pnpm docker:up"
  API_OK=false
fi

echo ""

# ── Step 2: Check Web health ──────────────────────────────────────────────────
info "Checking Web app on ${WEB_URL} ..."

WEB_STATUS=$(curl --silent --max-time 5 --write-out "%{http_code}" --output /dev/null "${WEB_URL}" 2>/dev/null || echo "000")

if [ "${WEB_STATUS}" = "200" ] || [ "${WEB_STATUS}" = "307" ] || [ "${WEB_STATUS}" = "302" ]; then
  ok "Web app is reachable (HTTP ${WEB_STATUS})"
  WEB_OK=true
else
  fail "Web app not reachable — got HTTP ${WEB_STATUS} from ${WEB_URL}"
  warn "Next steps to start the web app:"
  echo "   pnpm --filter web dev"
  echo "   # or"
  echo "   pnpm docker:up"
  WEB_OK=false
fi

echo ""

# ── Step 3: Abort early if either server is down ──────────────────────────────
if [ "${API_OK}" = false ] || [ "${WEB_OK}" = false ]; then
  hr
  fail "One or more services are not running. Fix them before running smoke tests."
  echo ""
  echo -e "${BOLD}Quick start:${RESET}"
  echo "  # Start everything via Docker:"
  echo "  pnpm docker:up"
  echo ""
  echo "  # Or start services individually:"
  echo "  pnpm --filter api start:dev   # API on :4000"
  echo "  pnpm --filter web dev          # Web on :3000"
  echo ""
  echo "  # Then re-run this script:"
  echo "  bash scripts/smoke-test-local.sh"
  hr
  exit 1
fi

# ── Step 4: Verify Playwright is installed ────────────────────────────────────
info "Checking Playwright installation ..."

if ! command -v npx &>/dev/null; then
  fail "npx not found. Install Node.js + pnpm first."
  exit 1
fi

if ! npx playwright --version &>/dev/null 2>&1; then
  warn "Playwright not found. Installing ..."
  pnpm exec playwright install --with-deps chromium
fi

ok "Playwright is available"
echo ""

# ── Step 5: Run the smoke test ────────────────────────────────────────────────
hr
info "Running Playwright smoke test ..."
echo -e "  Spec    : ${PLAYWRIGHT_SPEC}"
echo -e "  Project : ${PLAYWRIGHT_PROJECT}"
echo -e "  API URL : ${API_URL}"
echo -e "  Web URL : ${WEB_URL}"
hr
echo ""

# Export URLs so Playwright config picks them up
export API_URL
export WEB_URL

# Run Playwright — capture exit code without aborting the script (set -e bypass)
PLAYWRIGHT_EXIT=0
npx playwright test \
  "${PLAYWRIGHT_SPEC}" \
  --project="${PLAYWRIGHT_PROJECT}" \
  --reporter=list \
  2>&1 || PLAYWRIGHT_EXIT=$?

echo ""
hr

# ── Step 6: Report result ─────────────────────────────────────────────────────
if [ "${PLAYWRIGHT_EXIT}" -eq 0 ]; then
  ok "${BOLD}All smoke tests passed!${RESET}"
  echo ""
  echo -e "  HTML report: ${CYAN}playwright-report/index.html${RESET}"
  echo -e "  Open with : npx playwright show-report"
  hr
  exit 0
else
  fail "${BOLD}One or more smoke tests failed (exit code ${PLAYWRIGHT_EXIT})${RESET}"
  echo ""
  echo -e "${BOLD}Next steps:${RESET}"
  echo "  1. View the HTML report:"
  echo "     npx playwright show-report"
  echo ""
  echo "  2. Re-run only failed tests:"
  echo "     npx playwright test ${PLAYWRIGHT_SPEC} --project=${PLAYWRIGHT_PROJECT} --last-failed"
  echo ""
  echo "  3. Run in headed mode to debug:"
  echo "     npx playwright test ${PLAYWRIGHT_SPEC} --project=${PLAYWRIGHT_PROJECT} --headed"
  echo ""
  echo "  4. Check that predictive-refill data is seeded:"
  echo "     pnpm db:seed"
  echo "     # Then trigger forecast recalc:"
  echo "     curl -X POST ${API_URL}/api/v1/predictive-refill/trigger-refresh"
  hr
  exit "${PLAYWRIGHT_EXIT}"
fi
