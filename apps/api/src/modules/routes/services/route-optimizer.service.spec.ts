import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { RouteOptimizerService } from "./route-optimizer.service";
import {
  Route,
  RouteStop,
  RouteType,
  RouteStatus,
  RouteStopStatus,
} from "../entities/route.entity";
import {
  RefillRecommendation,
  RefillAction,
} from "../../predictive-refill/entities/refill-recommendation.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { GpsProcessingService } from "./gps-processing.service";

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeRec(
  machineId: string,
  priorityScore: number,
  productId = "prod-1",
): Partial<RefillRecommendation> {
  return {
    machineId,
    productId,
    priorityScore,
    recommendedAction: RefillAction.REFILL_NOW,
    organizationId: "org-1",
  };
}

function makeMachine(
  id: string,
  lat: number | null,
  lng: number | null,
): Partial<Machine> {
  return {
    id,
    name: `Machine ${id}`,
    address: `Address ${id}`,
    latitude: lat as number,
    longitude: lng as number,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("RouteOptimizerService", () => {
  let service: RouteOptimizerService;
  let routeRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let routeStopRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let recommendationRepository: {
    find: jest.Mock;
  };
  let machineRepository: {
    find: jest.Mock;
  };

  // Saved route id counter
  let savedRouteId: string;

  beforeEach(async () => {
    savedRouteId = "route-saved-1";

    routeRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ ...entity, id: savedRouteId }),
        ),
    };

    // findOne returns the saved route with stops attached
    routeRepository.findOne.mockImplementation(() =>
      Promise.resolve({ id: savedRouteId, stops: [] }),
    );

    routeStopRepository = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockResolvedValue([]),
    };

    recommendationRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    machineRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteOptimizerService,
        // Use REAL GpsProcessingService so haversine math is accurate
        GpsProcessingService,
        {
          provide: getRepositoryToken(Route),
          useValue: routeRepository,
        },
        {
          provide: getRepositoryToken(RouteStop),
          useValue: routeStopRepository,
        },
        {
          provide: getRepositoryToken(RefillRecommendation),
          useValue: recommendationRepository,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: machineRepository,
        },
      ],
    }).compile();

    service = module.get(RouteOptimizerService);
  });

  // =========================================================================
  // No recommendations → BadRequestException
  // =========================================================================

  describe("generateOptimalRoute — no recommendations", () => {
    it("should throw BadRequestException when no recommendations exist", async () => {
      recommendationRepository.find.mockResolvedValue([]);

      await expect(
        service.generateOptimalRoute("org-1", "op-1", false),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // Machines without coordinates are skipped
  // =========================================================================

  describe("generateOptimalRoute — machines without coordinates", () => {
    it("should throw BadRequestException when all machines lack coordinates", async () => {
      const recs = [makeRec("m-1", 90), makeRec("m-2", 80)];
      recommendationRepository.find.mockResolvedValue(recs);

      // Both machines have null lat/lng
      const machines = [
        makeMachine("m-1", null, null),
        makeMachine("m-2", null, null),
      ];
      machineRepository.find.mockResolvedValue(machines);

      await expect(
        service.generateOptimalRoute("org-1", "op-1", false),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create route with only machines that have valid coordinates", async () => {
      // 3 recommendations; machine m-3 has no coordinates
      const recs = [makeRec("m-1", 90), makeRec("m-2", 80), makeRec("m-3", 70)];
      recommendationRepository.find.mockResolvedValue(recs);

      const machines = [
        makeMachine("m-1", 41.2995, 69.2401), // Tashkent
        makeMachine("m-2", 41.3111, 69.2797),
        makeMachine("m-3", null, null), // no GPS
      ];
      machineRepository.find.mockResolvedValue(machines);

      // routeStopRepository.create will be called once per valid stop
      const createdStops: unknown[] = [];
      routeStopRepository.create.mockImplementation((data) => {
        const stop = { ...data };
        createdStops.push(stop);
        return stop;
      });

      routeRepository.findOne.mockResolvedValue({
        id: savedRouteId,
        stops: createdStops,
      });

      await service.generateOptimalRoute("org-1", "op-1", false);

      // Only 2 machines had coords → 2 RouteStop.create calls
      expect(routeStopRepository.create).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // Nearest-neighbor ordering
  // =========================================================================

  describe("generateOptimalRoute — nearest-neighbor ordering", () => {
    it("should start from highest-priority machine", async () => {
      // Three machines arranged in a straight line along latitude.
      // m-high has the highest priorityScore and should be first.
      // m-close is geographically closest to m-high so should be second.
      // m-far is furthest and should be last.
      const recs = [
        makeRec("m-high", 95), // highest priority → start here
        makeRec("m-close", 60), // closest to m-high
        makeRec("m-far", 40), // furthest from m-high
      ];
      recommendationRepository.find.mockResolvedValue(recs);

      const machines = [
        makeMachine("m-high", 41.3, 69.25), // start
        makeMachine("m-close", 41.301, 69.251), // ~1.4 km from start
        makeMachine("m-far", 41.35, 69.3), // ~6 km from start
      ];
      machineRepository.find.mockResolvedValue(machines);

      const stopSequences: { machineId: string; sequence: number }[] = [];
      routeStopRepository.create.mockImplementation((data) => {
        stopSequences.push({
          machineId: data.machineId,
          sequence: data.sequence,
        });
        return { ...data };
      });

      routeRepository.findOne.mockResolvedValue({
        id: savedRouteId,
        stops: stopSequences,
      });

      await service.generateOptimalRoute("org-1", "op-1", false);

      // First stop must be the highest-priority machine
      const first = stopSequences.find((s) => s.sequence === 1);
      expect(first?.machineId).toBe("m-high");

      // Second stop should be the closer machine (nearest-neighbor)
      const second = stopSequences.find((s) => s.sequence === 2);
      expect(second?.machineId).toBe("m-close");

      // Last stop is the far machine
      const third = stopSequences.find((s) => s.sequence === 3);
      expect(third?.machineId).toBe("m-far");
    });

    it("should create a DRAFT route with REFILL type", async () => {
      const recs = [makeRec("m-1", 90)];
      recommendationRepository.find.mockResolvedValue(recs);
      machineRepository.find.mockResolvedValue([
        makeMachine("m-1", 41.3, 69.25),
      ]);

      routeStopRepository.create.mockReturnValue({});

      await service.generateOptimalRoute("org-1", "op-1", false);

      const createArg = routeRepository.create.mock.calls[0][0];
      expect(createArg.status).toBe(RouteStatus.DRAFT);
      expect(createArg.type).toBe(RouteType.REFILL);
      expect(createArg.organizationId).toBe("org-1");
      expect(createArg.operatorId).toBe("op-1");
    });

    it("should mark stops as PENDING status", async () => {
      const recs = [makeRec("m-1", 90), makeRec("m-2", 80)];
      recommendationRepository.find.mockResolvedValue(recs);
      machineRepository.find.mockResolvedValue([
        makeMachine("m-1", 41.3, 69.25),
        makeMachine("m-2", 41.305, 69.255),
      ]);

      await service.generateOptimalRoute("org-1", "op-1", false);

      routeStopRepository.create.mock.calls.forEach(([arg]) => {
        expect(arg.status).toBe(RouteStopStatus.PENDING);
      });
    });

    it("should include REFILL_SOON recommendations when includeRefillSoon=true", async () => {
      // Ensure the find query receives both REFILL_NOW and REFILL_SOON.
      // The service uses TypeORM's In() operator, so recommendedAction is a
      // FindOperator wrapping both values — we inspect its internal _value.
      recommendationRepository.find.mockResolvedValue([]);

      await expect(
        service.generateOptimalRoute("org-1", "op-1", true),
      ).rejects.toThrow(BadRequestException);

      expect(recommendationRepository.find).toHaveBeenCalledTimes(1);
      const findArg = recommendationRepository.find.mock.calls[0][0];
      // The In() FindOperator stores the values array in _value
      const operatorValue = findArg.where.recommendedAction._value as string[];
      expect(operatorValue).toContain(RefillAction.REFILL_NOW);
      expect(operatorValue).toContain(RefillAction.REFILL_SOON);
    });

    it("should assign isPriority=true for stops with priorityScore >= 80", async () => {
      const recs = [makeRec("m-high", 90), makeRec("m-low", 50)];
      recommendationRepository.find.mockResolvedValue(recs);
      machineRepository.find.mockResolvedValue([
        makeMachine("m-high", 41.3, 69.25),
        makeMachine("m-low", 41.305, 69.255),
      ]);

      await service.generateOptimalRoute("org-1", "op-1", false);

      const highStop = routeStopRepository.create.mock.calls.find(
        ([d]) => d.machineId === "m-high",
      )?.[0];
      const lowStop = routeStopRepository.create.mock.calls.find(
        ([d]) => d.machineId === "m-low",
      )?.[0];

      expect(highStop?.isPriority).toBe(true);
      expect(lowStop?.isPriority).toBe(false);
    });
  });
});
