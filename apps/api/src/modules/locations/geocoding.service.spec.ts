/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { GeocodingService } from "./geocoding.service";

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe("GeocodingService", () => {
  let service: GeocodingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeocodingService],
    }).compile();

    service = module.get<GeocodingService>(GeocodingService);
    (service as any).lastRequestTime = 0;
    mockFetch.mockReset();
  });

  describe("geocode", () => {
    it("should return coordinates for a valid address", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            lat: "41.2995",
            lon: "69.2401",
            display_name: "Tashkent, Uzbekistan",
          },
        ],
      });

      const result = await service.geocode("Tashkent");

      expect(result).toEqual({
        latitude: 41.2995,
        longitude: 69.2401,
        displayName: "Tashkent, Uzbekistan",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("Tashkent"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("VendHub24"),
          }),
        }),
      );
    });

    it("should return null when no results found", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result = await service.geocode("nonexistent-place-xyz");

      expect(result).toBeNull();
    });

    it("should return null on HTTP error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await service.geocode("Tashkent");

      expect(result).toBeNull();
    });

    it("should return null on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await service.geocode("Tashkent");

      expect(result).toBeNull();
    });

    it("should URL-encode the address parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      await service.geocode("Amir Temur 1, Tashkent");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("Amir%20Temur%201%2C%20Tashkent"),
        expect.any(Object),
      );
    });
  });

  describe("reverseGeocode", () => {
    it("should return address for valid coordinates", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          display_name: "Amir Temur Street, Tashkent, Uzbekistan",
          address: {
            road: "Amir Temur Street",
            house_number: "1",
            city: "Tashkent",
            state: "Tashkent Region",
            country: "Uzbekistan",
            postcode: "100000",
          },
        }),
      });

      const result = await service.reverseGeocode(41.2995, 69.2401);

      expect(result).toEqual({
        displayName: "Amir Temur Street, Tashkent, Uzbekistan",
        road: "Amir Temur Street",
        houseNumber: "1",
        city: "Tashkent",
        state: "Tashkent Region",
        country: "Uzbekistan",
        postcode: "100000",
      });
    });

    it("should handle missing address fields gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          display_name: "Somewhere in Uzbekistan",
        }),
      });

      const result = await service.reverseGeocode(41.0, 69.0);

      expect(result).toEqual({
        displayName: "Somewhere in Uzbekistan",
        road: undefined,
        houseNumber: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
        postcode: undefined,
      });
    });

    it("should return null on HTTP error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
      });

      const result = await service.reverseGeocode(41.2995, 69.2401);

      expect(result).toBeNull();
    });

    it("should return null on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Timeout"));

      const result = await service.reverseGeocode(41.2995, 69.2401);

      expect(result).toBeNull();
    });

    it("should include lat/lon in request URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ display_name: "Test" }),
      });

      await service.reverseGeocode(41.2995, 69.2401);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("lat=41.2995&lon=69.2401"),
        expect.any(Object),
      );
    });
  });

  describe("throttle", () => {
    it("should enforce throttling between requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const start = Date.now();
      await service.geocode("First");
      await service.geocode("Second");
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(900);
    });

    it("should not throttle when enough time has passed", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      (service as any).lastRequestTime = Date.now() - 2000;

      const start = Date.now();
      await service.geocode("Test");
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });
});
