# VendHub OS Load Testing Suite - File Index

Complete load testing infrastructure for VendHub OS API using k6.

## 📁 Directory Structure

```
tests/load/
├── config.js                     # Test configuration and constants
├── helpers.js                    # Reusable helper functions
├── smoke.js                      # Smoke test (30s, 2 VUs)
├── load.js                       # Load test (8min, 50 VUs)
├── stress.js                     # Stress test (15min, 200 VUs)
├── spike.js                      # Spike test (5min, 100 VUs)
├── analyze-results.js            # Results analysis script
├── run-all-tests.sh              # Bash script to run all tests
├── package.json                  # NPM scripts and metadata
├── Makefile                      # Make targets for convenience
├── .env.load-test.example        # Environment variables template
├── .gitignore                    # Git ignore patterns
├── README.md                     # Complete documentation
├── QUICKSTART.md                 # Quick start guide
├── github-actions-example.yml    # CI/CD workflow example
├── INDEX.md                      # This file
└── results/                      # Test results (auto-generated)
```

## 📄 File Descriptions

### Core Test Files

#### `config.js`
Central configuration for all load tests.

**Exports:**
- `BASE_URL` - API endpoint (default: http://localhost:4000)
- `API_PREFIX` - API version prefix (/api/v1)
- `TEST_USER` - Test credentials (email, password)
- `THRESHOLDS` - Performance thresholds (p95, p99, error rate)
- `TEST_DATA` - Common test data (org ID, pagination, statuses)

**Usage:**
```javascript
import { BASE_URL, TEST_USER, THRESHOLDS } from './config.js';
```

#### `helpers.js`
Reusable utility functions for all tests.

**Functions:**
- `login()` - Authenticate and return JWT token
- `authHeaders(token)` - Generate auth headers
- `authGet(url, token, name)` - Authenticated GET request with checks
- `authPost(url, body, token, name)` - Authenticated POST request
- `authPatch(url, body, token, name)` - Authenticated PATCH request
- `randomSleep(min, max)` - Random sleep to simulate user behavior
- `randomItem(array)` - Get random array element
- `parseResponse(res)` - Parse JSON response safely
- `extractData(res)` - Extract data from paginated response

**Usage:**
```javascript
import { login, authGet, randomSleep } from './helpers.js';

const token = login();
authGet('/machines?page=1&limit=20', token);
randomSleep(1, 3);
```

### Test Scripts

#### `smoke.js` - Smoke Test
**Purpose:** Quick validation of critical endpoints
**Duration:** 30 seconds
**Load:** 2 VUs
**Endpoints tested:**
- Health check
- Authentication
- Machines API
- Products API
- Tasks API
- Dashboard API
- Inventory API

**When to run:** After every deployment, before other tests

#### `load.js` - Load Test
**Purpose:** Simulate typical business day traffic
**Duration:** 8 minutes (2min ramp up, 5min sustain, 1min ramp down)
**Load:** 50 VUs
**Scenarios:**
- 40% read operations (list machines, products, tasks)
- 20% dashboard/reports
- 15% task status updates
- 10% inventory checks
- 10% login/auth refresh
- 5% create operations

**Custom metrics:**
- `read_operations` - Counter
- `write_operations` - Counter
- `dashboard_views` - Counter
- `auth_operations` - Counter

**When to run:** Before releases, weekly on staging

#### `stress.js` - Stress Test
**Purpose:** Find system breaking points
**Duration:** 15 minutes
**Load:** Ramps from 10 → 200 VUs
**Tests:**
- Heavy read load (machines, products, tasks)
- Concurrent task updates
- Dashboard under load
- Multiple simultaneous logins
- Complex database queries

**Custom metrics:**
- `errorRate` - Rate of errors
- `timeoutRate` - Rate of timeouts
- `successfulRequests` - Counter

**When to run:** Capacity planning, infrastructure changes

#### `spike.js` - Spike Test
**Purpose:** Test recovery from sudden traffic spikes
**Duration:** 5 minutes
**Load:** 10 → 100 → 10 VUs (sudden jumps)
**Simulates:** Morning operator rush (everyone logs in at once)

**Custom metrics:**
- `spikeErrors` - Rate of errors during spike
- `recoveryTime` - Trend of recovery duration
- `loginAttempts` - Counter

**When to run:** Before major events, after caching changes

### Utility Scripts

#### `analyze-results.js`
Node.js script to analyze k6 JSON summary output.

**Features:**
- Formatted test overview (duration, VUs, requests)
- Response time analysis (avg, min, max, percentiles)
- Success/failure rates with color coding
- Network metrics breakdown
- Custom metrics display
- Threshold validation
- Overall pass/fail status

**Usage:**
```bash
node analyze-results.js results/load_summary.json
```

#### `run-all-tests.sh`
Bash script to run all tests sequentially.

**Features:**
- Auto-loads `.env.load-test` if exists
- Checks k6 installation
- Verifies API is running
- Runs all tests with proper delays
- Saves results with timestamps
- Provides colored output

**Usage:**
```bash
bash run-all-tests.sh
```

### Configuration Files

#### `package.json`
NPM scripts for convenient test execution.

**Scripts:**
- `test:smoke` - Run smoke test
- `test:load` - Run load test
- `test:stress` - Run stress test
- `test:spike` - Run spike test
- `test:all` - Run all tests
- `test:*:json` - Run with JSON output

**Usage:**
```bash
npm run test:smoke
npm run test:load
```

#### `Makefile`
Make targets for convenient test execution.

**Targets:**
- `make help` - Show help
- `make install` - Install k6 (macOS)
- `make check` - Check if API is running
- `make smoke` - Run smoke test
- `make load` - Run load test
- `make stress` - Run stress test
- `make spike` - Run spike test
- `make all` - Run all tests
- `make results` - List result files
- `make analyze` - Analyze latest results
- `make clean` - Clean result files
- `make quick` - Quick smoke test (no output files)

**Usage:**
```bash
make smoke
make load
make all
```

#### `.env.load-test.example`
Template for environment variables.

**Variables:**
- `BASE_URL` - API endpoint
- `TEST_EMAIL` - Test user email
- `TEST_PASSWORD` - Test user password
- `TEST_ORG_ID` - Organization ID for multi-tenant testing
- `K6_CLOUD_TOKEN` - k6 Cloud token (optional)

**Setup:**
```bash
cp .env.load-test.example .env.load-test
# Edit .env.load-test with your values
```

#### `.gitignore`
Prevents committing sensitive/generated files.

**Ignored:**
- `*.json` - Test result files
- `*.csv` - CSV exports
- `*.log` - Log files
- `.env.load-test` - Environment with credentials
- `results/` - Results directory
- `summary/` - Summary directory

### Documentation

#### `README.md`
Complete documentation (200+ lines) covering:
- Prerequisites and installation
- Test files overview
- Configuration guide
- Running tests (all methods)
- Output formats
- Interpreting results
- Test scenarios explained
- Custom metrics
- Troubleshooting
- CI/CD integration
- Best practices
- Advanced usage
- Resources

#### `QUICKSTART.md`
Quick start guide (5-minute setup) covering:
- Install k6
- Start API
- Run tests
- View results
- Customize configuration
- Common issues
- Next steps

#### `github-actions-example.yml`
Complete GitHub Actions workflow for CI/CD.

**Features:**
- Runs on schedule (daily)
- Manual trigger with test selection
- Auto-run smoke test on PRs
- PostgreSQL + Redis services
- Build and start API
- Run selected tests
- Analyze results
- Upload artifacts
- Check performance thresholds
- Comment PR with results

**Usage:**
```bash
cp github-actions-example.yml ../../.github/workflows/load-test.yml
```

#### `INDEX.md`
This file - complete index of all files.

## 🚀 Quick Start

```bash
# 1. Install k6
make install

# 2. Start API
cd ../../
pnpm --filter api dev

# 3. Run tests
cd tests/load
make smoke        # Quick validation
make load         # Full load test
make all          # All tests
```

## 📊 Test Coverage

| Endpoint Category | Smoke | Load | Stress | Spike |
|-------------------|-------|------|--------|-------|
| Health Check      | ✓     | ✓    | ✓      | ✓     |
| Authentication    | ✓     | ✓    | ✓      | ✓     |
| Machines          | ✓     | ✓    | ✓      | ✓     |
| Products          | ✓     | ✓    | ✓      | ✓     |
| Tasks             | ✓     | ✓    | ✓      | ✓     |
| Dashboard         | ✓     | ✓    | ✓      | ✓     |
| Inventory         | ✓     | ✓    | ✓      | ✓     |
| Reports           | -     | ✓    | ✓      | -     |
| Statistics        | -     | ✓    | ✓      | -     |
| Warehouse         | -     | ✓    | -      | ✓     |

## 🎯 Performance Targets

| Metric | Target | Measured In |
|--------|--------|-------------|
| p(95) Response Time | < 500ms | All tests |
| p(99) Response Time | < 1500ms | All tests |
| Error Rate | < 1% | All tests |
| Throughput | > 100 RPS | Load test |
| Success Rate | > 99% | All tests |

## 📈 Custom Metrics

| Metric | Type | Tests | Description |
|--------|------|-------|-------------|
| read_operations | Counter | Load | Number of read API calls |
| write_operations | Counter | Load | Number of write API calls |
| dashboard_views | Counter | Load | Dashboard page views |
| auth_operations | Counter | Load | Authentication attempts |
| errors | Rate | Stress | Custom error rate |
| timeouts | Rate | Stress | Request timeout rate |
| spike_errors | Rate | Spike | Errors during spike |
| recovery_time | Trend | Spike | Time to recover |
| successful_requests | Counter | Stress | Successful requests |
| login_attempts | Counter | Spike | Login attempts |

## 🔧 Customization

### Add New Endpoint Test

Edit test file (e.g., `load.js`):

```javascript
group('New Feature', () => {
  authGet('/new-endpoint', token, 'test new feature');
  readOperations.add(1);
  randomSleep(1, 2);
});
```

### Add Custom Metric

```javascript
import { Counter } from 'k6/metrics';

const customMetric = new Counter('custom_metric_name');

// Later in test
customMetric.add(1);
```

### Adjust Thresholds

Edit `config.js`:

```javascript
export const THRESHOLDS = {
  http_req_duration: ['p(95)<300', 'p(99)<1000'], // Stricter
  http_req_failed: ['rate<0.005'], // 0.5% error rate
  http_reqs: ['rate>200'], // 200 RPS minimum
};
```

## 🐛 Troubleshooting

### Common Issues

1. **k6 not found**
   ```bash
   make install
   ```

2. **API not running**
   ```bash
   make check
   pnpm --filter api dev
   ```

3. **Authentication failed**
   - Check `config.js` credentials
   - Verify test user in database

4. **High error rate**
   - Check API logs
   - Reduce VUs in test options
   - Verify database/Redis connectivity

## 📚 Resources

- **k6 Docs:** https://k6.io/docs/
- **k6 Examples:** https://k6.io/docs/examples/
- **k6 Extensions:** https://k6.io/docs/extensions/
- **VendHub API:** http://localhost:4000/api/docs

## 🤝 Contributing

To add new tests:

1. Create test file in `tests/load/`
2. Import from `config.js` and `helpers.js`
3. Define `options` with stages and thresholds
4. Use `group()` to organize scenarios
5. Add checks with `check()`
6. Document in README.md
7. Add to `run-all-tests.sh`

## 📝 License

Part of VendHub OS - See root LICENSE file.
