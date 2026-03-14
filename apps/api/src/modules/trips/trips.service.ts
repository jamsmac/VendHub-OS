import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Trip, TripStatus, TripTaskType } from "./entities/trip.entity";
import { TripPoint } from "./entities/trip-point.entity";
import { TripStop } from "./entities/trip-stop.entity";
import {
  TripAnomaly,
  AnomalyType,
  AnomalySeverity,
  AnomalyDetails,
} from "./entities/trip-anomaly.entity";
import {
  TripTaskLink,
  TripTaskLinkStatus,
} from "./entities/trip-task-link.entity";
import { TripReconciliation } from "./entities/trip-reconciliation.entity";
import { Vehicle } from "../vehicles/entities/vehicle.entity";
import { TRIP_SETTINGS } from "./constants/trip-settings";
import { TripRouteService } from "./services/trip-route.service";
import { TripAnalyticsService } from "./services/trip-analytics.service";

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

    @Inject(forwardRef(() => TripRouteService))
    private readonly tripRouteService: TripRouteService,

    private readonly tripAnalyticsService: TripAnalyticsService,
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
    const activeTrip = await this.getActiveTrip(input.employeeId);
    if (activeTrip) {
      throw new ConflictException(
        "Employee already has an active trip. End it before starting a new one.",
      );
    }

    if (input.vehicleId) {
      const vehicle = await this.vehicleRepository.findOne({
        where: { id: input.vehicleId, organizationId: input.organizationId },
      });
      if (!vehicle) {
        throw new BadRequestException(
          "Vehicle not found or does not belong to this organization",
        );
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
      createdById: input.userId,
    });

    const savedTrip = await this.tripRepository.save(trip);

    if (input.taskIds?.length) {
      const links = input.taskIds.map((taskId) =>
        this.taskLinkRepository.create({
          tripId: savedTrip.id,
          taskId,
          status: TripTaskLinkStatus.PENDING,
          createdById: input.userId,
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
    if (!trip) throw new NotFoundException("Trip not found");

    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException("Trip is not active");
    }

    const lastPoint = await this.pointRepository.findOne({
      where: { tripId, isFiltered: false },
      order: { recordedAt: "DESC" },
    });

    const distanceResult = await this.pointRepository
      .createQueryBuilder("p")
      .select("SUM(p.distanceFromPrevMeters)", "total")
      .where("p.tripId = :tripId", { tripId })
      .andWhere("p.isFiltered = false")
      .getRawOne();

    const totalDistance = Math.round(Number(distanceResult?.total) || 0);

    const visitedStops = await this.stopRepository.find({
      where: { tripId },
    });
    const uniqueMachines = new Set(
      visitedStops.filter((s) => s.machineId).map((s) => s.machineId),
    ).size;

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

    trip.status = TripStatus.COMPLETED;
    trip.endedAt = new Date();
    trip.endOdometer = input.endOdometer ?? null;
    trip.endLatitude = lastPoint ? Number(lastPoint.latitude) : null;
    trip.endLongitude = lastPoint ? Number(lastPoint.longitude) : null;
    trip.calculatedDistanceMeters = totalDistance;
    trip.visitedMachinesCount = uniqueMachines;
    trip.liveLocationActive = false;
    trip.updatedById = userId ?? null;

    if (input.notes) {
      trip.notes = trip.notes ? `${trip.notes}\n${input.notes}` : input.notes;
    }

    await this.tripRepository.save(trip);

    if (trip.vehicleId && input.endOdometer) {
      await this.vehicleRepository.update(trip.vehicleId, {
        currentOdometer: input.endOdometer,
        lastOdometerUpdate: new Date(),
      });
    }

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

  async cancelTrip(
    tripId: string,
    reason?: string,
    userId?: string,
  ): Promise<Trip> {
    const trip = await this.getTripById(tripId);
    if (!trip) throw new NotFoundException("Trip not found");

    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException("Only active trips can be cancelled");
    }

    trip.status = TripStatus.CANCELLED;
    trip.endedAt = new Date();
    trip.liveLocationActive = false;
    trip.updatedById = userId ?? null;
    if (reason) {
      trip.notes = trip.notes
        ? `${trip.notes}\n[Cancelled: ${reason}]`
        : `[Cancelled: ${reason}]`;
    }

    return this.tripRepository.save(trip);
  }

  async getActiveTrip(employeeId: string): Promise<Trip | null> {
    return this.tripRepository.findOne({
      where: { employeeId, status: TripStatus.ACTIVE },
      relations: ["vehicle", "taskLinks"],
    });
  }

  async getTripById(id: string, organizationId?: string): Promise<Trip> {
    const where: Record<string, string> = { id };
    if (organizationId) where.organizationId = organizationId;
    const trip = await this.tripRepository.findOne({
      where,
      relations: ["vehicle", "taskLinks", "stops", "anomalies"],
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
    const {
      employeeId,
      vehicleId,
      status,
      taskType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters || {};

    const query = this.tripRepository.createQueryBuilder("trip");
    query.where("trip.organizationId = :organizationId", { organizationId });
    query.leftJoinAndSelect("trip.vehicle", "vehicle");

    if (employeeId)
      query.andWhere("trip.employeeId = :employeeId", { employeeId });
    if (vehicleId) query.andWhere("trip.vehicleId = :vehicleId", { vehicleId });
    if (status) query.andWhere("trip.status = :status", { status });
    if (taskType) query.andWhere("trip.taskType = :taskType", { taskType });
    if (dateFrom) query.andWhere("trip.startedAt >= :dateFrom", { dateFrom });
    if (dateTo) query.andWhere("trip.startedAt <= :dateTo", { dateTo });

    const total = await query.getCount();
    query.orderBy("trip.startedAt", "DESC");
    query.skip((page - 1) * limit).take(limit);

    const data = await query.getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ============================================================================
  // GPS TRACKING (delegates to TripRouteService)
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
    return this.tripRouteService.addPoint(tripId, input);
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
    return this.tripRouteService.addPointsBatch(tripId, points);
  }

  async updateLiveLocationStatus(
    tripId: string,
    isActive: boolean,
    telegramMessageId?: number,
  ): Promise<void> {
    return this.tripRouteService.updateLiveLocationStatus(
      tripId,
      isActive,
      telegramMessageId,
    );
  }

  // ============================================================================
  // ROUTE & STOPS (delegates to TripRouteService)
  // ============================================================================

  async getTripRoute(tripId: string): Promise<TripPoint[]> {
    return this.tripRouteService.getTripRoute(tripId);
  }

  async getTripStops(tripId: string): Promise<TripStop[]> {
    return this.tripRouteService.getTripStops(tripId);
  }

  // ============================================================================
  // TASK LINKS
  // ============================================================================

  async linkTask(
    tripId: string,
    taskId: string,
    userId?: string,
  ): Promise<TripTaskLink> {
    const existing = await this.taskLinkRepository.findOne({
      where: { tripId, taskId },
    });
    if (existing) {
      throw new ConflictException("Task is already linked to this trip");
    }

    const link = this.taskLinkRepository.create({
      tripId,
      taskId,
      status: TripTaskLinkStatus.PENDING,
      createdById: userId,
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
    if (!link) throw new NotFoundException("Task link not found");

    link.status = TripTaskLinkStatus.COMPLETED;
    link.completedAt = new Date();
    link.notes = notes ?? null;
    link.updatedById = userId ?? null;

    return this.taskLinkRepository.save(link);
  }

  async getTripTasks(tripId: string): Promise<TripTaskLink[]> {
    return this.taskLinkRepository.find({
      where: { tripId },
      order: { createdAt: "ASC" },
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

    await this.tripRepository
      .createQueryBuilder()
      .update(Trip)
      .set({ totalAnomalies: () => '"total_anomalies" + 1' })
      .where("id = :tripId", { tripId })
      .execute();

    return saved;
  }

  async getTripAnomalies(tripId: string): Promise<TripAnomaly[]> {
    return this.anomalyRepository.find({
      where: { tripId },
      order: { detectedAt: "DESC" },
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
    if (!anomaly) throw new NotFoundException("Anomaly not found");

    const trip = await this.tripRepository.findOne({
      where: { id: anomaly.tripId },
    });
    if (trip && trip.organizationId !== organizationId) {
      throw new ForbiddenException("Access denied to this anomaly");
    }

    anomaly.resolved = true;
    anomaly.resolvedById = userId;
    anomaly.resolvedAt = new Date();
    anomaly.resolutionNotes = notes ?? null;
    anomaly.updatedById = userId;

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
      .createQueryBuilder("anomaly")
      .leftJoinAndSelect("anomaly.trip", "trip")
      .where("trip.organizationId = :organizationId", { organizationId })
      .andWhere("anomaly.resolved = false");

    if (filters?.employeeId) {
      query.andWhere("trip.employeeId = :employeeId", {
        employeeId: filters.employeeId,
      });
    }
    if (filters?.severity) {
      query.andWhere("anomaly.severity = :severity", {
        severity: filters.severity,
      });
    }
    if (filters?.type) {
      query.andWhere("anomaly.type = :type", { type: filters.type });
    }

    query.orderBy("anomaly.detectedAt", "DESC");
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
    if (!vehicle)
      throw new NotFoundException(
        "Vehicle not found or does not belong to this organization",
      );

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
      createdById: input.performedById,
    });

    const saved = await this.reconciliationRepository.save(reconciliation);

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
      order: { performedAt: "DESC" },
      take: limit,
    });
  }

  // ============================================================================
  // ANALYTICS (delegates to TripAnalyticsService)
  // ============================================================================

  async getEmployeeStats(input: {
    organizationId: string;
    employeeId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    return this.tripAnalyticsService.getEmployeeStats(input);
  }

  async getMachineVisitStats(input: {
    organizationId: string;
    machineId?: string;
    dateFrom: string;
    dateTo: string;
  }) {
    return this.tripAnalyticsService.getMachineVisitStats(input);
  }

  async getTripsSummary(input: {
    organizationId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    return this.tripAnalyticsService.getTripsSummary(input);
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
    return this.tripRouteService.calculateHaversineDistance(
      lat1,
      lon1,
      lat2,
      lon2,
    );
  }
}
