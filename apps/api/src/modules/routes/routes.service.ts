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
import {
  Route,
  RouteType,
  RouteStatus,
  RouteStop,
  RouteStopStatus,
} from "./entities/route.entity";
import { RoutePoint } from "./entities/route-point.entity";
import {
  RouteAnomaly,
  AnomalyType,
  AnomalySeverity,
  AnomalyDetails,
} from "./entities/route-anomaly.entity";
import {
  RouteTaskLink,
  RouteTaskLinkStatus,
} from "./entities/route-task-link.entity";
import { Vehicle } from "../vehicles/entities/vehicle.entity";
import { CreateRouteDto, UpdateRouteDto } from "./dto/create-route.dto";
import {
  CreateRouteStopDto,
  UpdateRouteStopDto,
} from "./dto/create-route-stop.dto";
import { RouteTrackingService } from "./services/route-tracking.service";
import { RouteAnalyticsService } from "./services/route-analytics.service";
import { ROUTE_SETTINGS } from "./constants/route-settings";

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,

    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,

    @InjectRepository(RoutePoint)
    private readonly pointRepository: Repository<RoutePoint>,

    @InjectRepository(RouteAnomaly)
    private readonly anomalyRepository: Repository<RouteAnomaly>,

    @InjectRepository(RouteTaskLink)
    private readonly taskLinkRepository: Repository<RouteTaskLink>,

    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,

    @Inject(forwardRef(() => RouteTrackingService))
    private readonly routeTrackingService: RouteTrackingService,

    private readonly routeAnalyticsService: RouteAnalyticsService,
  ) {}

  // ============================================================================
  // ROUTE CRUD
  // ============================================================================

  async create(dto: CreateRouteDto, userId?: string): Promise<Route> {
    const route = this.routeRepository.create({
      organizationId: dto.organizationId,
      operatorId: dto.operatorId,
      name: dto.name,
      type: dto.type ?? RouteType.REFILL,
      status: RouteStatus.PLANNED,
      plannedDate: new Date(dto.plannedDate),
      ...(dto.estimatedDurationMinutes !== undefined && {
        estimatedDurationMinutes: dto.estimatedDurationMinutes,
      }),
      ...(dto.estimatedDistanceKm !== undefined && {
        estimatedDistanceKm: dto.estimatedDistanceKm,
      }),
      vehicleId: dto.vehicleId ?? null,
      transportType: dto.transportType ?? null,
      ...(dto.notes !== undefined && { notes: dto.notes }),
      metadata: dto.metadata ?? {},
      ...(userId !== undefined && { createdById: userId }),
    });

    return this.routeRepository.save(route);
  }

  async findAll(
    organizationId: string,
    filters?: {
      operatorId?: string;
      type?: RouteType;
      status?: RouteStatus;
      plannedDateFrom?: string;
      plannedDateTo?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      operatorId,
      type,
      status,
      plannedDateFrom,
      plannedDateTo,
      search,
      page = 1,
      limit = 20,
    } = filters || {};

    const query = this.routeRepository.createQueryBuilder("route");

    query.where("route.organizationId = :organizationId", { organizationId });
    query.leftJoinAndSelect("route.vehicle", "vehicle");

    if (operatorId) {
      query.andWhere("route.operatorId = :operatorId", { operatorId });
    }

    if (type) {
      query.andWhere("route.type = :type", { type });
    }

    if (status) {
      query.andWhere("route.status = :status", { status });
    }

    if (plannedDateFrom) {
      query.andWhere("route.plannedDate >= :plannedDateFrom", {
        plannedDateFrom,
      });
    }

    if (plannedDateTo) {
      query.andWhere("route.plannedDate <= :plannedDateTo", { plannedDateTo });
    }

    if (search) {
      query.andWhere("route.name ILIKE :search", { search: `%${search}%` });
    }

    const total = await query.getCount();

    query.orderBy("route.plannedDate", "DESC");
    query.addOrderBy("route.name", "ASC");
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, organizationId?: string): Promise<Route | null> {
    const where: Record<string, unknown> = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.routeRepository.findOne({
      where,
      relations: ["stops", "vehicle", "taskLinks", "anomalies"],
      order: { stops: { sequence: "ASC" } },
    });
  }

  async update(
    id: string,
    dto: UpdateRouteDto,
    organizationId: string,
    userId?: string,
  ): Promise<Route> {
    const route = await this.findById(id, organizationId);
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    if (route.status === RouteStatus.COMPLETED) {
      throw new BadRequestException("Cannot update a completed route");
    }

    if (route.status === RouteStatus.CANCELLED) {
      throw new BadRequestException("Cannot update a cancelled route");
    }

    if (dto.plannedDate !== undefined) {
      route.plannedDate = new Date(dto.plannedDate);
    }
    if (dto.operatorId !== undefined) route.operatorId = dto.operatorId;
    if (dto.name !== undefined) route.name = dto.name;
    if (dto.type !== undefined) route.type = dto.type;
    if (dto.estimatedDurationMinutes !== undefined)
      route.estimatedDurationMinutes = dto.estimatedDurationMinutes;
    if (dto.estimatedDistanceKm !== undefined)
      route.estimatedDistanceKm = dto.estimatedDistanceKm;
    if (dto.actualDurationMinutes !== undefined)
      route.actualDurationMinutes = dto.actualDurationMinutes;
    if (dto.actualDistanceKm !== undefined)
      route.actualDistanceKm = dto.actualDistanceKm;
    if (dto.vehicleId !== undefined) route.vehicleId = dto.vehicleId ?? null;
    if (dto.transportType !== undefined)
      route.transportType = dto.transportType ?? null;
    if (dto.notes !== undefined) route.notes = dto.notes;
    if (dto.metadata !== undefined) route.metadata = dto.metadata;

    route.updatedById = userId ?? route.updatedById;

    return this.routeRepository.save(route);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const route = await this.findById(id, organizationId);
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    if (route.status === RouteStatus.ACTIVE) {
      throw new BadRequestException("Cannot delete a route that is active");
    }

    await this.routeRepository.softDelete(id);
  }

  // ============================================================================
  // ROUTE LIFECYCLE
  // ============================================================================

  async startRoute(
    id: string,
    userId: string,
    organizationId: string,
    input?: {
      vehicleId?: string;
      startOdometer?: number;
      taskIds?: string[];
      notes?: string;
    },
  ): Promise<Route> {
    const route = await this.findById(id, organizationId);
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    if (
      route.status !== RouteStatus.PLANNED &&
      route.status !== RouteStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Cannot start route. Current status: ${route.status}. Only planned/draft routes can be started.`,
      );
    }

    // Check no other active route for this operator within the same org
    const activeRoute = await this.routeRepository.findOne({
      where: {
        operatorId: route.operatorId,
        organizationId,
        status: RouteStatus.ACTIVE,
      },
    });
    if (activeRoute) {
      throw new ConflictException(
        "Operator already has an active route. Complete it before starting a new one.",
      );
    }

    // Validate vehicle if provided
    if (input?.vehicleId) {
      const vehicle = await this.vehicleRepository.findOne({
        where: { id: input.vehicleId, organizationId },
      });
      if (!vehicle) {
        throw new BadRequestException(
          "Vehicle not found or does not belong to this organization",
        );
      }
      route.vehicleId = input.vehicleId;
    }

    route.status = RouteStatus.ACTIVE;
    route.startedAt = new Date();
    route.startOdometer = input?.startOdometer ?? null;
    route.updatedById = userId;

    if (input?.notes) {
      route.notes = route.notes
        ? `${route.notes}\n${input.notes}`
        : input.notes;
    }

    const savedRoute = await this.routeRepository.save(route);

    // Link tasks if provided
    if (input?.taskIds?.length) {
      const links = input.taskIds.map((taskId) =>
        this.taskLinkRepository.create({
          routeId: savedRoute.id,
          taskId,
          status: RouteTaskLinkStatus.PENDING,
          createdById: userId,
        }),
      );
      await this.taskLinkRepository.save(links);
    }

    return this.findById(savedRoute.id, organizationId) as Promise<Route>;
  }

  async endRoute(
    id: string,
    userId: string,
    organizationId: string,
    input?: {
      endOdometer?: number;
      notes?: string;
    },
  ): Promise<Route> {
    const route = await this.findById(id, organizationId);
    if (!route) throw new NotFoundException("Route not found");

    if (route.status !== RouteStatus.ACTIVE) {
      throw new BadRequestException("Route is not active");
    }

    const lastPoint = await this.pointRepository.findOne({
      where: { routeId: id, isFiltered: false },
      order: { recordedAt: "DESC" },
    });

    const distanceResult = await this.pointRepository
      .createQueryBuilder("p")
      .select("SUM(p.distanceFromPrevMeters)", "total")
      .where("p.routeId = :routeId", { routeId: id })
      .andWhere("p.isFiltered = false")
      .getRawOne();

    const totalDistance = Math.round(Number(distanceResult?.total) || 0);

    // Count visited machines
    const visitedStops = await this.routeStopRepository.find({
      where: { routeId: id },
    });
    const uniqueMachines = new Set(
      visitedStops
        .filter((s) => s.isVerified && s.machineId)
        .map((s) => s.machineId),
    ).size;

    route.status = RouteStatus.COMPLETED;
    route.completedAt = new Date();
    route.endOdometer = input?.endOdometer ?? null;
    route.endLatitude = lastPoint ? Number(lastPoint.latitude) : null;
    route.endLongitude = lastPoint ? Number(lastPoint.longitude) : null;
    route.calculatedDistanceMeters = totalDistance;
    route.visitedMachinesCount = uniqueMachines;
    route.liveLocationActive = false;
    route.updatedById = userId;

    // Calculate actual duration
    if (route.startedAt) {
      const durationMs = new Date().getTime() - route.startedAt.getTime();
      route.actualDurationMinutes = Math.round(durationMs / 60000);
    }

    route.actualDistanceKm = totalDistance
      ? Math.round((totalDistance / 1000) * 100) / 100
      : null;

    if (input?.notes) {
      route.notes = route.notes
        ? `${route.notes}\n${input.notes}`
        : input.notes;
    }

    await this.routeRepository.save(route);

    // Update vehicle odometer
    if (route.vehicleId && input?.endOdometer) {
      await this.vehicleRepository.update(route.vehicleId, {
        currentOdometer: input.endOdometer,
        lastOdometerUpdate: new Date(),
      });
    }

    // Check mileage discrepancy
    if (route.vehicleId && route.startOdometer && input?.endOdometer) {
      const reportedKm = input.endOdometer - route.startOdometer;
      const calculatedKm = Math.round(totalDistance / 1000);
      const difference = Math.abs(reportedKm - calculatedKm);

      if (difference > ROUTE_SETTINGS.MILEAGE_THRESHOLD_KM) {
        await this.createAnomaly(id, route.organizationId, {
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

    return this.findById(id, organizationId) as Promise<Route>;
  }

  async cancelRoute(
    id: string,
    userId: string,
    organizationId: string,
    reason?: string,
  ): Promise<Route> {
    const route = await this.findById(id, organizationId);
    if (!route) throw new NotFoundException("Route not found");

    if (
      route.status !== RouteStatus.ACTIVE &&
      route.status !== RouteStatus.PLANNED &&
      route.status !== RouteStatus.DRAFT
    ) {
      throw new BadRequestException(
        "Only active/planned/draft routes can be cancelled",
      );
    }

    route.status = RouteStatus.CANCELLED;
    route.completedAt = new Date();
    route.liveLocationActive = false;
    route.updatedById = userId;

    if (reason) {
      route.notes = route.notes
        ? `${route.notes}\n[Cancelled: ${reason}]`
        : `[Cancelled: ${reason}]`;
    }

    return this.routeRepository.save(route);
  }

  async getActiveRoute(
    operatorId: string,
    organizationId?: string,
  ): Promise<Route | null> {
    const where: Record<string, unknown> = {
      operatorId,
      status: RouteStatus.ACTIVE,
    };
    if (organizationId) where.organizationId = organizationId;
    return this.routeRepository.findOne({
      where,
      relations: ["vehicle", "taskLinks", "stops"],
    });
  }

  async getActiveRoutes(organizationId: string): Promise<Route[]> {
    return this.routeRepository.find({
      where: { organizationId, status: RouteStatus.ACTIVE },
      relations: ["vehicle"],
      order: { startedAt: "DESC" },
    });
  }

  // ============================================================================
  // GPS TRACKING (delegates to RouteTrackingService)
  // ============================================================================

  async addPoint(
    routeId: string,
    input: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      altitude?: number;
      recordedAt?: string;
    },
  ) {
    return this.routeTrackingService.addPoint(routeId, input);
  }

  async addPointsBatch(
    routeId: string,
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
    return this.routeTrackingService.addPointsBatch(routeId, points);
  }

  async updateLiveLocationStatus(
    routeId: string,
    isActive: boolean,
    telegramMessageId?: number,
  ): Promise<void> {
    return this.routeTrackingService.updateLiveLocationStatus(
      routeId,
      isActive,
      telegramMessageId,
    );
  }

  async getRouteTrack(routeId: string): Promise<RoutePoint[]> {
    return this.routeTrackingService.getRouteTrack(routeId);
  }

  // ============================================================================
  // TASK LINKS
  // ============================================================================

  async linkTask(
    routeId: string,
    taskId: string,
    userId?: string,
  ): Promise<RouteTaskLink> {
    const existing = await this.taskLinkRepository.findOne({
      where: { routeId, taskId },
    });
    if (existing) {
      throw new ConflictException("Task is already linked to this route");
    }

    const link = this.taskLinkRepository.create({
      routeId,
      taskId,
      status: RouteTaskLinkStatus.PENDING,
      ...(userId !== undefined && { createdById: userId }),
    });

    return this.taskLinkRepository.save(link);
  }

  async completeLinkedTask(
    routeId: string,
    taskId: string,
    notes?: string,
    userId?: string,
  ): Promise<RouteTaskLink> {
    const link = await this.taskLinkRepository.findOne({
      where: { routeId, taskId },
    });
    if (!link) throw new NotFoundException("Task link not found");

    link.status = RouteTaskLinkStatus.COMPLETED;
    link.completedAt = new Date();
    link.notes = notes ?? null;
    link.updatedById = userId ?? null;

    return this.taskLinkRepository.save(link);
  }

  async getRouteTasks(routeId: string): Promise<RouteTaskLink[]> {
    return this.taskLinkRepository.find({
      where: { routeId },
      order: { createdAt: "ASC" },
    });
  }

  // ============================================================================
  // ANOMALIES
  // ============================================================================

  async createAnomaly(
    routeId: string,
    organizationId: string,
    data: {
      type: AnomalyType;
      severity: AnomalySeverity;
      latitude?: number;
      longitude?: number;
      details?: AnomalyDetails;
    },
  ): Promise<RouteAnomaly> {
    const anomaly = this.anomalyRepository.create({
      routeId,
      type: data.type,
      severity: data.severity,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      details: data.details ?? {},
      detectedAt: new Date(),
    });

    const saved = await this.anomalyRepository.save(anomaly);

    await this.routeRepository
      .createQueryBuilder()
      .update(Route)
      .set({ totalAnomalies: () => '"total_anomalies" + 1' })
      .where("id = :routeId", { routeId })
      .execute();

    return saved;
  }

  async getRouteAnomalies(routeId: string): Promise<RouteAnomaly[]> {
    return this.anomalyRepository.find({
      where: { routeId },
      order: { detectedAt: "DESC" },
    });
  }

  async resolveAnomaly(
    anomalyId: string,
    userId: string,
    organizationId: string,
    notes?: string,
  ): Promise<RouteAnomaly> {
    const anomaly = await this.anomalyRepository.findOne({
      where: { id: anomalyId },
    });
    if (!anomaly) throw new NotFoundException("Anomaly not found");

    const route = await this.routeRepository.findOne({
      where: { id: anomaly.routeId },
    });
    if (route && route.organizationId !== organizationId) {
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
      operatorId?: string;
      severity?: AnomalySeverity;
      type?: AnomalyType;
      limit?: number;
    },
  ): Promise<RouteAnomaly[]> {
    const query = this.anomalyRepository
      .createQueryBuilder("anomaly")
      .leftJoinAndSelect("anomaly.route", "route")
      .where("route.organizationId = :organizationId", { organizationId })
      .andWhere("anomaly.resolved = false");

    if (filters?.operatorId) {
      query.andWhere("route.operatorId = :operatorId", {
        operatorId: filters.operatorId,
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
  // ANALYTICS (delegates to RouteAnalyticsService)
  // ============================================================================

  async getEmployeeStats(input: {
    organizationId: string;
    employeeId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    return this.routeAnalyticsService.getEmployeeStats(input);
  }

  async getMachineVisitStats(input: {
    organizationId: string;
    machineId?: string;
    dateFrom: string;
    dateTo: string;
  }) {
    return this.routeAnalyticsService.getMachineVisitStats(input);
  }

  async getRoutesSummary(input: {
    organizationId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    return this.routeAnalyticsService.getRoutesSummary(input);
  }

  // ============================================================================
  // ROUTE STOP MANAGEMENT
  // ============================================================================

  async addStop(
    routeId: string,
    dto: CreateRouteStopDto,
    userId?: string,
  ): Promise<RouteStop> {
    const route = await this.routeRepository.findOne({
      where: { id: routeId },
    });
    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }

    if (
      route.status === RouteStatus.COMPLETED ||
      route.status === RouteStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "Cannot add stops to a completed or cancelled route",
      );
    }

    const existingStop = await this.routeStopRepository.findOne({
      where: { routeId, sequence: dto.sequence },
    });
    if (existingStop) {
      throw new BadRequestException(
        `A stop with sequence ${dto.sequence} already exists on this route`,
      );
    }

    const stop = this.routeStopRepository.create({
      routeId,
      machineId: dto.machineId,
      sequence: dto.sequence,
      taskId: dto.taskId ?? null,
      status: RouteStopStatus.PENDING,
      estimatedArrival: dto.estimatedArrival
        ? new Date(dto.estimatedArrival)
        : null,
      notes: dto.notes ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      metadata: dto.metadata ?? {},
      ...(userId !== undefined && { createdById: userId }),
    });

    return this.routeStopRepository.save(stop);
  }

  async updateStop(
    stopId: string,
    dto: UpdateRouteStopDto,
    userId?: string,
  ): Promise<RouteStop> {
    const stop = await this.routeStopRepository.findOne({
      where: { id: stopId },
    });
    if (!stop) {
      throw new NotFoundException(`Route stop with ID ${stopId} not found`);
    }

    if (dto.machineId !== undefined) stop.machineId = dto.machineId;
    if (dto.sequence !== undefined) stop.sequence = dto.sequence;
    if (dto.taskId !== undefined) stop.taskId = dto.taskId;
    if (dto.status !== undefined) stop.status = dto.status;
    if (dto.estimatedArrival !== undefined)
      stop.estimatedArrival = dto.estimatedArrival
        ? new Date(dto.estimatedArrival)
        : null;
    if (dto.actualArrival !== undefined)
      stop.actualArrival = dto.actualArrival
        ? new Date(dto.actualArrival)
        : null;
    if (dto.departedAt !== undefined)
      stop.departedAt = dto.departedAt ? new Date(dto.departedAt) : null;
    if (dto.notes !== undefined) stop.notes = dto.notes;
    if (dto.latitude !== undefined) stop.latitude = dto.latitude;
    if (dto.longitude !== undefined) stop.longitude = dto.longitude;
    if (dto.metadata !== undefined) stop.metadata = dto.metadata;

    stop.updatedById = userId ?? stop.updatedById;

    return this.routeStopRepository.save(stop);
  }

  async reorderStops(
    routeId: string,
    stopIds: string[],
    userId?: string,
  ): Promise<RouteStop[]> {
    const route = await this.routeRepository.findOne({
      where: { id: routeId },
    });
    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }

    if (
      route.status === RouteStatus.COMPLETED ||
      route.status === RouteStatus.CANCELLED
    ) {
      throw new BadRequestException(
        "Cannot reorder stops on a completed or cancelled route",
      );
    }

    const existingStops = await this.routeStopRepository.find({
      where: { routeId },
    });

    const existingStopIds = new Set(existingStops.map((s) => s.id));
    for (const stopId of stopIds) {
      if (!existingStopIds.has(stopId)) {
        throw new BadRequestException(
          `Stop with ID ${stopId} does not belong to route ${routeId}`,
        );
      }
    }

    const updatedStops: RouteStop[] = [];
    for (let i = 0; i < stopIds.length; i++) {
      const stop = existingStops.find((s) => s.id === stopIds[i]);
      if (stop) {
        stop.sequence = i + 1;
        stop.updatedById = userId ?? stop.updatedById;
        const savedStop = await this.routeStopRepository.save(stop);
        updatedStops.push(savedStop);
      }
    }

    return updatedStops.sort((a, b) => a.sequence - b.sequence);
  }

  async getStops(routeId: string): Promise<RouteStop[]> {
    return this.routeStopRepository.find({
      where: { routeId },
      order: { sequence: "ASC" },
    });
  }

  async removeStop(stopId: string): Promise<void> {
    const stop = await this.routeStopRepository.findOne({
      where: { id: stopId },
    });
    if (!stop) {
      throw new NotFoundException(`Route stop with ID ${stopId} not found`);
    }
    await this.routeStopRepository.softDelete(stopId);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    return this.routeTrackingService.calculateHaversineDistance(
      lat1,
      lon1,
      lat2,
      lon2,
    );
  }
}
