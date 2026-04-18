import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Vhm24IntegrationService,
  WebhookPayload,
} from "./vhm24-integration.service";
import { RouteTaskLink as TripTaskLink } from "../routes/entities/route-task-link.entity";
import { RouteStop as TripStop } from "../routes/entities/route.entity";
import {
  MachineLocationSync,
  SyncStatus,
} from "./entities/machine-location-sync.entity";
import { GpsProcessingService } from "../routes/services/gps-processing.service";

describe("Vhm24IntegrationService", () => {
  let service: Vhm24IntegrationService;
  let _taskLinkRepo: jest.Mocked<Repository<TripTaskLink>>;
  let _stopRepo: jest.Mocked<Repository<TripStop>>;
  let _syncRepo: jest.Mocked<Repository<MachineLocationSync>>;
  let _gpsService: jest.Mocked<GpsProcessingService>;

  const mockTaskLinkRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneOrFail: jest.fn(),
  };

  const mockStopRepo = {
    find: jest.fn(),
  };

  const mockSyncRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockGpsService = {
    haversineDistance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Vhm24IntegrationService,
        {
          provide: getRepositoryToken(TripTaskLink),
          useValue: mockTaskLinkRepo,
        },
        {
          provide: getRepositoryToken(TripStop),
          useValue: mockStopRepo,
        },
        {
          provide: getRepositoryToken(MachineLocationSync),
          useValue: mockSyncRepo,
        },
        {
          provide: GpsProcessingService,
          useValue: mockGpsService,
        },
      ],
    }).compile();

    service = module.get<Vhm24IntegrationService>(Vhm24IntegrationService);
    _taskLinkRepo = module.get(getRepositoryToken(TripTaskLink));
    _stopRepo = module.get(getRepositoryToken(TripStop));
    _syncRepo = module.get(getRepositoryToken(MachineLocationSync));
    _gpsService = module.get(GpsProcessingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // linkTasksToTrip
  // ==========================================================================

  describe("linkTasksToTrip", () => {
    const tripId = "trip-uuid-1";
    const tasks = [
      {
        vhm24TaskId: "task-1",
        vhm24TaskType: "collection",
        vhm24MachineId: "machine-1",
        expectedLatitude: 41.3111,
        expectedLongitude: 69.2797,
      },
      {
        vhm24TaskId: "task-2",
        vhm24TaskType: "filling",
        vhm24MachineId: "machine-2",
        expectedLatitude: 41.32,
        expectedLongitude: 69.29,
        verificationRadiusM: 200,
      },
    ];

    it("should create and save task links", async () => {
      const createdLinks = tasks.map((t, i) => ({
        id: `link-uuid-${i}`,
        routeId: tripId,
        ...t,
        verificationRadiusM: t.verificationRadiusM ?? 100,
        verificationStatus: "pending",
      }));

      mockTaskLinkRepo.create.mockImplementation((data) => data as any);
      mockTaskLinkRepo.save.mockResolvedValue(createdLinks as any);

      const result = await service.linkTasksToTrip(tripId, tasks);

      expect(mockTaskLinkRepo.create).toHaveBeenCalledTimes(2);
      expect(mockTaskLinkRepo.save).toHaveBeenCalledWith(expect.any(Array));
      expect(result).toEqual(createdLinks);
    });

    it("should use default verification radius of 100m when not specified", async () => {
      const singleTask = [
        {
          vhm24TaskId: "task-x",
          vhm24TaskType: "repair",
          vhm24MachineId: "machine-x",
          expectedLatitude: 41.0,
          expectedLongitude: 69.0,
        },
      ];

      mockTaskLinkRepo.create.mockImplementation((data) => data as any);
      mockTaskLinkRepo.save.mockResolvedValue([] as any);

      await service.linkTasksToTrip(tripId, singleTask);

      expect(mockTaskLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationRadiusM: 100,
        }),
      );
    });
  });

  // ==========================================================================
  // verifyTaskByStop
  // ==========================================================================

  describe("verifyTaskByStop", () => {
    const tripId = "trip-uuid-1";
    const stop: Partial<TripStop> = {
      id: "stop-uuid-1",
      routeId: tripId,
      latitude: 41.3111,
      longitude: 69.2797,
      actualDurationSeconds: 300,
    };

    it("should verify tasks within radius", async () => {
      const pendingLink = {
        id: "link-1",
        routeId: tripId,
        vhm24TaskId: "task-1",
        verificationStatus: "pending",
        expectedLatitude: 41.3112,
        expectedLongitude: 69.2798,
        verificationRadiusM: 100,
        actualLatitude: null,
        actualLongitude: null,
        distanceFromExpectedM: null,
        stopDurationSeconds: null,
        tripStopId: null,
      };

      mockTaskLinkRepo.find.mockResolvedValue([pendingLink] as any);
      mockGpsService.haversineDistance.mockReturnValue(15); // 15m, within 100m radius

      const result = await service.verifyTaskByStop(tripId, stop as TripStop);

      expect(mockGpsService.haversineDistance).toHaveBeenCalledWith(
        stop.latitude,
        stop.longitude,
        pendingLink.expectedLatitude,
        pendingLink.expectedLongitude,
      );
      expect(result).toHaveLength(1);
      expect(result[0].verificationStatus).toBe("verified");
      expect(result[0].actualLatitude).toBe(stop.latitude);
      expect(result[0].distanceFromExpectedM).toBe(15);
      expect(mockTaskLinkRepo.save).toHaveBeenCalled();
    });

    it("should not verify tasks outside radius", async () => {
      const pendingLink = {
        id: "link-1",
        routeId: tripId,
        vhm24TaskId: "task-1",
        verificationStatus: "pending",
        expectedLatitude: 41.5,
        expectedLongitude: 69.5,
        verificationRadiusM: 100,
      };

      mockTaskLinkRepo.find.mockResolvedValue([pendingLink] as any);
      mockGpsService.haversineDistance.mockReturnValue(5000); // 5km, way outside

      const result = await service.verifyTaskByStop(tripId, stop as TripStop);

      expect(result).toHaveLength(0);
      expect(mockTaskLinkRepo.save).not.toHaveBeenCalled();
    });

    it("should skip tasks without expected coordinates", async () => {
      const pendingLink = {
        id: "link-1",
        routeId: tripId,
        vhm24TaskId: "task-1",
        verificationStatus: "pending",
        expectedLatitude: null,
        expectedLongitude: null,
      };

      mockTaskLinkRepo.find.mockResolvedValue([pendingLink] as any);

      const result = await service.verifyTaskByStop(tripId, stop as TripStop);

      expect(result).toHaveLength(0);
      expect(mockGpsService.haversineDistance).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // verifyAllTasksOnTripEnd
  // ==========================================================================

  describe("verifyAllTasksOnTripEnd", () => {
    const tripId = "trip-uuid-1";

    it("should verify pending tasks against all stops", async () => {
      const stops = [
        {
          id: "s1",
          routeId: tripId,
          latitude: 41.31,
          longitude: 69.28,
          startedAt: new Date(),
        },
        {
          id: "s2",
          routeId: tripId,
          latitude: 41.32,
          longitude: 69.29,
          startedAt: new Date(),
        },
      ];

      const pendingLink = {
        id: "link-1",
        routeId: tripId,
        verificationStatus: "pending",
        expectedLatitude: 41.31,
        expectedLongitude: 69.28,
        verificationRadiusM: 100,
        actualLatitude: null,
        actualLongitude: null,
        distanceFromExpectedM: null,
        tripStopId: null,
      };

      mockStopRepo.find.mockResolvedValue(stops as any);
      mockTaskLinkRepo.find.mockResolvedValue([pendingLink] as any);
      mockGpsService.haversineDistance
        .mockReturnValueOnce(10) // distance to first stop (close)
        .mockReturnValueOnce(1500); // distance to second stop (far)
      mockTaskLinkRepo.save.mockResolvedValue([] as any);

      await service.verifyAllTasksOnTripEnd(tripId);

      expect(pendingLink.verificationStatus).toBe("verified");
      expect(pendingLink.actualLatitude).toBe(41.31);
      expect(pendingLink.distanceFromExpectedM).toBe(10);
      expect(mockTaskLinkRepo.save).toHaveBeenCalled();
    });

    it("should mark as mismatch when closest stop is beyond radius", async () => {
      const stops = [
        {
          id: "s1",
          routeId: tripId,
          latitude: 41.5,
          longitude: 69.5,
          startedAt: new Date(),
        },
      ];

      const pendingLink = {
        id: "link-1",
        routeId: tripId,
        verificationStatus: "pending",
        expectedLatitude: 41.31,
        expectedLongitude: 69.28,
        verificationRadiusM: 100,
        actualLatitude: null,
        actualLongitude: null,
        distanceFromExpectedM: null,
      };

      mockStopRepo.find.mockResolvedValue(stops as any);
      mockTaskLinkRepo.find.mockResolvedValue([pendingLink] as any);
      mockGpsService.haversineDistance.mockReturnValue(25000); // 25km away
      mockTaskLinkRepo.save.mockResolvedValue([] as any);

      await service.verifyAllTasksOnTripEnd(tripId);

      expect(pendingLink.verificationStatus).toBe("mismatch");
    });

    it("should mark as skipped when no stops exist", async () => {
      const pendingLink = {
        id: "link-1",
        routeId: tripId,
        verificationStatus: "pending",
        expectedLatitude: 41.31,
        expectedLongitude: 69.28,
        verificationRadiusM: 100,
      };

      mockStopRepo.find.mockResolvedValue([]); // no stops
      mockTaskLinkRepo.find.mockResolvedValue([pendingLink] as any);
      mockTaskLinkRepo.save.mockResolvedValue([] as any);

      await service.verifyAllTasksOnTripEnd(tripId);

      expect(pendingLink.verificationStatus).toBe("skipped");
    });

    it("should skip tasks without expected coordinates", async () => {
      const pendingLink = {
        id: "link-1",
        routeId: tripId,
        verificationStatus: "pending",
        expectedLatitude: null,
        expectedLongitude: null,
      };

      mockStopRepo.find.mockResolvedValue([]);
      mockTaskLinkRepo.find.mockResolvedValue([pendingLink] as any);
      mockTaskLinkRepo.save.mockResolvedValue([] as any);

      await service.verifyAllTasksOnTripEnd(tripId);

      expect(pendingLink.verificationStatus).toBe("skipped");
    });
  });

  // ==========================================================================
  // manualVerifyTask
  // ==========================================================================

  describe("manualVerifyTask", () => {
    it("should update verification status and set override user", async () => {
      const link = {
        id: "link-uuid-1",
        verificationStatus: "pending",
        overriddenById: null,
      };

      mockTaskLinkRepo.findOneOrFail.mockResolvedValue(link as any);
      mockTaskLinkRepo.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.manualVerifyTask(
        "link-uuid-1",
        "admin-1",
        "verified",
      );

      expect(result.verificationStatus).toBe("verified");
      expect(result.overriddenById).toBe("admin-1");
    });
  });

  // ==========================================================================
  // syncMachines
  // ==========================================================================

  describe("syncMachines", () => {
    const orgId = "org-uuid-1";
    const machines = [
      {
        machineId: "vm-001",
        machineName: "Coffee Machine #1",
        latitude: 41.3111,
        longitude: 69.2797,
        address: "Tashkent, Amir Temur 1",
      },
    ];

    it("should create new sync record when machine does not exist", async () => {
      mockSyncRepo.findOne.mockResolvedValue(null); // not found
      mockSyncRepo.create.mockImplementation((data) => data as any);
      mockSyncRepo.save.mockResolvedValue({} as any);

      const result = await service.syncMachines(orgId, machines);

      expect(mockSyncRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          vhm24MachineId: "vm-001",
          vhm24MachineName: "Coffee Machine #1",
          vhm24Latitude: 41.3111,
          vhm24Longitude: 69.2797,
          syncStatus: SyncStatus.ACTIVE,
        }),
      );
      expect(result).toEqual({ synced: 1, skipped: 0 });
    });

    it("should update existing sync record", async () => {
      const existing = {
        id: "sync-uuid-1",
        organizationId: orgId,
        vhm24MachineId: "vm-001",
        vhm24MachineName: "Old Name",
        vhm24Latitude: 41.0,
        vhm24Longitude: 69.0,
        vhm24Address: null,
        lastSyncedAt: null,
      };

      mockSyncRepo.findOne.mockResolvedValue({ ...existing } as any);
      mockSyncRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.syncMachines(orgId, machines);

      expect(mockSyncRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          vhm24MachineName: "Coffee Machine #1",
          vhm24Latitude: 41.3111,
          vhm24Longitude: 69.2797,
          vhm24Address: "Tashkent, Amir Temur 1",
        }),
      );
      expect(result).toEqual({ synced: 1, skipped: 0 });
    });

    it("should handle multiple machines", async () => {
      const multipleMachines = [
        { machineId: "vm-001", latitude: 41.31, longitude: 69.28 },
        { machineId: "vm-002", latitude: 41.32, longitude: 69.29 },
        { machineId: "vm-003", latitude: 41.33, longitude: 69.3 },
      ];

      mockSyncRepo.findOne.mockResolvedValue(null);
      mockSyncRepo.create.mockImplementation((data) => data as any);
      mockSyncRepo.save.mockResolvedValue({} as any);

      const result = await service.syncMachines(orgId, multipleMachines);

      expect(result.synced).toBe(3);
      expect(result.skipped).toBe(0);
    });
  });

  // ==========================================================================
  // handleWebhook
  // ==========================================================================

  describe("handleWebhook", () => {
    const orgId = "org-uuid-1";

    it("should sync machine on machine.created event with coordinates", async () => {
      const payload: WebhookPayload = {
        event: "machine.created",
        data: {
          machineId: "vm-new",
          name: "New Machine",
          latitude: 41.31,
          longitude: 69.28,
        },
        timestamp: new Date().toISOString(),
        source: "vendhub",
      };

      // syncMachines internals
      mockSyncRepo.findOne.mockResolvedValue(null);
      mockSyncRepo.create.mockImplementation((data) => data as any);
      mockSyncRepo.save.mockResolvedValue({} as any);

      const result = await service.handleWebhook(orgId, payload);

      expect(result).toEqual({ handled: true, action: "machine_synced" });
    });

    it("should return no_coordinates when machine event lacks coordinates", async () => {
      const payload: WebhookPayload = {
        event: "machine.updated",
        data: { machineId: "vm-1" },
        timestamp: new Date().toISOString(),
        source: "vendhub",
      };

      const result = await service.handleWebhook(orgId, payload);

      expect(result).toEqual({ handled: false, action: "no_coordinates" });
    });

    it("should disable machine on machine.deleted event", async () => {
      const payload: WebhookPayload = {
        event: "machine.deleted",
        data: { machineId: "vm-del" },
        timestamp: new Date().toISOString(),
        source: "vendhub",
      };

      mockSyncRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.handleWebhook(orgId, payload);

      expect(mockSyncRepo.update).toHaveBeenCalledWith(
        { vhm24MachineId: "vm-del", organizationId: orgId },
        { syncStatus: SyncStatus.DISABLED },
      );
      expect(result).toEqual({ handled: true, action: "machine_disabled" });
    });

    it("should handle task.assigned event", async () => {
      const payload: WebhookPayload = {
        event: "task.assigned",
        data: { taskId: "t-1", assigneeId: "u-1" },
        timestamp: new Date().toISOString(),
        source: "vendhub",
      };

      const result = await service.handleWebhook(orgId, payload);

      expect(result).toEqual({ handled: true, action: "task_noted" });
    });

    it("should handle task.completed event", async () => {
      const payload: WebhookPayload = {
        event: "task.completed",
        data: { taskId: "t-1" },
        timestamp: new Date().toISOString(),
        source: "vendhub",
      };

      const result = await service.handleWebhook(orgId, payload);

      expect(result).toEqual({ handled: true, action: "task_noted" });
    });

    it("should return unknown_event for unrecognized events", async () => {
      const payload = {
        event: "order.placed" as any,
        data: {},
        timestamp: new Date().toISOString(),
        source: "external",
      };

      const result = await service.handleWebhook(orgId, payload);

      expect(result).toEqual({ handled: false, action: "unknown_event" });
    });
  });
});
