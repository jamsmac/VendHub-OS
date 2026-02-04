import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import {
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
} from '../entities/security-event.entity';

export interface LogSecurityEventDto {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  sessionId?: string;
}

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

    if (saved.severity === SecuritySeverity.HIGH || saved.severity === SecuritySeverity.CRITICAL) {
      this.logger.warn(
        `Security event [${saved.severity}]: ${saved.eventType} - ${saved.description}`,
      );
    }

    return saved;
  }

  async findAll(options: {
    organizationId?: string;
    userId?: string;
    eventType?: SecurityEventType;
    severity?: SecuritySeverity;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, organizationId, userId, eventType, severity, startDate, endDate } = options;

    const query = this.securityEventRepository.createQueryBuilder('event');

    if (organizationId) {
      query.andWhere('event.organization_id = :organizationId', { organizationId });
    }
    if (userId) {
      query.andWhere('event.user_id = :userId', { userId });
    }
    if (eventType) {
      query.andWhere('event.event_type = :eventType', { eventType });
    }
    if (severity) {
      query.andWhere('event.severity = :severity', { severity });
    }
    if (startDate && endDate) {
      query.andWhere('event.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const total = await query.getCount();

    query.orderBy('event.created_at', 'DESC');
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

  async findByUser(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    return this.securityEventRepository.find({
      where: { userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async resolve(eventId: string, resolvedById: string, notes: string): Promise<SecurityEvent> {
    const event = await this.securityEventRepository.findOneBy({ id: eventId });
    if (!event) {
      throw new Error('Security event not found');
    }

    event.isResolved = true;
    event.resolvedById = resolvedById;
    event.resolvedAt = new Date();
    event.resolutionNotes = notes;

    return this.securityEventRepository.save(event);
  }

  async getUnresolvedCount(organizationId?: string): Promise<number> {
    const where: any = { isResolved: false };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    return this.securityEventRepository.count({ where });
  }

  async cleanup(retentionDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.securityEventRepository.delete({
      created_at: LessThan(cutoff),
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
