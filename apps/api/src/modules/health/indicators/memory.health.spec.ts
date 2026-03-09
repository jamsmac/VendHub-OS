import { HealthCheckError } from "@nestjs/terminus";
import { MemoryHealthIndicator } from "./memory.health";

const MOCK_MEMORY: NodeJS.MemoryUsage = {
  heapUsed: 100 * 1024 * 1024, // 100 MB
  heapTotal: 200 * 1024 * 1024, // 200 MB
  rss: 300 * 1024 * 1024, // 300 MB
  external: 10 * 1024 * 1024, // 10 MB
  arrayBuffers: 5 * 1024 * 1024, // 5 MB
};

describe("MemoryHealthIndicator", () => {
  let indicator: MemoryHealthIndicator;
  let memSpy: jest.SpyInstance;

  beforeEach(() => {
    indicator = new MemoryHealthIndicator();
    memSpy = jest.spyOn(process, "memoryUsage").mockReturnValue(MOCK_MEMORY);
  });

  afterEach(() => {
    memSpy.mockRestore();
  });

  // ==========================================================================
  // checkHeap
  // ==========================================================================

  describe("checkHeap", () => {
    it("should return healthy when heap is below threshold", () => {
      const result = indicator.checkHeap("memory_heap", 500 * 1024 * 1024);

      expect(result).toHaveProperty("memory_heap");
      expect(result.memory_heap.status).toBe("up");
    });

    it("should throw HealthCheckError when heap exceeds threshold", () => {
      expect(() => indicator.checkHeap("memory_heap", 1)).toThrow(
        HealthCheckError,
      );
    });

    it("should include usage details in result", () => {
      const result = indicator.checkHeap("memory_heap", 500 * 1024 * 1024);

      expect(result.memory_heap.heapUsed).toBe("100.00 MB");
      expect(result.memory_heap.heapTotal).toBe("200.00 MB");
      expect(result.memory_heap.heapLimit).toBe("500.00 MB");
      expect(result.memory_heap.usagePercent).toBe("50.00%");
    });
  });

  // ==========================================================================
  // checkRSS
  // ==========================================================================

  describe("checkRSS", () => {
    it("should return healthy when RSS is below threshold", () => {
      const result = indicator.checkRSS("memory_rss", 500 * 1024 * 1024);

      expect(result).toHaveProperty("memory_rss");
      expect(result.memory_rss.status).toBe("up");
    });

    it("should throw HealthCheckError when RSS exceeds threshold", () => {
      expect(() => indicator.checkRSS("memory_rss", 1)).toThrow(
        HealthCheckError,
      );
    });

    it("should include rss and external memory in details", () => {
      const result = indicator.checkRSS("memory_rss", 500 * 1024 * 1024);

      expect(result.memory_rss.rss).toBe("300.00 MB");
      expect(result.memory_rss.rssLimit).toBe("500.00 MB");
      expect(result.memory_rss.external).toBe("10.00 MB");
      expect(result.memory_rss.arrayBuffers).toBe("5.00 MB");
    });
  });
});
