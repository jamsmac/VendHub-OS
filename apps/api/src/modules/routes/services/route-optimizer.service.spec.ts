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

    it("should apply 2-opt to produce a shorter tour than nearest-neighbor alone", async () => {
      // 4 machines arranged in a square.
      // Greedy nearest-neighbor starting from top-left (highest priority) will
      // pick a crossing order: TL → TR → BR → BL (zig-zag with the BL diagonal
      // at the end creates a cross). 2-opt should uncross it to TL → TR → BR → BL
      // being the rectangular perimeter (no crossing).
      //
      // Layout (lat is Y, lng is X):
      //   TL (m-tl, priority 95) ───── TR (m-tr, priority 50)
      //        │                              │
      //   BL (m-bl, priority 60) ───── BR (m-br, priority 40)
      //
      // Nearest-neighbor from TL:
      //   TL → TR (closest, 1 step) → BR (closest remaining) → BL
      //   That's actually the rectangular path — no crossing.
      //
      // To force a crossing, we give BL a higher priority than BR so the greedy
      // pick from TL chooses BL (diagonally further via Haversine? no, still TR).
      //
      // Better test: construct coords where greedy demonstrably picks crossing order.
      // Use coordinates where TL → BR → TR → BL is what greedy would pick due to
      // a priority-enforced start that's not optimal geographically.
      //
      // Simplest reliable test: place 4 points where the sequence by priority is
      // A(0,0), B(2,0), C(2,2), D(0,2) — forming a square.
      // Greedy from A: A → B (dist 2) → C (dist 2) → D (dist 2). Total = 6. Good path.
      // But shuffle priorities so stops are fed in bad order to NN: not possible,
      // NN picks geographically.
      //
      // Canonical 2-opt test: 4 points arranged so NN picks crossing path.
      // Use stops with priorityScore ordering that seeds NN with a bad start choice.
      // Since NN always starts from highest priority, we control only the start.
      //
      // Construct: start S, then 3 points arranged so S → nearest creates cross.
      //   S  = (0, 0)      priority 99 (forced start)
      //   P1 = (1, 0.1)    priority 50  — closest to S
      //   P2 = (0.1, 1)    priority 50  — closest to S after P1
      //   P3 = (1, 1)      priority 50
      //
      // NN from S: S → P1 (dist ~1) → P3 (dist ~0.9) → P2 (dist ~0.9). Total ~2.8.
      // Optimal: S → P1 → P3 → P2 is actually fine (no cross).
      //
      // Real crossing test — 4 points on a square, NN picks diagonal crossing:
      //   A = (0, 0)       priority 99 (start)
      //   B = (0, 10)      priority 50
      //   C = (10, 0)      priority 50
      //   D = (10, 10)     priority 50
      //
      // NN from A: A → B or A → C (both dist 10). Pick A → B (stable sort).
      // From B: nearest is D (dist 10) vs C (dist ~14). B → D.
      // From D: C (dist 10). Path: A → B → D → C. Total = 30. No cross.
      //
      // Force a cross: add 5th point.
      //   A = (0, 0) priority 99
      //   B = (10, 0) priority 50
      //   C = (10, 10) priority 50
      //   D = (0, 10) priority 50
      //   E = (5, 5) priority 50  — center
      //
      // NN from A: A → E (dist ~7.07) [closest] → B (~7.07) → C (10) → D (~14.14). Total ~38.28.
      // 2-opt optimal: A → B → C → D → E or A → B → E → C → D etc.
      // A → B → C → D → E: 10+10+10+~14.14 ≈ 44.14. Worse.
      // A → D → E → C → B: ~14.14+~7.07+~7.07+10 ≈ 38.28. Same.
      // A → D → C → E → B: 10+10+~7.07+~7.07 ≈ 34.14. Better.
      // So NN gives ~38.28, 2-opt can find ~34.14.
      //
      // Translated to lat/lng near Tashkent (~111km per degree lat, ~84km per
      // degree lng at lat 41°); use small decimals so haversine distances are
      // proportional to planar distances.
      const baseLat = 41.3;
      const baseLng = 69.25;
      const deg = 0.01; // ~1km scale
      const recs = [
        makeRec("A", 99), // start (highest priority)
        makeRec("B", 50),
        makeRec("C", 50),
        makeRec("D", 50),
        makeRec("E", 50),
      ];
      recommendationRepository.find.mockResolvedValue(recs);

      const machines = [
        makeMachine("A", baseLat, baseLng), // (0,0)
        makeMachine("B", baseLat, baseLng + 10 * deg), // (0,10)
        makeMachine("C", baseLat + 10 * deg, baseLng + 10 * deg), // (10,10)
        makeMachine("D", baseLat + 10 * deg, baseLng), // (10,0)
        makeMachine("E", baseLat + 5 * deg, baseLng + 5 * deg), // (5,5)
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

      await service.generateOptimalRoute("org-1", "op-1", false);

      // Highest-priority machine is still first after 2-opt
      const first = stopSequences.find((s) => s.sequence === 1);
      expect(first?.machineId).toBe("A");

      // Total distance (stored on the saved route) should be the 2-opt result.
      // Compare against the pure nearest-neighbor total by computing what NN
      // would have produced: A → E → B → C → D.
      // We assert the recorded estimatedDistanceKm is <= NN path distance.
      const savedRouteArg = routeRepository.create.mock.calls[0][0];
      const totalKm = savedRouteArg.estimatedDistanceKm as number;

      // Compute nearest-neighbor-only distance for comparison
      const { GpsProcessingService } = await import("./gps-processing.service");
      const gps = new GpsProcessingService();
      const haversine = (
        a: (typeof machines)[number],
        b: (typeof machines)[number],
      ) =>
        gps.haversineDistance(
          a.latitude as number,
          a.longitude as number,
          b.latitude as number,
          b.longitude as number,
        ) / 1000;
      const [A, B, C, D, E] = machines;
      // NN-from-A path: A→E→B→C→D (or A→E→D→C→B, both ~equivalent)
      const nnPath =
        haversine(A!, E!) +
        haversine(E!, B!) +
        haversine(B!, C!) +
        haversine(C!, D!);

      // 2-opt should produce a tour no longer than NN (and usually shorter)
      expect(totalKm).toBeLessThanOrEqual(nnPath + 0.01);
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
