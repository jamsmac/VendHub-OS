import { Injectable } from "@nestjs/common";

@Injectable()
export class MetricsService {
  private httpRequestsTotal = new Map<string, number>();
  private httpRequestDuration = new Map<string, number[]>();
  private startTime = Date.now();

  recordRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ): void {
    const key = `${method}_${path}_${statusCode}`;
    this.httpRequestsTotal.set(key, (this.httpRequestsTotal.get(key) || 0) + 1);

    const durKey = `${method}_${path}`;
    const durations = this.httpRequestDuration.get(durKey) || [];
    durations.push(duration);
    if (durations.length > 1000) durations.shift();
    this.httpRequestDuration.set(durKey, durations);
  }

  async getMetrics(): Promise<string> {
    const lines: string[] = [];

    // Process uptime
    lines.push("# HELP process_uptime_seconds Process uptime in seconds");
    lines.push("# TYPE process_uptime_seconds gauge");
    lines.push(
      `process_uptime_seconds ${((Date.now() - this.startTime) / 1000).toFixed(0)}`,
    );

    // Memory
    const mem = process.memoryUsage();
    lines.push("# HELP process_heap_bytes Process heap size in bytes");
    lines.push("# TYPE process_heap_bytes gauge");
    lines.push(`process_heap_bytes{type="used"} ${mem.heapUsed}`);
    lines.push(`process_heap_bytes{type="total"} ${mem.heapTotal}`);
    lines.push(`process_heap_bytes{type="rss"} ${mem.rss}`);

    // HTTP requests
    lines.push("# HELP http_requests_total Total number of HTTP requests");
    lines.push("# TYPE http_requests_total counter");
    for (const [key, count] of this.httpRequestsTotal) {
      const [method, path, status] = key.split("_");
      lines.push(
        `http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`,
      );
    }

    // HTTP duration
    lines.push("# HELP http_request_duration_seconds HTTP request duration");
    lines.push("# TYPE http_request_duration_seconds summary");
    for (const [key, durations] of this.httpRequestDuration) {
      const [method, path] = key.split("_");
      const sorted = [...durations].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
      lines.push(
        `http_request_duration_seconds{method="${method}",path="${path}",quantile="0.5"} ${(p50 / 1000).toFixed(4)}`,
      );
      lines.push(
        `http_request_duration_seconds{method="${method}",path="${path}",quantile="0.95"} ${(p95 / 1000).toFixed(4)}`,
      );
      lines.push(
        `http_request_duration_seconds{method="${method}",path="${path}",quantile="0.99"} ${(p99 / 1000).toFixed(4)}`,
      );
    }

    return lines.join("\n") + "\n";
  }
}
