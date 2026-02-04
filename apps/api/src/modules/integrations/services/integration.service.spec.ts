import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { Integration, IntegrationTemplate, IntegrationLog } from '../entities/integration.entity';
import {
  IntegrationCategory,
  IntegrationStatus,
} from '../types/integration.types';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
  increment: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  getRawOne: jest.fn(),
});

describe('IntegrationService', () => {
  let service: IntegrationService;
  let integrationRepo: MockRepository<Integration>;
  let templateRepo: MockRepository<IntegrationTemplate>;
  let logRepo: MockRepository<IntegrationLog>;

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';
  const integrationId = 'int-uuid-1';

  const mockIntegration: Partial<Integration> = {
    id: integrationId,
    organizationId: orgId,
    name: 'payme',
    displayName: 'Payme',
    category: IntegrationCategory.PAYMENT,
    status: IntegrationStatus.DRAFT,
    config: {
      name: 'payme',
      displayName: 'Payme',
      sandboxMode: true,
      baseUrl: 'https://checkout.payme.uz',
      auth: { type: 'api_key' as any, config: { keyName: 'Authorization', keyLocation: 'header' as any } },
      credentials: [],
      supportedCurrencies: ['UZS'],
      supportedMethods: [],
      endpoints: {
        createPayment: { id: 'cp', name: 'Create', description: 'd', method: 'POST' as any, path: '/payments' },
        checkStatus: { id: 'cs', name: 'Status', description: 'd', method: 'GET' as any, path: '/payments/{id}' },
      },
    },
    credentials: { api_key: 'test-key' },
    sandboxCredentials: { api_key: 'sandbox-key' },
    sandboxMode: true,
    successCount: 0,
    errorCount: 0,
    lastTestedAt: null as any,
    lastUsedAt: null as any,
  };

  const mockTemplate: Partial<IntegrationTemplate> = {
    id: 'tmpl-1',
    name: 'payme',
    displayName: 'Payme Template',
    category: IntegrationCategory.PAYMENT,
    defaultConfig: mockIntegration.config!,
    isActive: true,
    usageCount: 5,
  };

  beforeEach(async () => {
    integrationRepo = createMockRepository<Integration>();
    templateRepo = createMockRepository<IntegrationTemplate>();
    logRepo = createMockRepository<IntegrationLog>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        { provide: getRepositoryToken(Integration), useValue: integrationRepo },
        { provide: getRepositoryToken(IntegrationTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(IntegrationLog), useValue: logRepo },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
  });

  // ================================================================
  // Integration CRUD
  // ================================================================

  describe('findAll', () => {
    it('should return integrations for organization', async () => {
      const qb = createMockQueryBuilder();
      integrationRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([mockIntegration]);

      const result = await service.findAll(orgId);

      expect(qb.where).toHaveBeenCalledWith(
        'integration.organizationId = :organizationId',
        { organizationId: orgId },
      );
      expect(result).toEqual([mockIntegration]);
    });

    it('should filter by category when provided', async () => {
      const qb = createMockQueryBuilder();
      integrationRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(orgId, IntegrationCategory.PAYMENT);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'integration.category = :category',
        { category: IntegrationCategory.PAYMENT },
      );
    });
  });

  describe('findOne', () => {
    it('should return integration when found', async () => {
      integrationRepo.findOne!.mockResolvedValue(mockIntegration);
      const result = await service.findOne(integrationId, orgId);
      expect(result).toEqual(mockIntegration);
    });

    it('should throw NotFoundException when not found', async () => {
      integrationRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOne('missing', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActivePaymentIntegrations', () => {
    it('should return active payment integrations sorted by priority', async () => {
      integrationRepo.find!.mockResolvedValue([mockIntegration]);

      const result = await service.findActivePaymentIntegrations(orgId);

      expect(integrationRepo.find).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          category: IntegrationCategory.PAYMENT,
          status: IntegrationStatus.ACTIVE,
        },
        order: { priority: 'DESC' },
      });
      expect(result).toEqual([mockIntegration]);
    });
  });

  describe('create', () => {
    it('should create integration from template', async () => {
      templateRepo.findOne!.mockResolvedValue(mockTemplate);
      templateRepo.increment!.mockResolvedValue({ affected: 1 });
      integrationRepo.create!.mockImplementation((d) => d);
      integrationRepo.save!.mockImplementation(async (d) => ({ id: 'new-int', ...d }));

      const result = await service.create(
        orgId,
        {
          name: 'payme',
          displayName: 'Payme',
          category: IntegrationCategory.PAYMENT,
          templateId: 'tmpl-1',
        },
        userId,
      );

      expect(templateRepo.increment).toHaveBeenCalledWith(
        { id: 'tmpl-1' },
        'usageCount',
        1,
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when template not found', async () => {
      templateRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.create(
          orgId,
          { name: 'x', displayName: 'X', category: IntegrationCategory.PAYMENT, templateId: 'bad' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create integration with empty config when no template provided', async () => {
      integrationRepo.create!.mockImplementation((d) => d);
      integrationRepo.save!.mockImplementation(async (d) => ({ id: 'new-int', ...d }));

      const result = await service.create(
        orgId,
        { name: 'custom', displayName: 'Custom', category: IntegrationCategory.CUSTOM },
        userId,
      );

      expect(result.status).toBe(IntegrationStatus.DRAFT);
    });
  });

  describe('update', () => {
    it('should update integration fields', async () => {
      integrationRepo.findOne!.mockResolvedValue({ ...mockIntegration });
      integrationRepo.save!.mockImplementation(async (d) => d);

      const result = await service.update(integrationId, orgId, { displayName: 'Payme v2' }, userId);

      expect(result.displayName).toBe('Payme v2');
      expect(result.updated_by_id).toBe(userId);
    });
  });

  describe('updateConfig', () => {
    it('should merge config updates', async () => {
      integrationRepo.findOne!.mockResolvedValue({ ...mockIntegration });
      integrationRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateConfig(integrationId, orgId, { baseUrl: 'https://new-url.com' }, userId);

      expect(result.config.baseUrl).toBe('https://new-url.com');
      expect(result.config.name).toBe('payme'); // existing fields preserved
    });
  });

  describe('updateCredentials', () => {
    it('should update sandbox credentials when isSandbox is true', async () => {
      integrationRepo.findOne!.mockResolvedValue({ ...mockIntegration });
      integrationRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateCredentials(integrationId, orgId, { api_key: 'new-sandbox' }, true, userId);

      expect(result.sandboxCredentials).toEqual({ api_key: 'new-sandbox' });
    });

    it('should update production credentials when isSandbox is false', async () => {
      integrationRepo.findOne!.mockResolvedValue({ ...mockIntegration });
      integrationRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateCredentials(integrationId, orgId, { api_key: 'prod-key' }, false, userId);

      expect(result.credentials).toEqual({ api_key: 'prod-key' });
    });
  });

  describe('updateStatus', () => {
    it('should transition from DRAFT to TESTING', async () => {
      integrationRepo.findOne!.mockResolvedValue({ ...mockIntegration, status: IntegrationStatus.DRAFT });
      integrationRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateStatus(integrationId, orgId, IntegrationStatus.TESTING, userId);

      expect(result.status).toBe(IntegrationStatus.TESTING);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      integrationRepo.findOne!.mockResolvedValue({ ...mockIntegration, status: IntegrationStatus.DEPRECATED });

      await expect(
        service.updateStatus(integrationId, orgId, IntegrationStatus.ACTIVE, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject transition from ACTIVE to DRAFT', async () => {
      integrationRepo.findOne!.mockResolvedValue({ ...mockIntegration, status: IntegrationStatus.ACTIVE });

      await expect(
        service.updateStatus(integrationId, orgId, IntegrationStatus.DRAFT, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should remove the integration', async () => {
      integrationRepo.findOne!.mockResolvedValue(mockIntegration);
      integrationRepo.remove!.mockResolvedValue(mockIntegration);

      await service.delete(integrationId, orgId);

      expect(integrationRepo.remove).toHaveBeenCalledWith(mockIntegration);
    });
  });

  describe('toggleSandboxMode', () => {
    it('should set sandboxMode to false', async () => {
      integrationRepo.findOne!.mockResolvedValue({ ...mockIntegration, sandboxMode: true });
      integrationRepo.save!.mockImplementation(async (d) => d);

      const result = await service.toggleSandboxMode(integrationId, orgId, false, userId);

      expect(result.sandboxMode).toBe(false);
    });
  });

  // ================================================================
  // Templates
  // ================================================================

  describe('findAllTemplates', () => {
    it('should return active templates', async () => {
      const qb = createMockQueryBuilder();
      templateRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([mockTemplate]);

      const result = await service.findAllTemplates();

      expect(qb.where).toHaveBeenCalledWith(
        'template.isActive = :isActive',
        { isActive: true },
      );
      expect(result).toEqual([mockTemplate]);
    });

    it('should filter by category and country', async () => {
      const qb = createMockQueryBuilder();
      templateRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAllTemplates(IntegrationCategory.PAYMENT, 'UZ');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'template.category = :category',
        { category: IntegrationCategory.PAYMENT },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'template.country = :country',
        { country: 'UZ' },
      );
    });
  });

  describe('findTemplate', () => {
    it('should return template when found', async () => {
      templateRepo.findOne!.mockResolvedValue(mockTemplate);
      const result = await service.findTemplate('tmpl-1');
      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException when not found', async () => {
      templateRepo.findOne!.mockResolvedValue(null);
      await expect(service.findTemplate('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // Logs
  // ================================================================

  describe('getLogs', () => {
    it('should return logs filtered by success flag', async () => {
      const qb = createMockQueryBuilder();
      logRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.getLogs(integrationId, orgId, { success: true, limit: 10, offset: 5 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'log.success = :success',
        { success: true },
      );
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(qb.skip).toHaveBeenCalledWith(5);
    });
  });

  describe('createLog', () => {
    it('should create and save a log entry', async () => {
      const logData = { integrationId, action: 'createPayment', success: true };
      logRepo.create!.mockReturnValue(logData);
      logRepo.save!.mockResolvedValue({ id: 'log-1', ...logData });

      const result = await service.createLog(logData as any);

      expect(result.id).toBe('log-1');
    });
  });

  // ================================================================
  // Statistics
  // ================================================================

  describe('getStatistics', () => {
    it('should return comprehensive statistics', async () => {
      integrationRepo.findOne!.mockResolvedValue(mockIntegration);
      logRepo.count!
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95); // successful
      const qb = createMockQueryBuilder();
      logRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getRawOne.mockResolvedValue({ avg: 250 });

      const result = await service.getStatistics(integrationId, orgId);

      expect(result.totalRequests).toBe(100);
      expect(result.successfulRequests).toBe(95);
      expect(result.failedRequests).toBe(5);
      expect(result.successRate).toBe(95);
      expect(result.avgDuration).toBe(250);
    });

    it('should return 0 success rate when no requests', async () => {
      integrationRepo.findOne!.mockResolvedValue(mockIntegration);
      logRepo.count!.mockResolvedValue(0);
      const qb = createMockQueryBuilder();
      logRepo.createQueryBuilder!.mockReturnValue(qb);
      qb.getRawOne.mockResolvedValue({ avg: null });

      const result = await service.getStatistics(integrationId, orgId);

      expect(result.successRate).toBe(0);
      expect(result.avgDuration).toBe(0);
    });
  });
});
