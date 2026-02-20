import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Route,
  RouteType,
  RouteStatus,
  RouteStop,
  RouteStopStatus,
} from './entities/route.entity';
import { CreateRouteDto, UpdateRouteDto } from './dto/create-route.dto';
import { CreateRouteStopDto, UpdateRouteStopDto } from './dto/create-route-stop.dto';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,

    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
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
      estimatedDurationMinutes: dto.estimatedDurationMinutes,
      estimatedDistanceKm: dto.estimatedDistanceKm,
      notes: dto.notes,
      metadata: dto.metadata ?? {},
      created_by_id: userId,
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

    const query = this.routeRepository.createQueryBuilder('route');

    query.where('route.organizationId = :organizationId', { organizationId });

    if (operatorId) {
      query.andWhere('route.operatorId = :operatorId', { operatorId });
    }

    if (type) {
      query.andWhere('route.type = :type', { type });
    }

    if (status) {
      query.andWhere('route.status = :status', { status });
    }

    if (plannedDateFrom) {
      query.andWhere('route.plannedDate >= :plannedDateFrom', { plannedDateFrom });
    }

    if (plannedDateTo) {
      query.andWhere('route.plannedDate <= :plannedDateTo', { plannedDateTo });
    }

    if (search) {
      query.andWhere('route.name ILIKE :search', { search: `%${search}%` });
    }

    const total = await query.getCount();

    query.orderBy('route.plannedDate', 'DESC');
    query.addOrderBy('route.name', 'ASC');
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

  async findById(id: string): Promise<Route | null> {
    return this.routeRepository.findOne({
      where: { id },
      relations: ['stops'],
      order: { stops: { sequence: 'ASC' } },
    });
  }

  async update(id: string, dto: UpdateRouteDto, userId?: string): Promise<Route> {
    const route = await this.findById(id);
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    if (route.status === RouteStatus.COMPLETED) {
      throw new BadRequestException('Cannot update a completed route');
    }

    if (route.status === RouteStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled route');
    }

    // Map DTO fields to entity, handling date conversion
    if (dto.plannedDate !== undefined) {
      route.plannedDate = new Date(dto.plannedDate);
    }
    if (dto.operatorId !== undefined) route.operatorId = dto.operatorId;
    if (dto.name !== undefined) route.name = dto.name;
    if (dto.type !== undefined) route.type = dto.type;
    if (dto.estimatedDurationMinutes !== undefined) route.estimatedDurationMinutes = dto.estimatedDurationMinutes;
    if (dto.estimatedDistanceKm !== undefined) route.estimatedDistanceKm = dto.estimatedDistanceKm;
    if (dto.actualDurationMinutes !== undefined) route.actualDurationMinutes = dto.actualDurationMinutes;
    if (dto.actualDistanceKm !== undefined) route.actualDistanceKm = dto.actualDistanceKm;
    if (dto.notes !== undefined) route.notes = dto.notes;
    if (dto.metadata !== undefined) route.metadata = dto.metadata;

    route.updated_by_id = userId ?? route.updated_by_id;

    return this.routeRepository.save(route);
  }

  async remove(id: string): Promise<void> {
    const route = await this.findById(id);
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    if (route.status === RouteStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete a route that is in progress');
    }

    await this.routeRepository.softDelete(id);
  }

  // ============================================================================
  // ROUTE LIFECYCLE
  // ============================================================================

  async startRoute(id: string, userId: string): Promise<Route> {
    const route = await this.findById(id);
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    if (route.status !== RouteStatus.PLANNED) {
      throw new BadRequestException(
        `Cannot start route. Current status: ${route.status}. Only planned routes can be started.`,
      );
    }

    route.status = RouteStatus.IN_PROGRESS;
    route.startedAt = new Date();
    route.updated_by_id = userId;

    return this.routeRepository.save(route);
  }

  async completeRoute(
    id: string,
    userId: string,
    completionData?: { actualDurationMinutes?: number; actualDistanceKm?: number; notes?: string },
  ): Promise<Route> {
    const route = await this.findById(id);
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }

    if (route.status !== RouteStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot complete route. Current status: ${route.status}. Only in-progress routes can be completed.`,
      );
    }

    route.status = RouteStatus.COMPLETED;
    route.completedAt = new Date();
    route.updated_by_id = userId;

    // Calculate actual duration if not provided and route was started
    if (completionData?.actualDurationMinutes !== undefined) {
      route.actualDurationMinutes = completionData.actualDurationMinutes;
    } else if (route.startedAt) {
      const durationMs = new Date().getTime() - route.startedAt.getTime();
      route.actualDurationMinutes = Math.round(durationMs / 60000);
    }

    if (completionData?.actualDistanceKm !== undefined) {
      route.actualDistanceKm = completionData.actualDistanceKm;
    }

    if (completionData?.notes !== undefined) {
      route.notes = completionData.notes;
    }

    return this.routeRepository.save(route);
  }

  // ============================================================================
  // ROUTE STOP MANAGEMENT
  // ============================================================================

  async addStop(routeId: string, dto: CreateRouteStopDto, userId?: string): Promise<RouteStop> {
    const route = await this.routeRepository.findOne({
      where: { id: routeId },
    });
    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }

    if (route.status === RouteStatus.COMPLETED || route.status === RouteStatus.CANCELLED) {
      throw new BadRequestException('Cannot add stops to a completed or cancelled route');
    }

    // Check for duplicate sequence
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
      estimatedArrival: dto.estimatedArrival ? new Date(dto.estimatedArrival) : null,
      notes: dto.notes ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      metadata: dto.metadata ?? {},
      created_by_id: userId,
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
    if (dto.estimatedArrival !== undefined) stop.estimatedArrival = dto.estimatedArrival ? new Date(dto.estimatedArrival) : null;
    if (dto.actualArrival !== undefined) stop.actualArrival = dto.actualArrival ? new Date(dto.actualArrival) : null;
    if (dto.departedAt !== undefined) stop.departedAt = dto.departedAt ? new Date(dto.departedAt) : null;
    if (dto.notes !== undefined) stop.notes = dto.notes;
    if (dto.latitude !== undefined) stop.latitude = dto.latitude;
    if (dto.longitude !== undefined) stop.longitude = dto.longitude;
    if (dto.metadata !== undefined) stop.metadata = dto.metadata;

    stop.updated_by_id = userId ?? stop.updated_by_id;

    return this.routeStopRepository.save(stop);
  }

  /**
   * Reorder stops by setting new sequence values.
   * Accepts an ordered array of stop IDs.
   */
  async reorderStops(routeId: string, stopIds: string[], userId?: string): Promise<RouteStop[]> {
    const route = await this.routeRepository.findOne({
      where: { id: routeId },
    });
    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }

    if (route.status === RouteStatus.COMPLETED || route.status === RouteStatus.CANCELLED) {
      throw new BadRequestException('Cannot reorder stops on a completed or cancelled route');
    }

    // Verify all stop IDs belong to this route
    const existingStops = await this.routeStopRepository.find({
      where: { routeId },
    });

    const existingStopIds = new Set(existingStops.map((s) => s.id));
    for (const stopId of stopIds) {
      if (!existingStopIds.has(stopId)) {
        throw new BadRequestException(`Stop with ID ${stopId} does not belong to route ${routeId}`);
      }
    }

    // Update sequences
    const updatedStops: RouteStop[] = [];
    for (let i = 0; i < stopIds.length; i++) {
      const stop = existingStops.find((s) => s.id === stopIds[i]);
      if (stop) {
        stop.sequence = i + 1;
        stop.updated_by_id = userId ?? stop.updated_by_id;
        const savedStop = await this.routeStopRepository.save(stop);
        updatedStops.push(savedStop);
      }
    }

    return updatedStops.sort((a, b) => a.sequence - b.sequence);
  }

  async getStops(routeId: string): Promise<RouteStop[]> {
    return this.routeStopRepository.find({
      where: { routeId },
      order: { sequence: 'ASC' },
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
}
