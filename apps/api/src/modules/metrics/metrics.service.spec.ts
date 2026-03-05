import { Test, TestingModule } from "@nestjs/testing";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("recordRequest", () => {
    it("should increment request count", () => {
      service.recordRequest("GET", "/api/v1/health", 200, 15);
      service.recordRequest("GET", "/api/v1/health", 200, 20);

      return service.getMetrics().then((metrics) => {
        expect(metrics).toContain('http_requests_total{method="GET"');
        expect(metrics).toContain("} 2");
      });
    });
  });

  describe("getMetrics", () => {
    it("should return Prometheus-format metrics", async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toContain("process_uptime_seconds");
      expect(metrics).toContain("process_heap_bytes");
      expect(metrics).toContain("# TYPE process_uptime_seconds gauge");
    });

    it("should include HTTP duration percentiles after recording", async () => {
      for (let i = 0; i < 10; i++) {
        service.recordRequest("POST", "/api/v1/orders", 201, 50 + i * 10);
      }

      const metrics = await service.getMetrics();
      expect(metrics).toContain('quantile="0.5"');
      expect(metrics).toContain('quantile="0.95"');
      expect(metrics).toContain('quantile="0.99"');
    });
  });
});
