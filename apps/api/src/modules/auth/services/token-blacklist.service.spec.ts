import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { TokenBlacklistService } from "./token-blacklist.service";

describe("TokenBlacklistService", () => {
  let service: TokenBlacklistService;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const mockCacheManager: Partial<jest.Mocked<Cache>> = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------- blacklist() ----------

  describe("blacklist", () => {
    it("should store a token in cache with correct key and TTL in milliseconds", async () => {
      cacheManager.set.mockResolvedValue(undefined);

      await service.blacklist("jwt-id-123", 3600);

      expect(cacheManager.set).toHaveBeenCalledWith(
        "bl:jwt-id-123",
        "1",
        3600 * 1000,
      );
    });

    it("should skip blacklisting when jti is empty string", async () => {
      await service.blacklist("", 3600);

      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it("should not throw when cache write fails", async () => {
      cacheManager.set.mockRejectedValue(new Error("Redis connection lost"));

      await expect(service.blacklist("jti-fail", 600)).resolves.toBeUndefined();
    });

    it("should handle non-Error objects thrown by cache", async () => {
      cacheManager.set.mockRejectedValue("string-error");

      await expect(service.blacklist("jti-str", 600)).resolves.toBeUndefined();
    });
  });

  // ---------- isBlacklisted() ----------

  describe("isBlacklisted", () => {
    it("should return true when token is found in cache", async () => {
      cacheManager.get.mockResolvedValue("1");

      const result = await service.isBlacklisted("jwt-id-123");

      expect(result).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith("bl:jwt-id-123");
    });

    it("should return false when token is not in cache", async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.isBlacklisted("jwt-id-unknown");

      expect(result).toBe(false);
    });

    it("should return false when jti is empty string", async () => {
      const result = await service.isBlacklisted("");

      expect(result).toBe(false);
      expect(cacheManager.get).not.toHaveBeenCalled();
    });

    it("should return false when cache read fails (fail-open)", async () => {
      cacheManager.get.mockRejectedValue(new Error("Redis down"));

      const result = await service.isBlacklisted("jti-err");

      expect(result).toBe(false);
    });

    it("should return false when cache returns null", async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.isBlacklisted("jti-null");

      expect(result).toBe(false);
    });
  });

  // ---------- blacklistAllForUser() ----------

  describe("blacklistAllForUser", () => {
    it("should store user blacklist timestamp with correct key", async () => {
      cacheManager.set.mockResolvedValue(undefined);
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      await service.blacklistAllForUser("user-uuid-1", 86400);

      expect(cacheManager.set).toHaveBeenCalledWith(
        "bl:user:user-uuid-1",
        now.toString(),
        86400 * 1000,
      );

      jest.restoreAllMocks();
    });

    it("should skip when userId is empty", async () => {
      await service.blacklistAllForUser("", 86400);

      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it("should not throw when cache write fails", async () => {
      cacheManager.set.mockRejectedValue(new Error("Write failed"));

      await expect(
        service.blacklistAllForUser("user-1", 86400),
      ).resolves.toBeUndefined();
    });
  });

  // ---------- isUserBlacklisted() ----------

  describe("isUserBlacklisted", () => {
    it("should return true when token was issued before the blacklist timestamp", async () => {
      // Blacklist timestamp: 1700000000000 (ms)
      // Token issued at: 1699999000 (seconds) => 1699999000000 ms — before blacklist
      cacheManager.get.mockResolvedValue("1700000000000");

      const result = await service.isUserBlacklisted("user-1", 1699999000);

      expect(result).toBe(true);
    });

    it("should return false when token was issued after the blacklist timestamp", async () => {
      // Blacklist timestamp: 1700000000000 (ms)
      // Token issued at: 1700001000 (seconds) => 1700001000000 ms — after blacklist
      cacheManager.get.mockResolvedValue("1700000000000");

      const result = await service.isUserBlacklisted("user-1", 1700001000);

      expect(result).toBe(false);
    });

    it("should return false when no user blacklist entry exists", async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.isUserBlacklisted("user-1", 1700000000);

      expect(result).toBe(false);
    });

    it("should return false when userId is empty", async () => {
      const result = await service.isUserBlacklisted("", 1700000000);

      expect(result).toBe(false);
      expect(cacheManager.get).not.toHaveBeenCalled();
    });

    it("should return false when cache read fails", async () => {
      cacheManager.get.mockRejectedValue(new Error("Redis timeout"));

      const result = await service.isUserBlacklisted("user-err", 1700000000);

      expect(result).toBe(false);
    });
  });
});
