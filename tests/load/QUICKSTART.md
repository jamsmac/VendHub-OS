# Quick Start Guide - Load Testing

Get up and running with VendHub OS load tests in 5 minutes.

## 1. Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

## 2. Start API

From repo root:
```bash
cd vendhub-unified
pnpm --filter api dev
```

Or with Docker:
```bash
pnpm docker:up
```

## 3. Run Tests

```bash
cd tests/load

# Quick smoke test (30 seconds)
k6 run smoke.js

# Full load test (8 minutes)
k6 run load.js

# Stress test (15 minutes)
k6 run stress.js

# Spike test (5 minutes)
k6 run spike.js

# Or run all tests
bash run-all-tests.sh
```

## 4. View Results

Results appear in terminal. For detailed analysis:

```bash
# Run with JSON output
k6 run --out json=results.json --summary-export=summary.json load.js

# Analyze results
node analyze-results.js summary.json
```

## 5. Customize

Edit `config.js` to change:
- API URL (`BASE_URL`)
- Test credentials (`TEST_USER`)
- Thresholds (performance targets)

## Common Issues

**Connection refused:**
- Ensure API is running: `curl http://localhost:4000/health`

**Authentication failed:**
- Check credentials in `config.js`
- Verify test user exists in database

**High error rate:**
- Check API logs
- Verify database connection
- Reduce load (lower VUs)

## Next Steps

- Read full [README.md](README.md) for detailed docs
- Customize tests for your endpoints
- Set up CI/CD integration
- Monitor with Grafana dashboard

## Quick Reference

| Test | Duration | VUs | Purpose |
|------|----------|-----|---------|
| smoke | 30s | 2 | Quick validation |
| load | 8min | 50 | Normal traffic |
| stress | 15min | 200 | Find limits |
| spike | 5min | 100 | Handle spikes |
