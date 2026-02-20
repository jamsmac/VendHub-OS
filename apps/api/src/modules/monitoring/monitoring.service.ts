/**
 * Monitoring Service
 *
 * Provides application metrics in Prometheus text format and health check JSON.
 * Implements counters, histograms, and gauges for HTTP requests, database queries,
 * queue jobs, WebSocket connections, and machine telemetry events.
 *
 * Ready for prom-client integration; currently uses plain objects for metrics storage.
 */

import { Injectable, Logger } from '@nestjs/common';

// ============================================================================
// METRIC TYPES
// ============================================================================

interface CounterMetric {
  type: 'counter';
  help: string;
  values: Map<string, number>;
}

interface HistogramMetric {
  type: 'histogram';
  help: string;
  buckets: number[];
  values: Map<string, { sum: number; count: number; buckets: Map<number, number> }>;
}

interface GaugeMetric {
  type: 'gauge';
  help: string;
  value: number;
}

// ============================================================================
// MONITORING SERVICE
// ============================================================================

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly startTime = Date.now();

  // Counters
  private readonly httpRequestsTotal: CounterMetric = {
    type: 'counter',
    help: 'Total number of HTTP requests',
    values: new Map(),
  };

  private readonly queueJobsTotal: CounterMetric = {
    type: 'counter',
    help: 'Total number of queue jobs processed',
    values: new Map(),
  };

  private readonly queueJobsFailed: CounterMetric = {
    type: 'counter',
    help: 'Total number of failed queue jobs',
    values: new Map(),
  };

  private readonly machineTelemetryEvents: CounterMetric = {
    type: 'counter',
    help: 'Total number of machine telemetry events',
    values: new Map(),
  };

  // Histograms
  private readonly httpRequestDuration: HistogramMetric = {
    type: 'histogram',
    help: 'HTTP request duration in seconds',
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    values: new Map(),
  };

  private readonly dbQueryDuration: HistogramMetric = {
    type: 'histogram',
    help: 'Database query duration in seconds',
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5],
    values: new Map(),
  };

  // Gauges
  private activeConnections: GaugeMetric = {
    type: 'gauge',
    help: 'Number of active connections',
    value: 0,
  };

  // ============================================================================
  // METRIC RECORDING METHODS
  // ============================================================================

  /**
   * Increment HTTP request counter
   */
  incrementHttpRequests(method: string, route: string, statusCode: number): void {
    const key = `method="${method}",route="${route}",status_code="${statusCode}"`;
    const current = this.httpRequestsTotal.values.get(key) || 0;
    this.httpRequestsTotal.values.set(key, current + 1);
  }

  /**
   * Observe HTTP request duration
   */
  observeHttpDuration(method: string, route: string, duration: number): void {
    const key = `method="${method}",route="${route}"`;
    const existing = this.httpRequestDuration.values.get(key) || {
      sum: 0,
      count: 0,
      buckets: new Map(this.httpRequestDuration.buckets.map(b => [b, 0])),
    };

    existing.sum += duration;
    existing.count += 1;

    for (const bucket of this.httpRequestDuration.buckets) {
      if (duration <= bucket) {
        existing.buckets.set(bucket, (existing.buckets.get(bucket) || 0) + 1);
      }
    }

    this.httpRequestDuration.values.set(key, existing);
  }

  /**
   * Set the number of active connections
   */
  setActiveConnections(count: number): void {
    this.activeConnections.value = count;
  }

  /**
   * Observe database query duration
   */
  observeDbQueryDuration(queryType: string, duration: number): void {
    const key = `query_type="${queryType}"`;
    const existing = this.dbQueryDuration.values.get(key) || {
      sum: 0,
      count: 0,
      buckets: new Map(this.dbQueryDuration.buckets.map(b => [b, 0])),
    };

    existing.sum += duration;
    existing.count += 1;

    for (const bucket of this.dbQueryDuration.buckets) {
      if (duration <= bucket) {
        existing.buckets.set(bucket, (existing.buckets.get(bucket) || 0) + 1);
      }
    }

    this.dbQueryDuration.values.set(key, existing);
  }

  /**
   * Increment queue jobs counter
   */
  incrementQueueJobs(queueName: string, status: string): void {
    const key = `queue_name="${queueName}",status="${status}"`;
    const current = this.queueJobsTotal.values.get(key) || 0;
    this.queueJobsTotal.values.set(key, current + 1);

    if (status === 'failed') {
      const failedKey = `queue_name="${queueName}"`;
      const failedCurrent = this.queueJobsFailed.values.get(failedKey) || 0;
      this.queueJobsFailed.values.set(failedKey, failedCurrent + 1);
    }
  }

  /**
   * Increment telemetry events counter
   */
  incrementTelemetryEvents(eventType: string, machineId: string): void {
    const key = `event_type="${eventType}",machine_id="${machineId}"`;
    const current = this.machineTelemetryEvents.values.get(key) || 0;
    this.machineTelemetryEvents.values.set(key, current + 1);
  }

  // ============================================================================
  // METRIC OUTPUT
  // ============================================================================

  /**
   * Get metrics in Prometheus text exposition format
   */
  getMetrics(): string {
    const lines: string[] = [];

    // http_requests_total
    lines.push(`# HELP http_requests_total ${this.httpRequestsTotal.help}`);
    lines.push('# TYPE http_requests_total counter');
    for (const [labels, value] of this.httpRequestsTotal.values) {
      lines.push(`http_requests_total{${labels}} ${value}`);
    }

    // http_request_duration_seconds
    lines.push(`# HELP http_request_duration_seconds ${this.httpRequestDuration.help}`);
    lines.push('# TYPE http_request_duration_seconds histogram');
    for (const [labels, data] of this.httpRequestDuration.values) {
      for (const [bucket, count] of data.buckets) {
        lines.push(`http_request_duration_seconds_bucket{${labels},le="${bucket}"} ${count}`);
      }
      lines.push(`http_request_duration_seconds_bucket{${labels},le="+Inf"} ${data.count}`);
      lines.push(`http_request_duration_seconds_sum{${labels}} ${data.sum}`);
      lines.push(`http_request_duration_seconds_count{${labels}} ${data.count}`);
    }

    // active_connections
    lines.push(`# HELP active_connections ${this.activeConnections.help}`);
    lines.push('# TYPE active_connections gauge');
    lines.push(`active_connections ${this.activeConnections.value}`);

    // database_query_duration_seconds
    lines.push(`# HELP database_query_duration_seconds ${this.dbQueryDuration.help}`);
    lines.push('# TYPE database_query_duration_seconds histogram');
    for (const [labels, data] of this.dbQueryDuration.values) {
      for (const [bucket, count] of data.buckets) {
        lines.push(`database_query_duration_seconds_bucket{${labels},le="${bucket}"} ${count}`);
      }
      lines.push(`database_query_duration_seconds_bucket{${labels},le="+Inf"} ${data.count}`);
      lines.push(`database_query_duration_seconds_sum{${labels}} ${data.sum}`);
      lines.push(`database_query_duration_seconds_count{${labels}} ${data.count}`);
    }

    // queue_jobs_total
    lines.push(`# HELP queue_jobs_total ${this.queueJobsTotal.help}`);
    lines.push('# TYPE queue_jobs_total counter');
    for (const [labels, value] of this.queueJobsTotal.values) {
      lines.push(`queue_jobs_total{${labels}} ${value}`);
    }

    // queue_jobs_failed
    lines.push(`# HELP queue_jobs_failed ${this.queueJobsFailed.help}`);
    lines.push('# TYPE queue_jobs_failed counter');
    for (const [labels, value] of this.queueJobsFailed.values) {
      lines.push(`queue_jobs_failed{${labels}} ${value}`);
    }

    // machine_telemetry_events
    lines.push(`# HELP machine_telemetry_events ${this.machineTelemetryEvents.help}`);
    lines.push('# TYPE machine_telemetry_events counter');
    for (const [labels, value] of this.machineTelemetryEvents.values) {
      lines.push(`machine_telemetry_events{${labels}} ${value}`);
    }

    // Process uptime
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${uptimeSeconds.toFixed(2)}`);

    // Node.js process metrics
    const memUsage = process.memoryUsage();
    lines.push('# HELP nodejs_heap_used_bytes Node.js heap used bytes');
    lines.push('# TYPE nodejs_heap_used_bytes gauge');
    lines.push(`nodejs_heap_used_bytes ${memUsage.heapUsed}`);

    lines.push('# HELP nodejs_heap_total_bytes Node.js heap total bytes');
    lines.push('# TYPE nodejs_heap_total_bytes gauge');
    lines.push(`nodejs_heap_total_bytes ${memUsage.heapTotal}`);

    lines.push('# HELP nodejs_rss_bytes Node.js resident set size bytes');
    lines.push('# TYPE nodejs_rss_bytes gauge');
    lines.push(`nodejs_rss_bytes ${memUsage.rss}`);

    lines.push('# HELP nodejs_external_bytes Node.js external memory bytes');
    lines.push('# TYPE nodejs_external_bytes gauge');
    lines.push(`nodejs_external_bytes ${memUsage.external}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Get health check metrics as JSON
   */
  getHealthMetrics(): Record<string, any> {
    const memUsage = process.memoryUsage();
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;

    // Calculate total HTTP requests
    let totalRequests = 0;
    for (const value of this.httpRequestsTotal.values.values()) {
      totalRequests += value;
    }

    // Calculate average request duration
    let totalDuration = 0;
    let totalDurationCount = 0;
    for (const data of this.httpRequestDuration.values.values()) {
      totalDuration += data.sum;
      totalDurationCount += data.count;
    }
    const avgDuration = totalDurationCount > 0
      ? Math.round((totalDuration / totalDurationCount) * 1000) / 1000
      : 0;

    // Calculate total queue jobs
    let totalQueueJobs = 0;
    for (const value of this.queueJobsTotal.values.values()) {
      totalQueueJobs += value;
    }

    let totalFailedJobs = 0;
    for (const value of this.queueJobsFailed.values.values()) {
      totalFailedJobs += value;
    }

    // Calculate total telemetry events
    let totalTelemetry = 0;
    for (const value of this.machineTelemetryEvents.values.values()) {
      totalTelemetry += value;
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        formatted: this.formatUptime(uptimeSeconds),
      },
      memory: {
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        rss: this.formatBytes(memUsage.rss),
        external: this.formatBytes(memUsage.external),
        heapUsedRaw: memUsage.heapUsed,
        heapTotalRaw: memUsage.heapTotal,
      },
      http: {
        totalRequests,
        avgDurationSeconds: avgDuration,
        activeConnections: this.activeConnections.value,
      },
      queue: {
        totalJobs: totalQueueJobs,
        failedJobs: totalFailedJobs,
      },
      telemetry: {
        totalEvents: totalTelemetry,
      },
      node: {
        version: process.version,
        platform: process.platform,
        pid: process.pid,
      },
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
