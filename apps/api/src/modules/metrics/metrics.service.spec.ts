import { Test, TestingModule } from "@nestjs/testing";
import * as promClient from "prom-client";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(async () => {
    // Clear global registry to avoid "metric already registered" between tests
    promClient.register.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    service.onModuleInit();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("recordRequest", () => {
    it("should increment request count", async () => {
      service.recordRequest("GET", "/api/v1/health", 200, 15);
      service.recordRequest("GET", "/api/v1/health", 200, 20);

      const metrics = await service.getMetrics();
      expect(metrics).toContain("http_requests_total");
      expect(metrics).toContain('method="GET"');
    });

    it("should track 5xx as errors", async () => {
      service.recordRequest("POST", "/api/v1/orders", 500, 100);

      const metrics = await service.getMetrics();
      expect(metrics).toContain("http_requests_errors_total");
    });
  });

  describe("getMetrics", () => {
    it("should return Prometheus-format metrics with default Node.js metrics", async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toContain("process_cpu_seconds_total");
      expect(metrics).toContain("nodejs_heap_size_total_bytes");
    });

    it("should include HTTP duration histogram buckets after recording", async () => {
      for (let i = 0; i < 10; i++) {
        service.recordRequest("POST", "/api/v1/orders", 201, 50 + i * 10);
      }

      const metrics = await service.getMetrics();
      expect(metrics).toContain("http_request_duration_seconds_bucket");
      expect(metrics).toContain("http_request_duration_seconds_sum");
      expect(metrics).toContain("http_request_duration_seconds_count");
    });
  });

  describe("business metrics", () => {
    it("should expose order and payment counters", async () => {
      service.ordersTotal.inc({ organization_id: "org-1" });
      service.paymentsTotal.inc({ method: "payme", result: "success" });

      const metrics = await service.getMetrics();
      expect(metrics).toContain("orders_total");
      expect(metrics).toContain("payments_total");
    });

    it("should expose machine gauge", async () => {
      service.machinesOnline.set({ organization_id: "org-1" }, 42);

      const metrics = await service.getMetrics();
      expect(metrics).toContain("machines_online");
      expect(metrics).toContain("42");
    });
  });

  describe("getContentType", () => {
    it("should return Prometheus content type", () => {
      expect(service.getContentType()).toContain("text/plain");
    });
  });
});
