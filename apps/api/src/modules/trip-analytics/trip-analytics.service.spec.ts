/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripAnalyticsService } from './trip-analytics.service';
import { Trip } from '../trips/entities/trip.entity';
import { TripAnomaly } from '../trips/entities/trip-anomaly.entity';
import { TripStop } from '../trips/entities/trip-stop.entity';

describe('TripAnalyticsService', () => {
  let service: TripAnalyticsService;
  let _tripRepo: jest.Mocked<Repository<Trip>>;
  let _anomalyRepo: jest.Mocked<Repository<TripAnomaly>>;
  let _stopRepo: jest.Mocked<Repository<TripStop>>;

  const mockTripRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };

  const mockAnomalyRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockStopRepo = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripAnalyticsService,
        {
          provide: getRepositoryToken(Trip),
          useValue: mockTripRepo,
        },
        {
          provide: getRepositoryToken(TripAnomaly),
          useValue: mockAnomalyRepo,
        },
        {
          provide: getRepositoryToken(TripStop),
          useValue: mockStopRepo,
        },
      ],
    }).compile();

    service = module.get<TripAnalyticsService>(TripAnalyticsService);
    _tripRepo = module.get(getRepositoryToken(Trip));
    _anomalyRepo = module.get(getRepositoryToken(TripAnomaly));
    _stopRepo = module.get(getRepositoryToken(TripStop));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // Shared QueryBuilder mock helper
  // ==========================================================================

  function createMockQb(rawResult: any) {
    return {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(rawResult),
      getRawMany: jest.fn().mockResolvedValue(Array.isArray(rawResult) ? rawResult : [rawResult]),
      getMany: jest.fn().mockResolvedValue(Array.isArray(rawResult) ? rawResult : [rawResult]),
    };
  }

  // ==========================================================================
  // getMainDashboard
  // ==========================================================================

  describe('getMainDashboard', () => {
    const orgId = 'org-uuid-1';
    const from = new Date('2026-03-01');
    const to = new Date('2026-03-07');

    it('should return KPI stats with period comparison', async () => {
      const periodStats = {
        totalTrips: '25',
        totalDistance: '150000',
        totalAnomalies: '3',
      };

      const prevPeriodStats = {
        totalTrips: '20',
        totalDistance: '120000',
        totalAnomalies: '5',
      };

      // getPeriodStats is called twice (current + previous)
      const mockQb1 = createMockQb(periodStats);
      const mockQb2 = createMockQb(prevPeriodStats);

      let callCount = 0;
      mockTripRepo.createQueryBuilder.mockImplementation(() => {
        callCount++;
        return (callCount <= 1 ? mockQb1 : mockQb2) as any;
      });

      const result = await service.getMainDashboard(orgId, from, to);

      expect(result.totalTrips).toBe(25);
      expect(result.totalDistance).toBe(150000);
      expect(result.totalAnomalies).toBe(3);
      expect(result.avgTripDistance).toBe(6000); // 150000 / 25
      expect(result.previousPeriod.totalTrips).toBe(20);
      expect(result.changePercent.trips).toBe(25); // (25-20)/20 * 100
    });

    it('should handle zero trips gracefully', async () => {
      const zeroStats = {
        totalTrips: '0',
        totalDistance: '0',
        totalAnomalies: '0',
      };

      mockTripRepo.createQueryBuilder.mockReturnValue(createMockQb(zeroStats) as any);

      const result = await service.getMainDashboard(orgId, from, to);

      expect(result.totalTrips).toBe(0);
      expect(result.avgTripDistance).toBe(0);
      expect(result.changePercent.trips).toBe(0);
      expect(result.changePercent.distance).toBe(0);
    });

    it('should calculate 100% change when previous period is zero', async () => {
      const currentStats = {
        totalTrips: '10',
        totalDistance: '50000',
        totalAnomalies: '1',
      };
      const prevZero = {
        totalTrips: '0',
        totalDistance: '0',
        totalAnomalies: '0',
      };

      let callCount = 0;
      mockTripRepo.createQueryBuilder.mockImplementation(() => {
        callCount++;
        return createMockQb(callCount <= 1 ? currentStats : prevZero) as any;
      });

      const result = await service.getMainDashboard(orgId, from, to);

      expect(result.changePercent.trips).toBe(100);
      expect(result.changePercent.distance).toBe(100);
    });
  });

  // ==========================================================================
  // getActivityDashboard
  // ==========================================================================

  describe('getActivityDashboard', () => {
    const orgId = 'org-uuid-1';
    const from = new Date('2026-03-01');
    const to = new Date('2026-03-07');

    it('should return distance by day and trips by hour', async () => {
      const distanceByDay = [
        { date: '2026-03-01', distance: '50000', trips: '5' },
        { date: '2026-03-02', distance: '30000', trips: '3' },
      ];

      const tripsByHour = [
        { hour: '8', count: '4' },
        { hour: '14', count: '6' },
      ];

      let callCount = 0;
      mockTripRepo.createQueryBuilder.mockImplementation(() => {
        callCount++;
        const data = callCount <= 1 ? distanceByDay : tripsByHour;
        return createMockQb(data) as any;
      });

      const result = await service.getActivityDashboard(orgId, from, to);

      expect(result.distanceByDay).toHaveLength(2);
      expect(result.distanceByDay[0].date).toBe('2026-03-01');
      expect(result.distanceByDay[0].distance).toBe(50000);
      expect(result.distanceByDay[0].trips).toBe(5);
      expect(result.tripsByHour).toHaveLength(2);
      expect(result.tripsByHour[0].hour).toBe(8);
      expect(result.tripsByHour[0].count).toBe(4);
    });
  });

  // ==========================================================================
  // getEmployeeDashboard
  // ==========================================================================

  describe('getEmployeeDashboard', () => {
    const orgId = 'org-uuid-1';
    const from = new Date('2026-03-01');
    const to = new Date('2026-03-07');

    it('should return employee rankings', async () => {
      const rawResults = [
        { employeeId: 'emp-1', tripCount: '10', totalDistance: '80000', totalAnomalies: '2' },
        { employeeId: 'emp-2', tripCount: '5', totalDistance: '40000', totalAnomalies: '0' },
      ];

      mockTripRepo.createQueryBuilder.mockReturnValue(createMockQb(rawResults) as any);

      const result = await service.getEmployeeDashboard(orgId, from, to);

      expect(result).toHaveLength(2);
      expect(result[0].employeeId).toBe('emp-1');
      expect(result[0].tripCount).toBe(10);
      expect(result[0].totalDistance).toBe(80000);
      expect(result[0].avgTripDistance).toBe(8000); // 80000 / 10
    });

    it('should handle employee with zero trips', async () => {
      const rawResults = [
        { employeeId: 'emp-x', tripCount: '0', totalDistance: '0', totalAnomalies: '0' },
      ];

      mockTripRepo.createQueryBuilder.mockReturnValue(createMockQb(rawResults) as any);

      const result = await service.getEmployeeDashboard(orgId, from, to);

      expect(result[0].avgTripDistance).toBe(0);
    });
  });

  // ==========================================================================
  // getVehiclesDashboard
  // ==========================================================================

  describe('getVehiclesDashboard', () => {
    const orgId = 'org-uuid-1';
    const from = new Date('2026-03-01');
    const to = new Date('2026-03-07');

    it('should return vehicle statistics', async () => {
      const rawResults = [
        { vehicleId: 'v-1', tripCount: '15', totalDistance: '100000', totalStops: '45' },
        { vehicleId: 'v-2', tripCount: '8', totalDistance: '60000', totalStops: '24' },
      ];

      mockTripRepo.createQueryBuilder.mockReturnValue(createMockQb(rawResults) as any);

      const result = await service.getVehiclesDashboard(orgId, from, to);

      expect(result).toHaveLength(2);
      expect(result[0].vehicleId).toBe('v-1');
      expect(result[0].tripCount).toBe(15);
      expect(result[0].totalDistance).toBe(100000);
      expect(result[0].totalStops).toBe(45);
    });

    it('should return empty array when no vehicles exist', async () => {
      mockTripRepo.createQueryBuilder.mockReturnValue(createMockQb([]) as any);

      const result = await service.getVehiclesDashboard(orgId, from, to);

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getAnomaliesDashboard
  // ==========================================================================

  describe('getAnomaliesDashboard', () => {
    const orgId = 'org-uuid-1';
    const from = new Date('2026-03-01');
    const to = new Date('2026-03-07');

    it('should return anomalies grouped by type and severity', async () => {
      const anomalies = [
        { id: 'a1', type: 'speed_violation', severity: 'warning', createdAt: new Date() },
        { id: 'a2', type: 'speed_violation', severity: 'critical', createdAt: new Date() },
        { id: 'a3', type: 'long_stop', severity: 'warning', createdAt: new Date() },
      ];

      const mockQb = createMockQb(anomalies);
      mockAnomalyRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.getAnomaliesDashboard(orgId, from, to);

      expect(result.byType).toEqual({
        speed_violation: 2,
        long_stop: 1,
      });
      expect(result.bySeverity).toEqual({
        warning: 2,
        critical: 1,
      });
      expect(result.recent).toHaveLength(3);
    });

    it('should return empty results when no anomalies exist', async () => {
      const mockQb = createMockQb([]);
      mockAnomalyRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.getAnomaliesDashboard(orgId, from, to);

      expect(result.byType).toEqual({});
      expect(result.bySeverity).toEqual({});
      expect(result.recent).toHaveLength(0);
    });

    it('should limit recent anomalies to 50', async () => {
      const manyAnomalies = Array.from({ length: 60 }, (_, i) => ({
        id: `a-${i}`,
        type: 'gps_jump',
        severity: 'info',
        createdAt: new Date(),
      }));

      const mockQb = createMockQb(manyAnomalies);
      mockAnomalyRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.getAnomaliesDashboard(orgId, from, to);

      expect(result.recent).toHaveLength(50);
    });
  });

  // ==========================================================================
  // getTaxiDashboard
  // ==========================================================================

  describe('getTaxiDashboard', () => {
    const orgId = 'org-uuid-1';
    const from = new Date('2026-03-01');
    const to = new Date('2026-03-07');

    it('should return taxi expense stats and top users', async () => {
      const taxiTrips = [
        { id: 't1', taxiTotalAmount: 50000 },
        { id: 't2', taxiTotalAmount: 30000 },
        { id: 't3', taxiTotalAmount: 20000 },
      ];

      const topUsers = [
        { employeeId: 'emp-1', tripCount: '5', totalAmount: '200000' },
        { employeeId: 'emp-2', tripCount: '2', totalAmount: '80000' },
      ];

      let callCount = 0;
      mockTripRepo.createQueryBuilder.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          // First call: getMany for taxi trips
          return createMockQb(taxiTrips) as any;
        }
        // Second call: getRawMany for top users
        return createMockQb(topUsers) as any;
      });

      const result = await service.getTaxiDashboard(orgId, from, to);

      expect(result.totalTrips).toBe(3);
      expect(result.totalAmount).toBe(100000); // 50000 + 30000 + 20000
      expect(result.avgPerTrip).toBe(Math.round(100000 / 3));
      expect(result.topUsers).toHaveLength(2);
      expect(result.topUsers[0].employeeId).toBe('emp-1');
      expect(result.topUsers[0].tripCount).toBe(5);
      expect(result.topUsers[0].totalAmount).toBe(200000);
    });

    it('should handle zero taxi trips', async () => {
      let callCount = 0;
      mockTripRepo.createQueryBuilder.mockImplementation(() => {
        callCount++;
        return createMockQb([]) as any;
      });

      const result = await service.getTaxiDashboard(orgId, from, to);

      expect(result.totalTrips).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.avgPerTrip).toBe(0);
      expect(result.topUsers).toHaveLength(0);
    });

    it('should handle null taxiTotalAmount gracefully', async () => {
      const tripsWithNull = [
        { id: 't1', taxiTotalAmount: null },
        { id: 't2', taxiTotalAmount: 40000 },
      ];

      let callCount = 0;
      mockTripRepo.createQueryBuilder.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          return createMockQb(tripsWithNull) as any;
        }
        return createMockQb([]) as any;
      });

      const result = await service.getTaxiDashboard(orgId, from, to);

      expect(result.totalTrips).toBe(2);
      expect(result.totalAmount).toBe(40000); // 0 + 40000
    });
  });
});
