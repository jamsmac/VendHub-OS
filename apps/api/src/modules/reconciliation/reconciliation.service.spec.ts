import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { ReconciliationService } from './reconciliation.service';
import {
  ReconciliationRun,
  ReconciliationMismatch,
  HwImportedSale,
  ReconciliationStatus,
  MismatchType,
} from './entities/reconciliation.entity';

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';
const USER_ID = 'user-uuid-00000000-0000-0000-0000-000000000001';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let runRepo: jest.Mocked<Repository<ReconciliationRun>>;
  let mismatchRepo: jest.Mocked<Repository<ReconciliationMismatch>>;
  let hwSaleRepo: jest.Mocked<Repository<HwImportedSale>>;

  const mockRun = {
    id: 'run-uuid-1',
    organizationId: ORG_ID,
    status: ReconciliationStatus.PENDING,
    dateFrom: new Date('2024-01-01'),
    dateTo: new Date('2024-01-31'),
    sources: ['hw'],
    machineIds: [],
    timeTolerance: 300,
    amountTolerance: 0.01,
    summary: null,
    startedAt: null,
    completedAt: null,
    processingTimeMs: null,
    errorMessage: null,
    created_by_id: USER_ID,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as ReconciliationRun;

  const mockCompletedRun = {
    ...mockRun,
    id: 'run-uuid-2',
    status: ReconciliationStatus.COMPLETED,
  } as unknown as ReconciliationRun;

  const mockMismatch = {
    id: 'mismatch-uuid-1',
    runId: 'run-uuid-1',
    organizationId: ORG_ID,
    orderNumber: 'ORD-001',
    machineCode: 'M001',
    orderTime: new Date(),
    amount: 10000,
    mismatchType: MismatchType.ORDER_NOT_FOUND,
    matchScore: 0,
    isResolved: false,
    resolutionNotes: null,
    resolvedAt: null,
    resolvedByUserId: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as ReconciliationMismatch;

  const mockRunQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockRun], 1]),
  };

  const mockMismatchQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockMismatch], 1]),
  };

  const mockHwQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: getRepositoryToken(ReconciliationRun),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockRunQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(ReconciliationMismatch),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockMismatchQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(HwImportedSale),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockHwQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    runRepo = module.get(getRepositoryToken(ReconciliationRun));
    mismatchRepo = module.get(getRepositoryToken(ReconciliationMismatch));
    hwSaleRepo = module.get(getRepositoryToken(HwImportedSale));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE RUN
  // ============================================================================

  describe('createRun', () => {
    it('should create a new reconciliation run', async () => {
      runRepo.create.mockReturnValue(mockRun);
      runRepo.save.mockResolvedValue(mockRun);

      const dto = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        sources: ['hw'],
      };

      const result = await service.createRun(ORG_ID, USER_ID, dto as any);

      expect(result).toEqual(mockRun);
      expect(runRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: ORG_ID,
        status: ReconciliationStatus.PENDING,
        created_by_id: USER_ID,
      }));
    });

    it('should use default tolerances when not specified', async () => {
      runRepo.create.mockReturnValue(mockRun);
      runRepo.save.mockResolvedValue(mockRun);

      const dto = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        sources: ['hw'],
      };

      await service.createRun(ORG_ID, USER_ID, dto as any);

      expect(runRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        timeTolerance: 300,
        amountTolerance: 0.01,
      }));
    });
  });

  // ============================================================================
  // PROCESS RECONCILIATION
  // ============================================================================

  describe('processReconciliation', () => {
    it('should throw NotFoundException when run not found', async () => {
      runRepo.findOne.mockResolvedValue(null);

      await expect(
        service.processReconciliation('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when run is not pending', async () => {
      runRepo.findOne.mockResolvedValue(mockCompletedRun);

      await expect(
        service.processReconciliation('run-uuid-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process a pending run and mark as completed', async () => {
      const pendingRun = { ...mockRun } as any;
      runRepo.findOne.mockResolvedValue(pendingRun);
      runRepo.save.mockImplementation(async (run) => run as ReconciliationRun);
      hwSaleRepo.createQueryBuilder.mockReturnValue(mockHwQueryBuilder as any);
      mockHwQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.processReconciliation('run-uuid-1');

      expect(result.status).toBe(ReconciliationStatus.COMPLETED);
      expect(result.summary).toBeDefined();
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // FIND ALL (QUERY RUNS)
  // ============================================================================

  describe('findAll', () => {
    it('should return paginated reconciliation runs', async () => {
      const result = await service.findAll(ORG_ID, { page: 1, limit: 20 } as any);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages', 1);
    });

    it('should filter by status', async () => {
      await service.findAll(ORG_ID, { status: ReconciliationStatus.COMPLETED, page: 1, limit: 20 } as any);

      expect(mockRunQueryBuilder.andWhere).toHaveBeenCalledWith(
        'r.status = :status',
        { status: ReconciliationStatus.COMPLETED },
      );
    });
  });

  // ============================================================================
  // FIND ONE
  // ============================================================================

  describe('findOne', () => {
    it('should return run with mismatches', async () => {
      runRepo.findOne.mockResolvedValue(mockRun);

      const result = await service.findOne('run-uuid-1');

      expect(result).toEqual(mockRun);
      expect(runRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'run-uuid-1' },
        relations: ['mismatches'],
      });
    });

    it('should throw NotFoundException when run not found', async () => {
      runRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // GET MISMATCHES
  // ============================================================================

  describe('getMismatches', () => {
    it('should return paginated mismatches for a run', async () => {
      const result = await service.getMismatches('run-uuid-1', { page: 1, limit: 20 } as any);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 1);
      expect(mockMismatchQueryBuilder.where).toHaveBeenCalledWith(
        'm.runId = :runId',
        { runId: 'run-uuid-1' },
      );
    });
  });

  // ============================================================================
  // RESOLVE MISMATCH
  // ============================================================================

  describe('resolveMismatch', () => {
    it('should resolve an unresolved mismatch', async () => {
      const unresolvedMismatch = { ...mockMismatch } as any;
      mismatchRepo.findOne.mockResolvedValue(unresolvedMismatch);
      mismatchRepo.save.mockImplementation(async (m) => m as ReconciliationMismatch);

      const dto = { resolutionNotes: 'Fixed manually' };
      const result = await service.resolveMismatch('mismatch-uuid-1', USER_ID, dto as any);

      expect(result.isResolved).toBe(true);
      expect(result.resolutionNotes).toBe('Fixed manually');
      expect(result.resolvedByUserId).toBe(USER_ID);
    });

    it('should throw NotFoundException when mismatch not found', async () => {
      mismatchRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resolveMismatch('non-existent', USER_ID, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when mismatch is already resolved', async () => {
      mismatchRepo.findOne.mockResolvedValue({ ...mockMismatch, isResolved: true } as any);

      await expect(
        service.resolveMismatch('mismatch-uuid-1', USER_ID, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // DELETE RUN
  // ============================================================================

  describe('deleteRun', () => {
    it('should soft delete a completed run', async () => {
      runRepo.findOne.mockResolvedValue(mockCompletedRun);
      runRepo.softDelete.mockResolvedValue(undefined as any);

      await service.deleteRun('run-uuid-2');

      expect(runRepo.softDelete).toHaveBeenCalledWith('run-uuid-2');
    });

    it('should throw NotFoundException when run not found', async () => {
      runRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteRun('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when run is pending', async () => {
      runRepo.findOne.mockResolvedValue(mockRun);

      await expect(service.deleteRun('run-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // IMPORT HW SALES
  // ============================================================================

  describe('importHwSales', () => {
    it('should import HW sales and return batch info', async () => {
      hwSaleRepo.create.mockImplementation((data) => data as any);
      hwSaleRepo.save.mockResolvedValue([] as any);

      const dto = {
        importSource: 'excel',
        sales: [
          { saleDate: '2024-01-15', machineCode: 'M001', amount: 5000 },
          { saleDate: '2024-01-16', machineCode: 'M002', amount: 3000 },
        ],
      };

      const result = await service.importHwSales(ORG_ID, USER_ID, dto as any);

      expect(result).toHaveProperty('batchId');
      expect(result.imported).toBe(2);
    });
  });
});
