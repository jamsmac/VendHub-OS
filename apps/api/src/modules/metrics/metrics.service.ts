import { Injectable, OnModuleInit } from "@nestjs/common";
import * as client from "prom-client";

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register = new client.Registry();

  // ── HTTP metrics ──
  readonly httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "path", "status"] as const,
    registers: [this.register],
  });

  readonly httpRequestDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "path", "status"] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.register],
  });

  readonly httpRequestErrors = new client.Counter({
    name: "http_requests_errors_total",
    help: "Total number of HTTP 5xx errors",
    labelNames: ["method", "path"] as const,
    registers: [this.register],
  });

  // ── Database metrics ──
  readonly dbQueryDuration = new client.Histogram({
    name: "db_query_duration_seconds",
    help: "Database query duration in seconds",
    labelNames: ["operation"] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.register],
  });

  // ── Auth metrics ──
  readonly authLoginTotal = new client.Counter({
    name: "auth_login_total",
    help: "Total login attempts",
    labelNames: ["result"] as const,
    registers: [this.register],
  });

  // ── BullMQ metrics ──
  readonly bullmqJobsCompleted = new client.Counter({
    name: "bullmq_jobs_completed_total",
    help: "Total completed BullMQ jobs",
    labelNames: ["queue"] as const,
    registers: [this.register],
  });

  readonly bullmqJobsFailed = new client.Counter({
    name: "bullmq_jobs_failed_total",
    help: "Total failed BullMQ jobs",
    labelNames: ["queue"] as const,
    registers: [this.register],
  });

  // ── Business metrics ──
  readonly ordersTotal = new client.Counter({
    name: "orders_total",
    help: "Total number of orders",
    labelNames: ["organization_id"] as const,
    registers: [this.register],
  });

  readonly ordersRevenueUzs = new client.Counter({
    name: "orders_revenue_uzs",
    help: "Total revenue in UZS",
    labelNames: ["organization_id"] as const,
    registers: [this.register],
  });

  readonly paymentsTotal = new client.Counter({
    name: "payments_total",
    help: "Total payment attempts",
    labelNames: ["method", "result"] as const,
    registers: [this.register],
  });

  readonly machinesOnline = new client.Gauge({
    name: "machines_online",
    help: "Number of machines currently online",
    labelNames: ["organization_id"] as const,
    registers: [this.register],
  });

  readonly productsDispensed = new client.Counter({
    name: "products_dispensed_total",
    help: "Total products dispensed",
    labelNames: ["organization_id"] as const,
    registers: [this.register],
  });

  readonly productsLowStock = new client.Gauge({
    name: "products_low_stock",
    help: "Number of machines with low stock",
    labelNames: ["organization_id"] as const,
    registers: [this.register],
  });

  onModuleInit() {
    // Collect default Node.js metrics (GC, event loop lag, memory, handles)
    client.collectDefaultMetrics({ register: this.register });
  }

  recordRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ): void {
    const status = String(statusCode);
    this.httpRequestsTotal.inc({ method, path, status });
    this.httpRequestDuration.observe({ method, path, status }, duration / 1000);

    if (statusCode >= 500) {
      this.httpRequestErrors.inc({ method, path });
    }
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
