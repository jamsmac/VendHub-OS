import { HealthCheckError } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { RedisHealthIndicator } from "./redis.health";

describe("RedisHealthIndicator", () => {
  let indicator: RedisHealthIndicator;
  let mockRedis: {
    ping: jest.Mock;
    info: jest.Mock;
    quit: jest.Mock;
  };

  beforeEach(() => {
    // Create indicator with no Redis configured (no REDIS_URL/REDIS_HOST)
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    indicator = new RedisHealthIndicator(configService);

    // Set up a mock Redis instance for tests that need it
    mockRedis = {
      ping: jest.fn().mockResolvedValue("PONG"),
      info: jest.fn().mockImplementation((section: string) => {
        if (section === "memory") {
          return Promise.resolve(
            "# Memory\r\nused_memory_human:1.50M\r\nused_memory_peak_human:2.00M\r\n",
          );
        }
        if (section === "clients") {
          return Promise.resolve("# Clients\r\nconnected_clients:5\r\n");
        }
        return Promise.resolve("");
      }),
      quit: jest.fn().mockResolvedValue("OK"),
    };
  });

  afterEach(() => jest.clearAllMocks());

  // ==========================================================================
  // isHealthy — Redis not configured
  // ==========================================================================

  describe("isHealthy (no Redis)", () => {
    it("should return healthy with not_configured status when Redis is not set", async () => {
      const result = await indicator.isHealthy("redis");

      expect(result).toHaveProperty("redis");
      expect(result.redis.status).toBe("not_configured");
      expect(result.redis.message).toBe("Redis not configured");
    });
  });

  // ==========================================================================
  // isHealthy — Redis configured
  // ==========================================================================

  describe("isHealthy (with Redis)", () => {
    beforeEach(() => {
      // Inject mock Redis via private field
      (indicator as unknown as { redis: typeof mockRedis }).redis = mockRedis;
    });

    it("should return healthy when ping returns PONG", async () => {
      const result = await indicator.isHealthy("redis");

      expect(result).toHaveProperty("redis");
      expect(result.redis.status).toBe("up");
      expect(result.redis.connected).toBe(true);
      expect(result.redis.responseTime).toMatch(/\d+ms/);
    });

    it("should include memory and client info", async () => {
      const result = await indicator.isHealthy("redis");

      expect(result.redis.usedMemory).toBe("1.50M");
      expect(result.redis.peakMemory).toBe("2.00M");
      expect(result.redis.connectedClients).toBe(5);
    });

    it("should throw HealthCheckError when ping fails", async () => {
      mockRedis.ping.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(indicator.isHealthy("redis")).rejects.toThrow(
        HealthCheckError,
      );
    });

    it("should throw HealthCheckError when ping returns unexpected response", async () => {
      mockRedis.ping.mockResolvedValue("ERROR");

      await expect(indicator.isHealthy("redis")).rejects.toThrow(
        HealthCheckError,
      );
    });

    it("should still work if info call fails", async () => {
      mockRedis.info.mockRejectedValue(new Error("INFO not available"));

      const result = await indicator.isHealthy("redis");

      // Should still be healthy — info failure is non-critical
      expect(result.redis.status).toBe("up");
      expect(result.redis.connected).toBe(true);
    });
  });

  // ==========================================================================
  // onModuleDestroy
  // ==========================================================================

  describe("onModuleDestroy", () => {
    it("should quit Redis connection on destroy", async () => {
      (indicator as unknown as { redis: typeof mockRedis }).redis = mockRedis;

      await indicator.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it("should not throw if Redis is not configured", async () => {
      await expect(indicator.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
