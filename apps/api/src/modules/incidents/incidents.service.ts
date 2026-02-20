/**
 * Incidents Service for VendHub OS
 * Управление инцидентами с автоматами
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Incident,
  IncidentStatus,
  IncidentType,
  IncidentPriority,
} from './entities/incident.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto, QueryIncidentsDto } from './dto/update-incident.dto';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepo: Repository<Incident>,
  ) {}

  // ============================================================================
  // CRUD
  // ============================================================================

  /**
   * Create a new incident
   */
  async create(
    dto: CreateIncidentDto,
    reportedByUserId: string,
    organizationId: string,
  ): Promise<Incident> {
    const incident = this.incidentRepo.create({
      organization_id: organizationId,
      machine_id: dto.machine_id,
      type: dto.type,
      status: IncidentStatus.REPORTED,
      priority: dto.priority || IncidentPriority.MEDIUM,
      title: dto.title,
      description: dto.description || null,
      reported_by_user_id: reportedByUserId,
      assigned_to_user_id: dto.assigned_to_user_id || null,
      reported_at: new Date(),
      resolved_at: null,
      repair_cost: dto.repair_cost ?? null,
      insurance_claim: dto.insurance_claim || false,
      insurance_claim_number: dto.insurance_claim_number || null,
      photos: dto.photos || [],
      resolution: null,
      metadata: dto.metadata || {},
    });

    const saved = await this.incidentRepo.save(incident);
    this.logger.log(
      `Incident created: id=${saved.id} type=${dto.type} machine=${dto.machine_id}`,
    );

    return saved;
  }

  /**
   * Find an incident by ID
   */
  async findById(id: string, organizationId: string): Promise<Incident> {
    const incident = await this.incidentRepo.findOne({
      where: { id, organization_id: organizationId },
    });

    if (!incident) {
      throw new NotFoundException(`Incident ${id} not found`);
    }

    return incident;
  }

  /**
   * Query incidents with filters and pagination
   */
  async query(query: QueryIncidentsDto, organizationId: string) {
    const {
      machine_id,
      status,
      type,
      priority,
      assigned_to_user_id,
      search,
      date_from,
      date_to,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.incidentRepo.createQueryBuilder('i');
    qb.where('i.organization_id = :organizationId', { organizationId });

    if (machine_id) {
      qb.andWhere('i.machine_id = :machine_id', { machine_id });
    }

    if (status) {
      qb.andWhere('i.status = :status', { status });
    }

    if (type) {
      qb.andWhere('i.type = :type', { type });
    }

    if (priority) {
      qb.andWhere('i.priority = :priority', { priority });
    }

    if (assigned_to_user_id) {
      qb.andWhere('i.assigned_to_user_id = :assigned_to_user_id', {
        assigned_to_user_id,
      });
    }

    if (search) {
      qb.andWhere(
        '(i.title ILIKE :search OR i.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (date_from) {
      qb.andWhere('i.reported_at >= :date_from', { date_from: new Date(date_from) });
    }

    if (date_to) {
      qb.andWhere('i.reported_at <= :date_to', { date_to: new Date(date_to) });
    }

    const total = await qb.getCount();

    qb.orderBy('i.reported_at', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update an incident
   */
  async update(
    id: string,
    dto: UpdateIncidentDto,
    userId: string,
    organizationId: string,
  ): Promise<Incident> {
    const incident = await this.findById(id, organizationId);
    const oldStatus = incident.status;

    // Apply updatable fields
    if (dto.type !== undefined) incident.type = dto.type;
    if (dto.status !== undefined) incident.status = dto.status;
    if (dto.priority !== undefined) incident.priority = dto.priority;
    if (dto.title !== undefined) incident.title = dto.title;
    if (dto.description !== undefined) incident.description = dto.description || null;
    if (dto.assigned_to_user_id !== undefined) incident.assigned_to_user_id = dto.assigned_to_user_id || null;
    if (dto.repair_cost !== undefined) incident.repair_cost = dto.repair_cost ?? null;
    if (dto.insurance_claim !== undefined) incident.insurance_claim = dto.insurance_claim;
    if (dto.insurance_claim_number !== undefined) incident.insurance_claim_number = dto.insurance_claim_number || null;
    if (dto.photos !== undefined) incident.photos = dto.photos;
    if (dto.resolution !== undefined) incident.resolution = dto.resolution || null;
    if (dto.metadata !== undefined) incident.metadata = dto.metadata || {};

    // Handle status transitions
    if (dto.status && dto.status !== oldStatus) {
      if (dto.status === IncidentStatus.RESOLVED) {
        incident.resolved_at = new Date();
        incident.resolved_by_user_id = userId;

        if (!incident.resolution && dto.resolution) {
          incident.resolution = dto.resolution;
        }
      }
    }

    incident.updated_by_id = userId;

    const saved = await this.incidentRepo.save(incident);
    this.logger.log(`Incident updated: id=${id} status=${oldStatus}->${saved.status}`);

    return saved;
  }

  /**
   * Resolve an incident
   */
  async resolve(
    id: string,
    resolution: string,
    userId: string,
    organizationId: string,
  ): Promise<Incident> {
    return this.update(
      id,
      {
        status: IncidentStatus.RESOLVED,
        resolution,
      },
      userId,
      organizationId,
    );
  }

  /**
   * Close an incident
   */
  async close(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<Incident> {
    const incident = await this.findById(id, organizationId);

    if (incident.status !== IncidentStatus.RESOLVED) {
      throw new BadRequestException('Incident must be resolved before closing');
    }

    return this.update(
      id,
      { status: IncidentStatus.CLOSED },
      userId,
      organizationId,
    );
  }

  /**
   * Assign an incident to a user
   */
  async assign(
    id: string,
    assignedToUserId: string,
    userId: string,
    organizationId: string,
  ): Promise<Incident> {
    const incident = await this.findById(id, organizationId);

    incident.assigned_to_user_id = assignedToUserId;

    if (incident.status === IncidentStatus.REPORTED) {
      incident.status = IncidentStatus.INVESTIGATING;
    }

    incident.updated_by_id = userId;

    const saved = await this.incidentRepo.save(incident);
    this.logger.log(`Incident assigned: id=${id} to=${assignedToUserId} by=${userId}`);

    return saved;
  }

  /**
   * Get incidents for a specific machine
   */
  async findByMachine(
    machineId: string,
    organizationId: string,
    limit = 20,
  ): Promise<Incident[]> {
    return this.incidentRepo.find({
      where: {
        machine_id: machineId,
        organization_id: organizationId,
      },
      order: { reported_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get incident statistics for an organization
   */
  async getStatistics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ) {
    const qb = this.incidentRepo.createQueryBuilder('i');
    qb.where('i.organization_id = :organizationId', { organizationId });
    qb.andWhere('i.reported_at BETWEEN :dateFrom AND :dateTo', {
      dateFrom,
      dateTo,
    });

    const incidents = await qb.getMany();

    const total = incidents.length;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalRepairCost = 0;
    let resolvedCount = 0;
    let totalResolutionTimeMs = 0;

    for (const incident of incidents) {
      byType[incident.type] = (byType[incident.type] || 0) + 1;
      byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;
      byPriority[incident.priority] = (byPriority[incident.priority] || 0) + 1;

      if (incident.repair_cost) {
        totalRepairCost += Number(incident.repair_cost);
      }

      if (incident.resolved_at) {
        resolvedCount++;
        totalResolutionTimeMs +=
          incident.resolved_at.getTime() - incident.reported_at.getTime();
      }
    }

    return {
      total,
      byType,
      byStatus,
      byPriority,
      totalRepairCost,
      averageResolutionTimeHours:
        resolvedCount > 0
          ? totalResolutionTimeMs / resolvedCount / (1000 * 60 * 60)
          : 0,
      insuranceClaims: incidents.filter((i) => i.insurance_claim).length,
    };
  }

  /**
   * Soft delete an incident (only closed ones)
   */
  async remove(id: string, userId: string, organizationId: string): Promise<void> {
    const incident = await this.findById(id, organizationId);

    if (incident.status !== IncidentStatus.CLOSED) {
      throw new BadRequestException('Only closed incidents can be deleted');
    }

    await this.incidentRepo.softDelete(id);
    this.logger.log(`Incident ${id} soft deleted by user ${userId}`);
  }
}
