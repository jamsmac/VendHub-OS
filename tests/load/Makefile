# VendHub OS Load Testing Makefile
# Convenient shortcuts for running k6 tests

.PHONY: help install check smoke load stress spike all clean results analyze

# Default target
help:
	@echo "VendHub OS Load Testing"
	@echo ""
	@echo "Available targets:"
	@echo "  make install    - Install k6 (macOS with Homebrew)"
	@echo "  make check      - Check if API is running"
	@echo "  make smoke      - Run smoke test (30s, 2 VUs)"
	@echo "  make load       - Run load test (8min, 50 VUs)"
	@echo "  make stress     - Run stress test (15min, 200 VUs)"
	@echo "  make spike      - Run spike test (5min, 100 VUs)"
	@echo "  make all        - Run all tests sequentially"
	@echo "  make results    - List all result files"
	@echo "  make analyze    - Analyze latest test results"
	@echo "  make clean      - Clean result files"
	@echo ""
	@echo "Environment variables:"
	@echo "  BASE_URL        - API URL (default: http://localhost:4000)"
	@echo "  TEST_EMAIL      - Test user email"
	@echo "  TEST_PASSWORD   - Test user password"

# Install k6 (macOS only)
install:
	@command -v k6 >/dev/null 2>&1 || { \
		echo "Installing k6 via Homebrew..."; \
		brew install k6; \
	}
	@echo "k6 installed successfully!"
	@k6 version

# Check if API is running
check:
	@echo "Checking API at ${BASE_URL:-http://localhost:4000}..."
	@curl -f ${BASE_URL:-http://localhost:4000}/health || { \
		echo "Error: API is not running"; \
		echo "Start it with: pnpm --filter api dev"; \
		exit 1; \
	}
	@echo "✓ API is running!"

# Run smoke test
smoke: check
	@echo "Running smoke test..."
	@mkdir -p results
	@k6 run \
		--out json=results/smoke_$(shell date +%Y%m%d_%H%M%S).json \
		--summary-export=results/smoke_$(shell date +%Y%m%d_%H%M%S)_summary.json \
		smoke.js

# Run load test
load: check
	@echo "Running load test..."
	@mkdir -p results
	@k6 run \
		--out json=results/load_$(shell date +%Y%m%d_%H%M%S).json \
		--summary-export=results/load_$(shell date +%Y%m%d_%H%M%S)_summary.json \
		load.js

# Run stress test
stress: check
	@echo "Running stress test..."
	@mkdir -p results
	@k6 run \
		--out json=results/stress_$(shell date +%Y%m%d_%H%M%S).json \
		--summary-export=results/stress_$(shell date +%Y%m%d_%H%M%S)_summary.json \
		stress.js

# Run spike test
spike: check
	@echo "Running spike test..."
	@mkdir -p results
	@k6 run \
		--out json=results/spike_$(shell date +%Y%m%d_%H%M%S).json \
		--summary-export=results/spike_$(shell date +%Y%m%d_%H%M%S)_summary.json \
		spike.js

# Run all tests
all: check
	@echo "Running all load tests..."
	@bash run-all-tests.sh

# List all result files
results:
	@echo "Test results:"
	@ls -lh results/ 2>/dev/null || echo "No results found"

# Analyze latest test results
analyze:
	@echo "Analyzing latest test results..."
	@LATEST=$$(ls -t results/*_summary.json 2>/dev/null | head -1); \
	if [ -n "$$LATEST" ]; then \
		node analyze-results.js "$$LATEST"; \
	else \
		echo "No summary files found. Run a test first."; \
	fi

# Clean result files
clean:
	@echo "Cleaning result files..."
	@rm -rf results/*.json
	@echo "✓ Results cleaned"

# Quick test (smoke only, no output files)
quick: check
	@echo "Running quick smoke test..."
	@k6 run smoke.js
