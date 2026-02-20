import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import {
  AuditService,
  CreateAuditLogDto,
  QueryAuditLogsDto,
  CreateSessionDto,
} from './audit.service';
import {
  AuditLog,
  AuditSnapshot,
  AuditRetentionPolicy,
  AuditAlert,
  AuditAlertHistory,
  AuditSession,
  AuditReport,
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from './entities/audit.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepo: jest.Mocked<Repository<AuditLog>>;
  let snapshotRepo: jest.Mocked<Repository<AuditSnapshot>>;
  let retentionPolicyRepo: jest.Mocked<Repository<AuditRetentionPolicy>>;
  let alertRepo: jest.Mocked<Repository<AuditAlert>>;
  let alertHistoryRepo: jest.Mocked<Repository<AuditAlertHistory>>;
  let sessionRepo: jest.Mocked<Repository<AuditSession>>;
  let reportRepo: jest.Mocked<Repository<AuditReport>>;

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';

  const mockAuditLog: AuditLog = {
    id: 'audit-uuid-1',
    organizationId: orgId,
    userId,
    userEmail: 'test@example.com',
    userName: 'Test User',
    entityType: 'product',
    entityId: 'entity-uuid-1',
    entityName: 'Americano',
    action: AuditAction.CREATE,
    category: AuditCategory.DATA_MODIFICATION,
    severity: AuditSeverity.INFO,
    isSuccess: true,
    retentionDays: 365,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as AuditLog;

  const mockSnapshot: AuditSnapshot = {
    id: 'snapshot-uuid-1',
    organizationId: orgId,
    entityType: 'product',
    entityId: 'entity-uuid-1',
    entityName: 'Americano',
    snapshot: { name: 'Americano', price: 12000 },
    retentionDays: 2555,
    created_at: new Date(),
  } as unknown as AuditSnapshot;

  const mockSession: AuditSession = {
    id: 'session-uuid-1',
    userId,
    organizationId: orgId,
    isActive: true,
    actionsCount: 0,
    lastActivityAt: new Date(),
    created_at: new Date(),
  } as unknown as AuditSession;

  const mockReport: AuditReport = {
    id: 'report-uuid-1',
    organizationId: orgId,
    name: 'security Report - 2024-01-01',
    reportType: 'security',
    status: 'completed',
    created_at: new Date(),
  } as unknown as AuditReport;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockAuditLog]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockAuditLog], 1]),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(AuditSnapshot),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuditRetentionPolicy),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuditAlert),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuditAlertHistory),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuditSession),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuditReport),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogRepo = module.get(getRepositoryToken(AuditLog));
    snapshotRepo = module.get(getRepositoryToken(AuditSnapshot));
    retentionPolicyRepo = module.get(getRepositoryToken(AuditRetentionPolicy));
    alertRepo = module.get(getRepositoryToken(AuditAlert));
    alertHistoryRepo = module.get(getRepositoryToken(AuditAlertHistory));
    sessionRepo = module.get(getRepositoryToken(AuditSession));
    reportRepo = module.get(getRepositoryToken(AuditReport));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // AUDIT LOG METHODS
  // ============================================================================

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      const dto: CreateAuditLogDto = {
        organizationId: orgId,
        userId,
        entityType: 'product',
        entityId: 'entity-uuid-1',
        action: AuditAction.CREATE,
      };

      retentionPolicyRepo.findOne.mockResolvedValue(null);
      auditLogRepo.create.mockReturnValue(mockAuditLog);
      auditLogRepo.save.mockResolvedValue(mockAuditLog);
      alertRepo.find.mockResolvedValue([]);

      const result = await service.createAuditLog(dto);

      expect(result).toEqual(mockAuditLog);
      expect(auditLogRepo.create).toHaveBeenCalled();
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('should use default retention days when no policy found', async () => {
      retentionPolicyRepo.findOne.mockResolvedValue(null);
      auditLogRepo.create.mockReturnValue(mockAuditLog);
      auditLogRepo.save.mockResolvedValue(mockAuditLog);
      alertRepo.find.mockResolvedValue([]);

      await service.createAuditLog({
        entityType: 'product',
        action: AuditAction.CREATE,
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          retentionDays: 365,
        }),
      );
    });

    it('should apply custom retention policy when found', async () => {
      const policy = { retentionDays: 90 } as AuditRetentionPolicy;
      retentionPolicyRepo.findOne.mockResolvedValue(policy);
      auditLogRepo.create.mockReturnValue(mockAuditLog);
      auditLogRepo.save.mockResolvedValue(mockAuditLog);
      alertRepo.find.mockResolvedValue([]);

      await service.createAuditLog({
        organizationId: orgId,
        entityType: 'product',
        action: AuditAction.CREATE,
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          retentionDays: 90,
        }),
      );
    });

    it('should default category to DATA_MODIFICATION and severity to INFO', async () => {
      retentionPolicyRepo.findOne.mockResolvedValue(null);
      auditLogRepo.create.mockReturnValue(mockAuditLog);
      auditLogRepo.save.mockResolvedValue(mockAuditLog);
      alertRepo.find.mockResolvedValue([]);

      await service.createAuditLog({
        entityType: 'product',
        action: AuditAction.CREATE,
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: AuditCategory.DATA_MODIFICATION,
          severity: AuditSeverity.INFO,
          isSuccess: true,
        }),
      );
    });
  });

  describe('queryAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockAuditLog]);

      const result = await service.queryAuditLogs({});

      expect(result).toEqual({
        data: [mockAuditLog],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should apply organizationId filter', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.queryAuditLogs({ organizationId: orgId });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.organizationId = :organizationId',
        { organizationId: orgId },
      );
    });

    it('should apply search filter', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.queryAuditLogs({ search: 'product' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(audit.description ILIKE :search OR audit.entityName ILIKE :search OR audit.userEmail ILIKE :search)',
        { search: '%product%' },
      );
    });
  });

  describe('getAuditLogById', () => {
    it('should return a single audit log', async () => {
      auditLogRepo.findOne.mockResolvedValue(mockAuditLog);

      const result = await service.getAuditLogById('audit-uuid-1');

      expect(result).toEqual(mockAuditLog);
    });

    it('should throw NotFoundException when not found', async () => {
      auditLogRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getAuditLogById('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEntityHistory', () => {
    it('should return entity history without snapshots', async () => {
      auditLogRepo.find.mockResolvedValue([mockAuditLog]);

      const result = await service.getEntityHistory('product', 'entity-uuid-1');

      expect(result).toEqual({ logs: [mockAuditLog], snapshots: undefined });
    });

    it('should include snapshots when requested', async () => {
      auditLogRepo.find.mockResolvedValue([mockAuditLog]);
      snapshotRepo.find.mockResolvedValue([mockSnapshot]);

      const result = await service.getEntityHistory('product', 'entity-uuid-1', {
        includeSnapshots: true,
      });

      expect(result).toEqual({
        logs: [mockAuditLog],
        snapshots: [mockSnapshot],
      });
    });
  });

  // ============================================================================
  // SNAPSHOT METHODS
  // ============================================================================

  describe('createSnapshot', () => {
    it('should create an entity snapshot', async () => {
      retentionPolicyRepo.findOne.mockResolvedValue(null);
      snapshotRepo.create.mockReturnValue(mockSnapshot);
      snapshotRepo.save.mockResolvedValue(mockSnapshot);

      const result = await service.createSnapshot(
        orgId,
        'product',
        'entity-uuid-1',
        { name: 'Americano', price: 12000 },
      );

      expect(result).toEqual(mockSnapshot);
      expect(snapshotRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          entityType: 'product',
          entityId: 'entity-uuid-1',
          retentionDays: 2555,
        }),
      );
    });
  });

  describe('getSnapshot', () => {
    it('should return a snapshot by id', async () => {
      snapshotRepo.findOne.mockResolvedValue(mockSnapshot);

      const result = await service.getSnapshot('snapshot-uuid-1');

      expect(result).toEqual(mockSnapshot);
    });

    it('should throw NotFoundException when snapshot not found', async () => {
      snapshotRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getSnapshot('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // SESSION METHODS
  // ============================================================================

  describe('createSession', () => {
    it('should create a new session and log audit event', async () => {
      const dto: CreateSessionDto = {
        userId,
        organizationId: orgId,
        loginMethod: 'password',
      };

      sessionRepo.create.mockReturnValue(mockSession);
      sessionRepo.save.mockResolvedValue(mockSession);
      retentionPolicyRepo.findOne.mockResolvedValue(null);
      auditLogRepo.create.mockReturnValue(mockAuditLog);
      auditLogRepo.save.mockResolvedValue(mockAuditLog);
      alertRepo.find.mockResolvedValue([]);

      const result = await service.createSession(dto);

      expect(result).toEqual(mockSession);
      expect(sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          isActive: true,
          actionsCount: 0,
        }),
      );
    });
  });

  describe('endSession', () => {
    it('should end an active session', async () => {
      sessionRepo.findOne.mockResolvedValue(mockSession);
      sessionRepo.save.mockResolvedValue({
        ...mockSession,
        isActive: false,
      } as AuditSession);
      retentionPolicyRepo.findOne.mockResolvedValue(null);
      auditLogRepo.create.mockReturnValue(mockAuditLog);
      auditLogRepo.save.mockResolvedValue(mockAuditLog);
      alertRepo.find.mockResolvedValue([]);

      await service.endSession('session-uuid-1', 'logout');

      expect(sessionRepo.save).toHaveBeenCalled();
    });

    it('should do nothing when session not found', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await service.endSession('non-existent');

      expect(sessionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('updateSessionActivity', () => {
    it('should update session last activity', async () => {
      sessionRepo.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateSessionActivity('session-uuid-1');

      expect(sessionRepo.update).toHaveBeenCalledWith(
        'session-uuid-1',
        expect.objectContaining({
          lastActivityAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getUserSessions', () => {
    it('should return active sessions by default', async () => {
      sessionRepo.find.mockResolvedValue([mockSession]);

      const result = await service.getUserSessions(userId);

      expect(result).toEqual([mockSession]);
      expect(sessionRepo.find).toHaveBeenCalledWith({
        where: { userId, isActive: true },
        order: { created_at: 'DESC' },
      });
    });

    it('should return all sessions when activeOnly is false', async () => {
      sessionRepo.find.mockResolvedValue([mockSession]);

      await service.getUserSessions(userId, false);

      expect(sessionRepo.find).toHaveBeenCalledWith({
        where: { userId },
        order: { created_at: 'DESC' },
      });
    });
  });

  // ============================================================================
  // RETENTION & CLEANUP
  // ============================================================================

  describe('upsertRetentionPolicy', () => {
    it('should create new retention policy', async () => {
      const policy = {
        organizationId: orgId,
        entityType: 'product',
        retentionDays: 90,
      } as AuditRetentionPolicy;

      retentionPolicyRepo.findOne.mockResolvedValue(null);
      retentionPolicyRepo.create.mockReturnValue(policy);
      retentionPolicyRepo.save.mockResolvedValue(policy);

      const result = await service.upsertRetentionPolicy(
        orgId,
        'product',
        { retentionDays: 90 },
      );

      expect(result).toEqual(policy);
      expect(retentionPolicyRepo.create).toHaveBeenCalled();
    });

    it('should update existing retention policy', async () => {
      const existing = {
        organizationId: orgId,
        entityType: 'product',
        retentionDays: 365,
      } as AuditRetentionPolicy;

      retentionPolicyRepo.findOne.mockResolvedValue(existing);
      retentionPolicyRepo.save.mockResolvedValue({
        ...existing,
        retentionDays: 90,
      } as AuditRetentionPolicy);

      const result = await service.upsertRetentionPolicy(
        orgId,
        'product',
        { retentionDays: 90 },
      );

      expect(result.retentionDays).toEqual(90);
    });
  });

  describe('cleanupExpiredLogs', () => {
    it('should delete expired audit logs', async () => {
      auditLogRepo.delete.mockResolvedValue({ affected: 5 } as any);

      const result = await service.cleanupExpiredLogs();

      expect(result).toEqual(5);
      expect(auditLogRepo.delete).toHaveBeenCalled();
    });

    it('should return 0 when no logs expired', async () => {
      auditLogRepo.delete.mockResolvedValue({ affected: 0 } as any);

      const result = await service.cleanupExpiredLogs();

      expect(result).toEqual(0);
    });
  });

  describe('cleanupExpiredSnapshots', () => {
    it('should delete expired snapshots', async () => {
      snapshotRepo.delete.mockResolvedValue({ affected: 3 } as any);

      const result = await service.cleanupExpiredSnapshots();

      expect(result).toEqual(3);
    });
  });

  // ============================================================================
  // REPORT METHODS
  // ============================================================================

  describe('getReports', () => {
    it('should return reports for organization', async () => {
      reportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.getReports(orgId);

      expect(result).toEqual([mockReport]);
      expect(reportRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        order: { created_at: 'DESC' },
        take: 20,
      });
    });

    it('should apply custom limit', async () => {
      reportRepo.find.mockResolvedValue([]);

      await service.getReports(orgId, 5);

      expect(reportRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });
});
