import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";

import { RoutesService } from "./routes.service";
import {
  Route,
  RouteType,
  RouteStatus,
  RouteStop,
  RouteStopStatus,
} from "./entities/route.entity";
import { RoutePoint } from "./entities/route-point.entity";
import { RouteAnomaly } from "./entities/route-anomaly.entity";
import { RouteTaskLink } from "./entities/route-task-link.entity";
import { Vehicle } from "../vehicles/entities/vehicle.entity";
import { RouteTrackingService } from "./services/route-tracking.service";
import { RouteAnalyticsService } from "./services/route-analytics.service";

describe("RoutesService", () => {
  let service: RoutesService;
  let routeRepository: jest.Mocked<Repository<Route>>;
  let routeStopRepository: jest.Mocked<Repository<RouteStop>>;

  const orgId = "org-uuid-1";

  const mockRoute = {
    id: "route-uuid-1",
    organizationId: orgId,
    operatorId: "operator-uuid-1",
    name: "Morning refill route - Chilanzar",
    type: RouteType.REFILL,
    status: RouteStatus.PLANNED,
    plannedDate: new Date("2024-12-20"),
    startedAt: null,
    completedAt: null,
    estimatedDurationMinutes: 180,
    actualDurationMinutes: null,
    estimatedDistanceKm: 45.5,
    actualDistanceKm: null,
    notes: null,
    metadata: {},
    stops: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: "user-uuid-1",
    updatedById: null,
  } as unknown as Route;

  const mockRouteStop = {
    id: "stop-uuid-1",
    routeId: "route-uuid-1",
    machineId: "machine-uuid-1",
    sequence: 1,
    taskId: null,
    status: RouteStopStatus.PENDING,
    estimatedArrival: null,
    actualArrival: null,
    departedAt: null,
    notes: null,
    latitude: 41.311081,
    longitude: 69.240562,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: "user-uuid-1",
    updatedById: null,
  } as unknown as RouteStop;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockRoute]),
    getCount: jest.fn().mockResolvedValue(1),
  };

  const mockRouteTrackingService = {
    addPoint: jest.fn(),
    addPointsBatch: jest.fn(),
    updateLiveLocationStatus: jest.fn(),
    getRouteTrack: jest.fn(),
    calculateHaversineDistance: jest.fn(),
  };

  const mockRouteAnalyticsService = {
    getEmployeeStats: jest.fn(),
    getMachineVisitStats: jest.fn(),
    getRoutesSummary: jest.fn(),
    getMainDashboard: jest.fn(),
    getActivityDashboard: jest.fn(),
    getEmployeeDashboard: jest.fn(),
    getVehiclesDashboard: jest.fn(),
    getAnomaliesDashboard: jest.fn(),
    getTaxiDashboard: jest.fn(),
  };

  beforeEach(async () => {
    // Reset query builder mocks before each test
    mockQueryBuilder.where.mockClear().mockReturnThis();
    mockQueryBuilder.andWhere.mockClear().mockReturnThis();
    mockQueryBuilder.leftJoinAndSelect.mockClear().mockReturnThis();
    mockQueryBuilder.orderBy.mockClear().mockReturnThis();
    mockQueryBuilder.addOrderBy.mockClear().mockReturnThis();
    mockQueryBuilder.skip.mockClear().mockReturnThis();
    mockQueryBuilder.take.mockClear().mockReturnThis();
    mockQueryBuilder.getMany.mockClear().mockResolvedValue([mockRoute]);
    mockQueryBuilder.getCount.mockClear().mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        {
          provide: getRepositoryToken(Route),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(RouteStop),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RoutePoint),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ total: 0 }),
            }),
          },
        },
        {
          provide: getRepositoryToken(RouteAnomaly),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(RouteTaskLink),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: RouteTrackingService,
          useValue: mockRouteTrackingService,
        },
        {
          provide: RouteAnalyticsService,
          useValue: mockRouteAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
    routeRepository = module.get(getRepositoryToken(Route));
    routeStopRepository = module.get(getRepositoryToken(RouteStop));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // ROUTE CRUD
  // ============================================================================

  describe("create", () => {
    it("should create a new route with PLANNED status and organizationId", async () => {
      routeRepository.create.mockReturnValue(mockRoute);
      routeRepository.save.mockResolvedValue(mockRoute);

      const result = await service.create(
        {
          organizationId: orgId,
          operatorId: "operator-uuid-1",
          name: "Morning refill route - Chilanzar",
          plannedDate: "2024-12-20",
          estimatedDurationMinutes: 180,
          estimatedDistanceKm: 45.5,
        },
        "user-uuid-1",
      );

      expect(result).toEqual(mockRoute);
      expect(routeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          operatorId: "operator-uuid-1",
          name: "Morning refill route - Chilanzar",
          status: RouteStatus.PLANNED,
          type: RouteType.REFILL,
          createdById: "user-uuid-1",
        }),
      );
      expect(routeRepository.save).toHaveBeenCalledWith(mockRoute);
    });

    it("should default type to REFILL when not provided", async () => {
      routeRepository.create.mockReturnValue(mockRoute);
      routeRepository.save.mockResolvedValue(mockRoute);

      await service.create({
        organizationId: orgId,
        operatorId: "operator-uuid-1",
        name: "Test Route",
        plannedDate: "2024-12-20",
      });

      expect(routeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RouteType.REFILL,
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated routes for organization", async () => {
      const result = await service.findAll(orgId, { page: 1, limit: 20 });

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total", 1);
      expect(result).toHaveProperty("page", 1);
      expect(result).toHaveProperty("limit", 20);
      expect(result).toHaveProperty("totalPages", 1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "route.organizationId = :organizationId",
        { organizationId: orgId },
      );
    });

    it("should filter by status", async () => {
      await service.findAll(orgId, {
        status: RouteStatus.PLANNED,
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "route.status = :status",
        { status: RouteStatus.PLANNED },
      );
    });

    it("should filter by name search with ILIKE", async () => {
      await service.findAll(orgId, {
        search: "Chilanzar",
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "route.name ILIKE :search",
        { search: "%Chilanzar%" },
      );
    });

    it("should use default page=1 and limit=20 when not provided", async () => {
      const result = await service.findAll(orgId);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  describe("findById", () => {
    it("should return route with stops when found", async () => {
      routeRepository.findOne.mockResolvedValue(mockRoute);

      const result = await service.findById("route-uuid-1");

      expect(result).toEqual(mockRoute);
      expect(routeRepository.findOne).toHaveBeenCalledWith({
        where: { id: "route-uuid-1" },
        relations: ["stops", "vehicle", "taskLinks", "anomalies"],
        order: { stops: { sequence: "ASC" } },
      });
    });

    it("should return null when route not found", async () => {
      routeRepository.findOne.mockResolvedValue(null);

      const result = await service.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update route fields when found", async () => {
      const updatedRoute = {
        ...mockRoute,
        name: "Updated Route Name",
      } as unknown as Route;
      routeRepository.findOne.mockResolvedValue(mockRoute);
      routeRepository.save.mockResolvedValue(updatedRoute);

      const result = await service.update(
        "route-uuid-1",
        { name: "Updated Route Name" },
        orgId,
        "user-uuid-2",
      );

      expect(result.name).toBe("Updated Route Name");
      expect(routeRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when route not found", async () => {
      routeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update("non-existent", { name: "Updated" }, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when updating a completed route", async () => {
      const completedRoute = {
        ...mockRoute,
        status: RouteStatus.COMPLETED,
      } as unknown as Route;
      routeRepository.findOne.mockResolvedValue(completedRoute);

      await expect(
        service.update("route-uuid-1", { name: "Updated" }, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when updating a cancelled route", async () => {
      const cancelledRoute = {
        ...mockRoute,
        status: RouteStatus.CANCELLED,
      } as unknown as Route;
      routeRepository.findOne.mockResolvedValue(cancelledRoute);

      await expect(
        service.update("route-uuid-1", { name: "Updated" }, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should soft delete route when found", async () => {
      routeRepository.findOne.mockResolvedValue(mockRoute);

      routeRepository.softDelete.mockResolvedValue(undefined as any);

      await service.remove("route-uuid-1", orgId);

      expect(routeRepository.softDelete).toHaveBeenCalledWith("route-uuid-1");
    });

    it("should throw NotFoundException when route not found", async () => {
      routeRepository.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when deleting an in-progress route", async () => {
      const inProgressRoute = {
        ...mockRoute,
        status: RouteStatus.ACTIVE,
      } as unknown as Route;
      routeRepository.findOne.mockResolvedValue(inProgressRoute);

      await expect(service.remove("route-uuid-1", orgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // ROUTE LIFECYCLE
  // ============================================================================

  describe("startRoute", () => {
    it("should change status to ACTIVE and set startedAt", async () => {
      const plannedRoute = {
        ...mockRoute,
        status: RouteStatus.PLANNED,
      } as unknown as Route;
      const activeRoute = {
        ...plannedRoute,
        status: RouteStatus.ACTIVE,
        startedAt: new Date(),
        updatedById: "user-uuid-1",
      } as unknown as Route;
      // 1st call: findById (lookup route by id + orgId)
      // 2nd call: check no active route for operator (returns null = OK)
      // 3rd call: findById return after save
      routeRepository.findOne
        .mockResolvedValueOnce(plannedRoute)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(activeRoute);
      routeRepository.save.mockImplementation(async (route) => route as Route);

      const result = await service.startRoute(
        "route-uuid-1",
        "user-uuid-1",
        orgId,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(RouteStatus.ACTIVE);
      expect(routeRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent route", async () => {
      routeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.startRoute("non-existent", "user-uuid-1", orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when current status is not PLANNED or DRAFT", async () => {
      const activeRoute = {
        ...mockRoute,
        status: RouteStatus.ACTIVE,
      } as unknown as Route;
      routeRepository.findOne.mockResolvedValue(activeRoute);

      await expect(
        service.startRoute("route-uuid-1", "user-uuid-1", orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("endRoute", () => {
    it("should change status to COMPLETED and set completedAt", async () => {
      const startedAt = new Date("2024-12-20T08:00:00Z");
      const activeRoute = {
        ...mockRoute,
        status: RouteStatus.ACTIVE,
        startedAt,
        vehicleId: null,
        startOdometer: null,
      } as unknown as Route;
      // findById calls findOne twice (first for endRoute lookup, second for return)
      routeRepository.findOne
        .mockResolvedValueOnce(activeRoute)
        .mockResolvedValueOnce({
          ...activeRoute,
          status: RouteStatus.COMPLETED,
        } as unknown as Route);
      routeRepository.save.mockImplementation(async (route) => route as Route);

      const pointRepo = service["pointRepository"] as jest.Mocked<any>;
      pointRepo.findOne.mockResolvedValue(null);
      pointRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 0 }),
      });

      const stopRepo = service["routeStopRepository"] as jest.Mocked<any>;
      stopRepo.find.mockResolvedValue([]);

      const result = await service.endRoute(
        "route-uuid-1",
        "user-uuid-1",
        orgId,
      );

      expect(result).toBeDefined();
      expect(routeRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException for non-existent route", async () => {
      routeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.endRoute("non-existent", "user-uuid-1", orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when current status is not ACTIVE", async () => {
      const plannedRoute = {
        ...mockRoute,
        status: RouteStatus.PLANNED,
      } as unknown as Route;
      routeRepository.findOne.mockResolvedValue(plannedRoute);

      await expect(
        service.endRoute("route-uuid-1", "user-uuid-1", orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // ROUTE STOP MANAGEMENT
  // ============================================================================

  describe("addStop", () => {
    it("should add a stop to a route with given sequence number", async () => {
      routeRepository.findOne.mockResolvedValue(mockRoute);
      routeStopRepository.findOne.mockResolvedValue(null); // no duplicate sequence
      routeStopRepository.create.mockReturnValue(mockRouteStop);
      routeStopRepository.save.mockResolvedValue(mockRouteStop);

      const result = await service.addStop(
        "route-uuid-1",
        {
          machineId: "machine-uuid-1",
          sequence: 1,
          latitude: 41.311081,
          longitude: 69.240562,
        },
        "user-uuid-1",
      );

      expect(result).toEqual(mockRouteStop);
      expect(routeStopRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: "route-uuid-1",
          machineId: "machine-uuid-1",
          sequence: 1,
          status: RouteStopStatus.PENDING,
          createdById: "user-uuid-1",
        }),
      );
      expect(routeStopRepository.save).toHaveBeenCalledWith(mockRouteStop);
    });

    it("should throw NotFoundException when route does not exist", async () => {
      routeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addStop("non-existent", {
          machineId: "machine-uuid-1",
          sequence: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for duplicate sequence on same route", async () => {
      routeRepository.findOne.mockResolvedValue(mockRoute);
      routeStopRepository.findOne.mockResolvedValue(mockRouteStop); // duplicate sequence

      await expect(
        service.addStop("route-uuid-1", {
          machineId: "machine-uuid-2",
          sequence: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when adding stop to completed route", async () => {
      const completedRoute = {
        ...mockRoute,
        status: RouteStatus.COMPLETED,
      } as unknown as Route;
      routeRepository.findOne.mockResolvedValue(completedRoute);

      await expect(
        service.addStop("route-uuid-1", {
          machineId: "machine-uuid-1",
          sequence: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateStop", () => {
    it("should update stop details when found", async () => {
      const updatedStop = {
        ...mockRouteStop,
        notes: "Updated notes",
        status: RouteStopStatus.ARRIVED,
      } as unknown as RouteStop;
      routeStopRepository.findOne.mockResolvedValue(mockRouteStop);
      routeStopRepository.save.mockResolvedValue(updatedStop);

      const result = await service.updateStop(
        "stop-uuid-1",
        { notes: "Updated notes", status: RouteStopStatus.ARRIVED },
        "user-uuid-2",
      );

      expect(result.notes).toBe("Updated notes");
      expect(result.status).toBe(RouteStopStatus.ARRIVED);
    });

    it("should throw NotFoundException when stop not found", async () => {
      routeStopRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStop("non-existent", { notes: "Test" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("reorderStops", () => {
    it("should reorder stops by new ID order and assign correct sequences", async () => {
      const stop1 = {
        ...mockRouteStop,
        id: "stop-uuid-1",
        sequence: 1,
      } as unknown as RouteStop;
      const stop2 = {
        ...mockRouteStop,
        id: "stop-uuid-2",
        sequence: 2,
      } as unknown as RouteStop;
      const stop3 = {
        ...mockRouteStop,
        id: "stop-uuid-3",
        sequence: 3,
      } as unknown as RouteStop;

      routeRepository.findOne.mockResolvedValue(mockRoute);
      routeStopRepository.find.mockResolvedValue([stop1, stop2, stop3]);
      routeStopRepository.save.mockImplementation(
        async (stop) => stop as RouteStop,
      );

      const result = await service.reorderStops(
        "route-uuid-1",
        ["stop-uuid-3", "stop-uuid-1", "stop-uuid-2"],
        "user-uuid-1",
      );

      expect(result).toHaveLength(3);
      // Verify stops are sorted by sequence in returned result
      expect(result[0].sequence).toBeLessThanOrEqual(result[1].sequence);
      expect(result[1].sequence).toBeLessThanOrEqual(result[2].sequence);
    });

    it("should throw NotFoundException when route does not exist", async () => {
      routeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reorderStops("non-existent", ["stop-uuid-1"]),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when stop ID does not belong to route", async () => {
      const stop1 = {
        ...mockRouteStop,
        id: "stop-uuid-1",
        sequence: 1,
      } as unknown as RouteStop;
      routeRepository.findOne.mockResolvedValue(mockRoute);
      routeStopRepository.find.mockResolvedValue([stop1]);

      await expect(
        service.reorderStops("route-uuid-1", [
          "stop-uuid-1",
          "foreign-stop-id",
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when reordering stops on completed route", async () => {
      const completedRoute = {
        ...mockRoute,
        status: RouteStatus.COMPLETED,
      } as unknown as Route;
      routeRepository.findOne.mockResolvedValue(completedRoute);

      await expect(
        service.reorderStops("route-uuid-1", ["stop-uuid-1"]),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getStops", () => {
    it("should return stops for route ordered by sequence ASC", async () => {
      const stop1 = {
        ...mockRouteStop,
        id: "stop-uuid-1",
        sequence: 1,
      } as unknown as RouteStop;
      const stop2 = {
        ...mockRouteStop,
        id: "stop-uuid-2",
        sequence: 2,
      } as unknown as RouteStop;
      routeStopRepository.find.mockResolvedValue([stop1, stop2]);

      const result = await service.getStops("route-uuid-1");

      expect(result).toHaveLength(2);
      expect(result[0].sequence).toBe(1);
      expect(result[1].sequence).toBe(2);
      expect(routeStopRepository.find).toHaveBeenCalledWith({
        where: { routeId: "route-uuid-1" },
        order: { sequence: "ASC" },
      });
    });

    it("should return empty array when route has no stops", async () => {
      routeStopRepository.find.mockResolvedValue([]);

      const result = await service.getStops("route-uuid-1");

      expect(result).toEqual([]);
    });
  });

  describe("removeStop", () => {
    it("should soft delete stop when found", async () => {
      routeStopRepository.findOne.mockResolvedValue(mockRouteStop);

      routeStopRepository.softDelete.mockResolvedValue(undefined as any);

      await service.removeStop("stop-uuid-1");

      expect(routeStopRepository.softDelete).toHaveBeenCalledWith(
        "stop-uuid-1",
      );
    });

    it("should throw NotFoundException when stop not found", async () => {
      routeStopRepository.findOne.mockResolvedValue(null);

      await expect(service.removeStop("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
