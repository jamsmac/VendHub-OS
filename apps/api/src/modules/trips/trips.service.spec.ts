import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { TripsService } from './trips.service';
import { Trip, TripStatus, TripTaskType } from './entities/trip.entity';
import { TripPoint } from './entities/trip-point.entity';
import { TripStop } from './entities/trip-stop.entity';
import { TripAnomaly, AnomalyType, AnomalySeverity } from './entities/trip-anomaly.entity';
import { TripTaskLink, TripTaskLinkStatus } from './entities/trip-task-link.entity';
import { TripReconciliation } from './entities/trip-reconciliation.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

describe('TripsService', () => {
  let service: TripsService;
  let tripRepository: jest.Mocked<Repository<Trip>>;
  let pointRepository: jest.Mocked<Repository<TripPoint>>;
  let stopRepository: jest.Mocked<Repository<TripStop>>;
  let anomalyRepository: jest.Mocked<Repository<TripAnomaly>>;
  let taskLinkRepository: jest.Mocked<Repository<TripTaskLink>>;
  let reconciliationRepository: jest.Mocked<Repository<TripReconciliation>>;
  let vehicleRepository: jest.Mocked<Repository<Vehicle>>;

  const mockTrip = {
    id: 'trip-uuid-1',
    organizationId: 'org-uuid-1',
    employeeId: 'emp-uuid-1',
    vehicleId: 'vehicle-uuid-1',
    taskType: TripTaskType.FILLING,
    status: TripStatus.ACTIVE,
    startedAt: new Date(),
    endedAt: null,
    startOdometer: 50000,
    endOdometer: null,
    calculatedDistanceMeters: 0,
    totalPoints: 0,
    totalStops: 0,
    totalAnomalies: 0,
    visitedMachinesCount: 0,
    liveLocationActive: false,
    lastLocationUpdate: null,
    notes: null,
    vehicle: null,
    taskLinks: [],
    stops: [],
    anomalies: [],
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Trip;

  const mockVehicle = {
    id: 'vehicle-uuid-1',
    organizationId: 'org-uuid-1',
    currentOdometer: 50000,
  } as unknown as Vehicle;

  const createMockUpdateQueryBuilder = () => ({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  });

  const createMockSelectQueryBuilder = (result: any = null) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(result),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        {
          provide: getRepositoryToken(Trip),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
            manager: { query: jest.fn().mockResolvedValue([]) },
          },
        },
        {
          provide: getRepositoryToken(TripPoint),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TripStop),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TripAnomaly),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TripTaskLink),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TripReconciliation),
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
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    tripRepository = module.get(getRepositoryToken(Trip));
    pointRepository = module.get(getRepositoryToken(TripPoint));
    stopRepository = module.get(getRepositoryToken(TripStop));
    anomalyRepository = module.get(getRepositoryToken(TripAnomaly));
    taskLinkRepository = module.get(getRepositoryToken(TripTaskLink));
    reconciliationRepository = module.get(getRepositoryToken(TripReconciliation));
    vehicleRepository = module.get(getRepositoryToken(Vehicle));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // TRIP LIFECYCLE
  // ============================================================================

  describe('startTrip', () => {
    it('should start a new trip successfully', async () => {
      tripRepository.findOne
        .mockResolvedValueOnce(null) // getActiveTrip: no active trip
        .mockResolvedValueOnce(mockTrip); // getTripById after save
      vehicleRepository.findOne.mockResolvedValueOnce(mockVehicle); // vehicle validation
      tripRepository.create.mockReturnValue(mockTrip);
      tripRepository.save.mockResolvedValue(mockTrip);

      const result = await service.startTrip({
        organizationId: 'org-uuid-1',
        employeeId: 'emp-uuid-1',
        vehicleId: 'vehicle-uuid-1',
        taskType: TripTaskType.FILLING,
        startOdometer: 50000,
      });

      expect(result).toBeDefined();
      expect(tripRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-uuid-1',
          employeeId: 'emp-uuid-1',
          status: TripStatus.ACTIVE,
        }),
      );
    });

    it('should throw ConflictException when employee has active trip', async () => {
      tripRepository.findOne.mockResolvedValue(mockTrip); // active trip exists

      await expect(
        service.startTrip({
          organizationId: 'org-uuid-1',
          employeeId: 'emp-uuid-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should link tasks when taskIds provided', async () => {
      tripRepository.findOne
        .mockResolvedValueOnce(null) // no active trip
        .mockResolvedValueOnce(mockTrip); // getTripById
      tripRepository.create.mockReturnValue(mockTrip);
      tripRepository.save.mockResolvedValue(mockTrip);
      taskLinkRepository.create.mockReturnValue({} as any);
      taskLinkRepository.save.mockResolvedValue([] as any);

      await service.startTrip({
        organizationId: 'org-uuid-1',
        employeeId: 'emp-uuid-1',
        taskIds: ['task-1', 'task-2'],
      });

      expect(taskLinkRepository.create).toHaveBeenCalledTimes(2);
      expect(taskLinkRepository.save).toHaveBeenCalled();
    });
  });

  describe('endTrip', () => {
    it('should end an active trip', async () => {
      const activeTrip = { ...mockTrip, status: TripStatus.ACTIVE } as any;
      tripRepository.findOne.mockResolvedValue(activeTrip);
      pointRepository.findOne.mockResolvedValue(null);

      const selectQb = createMockSelectQueryBuilder({ total: '0' });
      pointRepository.createQueryBuilder.mockReturnValue(selectQb as any);

      stopRepository.find.mockResolvedValue([]);

      const updateQb = createMockUpdateQueryBuilder();
      stopRepository.createQueryBuilder.mockReturnValue(updateQb as any);

      tripRepository.save.mockImplementation(async (t) => t as Trip);

      const result = await service.endTrip('trip-uuid-1', {}, 'user-1');

      expect(result.status).toBe(TripStatus.COMPLETED);
      expect(result.endedAt).toBeInstanceOf(Date);
      expect(result.liveLocationActive).toBe(false);
    });

    it('should throw BadRequestException when trip is not active', async () => {
      const completedTrip = { ...mockTrip, status: TripStatus.COMPLETED } as any;
      tripRepository.findOne.mockResolvedValue(completedTrip);

      await expect(
        service.endTrip('trip-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent trip', async () => {
      tripRepository.findOne.mockResolvedValue(null);

      await expect(
        service.endTrip('non-existent', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelTrip', () => {
    it('should cancel an active trip with reason', async () => {
      const activeTrip = { ...mockTrip, status: TripStatus.ACTIVE, notes: null } as any;
      tripRepository.findOne.mockResolvedValue(activeTrip);
      tripRepository.save.mockImplementation(async (t) => t as Trip);

      const result = await service.cancelTrip('trip-uuid-1', 'Wrong vehicle', 'user-1');

      expect(result.status).toBe(TripStatus.CANCELLED);
      expect(result.notes).toContain('Wrong vehicle');
    });

    it('should throw BadRequestException for non-active trip', async () => {
      const completedTrip = { ...mockTrip, status: TripStatus.COMPLETED } as any;
      tripRepository.findOne.mockResolvedValue(completedTrip);

      await expect(
        service.cancelTrip('trip-uuid-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getActiveTrip', () => {
    it('should return active trip for employee', async () => {
      tripRepository.findOne.mockResolvedValue(mockTrip);

      const result = await service.getActiveTrip('emp-uuid-1');

      expect(result).toEqual(mockTrip);
      expect(tripRepository.findOne).toHaveBeenCalledWith({
        where: { employeeId: 'emp-uuid-1', status: TripStatus.ACTIVE },
        relations: ['vehicle', 'taskLinks'],
      });
    });

    it('should return null when no active trip', async () => {
      tripRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveTrip('emp-uuid-1');

      expect(result).toBeNull();
    });
  });

  describe('getTripById', () => {
    it('should return trip with relations', async () => {
      tripRepository.findOne.mockResolvedValue(mockTrip);

      const result = await service.getTripById('trip-uuid-1');

      expect(result).toEqual(mockTrip);
      expect(tripRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'trip-uuid-1' },
        relations: ['vehicle', 'taskLinks', 'stops', 'anomalies'],
      });
    });

    it('should throw NotFoundException for non-existent trip', async () => {
      tripRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getTripById('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // GPS TRACKING
  // ============================================================================

  describe('addPoint', () => {
    it('should add a valid GPS point', async () => {
      const activeTrip = { ...mockTrip, status: TripStatus.ACTIVE } as any;
      tripRepository.findOne.mockResolvedValue(activeTrip);
      pointRepository.findOne.mockResolvedValue(null); // no previous point

      const savedPoint = { id: 'point-uuid-1', isFiltered: false, filterReason: null };
      pointRepository.create.mockReturnValue(savedPoint as any);
      pointRepository.save.mockResolvedValue(savedPoint as any);

      const updateQb = createMockUpdateQueryBuilder();
      tripRepository.createQueryBuilder.mockReturnValue(updateQb as any);
      tripRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Mock for stop detection
      pointRepository.find.mockResolvedValue([]);

      const result = await service.addPoint('trip-uuid-1', {
        latitude: 41.2995,
        longitude: 69.2401,
      });

      expect(result.id).toBe('point-uuid-1');
      expect(result.isFiltered).toBe(false);
    });

    it('should filter point with low accuracy', async () => {
      const activeTrip = { ...mockTrip, status: TripStatus.ACTIVE } as any;
      tripRepository.findOne.mockResolvedValue(activeTrip);
      pointRepository.findOne.mockResolvedValue(null);

      const savedPoint = { id: 'point-uuid-2', isFiltered: true, filterReason: 'LOW_ACCURACY' };
      pointRepository.create.mockReturnValue(savedPoint as any);
      pointRepository.save.mockResolvedValue(savedPoint as any);

      const updateQb = createMockUpdateQueryBuilder();
      tripRepository.createQueryBuilder.mockReturnValue(updateQb as any);

      const result = await service.addPoint('trip-uuid-1', {
        latitude: 41.2995,
        longitude: 69.2401,
        accuracy: 200, // exceeds MIN_GPS_ACCURACY_METERS (50)
      });

      expect(result.isFiltered).toBe(true);
      expect(result.filterReason).toBe('LOW_ACCURACY');
    });

    it('should throw NotFoundException for non-existent trip', async () => {
      tripRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addPoint('non-existent', { latitude: 41.0, longitude: 69.0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-active trip', async () => {
      const completedTrip = { ...mockTrip, status: TripStatus.COMPLETED } as any;
      tripRepository.findOne.mockResolvedValue(completedTrip);

      await expect(
        service.addPoint('trip-uuid-1', { latitude: 41.0, longitude: 69.0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set start coordinates on first valid point', async () => {
      const activeTrip = { ...mockTrip, status: TripStatus.ACTIVE } as any;
      tripRepository.findOne.mockResolvedValue(activeTrip);
      pointRepository.findOne.mockResolvedValue(null); // no previous = first point

      const savedPoint = { id: 'point-uuid-3', isFiltered: false, filterReason: null };
      pointRepository.create.mockReturnValue(savedPoint as any);
      pointRepository.save.mockResolvedValue(savedPoint as any);

      const updateQb = createMockUpdateQueryBuilder();
      tripRepository.createQueryBuilder.mockReturnValue(updateQb as any);
      tripRepository.update.mockResolvedValue({ affected: 1 } as any);
      pointRepository.find.mockResolvedValue([]);

      await service.addPoint('trip-uuid-1', {
        latitude: 41.2995,
        longitude: 69.2401,
      });

      expect(tripRepository.update).toHaveBeenCalledWith('trip-uuid-1', {
        startLatitude: 41.2995,
        startLongitude: 69.2401,
      });
    });
  });

  // ============================================================================
  // TASK LINKS
  // ============================================================================

  describe('linkTask', () => {
    it('should link task to trip', async () => {
      taskLinkRepository.findOne.mockResolvedValue(null);

      const mockLink = { tripId: 'trip-uuid-1', taskId: 'task-uuid-1' };
      taskLinkRepository.create.mockReturnValue(mockLink as any);
      taskLinkRepository.save.mockResolvedValue(mockLink as any);

      const result = await service.linkTask('trip-uuid-1', 'task-uuid-1', 'user-1');

      expect(result).toEqual(mockLink);
      expect(taskLinkRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: 'trip-uuid-1',
          taskId: 'task-uuid-1',
          status: TripTaskLinkStatus.PENDING,
        }),
      );
    });

    it('should throw ConflictException for duplicate link', async () => {
      taskLinkRepository.findOne.mockResolvedValue({ id: 'existing' } as any);

      await expect(
        service.linkTask('trip-uuid-1', 'task-uuid-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('completeLinkedTask', () => {
    it('should mark linked task as completed', async () => {
      const mockLink = {
        tripId: 'trip-uuid-1',
        taskId: 'task-uuid-1',
        status: TripTaskLinkStatus.IN_PROGRESS,
      } as any;
      taskLinkRepository.findOne.mockResolvedValue(mockLink);
      taskLinkRepository.save.mockImplementation(async (l) => l as TripTaskLink);

      const result = await service.completeLinkedTask(
        'trip-uuid-1',
        'task-uuid-1',
        'Done',
        'user-1',
      );

      expect(result.status).toBe(TripTaskLinkStatus.COMPLETED);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.notes).toBe('Done');
    });

    it('should throw NotFoundException for non-existent link', async () => {
      taskLinkRepository.findOne.mockResolvedValue(null);

      await expect(
        service.completeLinkedTask('trip-uuid-1', 'task-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // ANOMALIES
  // ============================================================================

  describe('createAnomaly', () => {
    it('should create and save anomaly', async () => {
      const mockAnomaly = {
        id: 'anomaly-uuid-1',
        tripId: 'trip-uuid-1',
        type: AnomalyType.SPEED_VIOLATION,
        severity: AnomalySeverity.WARNING,
      };
      anomalyRepository.create.mockReturnValue(mockAnomaly as any);
      anomalyRepository.save.mockResolvedValue(mockAnomaly as any);

      const updateQb = createMockUpdateQueryBuilder();
      tripRepository.createQueryBuilder.mockReturnValue(updateQb as any);

      const result = await service.createAnomaly('trip-uuid-1', 'org-uuid-1', {
        type: AnomalyType.SPEED_VIOLATION,
        severity: AnomalySeverity.WARNING,
        details: { speedKmh: 130, maxAllowedKmh: 120 },
      });

      expect(result).toEqual(mockAnomaly);
      expect(anomalyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: 'trip-uuid-1',
          type: AnomalyType.SPEED_VIOLATION,
        }),
      );
    });
  });

  describe('resolveAnomaly', () => {
    it('should resolve anomaly with notes', async () => {
      const mockAnomaly = {
        id: 'anomaly-uuid-1',
        tripId: 'trip-uuid-1',
        resolved: false,
        resolvedById: null,
      } as any;
      anomalyRepository.findOne.mockResolvedValue(mockAnomaly);
      tripRepository.findOne.mockResolvedValue(mockTrip); // org access check
      anomalyRepository.save.mockImplementation(async (a) => a as TripAnomaly);

      const result = await service.resolveAnomaly('anomaly-uuid-1', 'user-1', 'org-uuid-1', 'False alarm');

      expect(result.resolved).toBe(true);
      expect(result.resolvedById).toBe('user-1');
      expect(result.resolutionNotes).toBe('False alarm');
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException for non-existent anomaly', async () => {
      anomalyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resolveAnomaly('non-existent', 'user-1', 'org-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // RECONCILIATION
  // ============================================================================

  describe('performReconciliation', () => {
    it('should create reconciliation record', async () => {
      vehicleRepository.findOne.mockResolvedValue(mockVehicle);

      const mockRecon = { id: 'recon-uuid-1' };
      reconciliationRepository.create.mockReturnValue(mockRecon as any);
      reconciliationRepository.save.mockResolvedValue(mockRecon as any);
      vehicleRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.performReconciliation({
        organizationId: 'org-uuid-1',
        vehicleId: 'vehicle-uuid-1',
        actualOdometer: 52000,
        performedById: 'user-1',
      });

      expect(result).toEqual(mockRecon);
      expect(vehicleRepository.update).toHaveBeenCalledWith(
        'vehicle-uuid-1',
        expect.objectContaining({ currentOdometer: 52000 }),
      );
    });

    it('should throw NotFoundException for non-existent vehicle', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.performReconciliation({
          organizationId: 'org-uuid-1',
          vehicleId: 'non-existent',
          actualOdometer: 52000,
          performedById: 'user-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // HAVERSINE DISTANCE
  // ============================================================================

  describe('calculateHaversineDistance', () => {
    it('should return 0 for identical coordinates', () => {
      const dist = service.calculateHaversineDistance(41.2995, 69.2401, 41.2995, 69.2401);
      expect(dist).toBe(0);
    });

    it('should calculate correct distance between Tashkent points', () => {
      // ~1km apart
      const dist = service.calculateHaversineDistance(
        41.2995, 69.2401,
        41.3085, 69.2401,
      );
      expect(dist).toBeGreaterThan(900);
      expect(dist).toBeLessThan(1100);
    });

    it('should return symmetric results', () => {
      const d1 = service.calculateHaversineDistance(41.0, 69.0, 42.0, 70.0);
      const d2 = service.calculateHaversineDistance(42.0, 70.0, 41.0, 69.0);
      expect(Math.abs(d1 - d2)).toBeLessThan(0.01);
    });
  });
});
