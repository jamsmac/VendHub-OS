import { Test, TestingModule } from "@nestjs/testing";
import { GpsProcessingService } from "./gps-processing.service";

describe("GpsProcessingService", () => {
  let service: GpsProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GpsProcessingService],
    }).compile();

    service = module.get<GpsProcessingService>(GpsProcessingService);
  });

  // --------------------------------------------------------------------------
  // haversineDistance
  // --------------------------------------------------------------------------

  it("should return 0 for the same point", () => {
    const distance = service.haversineDistance(41.311, 69.279, 41.311, 69.279);
    expect(distance).toBeCloseTo(0, 0);
  });

  it("should calculate distance between Tashkent and Samarkand (~270km)", () => {
    // Tashkent: 41.2995, 69.2401
    // Samarkand: 39.6542, 66.9597
    const distance = service.haversineDistance(
      41.2995,
      69.2401,
      39.6542,
      66.9597,
    );

    // Approximately 270km = 270000m
    expect(distance).toBeGreaterThan(250_000);
    expect(distance).toBeLessThan(290_000);
  });

  it("should calculate short distance (within a city block)", () => {
    // Two points ~100m apart in Tashkent
    const distance = service.haversineDistance(
      41.3111,
      69.2797,
      41.312,
      69.2797,
    );

    expect(distance).toBeGreaterThan(50);
    expect(distance).toBeLessThan(200);
  });

  it("should handle equator-to-pole distance", () => {
    const distance = service.haversineDistance(0, 0, 90, 0);

    // Approximately quarter of Earth circumference: ~10,000km
    expect(distance).toBeGreaterThan(9_900_000);
    expect(distance).toBeLessThan(10_100_000);
  });

  it("should handle negative coordinates (southern/western hemisphere)", () => {
    const distance = service.haversineDistance(
      -33.8688,
      151.2093,
      -37.8136,
      144.9631,
    );

    // Sydney to Melbourne: ~714km
    expect(distance).toBeGreaterThan(700_000);
    expect(distance).toBeLessThan(750_000);
  });

  it("should be symmetric (distance A->B equals B->A)", () => {
    const d1 = service.haversineDistance(41.3, 69.28, 39.65, 66.96);
    const d2 = service.haversineDistance(39.65, 66.96, 41.3, 69.28);

    expect(d1).toBeCloseTo(d2, 5);
  });

  // --------------------------------------------------------------------------
  // isWithinRadius
  // --------------------------------------------------------------------------

  it("should return true when point is within radius", () => {
    // Same point, any radius > 0
    const result = service.isWithinRadius(41.311, 69.279, 41.311, 69.279, 100);
    expect(result).toBe(true);
  });

  it("should return false when point is outside radius", () => {
    // Tashkent to Samarkand (~270km) with 1km radius
    const result = service.isWithinRadius(
      41.2995,
      69.2401,
      39.6542,
      66.9597,
      1000,
    );
    expect(result).toBe(false);
  });

  it("should handle edge case exactly on radius boundary", () => {
    const distance = service.haversineDistance(41.3, 69.28, 41.301, 69.28);

    // Test with radius equal to the exact distance
    const result = service.isWithinRadius(41.3, 69.28, 41.301, 69.28, distance);
    expect(result).toBe(true);
  });

  it("should return true for nearby machines within geofence radius", () => {
    // Two points ~50m apart, geofence radius 100m
    const result = service.isWithinRadius(
      41.311,
      69.2797,
      41.31105,
      69.2797,
      100,
    );
    expect(result).toBe(true);
  });

  it("should return false for machines outside geofence radius", () => {
    // Two points ~500m apart, geofence radius 100m
    const result = service.isWithinRadius(
      41.311,
      69.2797,
      41.315,
      69.2797,
      100,
    );
    expect(result).toBe(false);
  });
});
