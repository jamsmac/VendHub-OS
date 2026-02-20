#!/usr/bin/env node

/**
 * VendHub OS - Load Test Results Analyzer
 *
 * Analyzes k6 JSON output and generates human-readable reports
 *
 * Usage:
 *   node analyze-results.js results/load_20240101_120000.json
 *   node analyze-results.js results/load_20240101_120000_summary.json
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function formatRate(rate) {
  return `${(rate * 100).toFixed(2)}%`;
}

function analyzeSummary(summaryFile) {
  console.log(`${colors.bright}${colors.cyan}VendHub OS Load Test Analysis${colors.reset}`);
  console.log(`${colors.cyan}=${'='.repeat(60)}${colors.reset}\n`);

  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));

  if (!summary.metrics) {
    console.error(`${colors.red}Error: Invalid summary file format${colors.reset}`);
    process.exit(1);
  }

  const metrics = summary.metrics;

  // Test Overview
  console.log(`${colors.bright}Test Overview:${colors.reset}`);
  console.log(`  Test Type: ${summary.root_group?.name || 'Unknown'}`);
  console.log(
    `  Duration: ${formatDuration(
      (metrics.iteration_duration?.values?.max || 0) * 1000
    )}`
  );
  console.log(`  Virtual Users: ${metrics.vus?.values?.max || 0}`);
  console.log(`  Total Requests: ${metrics.http_reqs?.values?.count || 0}`);
  console.log(
    `  Requests/sec: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}`
  );
  console.log(
    `  Data Received: ${formatBytes(
      metrics.data_received?.values?.count || 0
    )}`
  );
  console.log(
    `  Data Sent: ${formatBytes(metrics.data_sent?.values?.count || 0)}`
  );
  console.log();

  // Response Times
  console.log(`${colors.bright}Response Times:${colors.reset}`);
  const duration = metrics.http_req_duration?.values;
  if (duration) {
    console.log(`  Average: ${formatDuration(duration.avg)}`);
    console.log(`  Minimum: ${formatDuration(duration.min)}`);
    console.log(`  Median: ${formatDuration(duration.med)}`);
    console.log(`  p(90): ${formatDuration(duration['p(90)'])}`);
    console.log(`  p(95): ${formatDuration(duration['p(95)'])}`);
    console.log(`  p(99): ${formatDuration(duration['p(99)'])}`);
    console.log(`  Maximum: ${formatDuration(duration.max)}`);
  }
  console.log();

  // Success Rate
  console.log(`${colors.bright}Success Rate:${colors.reset}`);
  const failedRate = metrics.http_req_failed?.values?.rate || 0;
  const successRate = 1 - failedRate;
  const statusColor = successRate >= 0.99 ? colors.green : successRate >= 0.95 ? colors.yellow : colors.red;

  console.log(`  Success Rate: ${statusColor}${formatRate(successRate)}${colors.reset}`);
  console.log(`  Failed Rate: ${failedRate > 0 ? colors.red : colors.green}${formatRate(failedRate)}${colors.reset}`);
  console.log(
    `  Total Checks: ${metrics.checks?.values?.passes || 0} passed, ${
      metrics.checks?.values?.fails || 0
    } failed`
  );
  console.log();

  // Network Metrics
  console.log(`${colors.bright}Network Metrics:${colors.reset}`);
  console.log(
    `  Connection Time: ${formatDuration(
      (metrics.http_req_connecting?.values?.avg || 0)
    )}`
  );
  console.log(
    `  TLS Handshake: ${formatDuration(
      (metrics.http_req_tls_handshaking?.values?.avg || 0)
    )}`
  );
  console.log(
    `  Waiting Time: ${formatDuration(
      (metrics.http_req_waiting?.values?.avg || 0)
    )}`
  );
  console.log(
    `  Receiving Time: ${formatDuration(
      (metrics.http_req_receiving?.values?.avg || 0)
    )}`
  );
  console.log();

  // Custom Metrics (if any)
  const customMetrics = Object.keys(metrics).filter(
    (key) =>
      !key.startsWith('http_') &&
      !key.startsWith('iteration') &&
      !key.startsWith('data_') &&
      !key.startsWith('vus') &&
      !key.startsWith('checks')
  );

  if (customMetrics.length > 0) {
    console.log(`${colors.bright}Custom Metrics:${colors.reset}`);
    customMetrics.forEach((metricName) => {
      const metric = metrics[metricName];
      if (metric?.type === 'counter') {
        console.log(
          `  ${metricName}: ${metric.values.count} (${metric.values.rate.toFixed(
            2
          )}/s)`
        );
      } else if (metric?.type === 'rate') {
        console.log(
          `  ${metricName}: ${formatRate(metric.values.rate)}`
        );
      } else if (metric?.type === 'trend') {
        console.log(
          `  ${metricName}: avg=${formatDuration(
            metric.values.avg
          )}, p95=${formatDuration(metric.values['p(95)'])}`
        );
      }
    });
    console.log();
  }

  // Thresholds
  if (summary.thresholds) {
    console.log(`${colors.bright}Thresholds:${colors.reset}`);
    Object.entries(summary.thresholds).forEach(([name, threshold]) => {
      const passed = threshold.ok;
      const statusColor = passed ? colors.green : colors.red;
      const statusSymbol = passed ? '✓' : '✗';
      console.log(`  ${statusColor}${statusSymbol} ${name}${colors.reset}`);
    });
    console.log();
  }

  // Overall Status
  const allPassed = summary.thresholds
    ? Object.values(summary.thresholds).every((t) => t.ok)
    : true;

  console.log(`${colors.cyan}=${'='.repeat(60)}${colors.reset}`);
  if (allPassed && successRate >= 0.99) {
    console.log(
      `${colors.green}${colors.bright}Overall Status: PASSED ✓${colors.reset}`
    );
  } else if (successRate >= 0.95) {
    console.log(
      `${colors.yellow}${colors.bright}Overall Status: WARNING ⚠${colors.reset}`
    );
  } else {
    console.log(
      `${colors.red}${colors.bright}Overall Status: FAILED ✗${colors.reset}`
    );
  }
  console.log(`${colors.cyan}=${'='.repeat(60)}${colors.reset}\n`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`${colors.red}Error: No file specified${colors.reset}`);
    console.log('\nUsage:');
    console.log('  node analyze-results.js <summary-file.json>');
    console.log('\nExample:');
    console.log('  node analyze-results.js results/load_20240101_120000_summary.json');
    process.exit(1);
  }

  const summaryFile = args[0];

  if (!fs.existsSync(summaryFile)) {
    console.error(
      `${colors.red}Error: File not found: ${summaryFile}${colors.reset}`
    );
    process.exit(1);
  }

  try {
    analyzeSummary(summaryFile);
  } catch (error) {
    console.error(
      `${colors.red}Error analyzing results: ${error.message}${colors.reset}`
    );
    process.exit(1);
  }
}

main();
