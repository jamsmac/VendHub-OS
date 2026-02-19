import { HealthCheckError } from "@nestjs/terminus";
import { MemoryHealthIndicator } from "./memory.health";

describe("MemoryHealthIndicator", () => {
  let indicator: MemoryHealthIndicator;

  beforeEach(() => {
    indicator = new MemoryHealthIndicator();
  });

  // ==========================================================================
  // checkHeap
  // ==========================================================================

  describe("checkHeap", () => {
    it("should return healthy when heap is below threshold", () => {
      // Set threshold well above current usage (2GB)
      const result = indicator.checkHeap("memory_heap", 2 * 1024 * 1024 * 1024);

      expect(result).toHaveProperty("memory_heap");
      expect(result.memory_heap.status).toBe("up");
    });

    it("should throw HealthCheckError when heap exceeds threshold", () => {
      // Set threshold to 1 byte — guaranteed to fail
      expect(() => indicator.checkHeap("memory_heap", 1)).toThrow(
        HealthCheckError,
      );
    });

    it("should include usage details in result", () => {
      const result = indicator.checkHeap("memory_heap", 2 * 1024 * 1024 * 1024);

      expect(result.memory_heap.heapUsed).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
      expect(result.memory_heap.heapTotal).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
      expect(result.memory_heap.heapLimit).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
      expect(result.memory_heap.usagePercent).toMatch(/\d+\.\d+%/);
    });
  });

  // ==========================================================================
  // checkRSS
  // ==========================================================================

  describe("checkRSS", () => {
    it("should return healthy when RSS is below threshold", () => {
      const result = indicator.checkRSS("memory_rss", 2 * 1024 * 1024 * 1024);

      expect(result).toHaveProperty("memory_rss");
      expect(result.memory_rss.status).toBe("up");
    });

    it("should throw HealthCheckError when RSS exceeds threshold", () => {
      expect(() => indicator.checkRSS("memory_rss", 1)).toThrow(
        HealthCheckError,
      );
    });

    it("should include rss and external memory in details", () => {
      const result = indicator.checkRSS("memory_rss", 2 * 1024 * 1024 * 1024);

      expect(result.memory_rss.rss).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
      expect(result.memory_rss.rssLimit).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
      expect(result.memory_rss.external).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
      expect(result.memory_rss.arrayBuffers).toMatch(/\d+\.\d+ (B|KB|MB|GB)/);
    });
  });
});
