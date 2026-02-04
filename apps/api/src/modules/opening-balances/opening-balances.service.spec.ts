import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OpeningBalancesService } from './opening-balances.service';
import { StockOpeningBalance } from './entities/stock-opening-balance.entity';

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
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
});

describe('OpeningBalancesService', () => {
  let service: OpeningBalancesService;
  let repository: MockRepository<StockOpeningBalance>;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    repository = createMockRepository<StockOpeningBalance>();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpeningBalancesService,
        { provide: getRepositoryToken(StockOpeningBalance), useValue: repository },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<OpeningBalancesService>(OpeningBalancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    const dto = {
      productId: 'prod-1',
      warehouseId: 'wh-1',
      balanceDate: '2024-01-01',
      quantity: 100,
      unitCost: 15000,
      unit: 'pcs',
    };

    it('should create an opening balance with calculated totalCost', async () => {
      const created = { id: 'ob-1', ...dto, totalCost: 1500000 };
      repository.create!.mockReturnValue(created);
      repository.save!.mockResolvedValue(created);

      const result = await service.create('org-1', 'user-1', dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          productId: 'prod-1',
          quantity: 100,
          unitCost: 15000,
          totalCost: 1500000,
          importSource: 'manual',
          created_by_id: 'user-1',
        }),
      );
      expect(result.id).toBe('ob-1');
    });

    it('should use provided totalCost if supplied', async () => {
      const dtoWithTotal = { ...dto, totalCost: 999999 };
      const created = { id: 'ob-2', ...dtoWithTotal };
      repository.create!.mockReturnValue(created);
      repository.save!.mockResolvedValue(created);

      await service.create('org-1', 'user-1', dtoWithTotal);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalCost: 999999 }),
      );
    });

    it('should default unit to pcs when not provided', async () => {
      const dtoNoUnit = { productId: 'p-1', warehouseId: 'w-1', balanceDate: new Date(), quantity: 10, unitCost: 100 };
      repository.create!.mockReturnValue({ id: 'ob-3' });
      repository.save!.mockResolvedValue({ id: 'ob-3' });

      await service.create('org-1', 'user-1', dtoNoUnit as any);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ unit: 'pcs' }),
      );
    });
  });

  // ==========================================================================
  // bulkCreate
  // ==========================================================================

  describe('bulkCreate', () => {
    it('should create multiple balances with shared import session ID', async () => {
      const dto = {
        balances: [
          { productId: 'p-1', warehouseId: 'w-1', balanceDate: new Date(), quantity: 10, unitCost: 100 },
          { productId: 'p-2', warehouseId: 'w-1', balanceDate: new Date(), quantity: 20, unitCost: 200 },
        ],
      };
      repository.create!.mockImplementation((d) => d);
      repository.save!.mockResolvedValue([]);

      const result = await service.bulkCreate('org-1', 'user-1', dto as any);

      expect(result.created).toBe(2);
      expect(result.importSessionId).toBeDefined();
      expect(typeof result.importSessionId).toBe('string');
    });

    it('should use import source from dto', async () => {
      const dto = {
        balances: [{ productId: 'p-1', warehouseId: 'w-1', balanceDate: new Date(), quantity: 5, unitCost: 50 }],
        importSource: 'excel',
      };
      repository.create!.mockImplementation((d) => d);
      repository.save!.mockResolvedValue([]);

      await service.bulkCreate('org-1', 'user-1', dto as any);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ importSource: 'excel' }),
      );
    });
  });

  // ==========================================================================
  // findAll
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(50);
      mockQb.getMany.mockResolvedValue([{ id: 'ob-1' }]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.findAll('org-1', { page: 2, limit: 10 });

      expect(result.total).toBe(50);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(mockQb.skip).toHaveBeenCalledWith(10);
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });

    it('should filter by productId when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      await service.findAll('org-1', { productId: 'prod-1' } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith('sob.productId = :productId', { productId: 'prod-1' });
    });

    it('should filter by isApplied when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      await service.findAll('org-1', { isApplied: false } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith('sob.isApplied = :isApplied', { isApplied: false });
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================

  describe('findById', () => {
    it('should return balance when found', async () => {
      const balance = { id: 'ob-1', productId: 'p-1' };
      repository.findOne!.mockResolvedValue(balance);

      const result = await service.findById('ob-1');

      expect(result).toEqual(balance);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // update
  // ==========================================================================

  describe('update', () => {
    it('should update an unapplied balance', async () => {
      const balance = {
        id: 'ob-1',
        isApplied: false,
        quantity: 100,
        unitCost: 15000,
        totalCost: 1500000,
      };
      repository.findOne!.mockResolvedValue(balance);
      repository.save!.mockImplementation((b) => Promise.resolve(b));

      const result = await service.update('ob-1', { quantity: 200 });

      expect(result.quantity).toBe(200);
    });

    it('should throw BadRequestException when updating an applied balance', async () => {
      const balance = { id: 'ob-1', isApplied: true };
      repository.findOne!.mockResolvedValue(balance);

      await expect(service.update('ob-1', { quantity: 200 })).rejects.toThrow(BadRequestException);
    });

    it('should recalculate totalCost when quantity or unitCost changes', async () => {
      const balance = { id: 'ob-1', isApplied: false, quantity: 10, unitCost: 100, totalCost: 1000 };
      repository.findOne!.mockResolvedValue(balance);
      repository.save!.mockImplementation((b) => Promise.resolve(b));

      const result = await service.update('ob-1', { quantity: 20 });

      // totalCost = 20 * 100 = 2000
      expect(result.totalCost).toBe(2000);
    });
  });

  // ==========================================================================
  // apply
  // ==========================================================================

  describe('apply', () => {
    it('should apply an unapplied balance and emit event', async () => {
      const balance = {
        id: 'ob-1',
        isApplied: false,
        organizationId: 'org-1',
        productId: 'p-1',
        warehouseId: 'w-1',
        quantity: 10,
        unitCost: 100,
        totalCost: 1000,
      };
      repository.findOne!.mockResolvedValue(balance);
      repository.save!.mockImplementation((b) => Promise.resolve(b));

      const result = await service.apply('ob-1', 'user-1');

      expect(result.isApplied).toBe(true);
      expect(result.appliedByUserId).toBe('user-1');
      expect(result.appliedAt).toBeInstanceOf(Date);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'opening-balance.applied',
        expect.objectContaining({ id: 'ob-1', appliedByUserId: 'user-1' }),
      );
    });

    it('should throw BadRequestException when already applied', async () => {
      const balance = { id: 'ob-1', isApplied: true };
      repository.findOne!.mockResolvedValue(balance);

      await expect(service.apply('ob-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // applyAll
  // ==========================================================================

  describe('applyAll', () => {
    it('should apply all unapplied balances for a date', async () => {
      const balances = [
        { id: 'ob-1', isApplied: false, organizationId: 'org-1', productId: 'p-1', warehouseId: 'w-1', quantity: 10, unitCost: 100, totalCost: 1000 },
        { id: 'ob-2', isApplied: false, organizationId: 'org-1', productId: 'p-2', warehouseId: 'w-1', quantity: 5, unitCost: 50, totalCost: 250 },
      ];
      repository.find!.mockResolvedValue(balances);
      repository.save!.mockResolvedValue(balances);

      const result = await service.applyAll('org-1', 'user-1', { balanceDate: '2024-01-01' } as any);

      expect(result.applied).toBe(2);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    });

    it('should return applied=0 when no balances found', async () => {
      repository.find!.mockResolvedValue([]);

      const result = await service.applyAll('org-1', 'user-1', { balanceDate: '2024-01-01' } as any);

      expect(result.applied).toBe(0);
    });
  });

  // ==========================================================================
  // remove
  // ==========================================================================

  describe('remove', () => {
    it('should soft-delete an unapplied balance', async () => {
      const balance = { id: 'ob-1', isApplied: false };
      repository.findOne!.mockResolvedValue(balance);
      repository.softDelete!.mockResolvedValue({ affected: 1 });

      await service.remove('ob-1');

      expect(repository.softDelete).toHaveBeenCalledWith('ob-1');
    });

    it('should throw BadRequestException when deleting an applied balance', async () => {
      const balance = { id: 'ob-1', isApplied: true };
      repository.findOne!.mockResolvedValue(balance);

      await expect(service.remove('ob-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when balance not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe('getStats', () => {
    it('should return parsed statistics', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawOne.mockResolvedValue({
        total: '100',
        applied: '60',
        pending: '40',
        totalValue: '5000000.00',
      });
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getStats('org-1');

      expect(result.total).toBe(100);
      expect(result.applied).toBe(60);
      expect(result.pending).toBe(40);
      expect(result.totalValue).toBe(5000000);
    });

    it('should return zeros when no data', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getRawOne.mockResolvedValue(null);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getStats('org-1');

      expect(result.total).toBe(0);
      expect(result.applied).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.totalValue).toBe(0);
    });
  });
});
