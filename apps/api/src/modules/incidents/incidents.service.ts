/**
 * Incidents Service for VendHub OS
 * Управление инцидентами с автоматами
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Incident,
  IncidentStatus,
  IncidentPriority,
} from "./entities/incident.entity";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import {
  UpdateIncidentDto,
  QueryIncidentsDto,
} from "./dto/update-incident.dto";

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
      organizationId,
      machineId: dto.machineId,
      type: dto.type,
      status: IncidentStatus.REPORTED,
      priority: dto.priority || IncidentPriority.MEDIUM,
      title: dto.title,
      description: dto.description || null,
      reportedByUserId,
      assignedToUserId: dto.assignedToUserId || null,
      reportedAt: new Date(),
      resolvedAt: null,
      repairCost: dto.repairCost ?? null,
      insuranceClaim: dto.insuranceClaim || false,
      insuranceClaimNumber: dto.insuranceClaimNumber || null,
      photos: dto.photos || [],
      resolution: null,
      metadata: dto.metadata || {},
    });

    const saved = await this.incidentRepo.save(incident);
    this.logger.log(
      `Incident created: id=${saved.id} type=${dto.type} machine=${dto.machineId}`,
    );

    return saved;
  }

  /**
   * Find an incident by ID
   */
  async findById(id: string, organizationId: string): Promise<Incident> {
    const incident = await this.incidentRepo.findOne({
      where: { id, organizationId },
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
      machineId,
      status,
      type,
      priority,
      assignedToUserId,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.incidentRepo.createQueryBuilder("i");
    qb.where("i.organizationId = :organizationId", { organizationId });

    if (machineId) {
      qb.andWhere("i.machineId = :machineId", { machineId });
    }

    if (status) {
      qb.andWhere("i.status = :status", { status });
    }

    if (type) {
      qb.andWhere("i.type = :type", { type });
    }

    if (priority) {
      qb.andWhere("i.priority = :priority", { priority });
    }

    if (assignedToUserId) {
      qb.andWhere("i.assignedToUserId = :assignedToUserId", {
        assignedToUserId,
      });
    }

    if (search) {
      qb.andWhere("(i.title ILIKE :search OR i.description ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    if (dateFrom) {
      qb.andWhere("i.reportedAt >= :dateFrom", {
        dateFrom: new Date(dateFrom),
      });
    }

    if (dateTo) {
      qb.andWhere("i.reportedAt <= :dateTo", { dateTo: new Date(dateTo) });
    }

    const total = await qb.getCount();

    qb.orderBy("i.reportedAt", "DESC");
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
    if (dto.description !== undefined)
      incident.description = dto.description || null;
    if (dto.assignedToUserId !== undefined)
      incident.assignedToUserId = dto.assignedToUserId || null;
    if (dto.repairCost !== undefined)
      incident.repairCost = dto.repairCost ?? null;
    if (dto.insuranceClaim !== undefined)
      incident.insuranceClaim = dto.insuranceClaim;
    if (dto.insuranceClaimNumber !== undefined)
      incident.insuranceClaimNumber = dto.insuranceClaimNumber || null;
    if (dto.photos !== undefined) incident.photos = dto.photos;
    if (dto.resolution !== undefined)
      incident.resolution = dto.resolution || null;
    if (dto.metadata !== undefined) incident.metadata = dto.metadata || {};

    // Handle status transitions
    if (dto.status && dto.status !== oldStatus) {
      if (dto.status === IncidentStatus.RESOLVED) {
        incident.resolvedAt = new Date();
        incident.resolvedByUserId = userId;

        if (!incident.resolution && dto.resolution) {
          incident.resolution = dto.resolution;
        }
      }
    }

    incident.updatedById = userId;

    const saved = await this.incidentRepo.save(incident);
    this.logger.log(
      `Incident updated: id=${id} status=${oldStatus}->${saved.status}`,
    );

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
      throw new BadRequestException("Incident must be resolved before closing");
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

    incident.assignedToUserId = assignedToUserId;

    if (incident.status === IncidentStatus.REPORTED) {
      incident.status = IncidentStatus.INVESTIGATING;
    }

    incident.updatedById = userId;

    const saved = await this.incidentRepo.save(incident);
    this.logger.log(
      `Incident assigned: id=${id} to=${assignedToUserId} by=${userId}`,
    );

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
        machineId,
        organizationId,
      },
      order: { reportedAt: "DESC" },
      take: limit,
    });
  }

  /**
   * Get incident statistics for an organization
   */
  async getStatistics(organizationId: string, dateFrom: Date, dateTo: Date) {
    const qb = this.incidentRepo.createQueryBuilder("i");
    qb.where("i.organizationId = :organizationId", { organizationId });
    qb.andWhere("i.reportedAt BETWEEN :dateFrom AND :dateTo", {
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

      if (incident.repairCost) {
        totalRepairCost += Number(incident.repairCost);
      }

      if (incident.resolvedAt) {
        resolvedCount++;
        totalResolutionTimeMs +=
          incident.resolvedAt.getTime() - incident.reportedAt.getTime();
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
      insuranceClaims: incidents.filter((i) => i.insuranceClaim).length,
    };
  }

  /**
   * Soft delete an incident (only closed ones)
   */
  async remove(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const incident = await this.findById(id, organizationId);

    if (incident.status !== IncidentStatus.CLOSED) {
      throw new BadRequestException("Only closed incidents can be deleted");
    }

    await this.incidentRepo.softDelete(id);
    this.logger.log(`Incident ${id} soft deleted by user ${userId}`);
  }
}
