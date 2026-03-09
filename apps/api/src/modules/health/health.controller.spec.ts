import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckService } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { DatabaseHealthIndicator } from "./indicators/database.health";
import { RedisHealthIndicator } from "./indicators/redis.health";
import { MemoryHealthIndicator } from "./indicators/memory.health";
import { DiskHealthIndicator } from "./indicators/disk.health";
import { StorageHealthIndicator } from "./indicators/storage.health";
import { TelegramHealthIndicator } from "./indicators/telegram.health";

describe("HealthController", () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  const mockDbIndicator = { isHealthy: jest.fn() };
  const mockRedisIndicator = { isHealthy: jest.fn() };
  const mockMemoryIndicator = {
    checkHeap: jest.fn(),
    checkRSS: jest.fn(),
  };
  const mockDiskIndicator = { checkStorage: jest.fn() };
  const mockStorageIndicator = { isHealthy: jest.fn() };
  const mockTelegramIndicator = { isHealthy: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockImplementation(async (indicators) => {
              // Execute each indicator function to verify they're called
              for (const fn of indicators) {
                await fn();
              }
              return {
                status: "ok",
                info: {},
                error: {},
                details: {},
              };
            }),
          },
        },
        { provide: DatabaseHealthIndicator, useValue: mockDbIndicator },
        { provide: RedisHealthIndicator, useValue: mockRedisIndicator },
        { provide: MemoryHealthIndicator, useValue: mockMemoryIndicator },
        { provide: DiskHealthIndicator, useValue: mockDiskIndicator },
        { provide: StorageHealthIndicator, useValue: mockStorageIndicator },
        { provide: TelegramHealthIndicator, useValue: mockTelegramIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // GET /health
  // ==========================================================================

  describe("check", () => {
    it("should return status ok with timestamp", async () => {
      const result = await controller.check();

      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  // ==========================================================================
  // GET /health/live
  // ==========================================================================

  describe("liveness", () => {
    it("should call health.check with memory heap indicator", async () => {
      mockMemoryIndicator.checkHeap.mockReturnValue({
        memory_heap: { status: "up" },
      });

      await controller.liveness();

      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(mockMemoryIndicator.checkHeap).toHaveBeenCalledWith(
        "memory_heap",
        500 * 1024 * 1024,
      );
    });
  });

  // ==========================================================================
  // GET /health/ready
  // ==========================================================================

  describe("readiness", () => {
    it("should call health.check with database and redis indicators", async () => {
      mockDbIndicator.isHealthy.mockResolvedValue({
        database: { status: "up" },
      });
      mockRedisIndicator.isHealthy.mockResolvedValue({
        redis: { status: "up" },
      });

      await controller.readiness();

      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(mockDbIndicator.isHealthy).toHaveBeenCalledWith("database");
      expect(mockRedisIndicator.isHealthy).toHaveBeenCalledWith("redis");
    });
  });

  // ==========================================================================
  // GET /health/detailed
  // ==========================================================================

  describe("detailed", () => {
    it("should call health.check with all 7 indicators", async () => {
      mockDbIndicator.isHealthy.mockResolvedValue({
        database: { status: "up" },
      });
      mockRedisIndicator.isHealthy.mockResolvedValue({
        redis: { status: "up" },
      });
      mockStorageIndicator.isHealthy.mockResolvedValue({
        storage: { status: "up" },
      });
      mockTelegramIndicator.isHealthy.mockResolvedValue({
        telegram: { status: "up" },
      });
      mockMemoryIndicator.checkHeap.mockReturnValue({
        memory_heap: { status: "up" },
      });
      mockMemoryIndicator.checkRSS.mockReturnValue({
        memory_rss: { status: "up" },
      });
      mockDiskIndicator.checkStorage.mockResolvedValue({
        disk: { status: "up" },
      });

      await controller.detailed();

      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(mockDbIndicator.isHealthy).toHaveBeenCalledWith("database");
      expect(mockRedisIndicator.isHealthy).toHaveBeenCalledWith("redis");
      expect(mockStorageIndicator.isHealthy).toHaveBeenCalledWith("storage");
      expect(mockTelegramIndicator.isHealthy).toHaveBeenCalledWith("telegram");
      expect(mockMemoryIndicator.checkHeap).toHaveBeenCalledWith(
        "memory_heap",
        1024 * 1024 * 1024,
      );
      expect(mockMemoryIndicator.checkRSS).toHaveBeenCalledWith(
        "memory_rss",
        2 * 1024 * 1024 * 1024,
      );
      expect(mockDiskIndicator.checkStorage).toHaveBeenCalledWith("disk", {
        thresholdPercent: 0.9,
        path: "/",
      });
    });
  });

  // ==========================================================================
  // GET /health/version
  // ==========================================================================

  describe("version", () => {
    it("should return version info", () => {
      const result = controller.version();

      expect(result.name).toBe("vendhub-api");
      expect(result.version).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.nodeVersion).toBe(process.version);
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });
});
