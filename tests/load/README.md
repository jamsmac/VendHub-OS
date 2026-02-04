# VendHub OS — Load Testing with k6

Comprehensive load testing suite for VendHub OS API endpoints using [k6](https://k6.io/).

## Prerequisites

### Install k6

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows (Chocolatey):**
```powershell
choco install k6
```

**Or download binary from:** https://k6.io/docs/getting-started/installation/

### Verify Installation

```bash
k6 version
```

## Test Files

| Test | Duration | VUs | Purpose |
|------|----------|-----|---------|
| `smoke.js` | 30s | 2 | Quick validation of critical endpoints |
| `load.js` | 8min | 50 | Simulate typical business day traffic |
| `stress.js` | 15min | 10→200 | Find system breaking points |
| `spike.js` | 5min | 10→100→10 | Test recovery from sudden traffic spikes |

## Configuration

### Environment Variables

Create a `.env.load-test` file or set environment variables:

```bash
# API endpoint
export BASE_URL=http://localhost:4000

# Test credentials
export TEST_EMAIL=admin@vendhub.com
export TEST_PASSWORD=admin123

# Optional: Organization ID for multi-tenant testing
export TEST_ORG_ID=00000000-0000-0000-0000-000000000001
```

### Edit config.js

Modify `tests/load/config.js` for your environment:

```javascript
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
export const TEST_USER = {
  email: __ENV.TEST_EMAIL || 'admin@vendhub.com',
  password: __ENV.TEST_PASSWORD || 'admin123',
};
```

## Running Tests

### 1. Start VendHub OS API

Ensure the API is running:

```bash
# Development
pnpm --filter api dev

# Or with Docker
pnpm docker:up
```

### 2. Run Individual Tests

**Smoke Test (Quick validation):**
```bash
k6 run tests/load/smoke.js
```

**Load Test (Typical traffic):**
```bash
k6 run tests/load/load.js
```

**Stress Test (Find breaking points):**
```bash
k6 run tests/load/stress.js
```

**Spike Test (Sudden traffic spikes):**
```bash
k6 run tests/load/spike.js
```

### 3. Run with Custom Environment

```bash
BASE_URL=https://staging.vendhub.uz \
TEST_EMAIL=test@vendhub.com \
TEST_PASSWORD=secure123 \
k6 run tests/load/load.js
```

### 4. Run All Tests

```bash
for test in smoke load stress spike; do
  echo "Running $test test..."
  k6 run tests/load/$test.js
  sleep 10
done
```

## Output Formats

### Console Output (Default)

```bash
k6 run tests/load/smoke.js
```

### JSON Output

```bash
k6 run --out json=results.json tests/load/load.js
```

### CSV Output

```bash
k6 run --out csv=results.csv tests/load/stress.js
```

### InfluxDB + Grafana (Advanced)

```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/load/load.js
```

### Cloud Output (k6 Cloud)

```bash
k6 cloud tests/load/load.js
```

## Interpreting Results

### Key Metrics

| Metric | Description | Good Target |
|--------|-------------|-------------|
| `http_req_duration` | Response time | p95 < 500ms, p99 < 1500ms |
| `http_req_failed` | Failed requests rate | < 1% |
| `http_reqs` | Requests per second | > 100 RPS |
| `vus` | Virtual users (concurrent) | Varies by test |
| `iteration_duration` | Full iteration time | Depends on scenario |

### Example Output

```
     ✓ health check status is 200
     ✓ machines response has items
     ✓ dashboard returns stats

     checks.........................: 100.00% ✓ 450      ✗ 0
     data_received..................: 1.2 MB  40 kB/s
     data_sent......................: 245 kB  8.2 kB/s
     http_req_blocked...............: avg=1.2ms    min=1µs     med=3µs     max=150ms   p(90)=5µs     p(95)=7µs
     http_req_connecting............: avg=890µs    min=0s      med=0s      max=120ms   p(90)=0s      p(95)=0s
     http_req_duration..............: avg=120.5ms  min=12ms    med=95ms    max=450ms   p(90)=200ms   p(95)=250ms
       { expected_response:true }...: avg=120.5ms  min=12ms    med=95ms    max=450ms   p(90)=200ms   p(95)=250ms
     ✓ http_req_failed................: 0.00%   ✓ 0        ✗ 150
     http_req_receiving.............: avg=150µs    min=20µs    med=100µs   max=2ms     p(90)=300µs   p(95)=500µs
     http_req_sending...............: avg=50µs     min=10µs    med=40µs    max=500µs   p(90)=100µs   p(95)=150µs
     http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s      p(90)=0s      p(95)=0s
     http_req_waiting...............: avg=120.3ms  min=12ms    med=94.9ms  max=449ms   p(90)=199ms   p(95)=249ms
     ✓ http_reqs......................: 150     5/s
     iteration_duration.............: avg=6s       min=5.5s    med=6s      max=7s      p(90)=6.5s    p(95)=6.8s
     iterations.....................: 25      0.833333/s
     vus............................: 2       min=2      max=2
     vus_max........................: 2       min=2      max=2
```

### Thresholds

Tests define thresholds that must pass:

```javascript
thresholds: {
  http_req_duration: ['p(95)<500', 'p(99)<1500'],  // 95% under 500ms, 99% under 1500ms
  http_req_failed: ['rate<0.01'],                   // Less than 1% errors
  http_reqs: ['rate>100'],                          // At least 100 RPS
}
```

**✓ Green check** = Threshold passed
**✗ Red X** = Threshold failed

## Test Scenarios

### Smoke Test (`smoke.js`)

**Purpose:** Quick validation that API is functional.

**Checks:**
- Health endpoint responds
- Authentication works
- Core endpoints (machines, products, tasks) return data
- Dashboard is accessible

**When to run:** After every deployment, before other tests.

### Load Test (`load.js`)

**Purpose:** Simulate typical business day traffic.

**Scenarios:**
- 40% read operations (list endpoints)
- 20% dashboard/reports
- 15% task status updates
- 10% inventory checks
- 10% login/auth refresh
- 5% create operations

**When to run:** Before production releases, weekly on staging.

### Stress Test (`stress.js`)

**Purpose:** Find breaking points and maximum capacity.

**Load profile:**
- Ramp: 10 → 50 → 100 → 150 → 200 VUs
- Hold: 3 minutes at 200 VUs
- Ramp down: 200 → 0 VUs

**When to run:** Capacity planning, infrastructure changes.

### Spike Test (`spike.js`)

**Purpose:** Test recovery from sudden traffic spikes.

**Load profile:**
- Baseline: 10 VUs (1 min)
- Spike: Jump to 100 VUs (10 sec)
- Hold: 100 VUs (2 min)
- Recovery: Drop to 10 VUs (10 sec)
- Recovery period: 10 VUs (1 min)

**When to run:** Before major events, after caching changes.

## Custom Metrics

Tests track custom metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `read_operations` | Counter | Number of read API calls |
| `write_operations` | Counter | Number of write API calls |
| `dashboard_views` | Counter | Dashboard page views |
| `auth_operations` | Counter | Authentication attempts |
| `errors` | Rate | Custom error rate |
| `timeouts` | Rate | Request timeout rate |
| `spike_errors` | Rate | Errors during spike |
| `recovery_time` | Trend | Time to recover from spike |

View in summary output:

```
     auth_operations................: 125     4.166667/s
     dashboard_views................: 250     8.333333/s
     read_operations................: 1500    50/s
     write_operations...............: 75      2.5/s
```

## Troubleshooting

### Connection Refused

```
WARN[0001] Request Failed error="Get \"http://localhost:4000/health\": dial tcp [::1]:4000: connect: connection refused"
```

**Solution:** Ensure API is running on `http://localhost:4000`.

### Authentication Failed

```
ERROR Login failed: 401 {"message":"Invalid credentials"}
```

**Solution:** Verify `TEST_EMAIL` and `TEST_PASSWORD` in config or environment variables.

### High Error Rate

If tests show high `http_req_failed` rate:

1. Check API logs for errors
2. Verify database connection
3. Check Redis availability
4. Review API resource limits (CPU, memory)
5. Check for rate limiting (Throttler guards)

### Timeouts

If requests timeout:

1. Increase `http_req_duration` thresholds
2. Check database query performance
3. Review slow endpoints in API logs
4. Consider adding caching

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Run daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start API
        run: docker-compose up -d api

      - name: Wait for API
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done'

      - name: Run smoke test
        run: k6 run tests/load/smoke.js

      - name: Run load test
        run: k6 run tests/load/load.js --out json=results.json

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: results.json
```

## Best Practices

1. **Start with smoke tests** before running load/stress tests
2. **Run on staging** environment first
3. **Monitor infrastructure** (CPU, memory, DB connections) during tests
4. **Gradually increase load** - don't jump straight to stress testing
5. **Run during off-peak hours** for production-like environments
6. **Document results** and track performance over time
7. **Set realistic thresholds** based on business requirements
8. **Test regularly** - performance degrades over time

## Advanced Usage

### Custom Scenarios

Create custom test scenarios in `tests/load/custom.js`:

```javascript
import { login, authGet } from './helpers.js';

export const options = {
  scenarios: {
    admin_users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      exec: 'adminScenario',
    },
    operators: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      exec: 'operatorScenario',
    },
  },
};

export function adminScenario() {
  const token = login();
  authGet('/dashboard/stats', token);
  authGet('/reports/sales', token);
}

export function operatorScenario() {
  const token = login();
  authGet('/tasks?assignedToMe=true', token);
  authGet('/machines?page=1&limit=20', token);
}
```

### Performance Budgets

Set performance budgets in CI:

```bash
k6 run \
  --out json=results.json \
  --summary-export=summary.json \
  tests/load/load.js

# Check against budget
BUDGET_P95=500  # 500ms budget for p95
ACTUAL_P95=$(jq '.metrics.http_req_duration.values.p(95)' summary.json)

if (( $(echo "$ACTUAL_P95 > $BUDGET_P95" | bc -l) )); then
  echo "Performance budget exceeded: ${ACTUAL_P95}ms > ${BUDGET_P95}ms"
  exit 1
fi
```

## Resources

- **k6 Documentation:** https://k6.io/docs/
- **Best Practices:** https://k6.io/docs/testing-guides/test-types/
- **k6 Extensions:** https://k6.io/docs/extensions/
- **Grafana k6 Cloud:** https://k6.io/cloud/

## Support

For issues or questions:
- Check k6 documentation: https://k6.io/docs/
- VendHub OS issues: Open GitHub issue
- k6 community: https://community.k6.io/
