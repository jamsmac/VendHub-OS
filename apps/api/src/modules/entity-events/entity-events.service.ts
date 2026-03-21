import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { EntityEvent } from "./entities/entity-event.entity";
import { CreateEntityEventDto } from "./dto/create-entity-event.dto";
import { QueryEntityEventsDto } from "./dto/query-entity-events.dto";

@Injectable()
export class EntityEventsService {
  constructor(
    @InjectRepository(EntityEvent)
    private readonly eventRepo: Repository<EntityEvent>,
  ) {}

  /**
   * Create a business event in the unified timeline
   */
  async createEvent(
    dto: CreateEntityEventDto,
    performedBy: string,
    organizationId: string,
  ): Promise<EntityEvent> {
    const event = this.eventRepo.create({
      ...dto,
      eventDate: dto.eventDate ? new Date(dto.eventDate) : new Date(),
      performedBy,
      organizationId,
    });
    return this.eventRepo.save(event);
  }

  /**
   * Get timeline for a specific entity (paginated, newest first)
   */
  async getEntityTimeline(
    entityId: string,
    organizationId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: EntityEvent[]; total: number }> {
    const [data, total] = await this.eventRepo.findAndCount({
      where: { entityId, organizationId },
      order: { eventDate: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  /**
   * Query events with filters
   */
  async queryEvents(
    dto: QueryEntityEventsDto,
    organizationId: string,
  ): Promise<{ data: EntityEvent[]; total: number }> {
    const where: Record<string, unknown> = { organizationId };

    if (dto.entityId) where.entityId = dto.entityId;
    if (dto.entityType) where.entityType = dto.entityType;
    if (dto.eventType) where.eventType = dto.eventType;
    if (dto.performedBy) where.performedBy = dto.performedBy;

    if (dto.dateFrom && dto.dateTo) {
      where.eventDate = Between(new Date(dto.dateFrom), new Date(dto.dateTo));
    } else if (dto.dateFrom) {
      where.eventDate = MoreThanOrEqual(new Date(dto.dateFrom));
    } else if (dto.dateTo) {
      where.eventDate = LessThanOrEqual(new Date(dto.dateTo));
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 50;

    const [data, total] = await this.eventRepo.findAndCount({
      where,
      order: { eventDate: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  /**
   * Get the last N events for an entity (for mini-passport)
   */
  async getRecentEvents(
    entityId: string,
    organizationId: string,
    count = 10,
  ): Promise<EntityEvent[]> {
    return this.eventRepo.find({
      where: { entityId, organizationId },
      order: { eventDate: "DESC" },
      take: count,
    });
  }
}
