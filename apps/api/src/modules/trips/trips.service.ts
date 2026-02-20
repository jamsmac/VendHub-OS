import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Trip, TripStatus, TripTaskType } from './entities/trip.entity';
import { TripPoint } from './entities/trip-point.entity';
import { TripStop } from './entities/trip-stop.entity';
import { TripAnomaly, AnomalyType, AnomalySeverity, AnomalyDetails } from './entities/trip-anomaly.entity';
import { TripTaskLink, TripTaskLinkStatus } from './entities/trip-task-link.entity';
import { TripReconciliation } from './entities/trip-reconciliation.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { TRIP_SETTINGS } from './constants/trip-settings';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,

    @InjectRepository(TripPoint)
    private readonly pointRepository: Repository<TripPoint>,

    @InjectRepository(TripStop)
    private readonly stopRepository: Repository<TripStop>,

    @InjectRepository(TripAnomaly)
    private readonly anomalyRepository: Repository<TripAnomaly>,

    @InjectRepository(TripTaskLink)
    private readonly taskLinkRepository: Repository<TripTaskLink>,

    @InjectRepository(TripReconciliation)
    private readonly reconciliationRepository: Repository<TripReconciliation>,

    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  // ============================================================================
  // TRIP LIFECYCLE
  // ============================================================================

  async startTrip(input: {
    organizationId: string;
    employeeId: string;
    vehicleId?: string;
    taskType?: TripTaskType;
    startOdometer?: number;
    taskIds?: string[];
    notes?: string;
    userId?: string;
  }): Promise<Trip> {
    // Check for existing active trip
    const activeTrip = await this.getActiveTrip(input.employeeId);
    if (activeTrip) {
      throw new ConflictException('Employee already has an active trip. End it before starting a new one.');
    }

    // Validate vehicle belongs to org
    if (input.vehicleId) {
      const vehicle = await this.vehicleRepository.findOne({
        where: { id: input.vehicleId, organizationId: input.organizationId },
      });
      if (!vehicle) {
        throw new BadRequestException('Vehicle not found or does not belong to this organization');
      }
    }

    const trip = this.tripRepository.create({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      vehicleId: input.vehicleId ?? null,
      taskType: input.taskType ?? TripTaskType.OTHER,
      status: TripStatus.ACTIVE,
      startedAt: new Date(),
      startOdometer: input.startOdometer ?? null,
      notes: input.notes ?? null,
      created_by_id: input.userId,
    });

    const savedTrip = await this.tripRepository.save(trip);

    // Link tasks if provided
    if (input.taskIds?.length) {
      const links = input.taskIds.map((taskId) =>
        this.taskLinkRepository.create({
          tripId: savedTrip.id,
          taskId,
          status: TripTaskLinkStatus.PENDING,
          created_by_id: input.userId,
        }),
      );
      await this.taskLinkRepository.save(links);
    }

    return this.getTripById(savedTrip.id);
  }

  async endTrip(
    tripId: string,
    input: { endOdometer?: number; notes?: string },
    userId?: string,
  ): Promise<Trip> {
    const trip = await this.getTripById(tripId);
    if (!trip) throw new NotFoundException('Trip not found');

    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException('Trip is not active');
    }

    // Get last valid point for end coordinates
    const lastPoint = await this.pointRepository.findOne({
      where: { tripId, isFiltered: false },
      order: { recordedAt: 'DESC' },
    });

    // Calculate total distance
    const distanceResult = await this.pointRepository
      .createQueryBuilder('p')
      .select('SUM(p.distanceFromPrevMeters)', 'total')
      .where('p.tripId = :tripId', { tripId })
      .andWhere('p.isFiltered = false')
      .getRawOne();

    const totalDistance = Math.round(Number(distanceResult?.total) || 0);

    // Count unique visited machines
    const visitedStops = await this.stopRepository.find({
      where: { tripId },
    });
    const uniqueMachines = new Set(
      visitedStops.filter((s) => s.machineId).map((s) => s.machineId),
    ).size;

    // Close any open stops
    await this.stopRepository
      .createQueryBuilder()
      .update(TripStop)
      .set({
        endedAt: new Date(),
        durationSeconds: () =>
          `EXTRACT(EPOCH FROM (now() - "started_at"))::int`,
      })
      .where('"trip_id" = :tripId', { tripId })
      .andWhere('"ended_at" IS NULL')
      .execute();

    // Update trip
    trip.status = TripStatus.COMPLETED;
    trip.endedAt = new Date();
    trip.endOdometer = input.endOdometer ?? null;
    trip.endLatitude = lastPoint ? Number(lastPoint.latitude) : null;
    trip.endLongitude = lastPoint ? Number(lastPoint.longitude) : null;
    trip.calculatedDistanceMeters = totalDistance;
    trip.visitedMachinesCount = uniqueMachines;
    trip.liveLocationActive = false;
    trip.updated_by_id = userId ?? null;

    if (input.notes) {
      trip.notes = trip.notes ? `${trip.notes}\n${input.notes}` : input.notes;
    }

    await this.tripRepository.save(trip);

    // Update vehicle odometer
    if (trip.vehicleId && input.endOdometer) {
      await this.vehicleRepository.update(trip.vehicleId, {
        currentOdometer: input.endOdometer,
        lastOdometerUpdate: new Date(),
      });
    }

    // Check mileage discrepancy
    if (trip.vehicleId && trip.startOdometer && input.endOdometer) {
      const reportedKm = input.endOdometer - trip.startOdometer;
      const calculatedKm = Math.round(totalDistance / 1000);
      const difference = Math.abs(reportedKm - calculatedKm);

      if (difference > TRIP_SETTINGS.MILEAGE_THRESHOLD_KM) {
        await this.createAnomaly(tripId, trip.organizationId, {
          type: AnomalyType.MILEAGE_DISCREPANCY,
          severity: AnomalySeverity.WARNING,
          details: {
            expectedKm: calculatedKm,
            actualKm: reportedKm,
            differenceKm: difference,
          },
        });
      }
    }

    return this.getTripById(tripId);
  }

  async cancelTrip(tripId: string, reason?: string, userId?: string): Promise<Trip> {
    const trip = await this.getTripById(tripId);
    if (!trip) throw new NotFoundException('Trip not found');

    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException('Only active trips can be cancelled');
    }

    trip.status = TripStatus.CANCELLED;
    trip.endedAt = new Date();
    trip.liveLocationActive = false;
    trip.updated_by_id = userId ?? null;
    if (reason) {
      trip.notes = trip.notes ? `${trip.notes}\n[Cancelled: ${reason}]` : `[Cancelled: ${reason}]`;
    }

    return this.tripRepository.save(trip);
  }

  async getActiveTrip(employeeId: string): Promise<Trip | null> {
    return this.tripRepository.findOne({
      where: { employeeId, status: TripStatus.ACTIVE },
      relations: ['vehicle', 'taskLinks'],
    });
  }

  async getTripById(id: string): Promise<Trip> {
    const trip = await this.tripRepository.findOne({
      where: { id },
      relations: ['vehicle', 'taskLinks', 'stops', 'anomalies'],
    });
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);
    return trip;
  }

  async listTrips(
    organizationId: string,
    filters?: {
      employeeId?: string;
      vehicleId?: string;
      status?: string;
      taskType?: TripTaskType;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { employeeId, vehicleId, status, taskType, dateFrom, dateTo, page = 1, limit = 20 } =
      filters || {};

    const query = this.tripRepository.createQueryBuilder('trip');
    query.where('trip.organizationId = :organizationId', { organizationId });
    query.leftJoinAndSelect('trip.vehicle', 'vehicle');

    if (employeeId) query.andWhere('trip.employeeId = :employeeId', { employeeId });
    if (vehicleId) query.andWhere('trip.vehicleId = :vehicleId', { vehicleId });
    if (status) query.andWhere('trip.status = :status', { status });
    if (taskType) query.andWhere('trip.taskType = :taskType', { taskType });
    if (dateFrom) query.andWhere('trip.startedAt >= :dateFrom', { dateFrom });
    if (dateTo) query.andWhere('trip.startedAt <= :dateTo', { dateTo });

    const total = await query.getCount();
    query.orderBy('trip.startedAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    const data = await query.getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ============================================================================
  // GPS TRACKING
  // ============================================================================

  async addPoint(
    tripId: string,
    input: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      altitude?: number;
      recordedAt?: string;
    },
  ): Promise<{ id: string; isFiltered: boolean; filterReason: string | null }> {
    // Fetch and validate trip once at the start
    const trip = await this.tripRepository.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException(`Trip ${tripId} not found`);
    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException('Cannot add points to a non-active trip');
    }

    let isFiltered = false;
    let filterReason: string | null = null;

    // Check GPS accuracy
    if (input.accuracy && input.accuracy > TRIP_SETTINGS.MIN_GPS_ACCURACY_METERS) {
      isFiltered = true;
      filterReason = 'LOW_ACCURACY';
    }

    // Get previous valid point
    const prevPoint = await this.pointRepository.findOne({
      where: { tripId, isFiltered: false },
      order: { recordedAt: 'DESC' },
    });

    let distanceFromPrev = 0;

    if (prevPoint && !isFiltered) {
      distanceFromPrev = this.calculateHaversineDistance(
        Number(prevPoint.latitude),
        Number(prevPoint.longitude),
        input.latitude,
        input.longitude,
      );

      // GPS jump detection
      if (distanceFromPrev > 1000) {
        const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
        const timeDiff =
          (recordedAt.getTime() - new Date(prevPoint.recordedAt).getTime()) / 1000;
        const speedKmh = timeDiff > 0 ? (distanceFromPrev / timeDiff) * 3.6 : 999;

        if (speedKmh > TRIP_SETTINGS.MAX_SPEED_KMH * 1.5) {
          isFiltered = true;
          filterReason = 'GPS_JUMP';

          await this.createAnomaly(tripId, trip.organizationId, {
            type: AnomalyType.GPS_JUMP,
            severity: AnomalySeverity.INFO,
            latitude: input.latitude,
            longitude: input.longitude,
            details: {
              previousPoint: {
                lat: Number(prevPoint.latitude),
                lng: Number(prevPoint.longitude),
              },
              distanceMeters: distanceFromPrev,
              timeSeconds: timeDiff,
            },
          });
        }
      }

      // Speed violation check (non-jump, valid movement)
      if (!isFiltered && input.speed) {
        const speedKmh = input.speed * 3.6;
        if (speedKmh > TRIP_SETTINGS.MAX_SPEED_KMH) {
          await this.createAnomaly(tripId, trip.organizationId, {
            type: AnomalyType.SPEED_VIOLATION,
            severity: AnomalySeverity.WARNING,
            latitude: input.latitude,
            longitude: input.longitude,
            details: {
              speedKmh: Math.round(speedKmh),
              maxAllowedKmh: TRIP_SETTINGS.MAX_SPEED_KMH,
            },
          });
        }
      }
    }

    // Save point
    const point = this.pointRepository.create({
      tripId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracy ?? null,
      speedMps: input.speed ?? null,
      heading: input.heading ?? null,
      altitude: input.altitude ?? null,
      distanceFromPrevMeters: distanceFromPrev,
      isFiltered,
      filterReason,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
    });

    const savedPoint = await this.pointRepository.save(point);

    // Update trip counters
    await this.tripRepository
      .createQueryBuilder()
      .update(Trip)
      .set({
        totalPoints: () => '"total_points" + 1',
        lastLocationUpdate: new Date(),
      })
      .where('id = :tripId', { tripId })
      .execute();

    // If this is the first point, set start coordinates
    if (!prevPoint && !isFiltered) {
      await this.tripRepository.update(tripId, {
        startLatitude: input.latitude,
        startLongitude: input.longitude,
      });
    }

    // Check for stops
    if (!isFiltered) {
      await this.checkForStop(tripId, trip.organizationId, input.latitude, input.longitude);
    }

    return { id: savedPoint.id, isFiltered, filterReason };
  }

  async addPointsBatch(
    tripId: string,
    points: Array<{
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      altitude?: number;
      recordedAt?: string;
    }>,
  ) {
    const results = [];
    for (const point of points) {
      const result = await this.addPoint(tripId, point);
      results.push(result);
    }
    return results;
  }

  async updateLiveLocationStatus(
    tripId: string,
    isActive: boolean,
    telegramMessageId?: number,
  ): Promise<void> {
    await this.tripRepository.update(tripId, {
      liveLocationActive: isActive,
      telegramMessageId: telegramMessageId ?? undefined,
      lastLocationUpdate: new Date(),
    });
  }

  // ============================================================================
  // ROUTE & STOPS
  // ============================================================================

  async getTripRoute(tripId: string): Promise<TripPoint[]> {
    return this.pointRepository.find({
      where: { tripId, isFiltered: false },
      order: { recordedAt: 'ASC' },
    });
  }

  async getTripStops(tripId: string): Promise<TripStop[]> {
    return this.stopRepository.find({
      where: { tripId },
      order: { startedAt: 'ASC' },
    });
  }

  // ============================================================================
  // STOP DETECTION
  // ============================================================================

  private async checkForStop(tripId: string, organizationId: string, lat: number, lng: number): Promise<void> {
    const thresholdTime = new Date(
      Date.now() - TRIP_SETTINGS.STOP_MIN_DURATION_SECONDS * 1000,
    );

    const recentPoints = await this.pointRepository.find({
      where: {
        tripId,
        isFiltered: false,
      },
      order: { recordedAt: 'DESC' },
      take: 50,
    });

    // Filter to points within the time window
    const pointsInWindow = recentPoints.filter(
      (p) => new Date(p.recordedAt) >= thresholdTime,
    );

    if (pointsInWindow.length < 2) return;

    // Check if all points are within stop detection radius
    const allInRadius = pointsInWindow.every((point) => {
      const dist = this.calculateHaversineDistance(
        Number(point.latitude),
        Number(point.longitude),
        lat,
        lng,
      );
      return dist <= TRIP_SETTINGS.STOP_DETECTION_RADIUS_METERS;
    });

    if (!allInRadius) {
      // Close any open stop (employee started moving)
      await this.closeOpenStop(tripId);
      return;
    }

    // Check for existing open stop
    const existingStop = await this.stopRepository.findOne({
      where: { tripId, endedAt: IsNull() },
    });

    if (existingStop) return; // Stop already tracked

    // Create new stop
    const firstPoint = pointsInWindow[pointsInWindow.length - 1];
    const centerLat = Number(firstPoint.latitude);
    const centerLng = Number(firstPoint.longitude);

    // Find nearest machine within this organization
    const nearestMachine = await this.findNearestMachine(centerLat, centerLng, organizationId);

    const stop = this.stopRepository.create({
      tripId,
      latitude: centerLat,
      longitude: centerLng,
      machineId: nearestMachine?.machineId ?? null,
      machineName: nearestMachine?.machineName ?? null,
      machineAddress: nearestMachine?.machineAddress ?? null,
      distanceToMachineMeters: nearestMachine?.distance ?? null,
      startedAt: new Date(firstPoint.recordedAt),
      isVerified: nearestMachine?.isWithinRadius ?? false,
    });

    await this.stopRepository.save(stop);

    // Update trip stop counter
    await this.tripRepository
      .createQueryBuilder()
      .update(Trip)
      .set({ totalStops: () => '"total_stops" + 1' })
      .where('id = :tripId', { tripId })
      .execute();

    // Verify tasks at this machine
    if (nearestMachine?.isWithinRadius && nearestMachine.machineId) {
      await this.verifyTaskAtMachine(tripId, nearestMachine.machineId);
    }
  }

  private async closeOpenStop(tripId: string): Promise<void> {
    const openStop = await this.stopRepository.findOne({
      where: { tripId, endedAt: IsNull() },
    });

    if (openStop) {
      openStop.endedAt = new Date();
      openStop.durationSeconds = Math.round(
        (openStop.endedAt.getTime() - new Date(openStop.startedAt).getTime()) / 1000,
      );
      await this.stopRepository.save(openStop);
    }
  }

  // ============================================================================
  // MACHINE GEOFENCING
  // ============================================================================

  private async findNearestMachine(
    lat: number,
    lng: number,
    organizationId: string,
  ): Promise<{
    machineId: string;
    machineName: string;
    machineAddress: string;
    distance: number;
    isWithinRadius: boolean;
  } | null> {
    // Bounding box for performance (~2km search radius)
    const latDelta = 2 / 111.32;
    const lngDelta = 2 / (111.32 * Math.cos(lat * Math.PI / 180));

    // Query machines within bounding box, filtered by organization
    const machines = await this.tripRepository.manager.query(`
      SELECT id, machine_number, name, address, latitude, longitude
      FROM machines
      WHERE organization_id = $1
        AND status = 'active'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND deleted_at IS NULL
        AND latitude BETWEEN $2 AND $3
        AND longitude BETWEEN $4 AND $5
    `, [
      organizationId,
      lat - latDelta,
      lat + latDelta,
      lng - lngDelta,
      lng + lngDelta,
    ]);

    let nearest: {
      machineId: string;
      machineName: string;
      machineAddress: string;
      distance: number;
      isWithinRadius: boolean;
    } | null = null;

    for (const machine of machines) {
      const dist = this.calculateHaversineDistance(
        lat,
        lng,
        Number(machine.latitude),
        Number(machine.longitude),
      );

      if (!nearest || dist < nearest.distance) {
        nearest = {
          machineId: machine.id,
          machineName: machine.name || machine.machine_number || '',
          machineAddress: machine.address || '',
          distance: Math.round(dist),
          isWithinRadius: dist <= TRIP_SETTINGS.GEOFENCE_RADIUS_METERS,
        };
      }
    }

    return nearest;
  }

  private async verifyTaskAtMachine(tripId: string, machineId: string): Promise<void> {
    // Find tasks linked to this trip that are for this machine
    const taskLinks = await this.taskLinkRepository.find({
      where: { tripId, status: TripTaskLinkStatus.PENDING },
    });

    for (const link of taskLinks) {
      // Check if the task is for this machine
      const task = await this.tripRepository.manager.query(
        `SELECT id, machine_id FROM tasks WHERE id = $1 AND deleted_at IS NULL`,
        [link.taskId],
      );

      if (task.length > 0 && task[0].machine_id === machineId) {
        link.status = TripTaskLinkStatus.IN_PROGRESS;
        link.verifiedByGps = true;
        link.verifiedAt = new Date();
        link.startedAt = new Date();
        await this.taskLinkRepository.save(link);
      }
    }
  }

  // ============================================================================
  // TASK LINKS
  // ============================================================================

  async linkTask(tripId: string, taskId: string, userId?: string): Promise<TripTaskLink> {
    const existing = await this.taskLinkRepository.findOne({
      where: { tripId, taskId },
    });
    if (existing) {
      throw new ConflictException('Task is already linked to this trip');
    }

    const link = this.taskLinkRepository.create({
      tripId,
      taskId,
      status: TripTaskLinkStatus.PENDING,
      created_by_id: userId,
    });

    return this.taskLinkRepository.save(link);
  }

  async completeLinkedTask(
    tripId: string,
    taskId: string,
    notes?: string,
    userId?: string,
  ): Promise<TripTaskLink> {
    const link = await this.taskLinkRepository.findOne({
      where: { tripId, taskId },
    });
    if (!link) throw new NotFoundException('Task link not found');

    link.status = TripTaskLinkStatus.COMPLETED;
    link.completedAt = new Date();
    link.notes = notes ?? null;
    link.updated_by_id = userId ?? null;

    return this.taskLinkRepository.save(link);
  }

  async getTripTasks(tripId: string): Promise<TripTaskLink[]> {
    return this.taskLinkRepository.find({
      where: { tripId },
      order: { created_at: 'ASC' },
    });
  }

  // ============================================================================
  // ANOMALIES
  // ============================================================================

  async createAnomaly(
    tripId: string,
    organizationId: string,
    data: {
      type: AnomalyType;
      severity: AnomalySeverity;
      latitude?: number;
      longitude?: number;
      details?: AnomalyDetails;
    },
  ): Promise<TripAnomaly> {
    const anomaly = this.anomalyRepository.create({
      tripId,
      type: data.type,
      severity: data.severity,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      details: data.details ?? {},
      detectedAt: new Date(),
    });

    const saved = await this.anomalyRepository.save(anomaly);

    // Increment trip anomaly counter
    await this.tripRepository
      .createQueryBuilder()
      .update(Trip)
      .set({ totalAnomalies: () => '"total_anomalies" + 1' })
      .where('id = :tripId', { tripId })
      .execute();

    return saved;
  }

  async getTripAnomalies(tripId: string): Promise<TripAnomaly[]> {
    return this.anomalyRepository.find({
      where: { tripId },
      order: { detectedAt: 'DESC' },
    });
  }

  async resolveAnomaly(
    anomalyId: string,
    userId: string,
    organizationId: string,
    notes?: string,
  ): Promise<TripAnomaly> {
    const anomaly = await this.anomalyRepository.findOne({
      where: { id: anomalyId },
    });
    if (!anomaly) throw new NotFoundException('Anomaly not found');

    // Verify org access through trip
    const trip = await this.tripRepository.findOne({ where: { id: anomaly.tripId } });
    if (trip && trip.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied to this anomaly');
    }

    anomaly.resolved = true;
    anomaly.resolvedById = userId;
    anomaly.resolvedAt = new Date();
    anomaly.resolutionNotes = notes ?? null;
    anomaly.updated_by_id = userId;

    return this.anomalyRepository.save(anomaly);
  }

  async listUnresolvedAnomalies(
    organizationId: string,
    filters?: {
      employeeId?: string;
      severity?: AnomalySeverity;
      type?: AnomalyType;
      limit?: number;
    },
  ): Promise<TripAnomaly[]> {
    const query = this.anomalyRepository
      .createQueryBuilder('anomaly')
      .leftJoinAndSelect('anomaly.trip', 'trip')
      .where('trip.organizationId = :organizationId', { organizationId })
      .andWhere('anomaly.resolved = false');

    if (filters?.employeeId) {
      query.andWhere('trip.employeeId = :employeeId', { employeeId: filters.employeeId });
    }
    if (filters?.severity) {
      query.andWhere('anomaly.severity = :severity', { severity: filters.severity });
    }
    if (filters?.type) {
      query.andWhere('anomaly.type = :type', { type: filters.type });
    }

    query.orderBy('anomaly.detectedAt', 'DESC');
    query.take(filters?.limit ?? 50);

    return query.getMany();
  }

  // ============================================================================
  // RECONCILIATION
  // ============================================================================

  async performReconciliation(input: {
    organizationId: string;
    vehicleId: string;
    actualOdometer: number;
    performedById: string;
    notes?: string;
  }): Promise<TripReconciliation> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: input.vehicleId, organizationId: input.organizationId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found or does not belong to this organization');

    const expectedOdometer = vehicle.currentOdometer;
    const differenceKm = Math.abs(input.actualOdometer - expectedOdometer);
    const isAnomaly = differenceKm > TRIP_SETTINGS.MILEAGE_THRESHOLD_KM;

    const reconciliation = this.reconciliationRepository.create({
      organizationId: input.organizationId,
      vehicleId: input.vehicleId,
      actualOdometer: input.actualOdometer,
      expectedOdometer,
      differenceKm,
      thresholdKm: TRIP_SETTINGS.MILEAGE_THRESHOLD_KM,
      isAnomaly,
      performedById: input.performedById,
      performedAt: new Date(),
      notes: input.notes ?? null,
      created_by_id: input.performedById,
    });

    const saved = await this.reconciliationRepository.save(reconciliation);

    // Update vehicle odometer
    await this.vehicleRepository.update(input.vehicleId, {
      currentOdometer: input.actualOdometer,
      lastOdometerUpdate: new Date(),
    });

    return saved;
  }

  async getReconciliationHistory(
    vehicleId: string,
    organizationId: string,
    limit = 10,
  ): Promise<TripReconciliation[]> {
    return this.reconciliationRepository.find({
      where: { vehicleId, organizationId },
      order: { performedAt: 'DESC' },
      take: limit,
    });
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getEmployeeStats(input: {
    organizationId: string;
    employeeId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const result = await this.tripRepository
      .createQueryBuilder('trip')
      .select('COUNT(*)', 'totalTrips')
      .addSelect('SUM("trip"."calculated_distance_meters")', 'totalDistanceMeters')
      .addSelect('SUM("trip"."visited_machines_count")', 'totalMachinesVisited')
      .addSelect('SUM("trip"."total_stops")', 'totalStops')
      .addSelect('SUM("trip"."total_anomalies")', 'totalAnomalies')
      .addSelect('AVG(EXTRACT(EPOCH FROM ("trip"."ended_at" - "trip"."started_at")))', 'avgDurationSeconds')
      .where('trip.organizationId = :organizationId', { organizationId: input.organizationId })
      .andWhere('trip.employeeId = :employeeId', { employeeId: input.employeeId })
      .andWhere('trip.startedAt >= :dateFrom', { dateFrom: input.dateFrom })
      .andWhere('trip.startedAt <= :dateTo', { dateTo: input.dateTo })
      .andWhere('trip.status IN (:...statuses)', {
        statuses: [TripStatus.COMPLETED, TripStatus.AUTO_CLOSED],
      })
      .getRawOne();

    return {
      totalTrips: parseInt(result.totalTrips) || 0,
      totalDistanceKm: Math.round((Number(result.totalDistanceMeters) || 0) / 1000),
      totalMachinesVisited: parseInt(result.totalMachinesVisited) || 0,
      totalStops: parseInt(result.totalStops) || 0,
      totalAnomalies: parseInt(result.totalAnomalies) || 0,
      avgDurationMinutes: Math.round((Number(result.avgDurationSeconds) || 0) / 60),
    };
  }

  async getMachineVisitStats(input: {
    organizationId: string;
    machineId?: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const query = this.stopRepository
      .createQueryBuilder('stop')
      .leftJoin('stop.trip', 'trip')
      .select('stop.machineId', 'machineId')
      .addSelect('stop.machineName', 'machineName')
      .addSelect('COUNT(*)', 'visitCount')
      .addSelect('SUM("stop"."duration_seconds")', 'totalDurationSeconds')
      .where('trip.organizationId = :organizationId', { organizationId: input.organizationId })
      .andWhere('stop.machineId IS NOT NULL')
      .andWhere('stop.startedAt >= :dateFrom', { dateFrom: input.dateFrom })
      .andWhere('stop.startedAt <= :dateTo', { dateTo: input.dateTo })
      .groupBy('stop.machineId')
      .addGroupBy('stop.machineName')
      .orderBy('COUNT(*)', 'DESC');

    if (input.machineId) {
      query.andWhere('stop.machineId = :machineId', { machineId: input.machineId });
    }

    return query.getRawMany();
  }

  async getTripsSummary(input: {
    organizationId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const result = await this.tripRepository
      .createQueryBuilder('trip')
      .select('COUNT(*)', 'totalTrips')
      .addSelect(
        `COUNT(*) FILTER (WHERE trip.status = 'completed')`,
        'completedTrips',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE trip.status = 'auto_closed')`,
        'autoClosedTrips',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE trip.status = 'cancelled')`,
        'cancelledTrips',
      )
      .addSelect('SUM("trip"."calculated_distance_meters")', 'totalDistanceMeters')
      .addSelect('SUM("trip"."visited_machines_count")', 'totalMachinesVisited')
      .addSelect('SUM("trip"."total_anomalies")', 'totalAnomalies')
      .addSelect('COUNT(DISTINCT "trip"."employee_id")', 'uniqueEmployees')
      .addSelect('COUNT(DISTINCT "trip"."vehicle_id")', 'uniqueVehicles')
      .where('trip.organizationId = :organizationId', { organizationId: input.organizationId })
      .andWhere('trip.startedAt >= :dateFrom', { dateFrom: input.dateFrom })
      .andWhere('trip.startedAt <= :dateTo', { dateTo: input.dateTo })
      .getRawOne();

    return {
      totalTrips: parseInt(result.totalTrips) || 0,
      completedTrips: parseInt(result.completedTrips) || 0,
      autoClosedTrips: parseInt(result.autoClosedTrips) || 0,
      cancelledTrips: parseInt(result.cancelledTrips) || 0,
      totalDistanceKm: Math.round((Number(result.totalDistanceMeters) || 0) / 1000),
      totalMachinesVisited: parseInt(result.totalMachinesVisited) || 0,
      totalAnomalies: parseInt(result.totalAnomalies) || 0,
      uniqueEmployees: parseInt(result.uniqueEmployees) || 0,
      uniqueVehicles: parseInt(result.uniqueVehicles) || 0,
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * @returns Distance in meters
   */
  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
