import { HealthCheckError } from "@nestjs/terminus";
import { DatabaseHealthIndicator } from "./database.health";

describe("DatabaseHealthIndicator", () => {
  let indicator: DatabaseHealthIndicator;
  let mockDataSource: {
    isInitialized: boolean;
    query: jest.Mock;
    driver: {
      pool?: { totalCount: number; idleCount: number; waitingCount: number };
    };
  };

  beforeEach(() => {
    mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
      driver: {
        pool: { totalCount: 10, idleCount: 8, waitingCount: 0 },
      },
    };

    indicator = new DatabaseHealthIndicator(mockDataSource as never);
  });

  afterEach(() => jest.clearAllMocks());

  // ==========================================================================
  // isHealthy
  // ==========================================================================

  describe("isHealthy", () => {
    it("should return healthy when database is connected", async () => {
      const result = await indicator.isHealthy("database");

      expect(result).toHaveProperty("database");
      expect(result.database.status).toBe("up");
      expect(result.database.connected).toBe(true);
      expect(result.database.responseTime).toMatch(/\d+ms/);
    });

    it("should execute SELECT 1 query", async () => {
      await indicator.isHealthy("database");

      expect(mockDataSource.query).toHaveBeenCalledWith("SELECT 1");
    });

    it("should include pool info when available", async () => {
      const result = await indicator.isHealthy("database");

      expect(result.database.pool).toEqual({
        total: 10,
        idle: 8,
        waiting: 0,
      });
    });

    it("should throw HealthCheckError when connection is not initialized", async () => {
      mockDataSource.isInitialized = false;

      await expect(indicator.isHealthy("database")).rejects.toThrow(
        HealthCheckError,
      );
    });

    it("should throw HealthCheckError when query fails", async () => {
      mockDataSource.query.mockRejectedValue(new Error("Connection refused"));

      await expect(indicator.isHealthy("database")).rejects.toThrow(
        HealthCheckError,
      );
    });

    it("should include error message in failed check details", async () => {
      mockDataSource.query.mockRejectedValue(new Error("Connection refused"));

      try {
        await indicator.isHealthy("database");
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        const causes = (error as HealthCheckError).causes;
        expect(causes.database.connected).toBe(false);
        expect(causes.database.error).toBe("Connection refused");
      }
    });

    it("should work without pool info", async () => {
      mockDataSource.driver = {} as typeof mockDataSource.driver;

      const result = await indicator.isHealthy("database");

      expect(result.database.status).toBe("up");
      expect(result.database.pool).toBeUndefined();
    });
  });
});
