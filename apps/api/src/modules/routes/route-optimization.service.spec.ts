import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";

import { RouteOptimizationService } from "./route-optimization.service";
import { Route, RouteStop } from "./entities/route.entity";

describe("RouteOptimizationService", () => {
  let service: RouteOptimizationService;
  let routeRepository: jest.Mocked<Repository<Route>>;
  let routeStopRepository: jest.Mocked<Repository<RouteStop>>;

  const routeId = "route-uuid-1";

  const makeStop = (
    seq: number,
    lat: number,
    lon: number,
  ): Partial<RouteStop> => ({
    id: `stop-${seq}`,
    routeId,
    sequence: seq,
    latitude: lat,
    longitude: lon,
    machineId: `machine-${seq}`,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteOptimizationService,
        {
          provide: getRepositoryToken(Route),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RouteStop),
          useValue: {
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RouteOptimizationService>(RouteOptimizationService);
    routeRepository = module.get(getRepositoryToken(Route));
    routeStopRepository = module.get(getRepositoryToken(RouteStop));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("optimizeRoute", () => {
    it("should throw NotFoundException when route does not exist", async () => {
      routeRepository.findOne.mockResolvedValue(null);

      await expect(service.optimizeRoute("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return unoptimized result when fewer than 3 valid stops", async () => {
      const route = {
        id: routeId,
        stops: [makeStop(1, 41.3, 69.2), makeStop(2, 41.31, 69.21)],
      } as unknown as Route;

      routeRepository.findOne.mockResolvedValue(route);

      const result = await service.optimizeRoute(routeId);

      expect(result.optimized).toBe(false);
      expect(result.estimatedSavingsKm).toBe(0);
      expect(result.estimatedSavingsMinutes).toBe(0);
    });

    it("should optimize route with 3+ valid stops", async () => {
      const stops = [
        makeStop(1, 41.3, 69.2),
        makeStop(2, 41.35, 69.3),
        makeStop(3, 41.31, 69.21),
        makeStop(4, 41.34, 69.29),
      ];
      const route = { id: routeId, stops } as unknown as Route;

      routeRepository.findOne
        .mockResolvedValueOnce(route)
        .mockResolvedValueOnce(route);
      routeStopRepository.save.mockResolvedValue(stops as any);

      const result = await service.optimizeRoute(routeId);

      expect(result.route).toBeDefined();
      expect(typeof result.estimatedSavingsKm).toBe("number");
      expect(typeof result.estimatedSavingsMinutes).toBe("number");
      expect(routeStopRepository.save).toHaveBeenCalled();
    });

    it("should filter out stops with null coordinates", async () => {
      const stops = [
        makeStop(1, 41.3, 69.2),
        { ...makeStop(2, 0, 0), latitude: null, longitude: null },
        makeStop(3, 41.31, 69.21),
      ];
      const route = { id: routeId, stops } as unknown as Route;

      routeRepository.findOne.mockResolvedValue(route);

      const result = await service.optimizeRoute(routeId);

      expect(result.optimized).toBe(false);
    });

    it("should handle route with empty stops array", async () => {
      const route = { id: routeId, stops: [] } as unknown as Route;
      routeRepository.findOne.mockResolvedValue(route);

      const result = await service.optimizeRoute(routeId);

      expect(result.optimized).toBe(false);
      expect(result.estimatedSavingsKm).toBe(0);
    });
  });

  describe("estimateRouteDistance", () => {
    it("should return 0 for fewer than 2 valid stops", async () => {
      const distance = await service.estimateRouteDistance([
        { latitude: 41.3, longitude: 69.2 },
      ]);

      expect(distance).toBe(0);
    });

    it("should calculate distance between two points", async () => {
      const distance = await service.estimateRouteDistance([
        { latitude: 41.3, longitude: 69.2 },
        { latitude: 41.35, longitude: 69.3 },
      ]);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(20);
    });

    it("should sum distances for multiple stops", async () => {
      const twoStopDistance = await service.estimateRouteDistance([
        { latitude: 41.3, longitude: 69.2 },
        { latitude: 41.35, longitude: 69.3 },
      ]);

      const threeStopDistance = await service.estimateRouteDistance([
        { latitude: 41.3, longitude: 69.2 },
        { latitude: 41.35, longitude: 69.3 },
        { latitude: 41.4, longitude: 69.4 },
      ]);

      expect(threeStopDistance).toBeGreaterThan(twoStopDistance);
    });

    it("should filter out stops with null coordinates", async () => {
      const distance = await service.estimateRouteDistance([
        { latitude: 41.3, longitude: 69.2 },
        { latitude: null, longitude: null },
        { latitude: 41.35, longitude: 69.3 },
      ]);

      expect(distance).toBeGreaterThan(0);
    });

    it("should return 0 for identical points", async () => {
      const distance = await service.estimateRouteDistance([
        { latitude: 41.3, longitude: 69.2 },
        { latitude: 41.3, longitude: 69.2 },
      ]);

      expect(distance).toBe(0);
    });
  });

  describe("haversineDistance (via estimateRouteDistance)", () => {
    it("should calculate known Tashkent-Samarkand distance approximately", async () => {
      const distance = await service.estimateRouteDistance([
        { latitude: 41.2995, longitude: 69.2401 },
        { latitude: 39.6542, longitude: 66.9597 },
      ]);

      expect(distance).toBeGreaterThan(250);
      expect(distance).toBeLessThan(300);
    });
  });
});
