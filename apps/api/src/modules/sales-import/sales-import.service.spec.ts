import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { SalesImportService } from './sales-import.service';
import { SalesImport, ImportStatus, ImportFileType } from './entities/sales-import.entity';
import { CreateSalesImportDto, QuerySalesImportsDto } from './dto/create-sales-import.dto';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
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
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  getCount: jest.fn(),
  getMany: jest.fn(),
  getRawOne: jest.fn(),
  getRawMany: jest.fn(),
});

describe('SalesImportService', () => {
  let service: SalesImportService;
  let repository: MockRepository<SalesImport>;

  beforeEach(async () => {
    repository = createMockRepository<SalesImport>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesImportService,
        { provide: getRepositoryToken(SalesImport), useValue: repository },
      ],
    }).compile();

    service = module.get<SalesImportService>(SalesImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // CREATE
  // ==========================================================================

  describe('create', () => {
    it('should create a new import record with PENDING status', async () => {
      const dto: CreateSalesImportDto = {
        filename: 'sales_jan_2025.xlsx',
        fileType: ImportFileType.EXCEL,
      };

      const created = {
        id: 'imp-1',
        organizationId: 'org-1',
        uploadedByUserId: 'user-1',
        filename: dto.filename,
        fileType: dto.fileType,
        fileId: null,
        status: ImportStatus.PENDING,
        created_by_id: 'user-1',
      };

      repository.create!.mockReturnValue(created);
      repository.save!.mockResolvedValue(created);

      const result = await service.create('org-1', 'user-1', dto);

      expect(repository.create).toHaveBeenCalledWith({
        organizationId: 'org-1',
        uploadedByUserId: 'user-1',
        filename: 'sales_jan_2025.xlsx',
        fileType: ImportFileType.EXCEL,
        fileId: null,
        status: ImportStatus.PENDING,
        created_by_id: 'user-1',
      });
      expect(result.status).toBe(ImportStatus.PENDING);
    });

    it('should set fileId when provided in dto', async () => {
      const dto: CreateSalesImportDto = {
        filename: 'sales.csv',
        fileType: ImportFileType.CSV,
        fileId: 'file-uuid-123',
      };

      const created = { ...dto, id: 'imp-2', status: ImportStatus.PENDING };
      repository.create!.mockReturnValue(created);
      repository.save!.mockResolvedValue(created);

      await service.create('org-1', 'user-1', dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ fileId: 'file-uuid-123' }),
      );
    });
  });

  // ==========================================================================
  // START PROCESSING
  // ==========================================================================

  describe('startProcessing', () => {
    it('should set status to PROCESSING and record start time', async () => {
      const existing = {
        id: 'imp-1',
        status: ImportStatus.PENDING,
        startedAt: null,
      };

      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockResolvedValue({
        ...existing,
        status: ImportStatus.PROCESSING,
        startedAt: expect.any(Date),
      });

      const result = await service.startProcessing('imp-1');

      expect(result.status).toBe(ImportStatus.PROCESSING);
      expect(existing.startedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when import not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.startProcessing('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // UPDATE PROGRESS
  // ==========================================================================

  describe('updateProgress', () => {
    it('should update totalRows, successRows and failedRows', async () => {
      const existing = {
        id: 'imp-1',
        totalRows: 0,
        successRows: 0,
        failedRows: 0,
        errors: [],
      };

      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateProgress('imp-1', {
        totalRows: 100,
        successRows: 90,
        failedRows: 10,
      });

      expect(existing.totalRows).toBe(100);
      expect(existing.successRows).toBe(90);
      expect(existing.failedRows).toBe(10);
    });

    it('should append errors to existing errors array', async () => {
      const existing = {
        id: 'imp-1',
        totalRows: 100,
        successRows: 0,
        failedRows: 0,
        errors: [{ row: 1, field: 'amount', message: 'Invalid' }],
      };

      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockImplementation((entity) => Promise.resolve(entity));

      await service.updateProgress('imp-1', {
        errors: [{ row: 5, field: 'date', message: 'Bad format' }],
      });

      expect(existing.errors).toHaveLength(2);
      expect(existing.errors[1]).toEqual({ row: 5, field: 'date', message: 'Bad format' });
    });

    it('should not modify fields that are not provided', async () => {
      const existing = {
        id: 'imp-1',
        totalRows: 50,
        successRows: 30,
        failedRows: 5,
        errors: [],
      };

      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockImplementation((entity) => Promise.resolve(entity));

      await service.updateProgress('imp-1', { successRows: 35 });

      expect(existing.totalRows).toBe(50);
      expect(existing.failedRows).toBe(5);
      expect(existing.successRows).toBe(35);
    });
  });

  // ==========================================================================
  // COMPLETE
  // ==========================================================================

  describe('complete', () => {
    it('should mark as COMPLETED when all rows succeed', async () => {
      const existing = {
        id: 'imp-1',
        totalRows: 100,
        successRows: 100,
        failedRows: 0,
        status: ImportStatus.PROCESSING,
        completedAt: null,
        summary: null,
        message: null,
      };

      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.complete('imp-1', {
        totalAmount: 5000000,
        transactionsCreated: 100,
      });

      expect(existing.status).toBe(ImportStatus.COMPLETED);
      expect(existing.message).toContain('Successfully imported 100');
      expect(existing.completedAt).toBeInstanceOf(Date);
    });

    it('should mark as FAILED when all rows fail', async () => {
      const existing = {
        id: 'imp-2',
        totalRows: 50,
        successRows: 0,
        failedRows: 50,
        status: ImportStatus.PROCESSING,
        completedAt: null,
        summary: null,
        message: null,
      };

      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockImplementation((entity) => Promise.resolve(entity));

      await service.complete('imp-2', {});

      expect(existing.status).toBe(ImportStatus.FAILED);
      expect(existing.message).toContain('failed');
    });

    it('should mark as PARTIAL when some rows succeed and some fail', async () => {
      const existing = {
        id: 'imp-3',
        totalRows: 100,
        successRows: 70,
        failedRows: 30,
        status: ImportStatus.PROCESSING,
        completedAt: null,
        summary: null,
        message: null,
      };

      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockImplementation((entity) => Promise.resolve(entity));

      await service.complete('imp-3', { totalAmount: 3500000 });

      expect(existing.status).toBe(ImportStatus.PARTIAL);
      expect(existing.message).toContain('70 success');
      expect(existing.message).toContain('30 failed');
    });

    it('should store the summary object', async () => {
      const existing = {
        id: 'imp-4',
        totalRows: 10,
        successRows: 10,
        failedRows: 0,
        status: ImportStatus.PROCESSING,
        completedAt: null,
        summary: null,
        message: null,
      };

      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockImplementation((entity) => Promise.resolve(entity));

      const summary = { totalAmount: 1000000, transactionsCreated: 10, machinesProcessed: 3 };
      await service.complete('imp-4', summary);

      expect(existing.summary).toEqual(summary);
    });
  });

  // ==========================================================================
  // FIND ALL
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated import records', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(25);
      mockQb.getMany.mockResolvedValue([{ id: 'imp-1' }, { id: 'imp-2' }]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const params: QuerySalesImportsDto = { page: 1, limit: 20 };
      const result = await service.findAll('org-1', params);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should apply status filter', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const params: QuerySalesImportsDto = { status: ImportStatus.COMPLETED };
      await service.findAll('org-1', params);

      expect(mockQb.andWhere).toHaveBeenCalledWith('si.status = :status', { status: ImportStatus.COMPLETED });
    });

    it('should apply date range filters', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const params: QuerySalesImportsDto = {
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      };
      await service.findAll('org-1', params);

      expect(mockQb.andWhere).toHaveBeenCalledWith('si.created_at >= :dateFrom', { dateFrom: '2025-01-01' });
      expect(mockQb.andWhere).toHaveBeenCalledWith('si.created_at <= :dateTo', { dateTo: '2025-12-31' });
    });

    it('should use default pagination when not specified', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.findAll('org-1', {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(20);
    });
  });

  // ==========================================================================
  // FIND BY ID
  // ==========================================================================

  describe('findById', () => {
    it('should return an import record by id', async () => {
      const record = { id: 'imp-1', filename: 'test.xlsx', status: ImportStatus.COMPLETED };
      repository.findOne!.mockResolvedValue(record);

      const result = await service.findById('imp-1');

      expect(result).toEqual(record);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'imp-1' } });
    });

    it('should throw NotFoundException when record not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findById('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // REMOVE
  // ==========================================================================

  describe('remove', () => {
    it('should soft delete an import record', async () => {
      const record = { id: 'imp-1', filename: 'test.xlsx' };
      repository.findOne!.mockResolvedValue(record);
      repository.softDelete!.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      await service.remove('imp-1');

      expect(repository.softDelete).toHaveBeenCalledWith('imp-1');
    });

    it('should throw NotFoundException when record to delete not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.remove('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // GET STATS
  // ==========================================================================

  describe('getStats', () => {
    it('should return import statistics', async () => {
      const statsQb = createMockQueryBuilder();
      const statusQb = createMockQueryBuilder();

      statsQb.getRawOne.mockResolvedValue({
        totalImports: '15',
        lastImportDate: new Date('2025-06-01'),
        successRate: '80.00',
      });

      statusQb.getRawMany.mockResolvedValue([
        { status: ImportStatus.COMPLETED, count: '12' },
        { status: ImportStatus.FAILED, count: '3' },
      ]);

      repository.createQueryBuilder!
        .mockReturnValueOnce(statsQb)
        .mockReturnValueOnce(statusQb);

      const result = await service.getStats('org-1');

      expect(result.totalImports).toBe(15);
      expect(result.successRate).toBe(80);
      expect(result.byStatus[ImportStatus.COMPLETED]).toBe(12);
      expect(result.byStatus[ImportStatus.FAILED]).toBe(3);
    });

    it('should return zeros when no imports exist', async () => {
      const statsQb = createMockQueryBuilder();
      const statusQb = createMockQueryBuilder();

      statsQb.getRawOne.mockResolvedValue({
        totalImports: '0',
        lastImportDate: null,
        successRate: '0',
      });
      statusQb.getRawMany.mockResolvedValue([]);

      repository.createQueryBuilder!
        .mockReturnValueOnce(statsQb)
        .mockReturnValueOnce(statusQb);

      const result = await service.getStats('org-1');

      expect(result.totalImports).toBe(0);
      expect(result.lastImportDate).toBeNull();
      expect(result.successRate).toBe(0);
      expect(result.byStatus).toEqual({});
    });

    it('should handle null stats result gracefully', async () => {
      const statsQb = createMockQueryBuilder();
      const statusQb = createMockQueryBuilder();

      statsQb.getRawOne.mockResolvedValue(null);
      statusQb.getRawMany.mockResolvedValue([]);

      repository.createQueryBuilder!
        .mockReturnValueOnce(statsQb)
        .mockReturnValueOnce(statusQb);

      const result = await service.getStats('org-1');

      expect(result.totalImports).toBe(0);
      expect(result.successRate).toBe(0);
    });
  });
});
