#!/bin/bash

# VendHub OS - Run All Load Tests
# This script runs all k6 tests sequentially with proper delays

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load environment variables if .env.load-test exists
if [ -f "$(dirname "$0")/.env.load-test" ]; then
    echo -e "${GREEN}Loading environment variables from .env.load-test${NC}"
    export $(cat "$(dirname "$0")/.env.load-test" | grep -v '^#' | xargs)
fi

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install k6 from: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if API is running
echo -e "${YELLOW}Checking if API is running at ${BASE_URL:-http://localhost:4000}...${NC}"
if ! curl -f "${BASE_URL:-http://localhost:4000}/health" &> /dev/null; then
    echo -e "${RED}Error: API is not responding at ${BASE_URL:-http://localhost:4000}/health${NC}"
    echo "Please start the API first: pnpm --filter api dev"
    exit 1
fi

echo -e "${GREEN}API is running!${NC}"
echo ""

# Array of tests to run
TESTS=("smoke" "load" "stress" "spike")

# Create results directory
RESULTS_DIR="$(dirname "$0")/results"
mkdir -p "$RESULTS_DIR"

# Timestamp for this run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}Starting VendHub OS Load Tests - ${TIMESTAMP}${NC}"
echo "Results will be saved to: $RESULTS_DIR"
echo ""

# Run each test
for TEST in "${TESTS[@]}"; do
    echo -e "${YELLOW}======================================${NC}"
    echo -e "${YELLOW}Running ${TEST}.js${NC}"
    echo -e "${YELLOW}======================================${NC}"

    TEST_FILE="$(dirname "$0")/${TEST}.js"
    RESULT_FILE="$RESULTS_DIR/${TEST}_${TIMESTAMP}.json"
    SUMMARY_FILE="$RESULTS_DIR/${TEST}_${TIMESTAMP}_summary.json"

    if [ -f "$TEST_FILE" ]; then
        # Run k6 test with JSON output
        if k6 run \
            --out "json=$RESULT_FILE" \
            --summary-export="$SUMMARY_FILE" \
            "$TEST_FILE"; then
            echo -e "${GREEN}✓ ${TEST}.js completed successfully${NC}"
        else
            echo -e "${RED}✗ ${TEST}.js failed${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Error: Test file not found: $TEST_FILE${NC}"
        exit 1
    fi

    # Wait between tests to let system stabilize
    if [ "$TEST" != "${TESTS[-1]}" ]; then
        echo ""
        echo -e "${YELLOW}Waiting 30 seconds before next test...${NC}"
        sleep 30
        echo ""
    fi
done

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}All tests completed successfully!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""
echo "To view detailed results:"
echo "  - JSON results: $RESULTS_DIR/*_${TIMESTAMP}.json"
echo "  - Summary: $RESULTS_DIR/*_${TIMESTAMP}_summary.json"
echo ""
