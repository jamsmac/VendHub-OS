import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import {
  TripReconciliationService,
  ReconciliationStatus,
  MismatchSeverity,
} from "./trip-reconciliation.service";
import { TripReconciliation } from "../../trips/entities/trip-reconciliation.entity";
import { Route as Trip } from "../../routes/entities/route.entity";
import { RouteStop as TripStop } from "../../routes/entities/route.entity";
import { RouteTaskLink as TripTaskLink } from "../../routes/entities/route-task-link.entity";
import { GpsProcessingService } from "../../routes/services/gps-processing.service";

describe("TripReconciliationService", () => {
  let service: TripReconciliationService;
  let reconRepo: any;
  let tripRepo: any;
  let stopRepo: any;
  let taskLinkRepo: any;
  let gpsService: any;

  const orgId = "org-uuid-1";
  const tripId = "trip-uuid-1";

  beforeEach(async () => {
    reconRepo = {
      create: jest
        .fn()
        .mockImplementation((data) => ({ id: "recon-1", ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOneOrFail: jest.fn(),
    };

    tripRepo = {
      findOne: jest.fn(),
    };

    stopRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    taskLinkRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    gpsService = {
      haversineDistance: jest.fn().mockReturnValue(0),
      isWithinRadius: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripReconciliationService,
        {
          provide: getRepositoryToken(TripReconciliation),
          useValue: reconRepo,
        },
        { provide: getRepositoryToken(Trip), useValue: tripRepo },
        { provide: getRepositoryToken(TripStop), useValue: stopRepo },
        { provide: getRepositoryToken(TripTaskLink), useValue: taskLinkRepo },
        { provide: GpsProcessingService, useValue: gpsService },
      ],
    }).compile();

    service = module.get<TripReconciliationService>(TripReconciliationService);
  });

  // --------------------------------------------------------------------------
  // reconcileTrip - basic flows
  // --------------------------------------------------------------------------

  it("should throw NotFoundException when trip does not exist", async () => {
    tripRepo.findOne.mockResolvedValue(null);

    await expect(service.reconcileTrip(tripId, orgId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should return MATCHED status when there are no mismatches", async () => {
    tripRepo.findOne.mockResolvedValue({
      id: tripId,
      startOdometer: null,
      endOdometer: null,
      calculatedDistanceMeters: 0,
    });

    const result = await service.reconcileTrip(tripId, orgId);

    expect(result.status).toBe(ReconciliationStatus.MATCHED);
    expect(result.mismatches).toEqual([]);
    expect(reconRepo.save).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Distance mismatch detection
  // --------------------------------------------------------------------------

  it("should detect odometer vs GPS distance mismatch", async () => {
    tripRepo.findOne.mockResolvedValue({
      id: tripId,
      startOdometer: 10000,
      endOdometer: 10050, // 50km by odometer
      calculatedDistanceMeters: 30_000, // 30km by GPS -> 40% diff
    });

    const result = await service.reconcileTrip(tripId, orgId);

    const distMismatch = (result.mismatches as any[]).find(
      (m: any) => m.type === "odometer_mismatch",
    );
    expect(distMismatch).toBeDefined();
    expect(distMismatch.severity).toBe(MismatchSeverity.HIGH); // >30% = HIGH
  });

  it("should not flag distance when within tolerance", async () => {
    tripRepo.findOne.mockResolvedValue({
      id: tripId,
      startOdometer: 10000,
      endOdometer: 10050, // 50km
      calculatedDistanceMeters: 48_000, // 48km -> 4% diff
    });

    const result = await service.reconcileTrip(tripId, orgId);

    const distMismatch = (result.mismatches as any[]).find(
      (m: any) => m.type === "odometer_mismatch",
    );
    expect(distMismatch).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // GPS mismatch detection
  // --------------------------------------------------------------------------

  it("should detect GPS location mismatches from task links", async () => {
    tripRepo.findOne.mockResolvedValue({
      id: tripId,
      startOdometer: null,
      endOdometer: null,
      calculatedDistanceMeters: 0,
    });

    taskLinkRepo.find.mockResolvedValue([
      {
        vhm24TaskId: "task-1",
        verificationStatus: "mismatch",
        expectedLatitude: 41.31,
        expectedLongitude: 69.28,
        actualLatitude: 41.35,
        actualLongitude: 69.3,
        distanceFromExpectedM: 500,
      },
    ]);

    const result = await service.reconcileTrip(tripId, orgId);

    const gpsMismatch = (result.mismatches as any[]).find(
      (m: any) => m.type === "gps_location",
    );
    expect(gpsMismatch).toBeDefined();
    expect(gpsMismatch.severity).toBe(MismatchSeverity.MEDIUM);
  });

  // --------------------------------------------------------------------------
  // Stop mismatch detection
  // --------------------------------------------------------------------------

  it("should detect skipped tasks (missing stops)", async () => {
    tripRepo.findOne.mockResolvedValue({
      id: tripId,
      startOdometer: null,
      endOdometer: null,
      calculatedDistanceMeters: 0,
    });

    taskLinkRepo.find.mockResolvedValue([
      { vhm24TaskId: "task-1", verificationStatus: "skipped" },
    ]);

    const result = await service.reconcileTrip(tripId, orgId);

    const missingStop = (result.mismatches as any[]).find(
      (m: any) => m.type === "missing_stop",
    );
    expect(missingStop).toBeDefined();
    expect(missingStop.severity).toBe(MismatchSeverity.HIGH);
  });

  it("should detect short stops at known locations", async () => {
    tripRepo.findOne.mockResolvedValue({
      id: tripId,
      startOdometer: null,
      endOdometer: null,
      calculatedDistanceMeters: 0,
    });

    stopRepo.find.mockResolvedValue([
      {
        id: "stop-1",
        actualDurationSeconds: 30, // too short (min 120s)
        machineId: "machine-1",
      },
    ]);

    const result = await service.reconcileTrip(tripId, orgId);

    const shortStop = (result.mismatches as any[]).find(
      (m: any) => m.type === "stop_too_short",
    );
    expect(shortStop).toBeDefined();
    expect(shortStop.severity).toBe(MismatchSeverity.LOW);
  });

  // --------------------------------------------------------------------------
  // Overall severity calculation
  // --------------------------------------------------------------------------

  it("should set REVIEW status when high severity mismatches exist", async () => {
    tripRepo.findOne.mockResolvedValue({
      id: tripId,
      startOdometer: 10000,
      endOdometer: 10050,
      calculatedDistanceMeters: 25_000, // 50% diff -> HIGH
    });

    const result = await service.reconcileTrip(tripId, orgId);

    expect(result.status).toBe(ReconciliationStatus.REVIEW);
    expect(result.overallSeverity).toBe(MismatchSeverity.HIGH);
  });

  // --------------------------------------------------------------------------
  // resolve
  // --------------------------------------------------------------------------

  it("should resolve a reconciliation with notes", async () => {
    const existing = {
      id: "recon-1",
      status: ReconciliationStatus.REVIEW,
      resolvedById: null,
      resolvedAt: null,
      resolutionNotes: null,
    };
    reconRepo.findOneOrFail.mockResolvedValue(existing);

    const result = await service.resolve("recon-1", "user-1", "Looks OK");

    expect(result.status).toBe(ReconciliationStatus.RESOLVED);
    expect(result.resolvedById).toBe("user-1");
    expect(result.resolutionNotes).toBe("Looks OK");
    expect(result.resolvedAt).toBeInstanceOf(Date);
  });

  // --------------------------------------------------------------------------
  // Stat tracking
  // --------------------------------------------------------------------------

  it("should track verified and mismatched task counts", async () => {
    tripRepo.findOne.mockResolvedValue({
      id: tripId,
      startOdometer: null,
      endOdometer: null,
      calculatedDistanceMeters: 0,
    });

    taskLinkRepo.find.mockResolvedValue([
      { verificationStatus: "verified" },
      { verificationStatus: "verified" },
      { verificationStatus: "mismatch", vhm24TaskId: "t3" },
    ]);

    const result = await service.reconcileTrip(tripId, orgId);

    expect(result.totalTasks).toBe(3);
    expect(result.verifiedTasks).toBe(2);
    expect(result.mismatchTasks).toBe(1);
  });
});
