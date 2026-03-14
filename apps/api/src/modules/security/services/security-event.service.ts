import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, FindOptionsWhere } from "typeorm";
import {
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
} from "../entities/security-event.entity";
import { LogSecurityEventDto } from "../dto/log-security-event.dto";

@Injectable()
export class SecurityEventService {
  private readonly logger = new Logger(SecurityEventService.name);

  constructor(
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepository: Repository<SecurityEvent>,
  ) {}

  async log(dto: LogSecurityEventDto): Promise<SecurityEvent> {
    const event = this.securityEventRepository.create({
      ...dto,
      severity: dto.severity || this.getDefaultSeverity(dto.eventType),
    });

    const saved = await this.securityEventRepository.save(event);

    if (
      saved.severity === SecuritySeverity.HIGH ||
      saved.severity === SecuritySeverity.CRITICAL
    ) {
      this.logger.warn(
        `Security event [${saved.severity}]: ${saved.eventType} - ${saved.description}`,
      );
    }

    return saved;
  }

  async findAll(options: {
    organizationId: string;
    userId?: string;
    eventType?: SecurityEventType;
    severity?: SecuritySeverity;
    ipAddress?: string;
    resource?: string;
    resourceId?: string;
    isResolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      page = 1,
      limit = 50,
      organizationId,
      userId,
      eventType,
      severity,
      ipAddress,
      resource,
      resourceId,
      isResolved,
      startDate,
      endDate,
    } = options;

    const query = this.securityEventRepository.createQueryBuilder("event");

    // Multi-tenant isolation: always filter by organization
    query.andWhere("event.organizationId = :organizationId", {
      organizationId,
    });

    if (userId) {
      query.andWhere("event.userId = :userId", { userId });
    }
    if (eventType) {
      query.andWhere("event.eventType = :eventType", { eventType });
    }
    if (severity) {
      query.andWhere("event.severity = :severity", { severity });
    }
    if (ipAddress) {
      query.andWhere("event.ipAddress = :ipAddress", { ipAddress });
    }
    if (resource) {
      query.andWhere("event.resource = :resource", { resource });
    }
    if (resourceId) {
      query.andWhere("event.resourceId = :resourceId", { resourceId });
    }
    if (isResolved !== undefined) {
      query.andWhere("event.isResolved = :isResolved", { isResolved });
    }
    if (startDate && endDate) {
      query.andWhere("event.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere("event.createdAt >= :startDate", { startDate });
    } else if (endDate) {
      query.andWhere("event.createdAt <= :endDate", { endDate });
    }

    const total = await query.getCount();

    query.orderBy("event.createdAt", "DESC");
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

  async findByUser(
    userId: string,
    limit: number = 50,
  ): Promise<SecurityEvent[]> {
    return this.securityEventRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async resolve(
    eventId: string,
    resolvedById: string,
    notes: string,
  ): Promise<SecurityEvent> {
    const event = await this.securityEventRepository.findOneBy({ id: eventId });
    if (!event) {
      throw new NotFoundException("Security event not found");
    }

    event.isResolved = true;
    event.resolvedById = resolvedById;
    event.resolvedAt = new Date();
    event.resolutionNotes = notes;

    return this.securityEventRepository.save(event);
  }

  async getUnresolvedCount(organizationId?: string): Promise<number> {
    const where: FindOptionsWhere<SecurityEvent> = { isResolved: false };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.securityEventRepository.count({ where });
  }

  async cleanup(retentionDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.securityEventRepository.softDelete({
      createdAt: LessThan(cutoff),
      isResolved: true,
    });

    return result.affected || 0;
  }

  private getDefaultSeverity(eventType: SecurityEventType): SecuritySeverity {
    switch (eventType) {
      case SecurityEventType.LOGIN_SUCCESS:
      case SecurityEventType.LOGOUT:
      case SecurityEventType.TOKEN_REFRESH:
        return SecuritySeverity.LOW;

      case SecurityEventType.LOGIN_FAILED:
      case SecurityEventType.PASSWORD_CHANGED:
      case SecurityEventType.PASSWORD_RESET_REQUESTED:
      case SecurityEventType.TWO_FACTOR_ENABLED:
      case SecurityEventType.TWO_FACTOR_DISABLED:
      case SecurityEventType.ACCOUNT_CREATED:
      case SecurityEventType.ROLE_CHANGED:
        return SecuritySeverity.MEDIUM;

      case SecurityEventType.LOGIN_LOCKED:
      case SecurityEventType.TWO_FACTOR_FAILED:
      case SecurityEventType.ACCOUNT_SUSPENDED:
      case SecurityEventType.ACCOUNT_REJECTED:
      case SecurityEventType.PERMISSION_CHANGED:
        return SecuritySeverity.HIGH;

      case SecurityEventType.SUSPICIOUS_ACTIVITY:
      case SecurityEventType.TOKEN_BLACKLISTED:
        return SecuritySeverity.CRITICAL;

      default:
        return SecuritySeverity.LOW;
    }
  }
}
