import { HealthCheckError } from "@nestjs/terminus";
import { DiskHealthIndicator } from "./disk.health";
import * as fs from "fs";

// Mock only fs.promises.statfs — the primary disk-check path
jest.mock("fs", () => {
  const actual = jest.requireActual("fs");
  return {
    ...actual,
    promises: {
      ...actual.promises,
      statfs: jest.fn(),
    },
  };
});

const mockStatfs = fs.promises.statfs as jest.MockedFunction<
  typeof fs.promises.statfs
>;

describe("DiskHealthIndicator", () => {
  let indicator: DiskHealthIndicator;

  beforeEach(() => {
    indicator = new DiskHealthIndicator();
  });

  afterEach(() => jest.clearAllMocks());

  // ==========================================================================
  // checkStorage — healthy disk
  // ==========================================================================

  describe("checkStorage (healthy)", () => {
    beforeEach(() => {
      // 1 TB total, ~500 GB used (50% usage)
      mockStatfs.mockResolvedValue({
        type: 0,
        bsize: 4096,
        blocks: 262144000, // ~1 TB
        bfree: 131072000,
        bavail: 131072000, // ~500 GB available
        files: 1000000,
        ffree: 900000,
      } as unknown as fs.StatsFs);
    });

    it("should return healthy when disk usage is below threshold", async () => {
      const result = await indicator.checkStorage("disk", {
        thresholdPercent: 0.9,
        path: "/",
      });

      expect(result).toHaveProperty("disk");
      expect(result.disk.status).toBe("up");
    });

    it("should include disk usage details", async () => {
      const result = await indicator.checkStorage("disk", {
        thresholdPercent: 0.9,
        path: "/",
      });

      expect(result.disk.path).toBe("/");
      expect(result.disk.usedPercent).toMatch(/\d+\.\d+%/);
      expect(result.disk.total).toMatch(/\d+\.\d+ (B|KB|MB|GB|TB)/);
      expect(result.disk.used).toMatch(/\d+\.\d+ (B|KB|MB|GB|TB)/);
      expect(result.disk.available).toMatch(/\d+\.\d+ (B|KB|MB|GB|TB)/);
      expect(result.disk.threshold).toBe("90%");
    });
  });

  // ==========================================================================
  // checkStorage — threshold exceeded
  // ==========================================================================

  describe("checkStorage (threshold exceeded)", () => {
    it("should throw HealthCheckError when disk usage exceeds threshold", async () => {
      // 95% disk usage
      mockStatfs.mockResolvedValue({
        type: 0,
        bsize: 4096,
        blocks: 262144000,
        bfree: 13107200,
        bavail: 13107200, // ~5% available
        files: 1000000,
        ffree: 900000,
      } as unknown as fs.StatsFs);

      await expect(
        indicator.checkStorage("disk", {
          thresholdPercent: 0.9,
          path: "/",
        }),
      ).rejects.toThrow(HealthCheckError);
    });
  });

  // ==========================================================================
  // checkStorage — error handling
  // ==========================================================================

  describe("checkStorage (error handling)", () => {
    it("should throw HealthCheckError when statfs fails and fallback also fails", async () => {
      mockStatfs.mockRejectedValue(new Error("ENOSYS: function not supported"));

      await expect(
        indicator.checkStorage("disk", {
          thresholdPercent: 0.9,
          path: "/nonexistent",
        }),
      ).rejects.toThrow(HealthCheckError);
    });
  });
});
