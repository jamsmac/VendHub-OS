import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { SecurityEventService, LogSecurityEventDto } from './security-event.service';
import {
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
} from '../entities/security-event.entity';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
});

describe('SecurityEventService', () => {
  let service: SecurityEventService;
  let repo: MockRepository<SecurityEvent>;

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';

  const mockEvent: Partial<SecurityEvent> = {
    id: 'ev-uuid-1',
    eventType: SecurityEventType.LOGIN_SUCCESS,
    severity: SecuritySeverity.LOW,
    userId,
    organizationId: orgId,
    description: 'User logged in successfully',
    ipAddress: '192.168.1.1',
    isResolved: false,
    created_at: new Date(),
  };

  beforeEach(async () => {
    repo = createMockRepository<SecurityEvent>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityEventService,
        { provide: getRepositoryToken(SecurityEvent), useValue: repo },
      ],
    }).compile();

    service = module.get<SecurityEventService>(SecurityEventService);
  });

  // ================================================================
  // log
  // ================================================================

  describe('log', () => {
    it('should create and save a security event with explicit severity', async () => {
      const dto: LogSecurityEventDto = {
        eventType: SecurityEventType.LOGIN_SUCCESS,
        severity: SecuritySeverity.LOW,
        userId,
        organizationId: orgId,
        description: 'User logged in',
        ipAddress: '10.0.0.1',
      };
      const created = { id: 'ev-new', ...dto };
      repo.create!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const result = await service.log(dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: SecurityEventType.LOGIN_SUCCESS,
          severity: SecuritySeverity.LOW,
        }),
      );
      expect(result).toEqual(created);
    });

    it('should use default severity when not provided', async () => {
      const dto: LogSecurityEventDto = {
        eventType: SecurityEventType.LOGIN_FAILED,
        description: 'Bad credentials',
      };
      const created = { id: 'ev-2', severity: SecuritySeverity.MEDIUM, ...dto };
      repo.create!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const result = await service.log(dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: SecuritySeverity.MEDIUM,
        }),
      );
      expect(result.severity).toBe(SecuritySeverity.MEDIUM);
    });

    it('should assign HIGH severity by default for LOGIN_LOCKED', async () => {
      const dto: LogSecurityEventDto = {
        eventType: SecurityEventType.LOGIN_LOCKED,
        description: 'Account locked after 5 failed attempts',
      };
      repo.create!.mockImplementation((d) => d);
      repo.save!.mockImplementation(async (d) => ({ id: 'ev-3', ...d }));

      const result = await service.log(dto);

      expect(result.severity).toBe(SecuritySeverity.HIGH);
    });

    it('should assign CRITICAL severity by default for SUSPICIOUS_ACTIVITY', async () => {
      const dto: LogSecurityEventDto = {
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        description: 'Multiple IPs detected',
      };
      repo.create!.mockImplementation((d) => d);
      repo.save!.mockImplementation(async (d) => ({ id: 'ev-4', ...d }));

      const result = await service.log(dto);

      expect(result.severity).toBe(SecuritySeverity.CRITICAL);
    });

    it('should assign LOW severity for LOGOUT', async () => {
      const dto: LogSecurityEventDto = {
        eventType: SecurityEventType.LOGOUT,
        description: 'User logged out',
      };
      repo.create!.mockImplementation((d) => d);
      repo.save!.mockImplementation(async (d) => ({ id: 'ev-5', ...d }));

      const result = await service.log(dto);

      expect(result.severity).toBe(SecuritySeverity.LOW);
    });

    it('should assign LOW severity for TOKEN_REFRESH', async () => {
      const dto: LogSecurityEventDto = {
        eventType: SecurityEventType.TOKEN_REFRESH,
        description: 'Token refreshed',
      };
      repo.create!.mockImplementation((d) => d);
      repo.save!.mockImplementation(async (d) => ({ id: 'ev-6', ...d }));

      const result = await service.log(dto);

      expect(result.severity).toBe(SecuritySeverity.LOW);
    });

    it('should assign MEDIUM severity for PASSWORD_CHANGED', async () => {
      const dto: LogSecurityEventDto = {
        eventType: SecurityEventType.PASSWORD_CHANGED,
        description: 'Password changed',
      };
      repo.create!.mockImplementation((d) => d);
      repo.save!.mockImplementation(async (d) => ({ id: 'ev-7', ...d }));

      const result = await service.log(dto);

      expect(result.severity).toBe(SecuritySeverity.MEDIUM);
    });

    it('should assign CRITICAL severity for TOKEN_BLACKLISTED', async () => {
      const dto: LogSecurityEventDto = {
        eventType: SecurityEventType.TOKEN_BLACKLISTED,
        description: 'Token blacklisted',
      };
      repo.create!.mockImplementation((d) => d);
      repo.save!.mockImplementation(async (d) => ({ id: 'ev-8', ...d }));

      const result = await service.log(dto);

      expect(result.severity).toBe(SecuritySeverity.CRITICAL);
    });
  });

  // ================================================================
  // findAll
  // ================================================================

  describe('findAll', () => {
    it('should return paginated events with defaults', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getCount.mockResolvedValue(1);
      qb.getMany.mockResolvedValue([mockEvent]);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by organizationId', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getCount.mockResolvedValue(0);
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ organizationId: orgId });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'event.organization_id = :organizationId',
        { organizationId: orgId },
      );
    });

    it('should filter by userId', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getCount.mockResolvedValue(0);
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ userId });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'event.user_id = :userId',
        { userId },
      );
    });

    it('should filter by eventType', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getCount.mockResolvedValue(0);
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ eventType: SecurityEventType.LOGIN_FAILED });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'event.event_type = :eventType',
        { eventType: SecurityEventType.LOGIN_FAILED },
      );
    });

    it('should filter by severity', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getCount.mockResolvedValue(0);
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ severity: SecuritySeverity.CRITICAL });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'event.severity = :severity',
        { severity: SecuritySeverity.CRITICAL },
      );
    });

    it('should filter by date range', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getCount.mockResolvedValue(0);
      qb.getMany.mockResolvedValue([]);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      await service.findAll({ startDate, endDate });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'event.created_at BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });

    it('should use custom pagination', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getCount.mockResolvedValue(100);
      qb.getMany.mockResolvedValue([]);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.totalPages).toBe(10);
    });
  });

  // ================================================================
  // findByUser
  // ================================================================

  describe('findByUser', () => {
    it('should return events for a user with default limit', async () => {
      repo.find!.mockResolvedValue([mockEvent]);

      const result = await service.findByUser(userId);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId },
        order: { created_at: 'DESC' },
        take: 50,
      });
      expect(result).toHaveLength(1);
    });

    it('should respect custom limit', async () => {
      repo.find!.mockResolvedValue([]);

      await service.findByUser(userId, 10);

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  // ================================================================
  // resolve
  // ================================================================

  describe('resolve', () => {
    it('should mark event as resolved', async () => {
      const event = { ...mockEvent, isResolved: false };
      repo.findOneBy!.mockResolvedValue(event);
      repo.save!.mockImplementation(async (d) => d);

      const result = await service.resolve('ev-uuid-1', 'admin-1', 'False positive');

      expect(result.isResolved).toBe(true);
      expect(result.resolvedById).toBe('admin-1');
      expect(result.resolvedAt).toBeInstanceOf(Date);
      expect(result.resolutionNotes).toBe('False positive');
    });

    it('should throw when event not found', async () => {
      repo.findOneBy!.mockResolvedValue(null);

      await expect(service.resolve('missing', 'admin', 'notes')).rejects.toThrow(
        'Security event not found',
      );
    });
  });

  // ================================================================
  // getUnresolvedCount
  // ================================================================

  describe('getUnresolvedCount', () => {
    it('should count unresolved events globally', async () => {
      repo.count!.mockResolvedValue(15);

      const result = await service.getUnresolvedCount();

      expect(repo.count).toHaveBeenCalledWith({
        where: { isResolved: false },
      });
      expect(result).toBe(15);
    });

    it('should count unresolved events for specific organization', async () => {
      repo.count!.mockResolvedValue(3);

      const result = await service.getUnresolvedCount(orgId);

      expect(repo.count).toHaveBeenCalledWith({
        where: { isResolved: false, organizationId: orgId },
      });
      expect(result).toBe(3);
    });
  });

  // ================================================================
  // cleanup
  // ================================================================

  describe('cleanup', () => {
    it('should delete old resolved events with default retention', async () => {
      repo.delete!.mockResolvedValue({ affected: 42 });

      const result = await service.cleanup();

      expect(repo.delete).toHaveBeenCalledWith({
        created_at: expect.any(Object), // LessThan
        isResolved: true,
      });
      expect(result).toBe(42);
    });

    it('should use custom retention period', async () => {
      repo.delete!.mockResolvedValue({ affected: 10 });

      const result = await service.cleanup(30);

      expect(result).toBe(10);
    });

    it('should return 0 when no events are deleted', async () => {
      repo.delete!.mockResolvedValue({ affected: 0 });

      const result = await service.cleanup();

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      repo.delete!.mockResolvedValue({});

      const result = await service.cleanup();

      expect(result).toBe(0);
    });
  });
});
