import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PurchaseHistoryService } from './purchase-history.service';
import { PurchaseHistory, PurchaseStatus } from './entities/purchase-history.entity';

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
  clone: jest.fn(),
  limit: jest.fn().mockReturnThis(),
});

describe('PurchaseHistoryService', () => {
  let service: PurchaseHistoryService;
  let repository: MockRepository<PurchaseHistory>;

  const orgId = 'org-1';
  const userId = 'user-1';

  beforeEach(async () => {
    repository = createMockRepository<PurchaseHistory>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseHistoryService,
        { provide: getRepositoryToken(PurchaseHistory), useValue: repository },
      ],
    }).compile();

    service = module.get<PurchaseHistoryService>(PurchaseHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    const dto = {
      purchaseDate: new Date('2024-03-15'),
      productId: 'prod-1',
      quantity: 100,
      unitPrice: 15000,
    };

    it('should create a purchase with calculated VAT (default 12%)', async () => {
      const created = { id: 'ph-1', ...dto, vatRate: 12 };
      repository.create!.mockReturnValue(created);
      repository.save!.mockResolvedValue(created);

      const result = await service.create(orgId, userId, dto as any);

      // subtotal = 100 * 15000 = 1500000
      // vatAmount = 1500000 * 12 / 100 = 180000
      // totalAmount = 1500000 + 180000 = 1680000
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          productId: 'prod-1',
          quantity: 100,
          unitPrice: 15000,
          vatRate: 12,
          vatAmount: 180000,
          totalAmount: 1680000,
          status: PurchaseStatus.PENDING,
          created_by_id: userId,
        }),
      );
    });

    it('should use provided vatRate instead of default', async () => {
      const dtoWithVat = { ...dto, vatRate: 0 };
      repository.create!.mockReturnValue({ id: 'ph-2' });
      repository.save!.mockResolvedValue({ id: 'ph-2' });

      await service.create(orgId, userId, dtoWithVat as any);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vatRate: 0,
          vatAmount: 0,
          totalAmount: 1500000,
        }),
      );
    });

    it('should default currency to UZS', async () => {
      repository.create!.mockReturnValue({ id: 'ph-3' });
      repository.save!.mockResolvedValue({ id: 'ph-3' });

      await service.create(orgId, userId, dto as any);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'UZS', exchangeRate: 1 }),
      );
    });

    it('should set importSource to manual', async () => {
      repository.create!.mockReturnValue({ id: 'ph-4' });
      repository.save!.mockResolvedValue({ id: 'ph-4' });

      await service.create(orgId, userId, dto as any);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ importSource: 'manual' }),
      );
    });
  });

  // ==========================================================================
  // bulkCreate
  // ==========================================================================

  describe('bulkCreate', () => {
    it('should create multiple purchases with shared import session ID', async () => {
      const dto = {
        purchases: [
          { purchaseDate: new Date(), productId: 'p-1', quantity: 10, unitPrice: 100 },
          { purchaseDate: new Date(), productId: 'p-2', quantity: 20, unitPrice: 200 },
        ],
      };
      repository.create!.mockImplementation((d) => d);
      repository.save!.mockResolvedValue([]);

      const result = await service.bulkCreate(orgId, userId, dto as any);

      expect(result.created).toBe(2);
      expect(result.importSessionId).toBeDefined();
      expect(typeof result.importSessionId).toBe('string');
    });
  });

  // ==========================================================================
  // findAll
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated results with defaults', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(50);
      mockQb.getMany.mockResolvedValue([{ id: 'ph-1' }]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.findAll(orgId, {});

      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by supplierId', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      await service.findAll(orgId, { supplierId: 'sup-1' } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith('ph.supplierId = :supplierId', { supplierId: 'sup-1' });
    });

    it('should filter by status', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      await service.findAll(orgId, { status: PurchaseStatus.PENDING } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith('ph.status = :status', { status: PurchaseStatus.PENDING });
    });

    it('should filter by search term', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      repository.createQueryBuilder!.mockReturnValue(mockQb);

      await service.findAll(orgId, { search: 'INV-001' } as any);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(ph.invoiceNumber ILIKE :search OR ph.batchNumber ILIKE :search OR ph.notes ILIKE :search)',
        { search: '%INV-001%' },
      );
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================

  describe('findById', () => {
    it('should return purchase when found', async () => {
      const purchase = { id: 'ph-1', productId: 'p-1' };
      repository.findOne!.mockResolvedValue(purchase);

      const result = await service.findById('ph-1');

      expect(result).toEqual(purchase);
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
    it('should update a PENDING purchase', async () => {
      const purchase = {
        id: 'ph-1',
        status: PurchaseStatus.PENDING,
        quantity: 100,
        unitPrice: 15000,
        vatRate: 12,
      };
      repository.findOne!.mockResolvedValue(purchase);
      repository.save!.mockImplementation((p) => Promise.resolve(p));

      const result = await service.update('ph-1', { quantity: 200 } as any);

      expect(result.quantity).toBe(200);
    });

    it('should throw BadRequestException when updating non-PENDING purchase', async () => {
      const purchase = { id: 'ph-1', status: PurchaseStatus.RECEIVED };
      repository.findOne!.mockResolvedValue(purchase);

      await expect(service.update('ph-1', { quantity: 200 } as any)).rejects.toThrow(BadRequestException);
    });

    it('should recalculate VAT and total when price changes', async () => {
      const purchase = {
        id: 'ph-1',
        status: PurchaseStatus.PENDING,
        quantity: 10,
        unitPrice: 1000,
        vatRate: 12,
      };
      repository.findOne!.mockResolvedValue(purchase);
      repository.save!.mockImplementation((p) => Promise.resolve(p));

      const result = await service.update('ph-1', { unitPrice: 2000 } as any);

      // subtotal = 10 * 2000 = 20000, vat = 2400, total = 22400
      expect(result.vatAmount).toBe(2400);
      expect(result.totalAmount).toBe(22400);
    });
  });

  // ==========================================================================
  // receive
  // ==========================================================================

  describe('receive', () => {
    it('should mark a PENDING purchase as RECEIVED', async () => {
      const purchase = {
        id: 'ph-1',
        status: PurchaseStatus.PENDING,
        notes: null,
        deliveryNoteNumber: null,
      };
      repository.findOne!.mockResolvedValue(purchase);
      repository.save!.mockImplementation((p) => Promise.resolve(p));

      const result = await service.receive('ph-1', userId);

      expect(result.status).toBe(PurchaseStatus.RECEIVED);
      expect(result.deliveryDate).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException when receiving non-PENDING purchase', async () => {
      const purchase = { id: 'ph-1', status: PurchaseStatus.CANCELLED };
      repository.findOne!.mockResolvedValue(purchase);

      await expect(service.receive('ph-1', userId)).rejects.toThrow(BadRequestException);
    });

    it('should append notes when provided in dto', async () => {
      const purchase = {
        id: 'ph-1',
        status: PurchaseStatus.PENDING,
        notes: 'Original note',
        deliveryNoteNumber: null,
      };
      repository.findOne!.mockResolvedValue(purchase);
      repository.save!.mockImplementation((p) => Promise.resolve(p));

      const result = await service.receive('ph-1', userId, {
        notes: 'Received in good condition',
      } as any);

      expect(result.notes).toContain('Original note');
      expect(result.notes).toContain('[Received] Received in good condition');
    });
  });

  // ==========================================================================
  // cancel
  // ==========================================================================

  describe('cancel', () => {
    it('should cancel a PENDING purchase', async () => {
      const purchase = { id: 'ph-1', status: PurchaseStatus.PENDING };
      repository.findOne!.mockResolvedValue(purchase);
      repository.save!.mockImplementation((p) => Promise.resolve(p));

      const result = await service.cancel('ph-1');

      expect(result.status).toBe(PurchaseStatus.CANCELLED);
    });

    it('should throw BadRequestException when cancelling non-PENDING purchase', async () => {
      const purchase = { id: 'ph-1', status: PurchaseStatus.RECEIVED };
      repository.findOne!.mockResolvedValue(purchase);

      await expect(service.cancel('ph-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // returnPurchase
  // ==========================================================================

  describe('returnPurchase', () => {
    it('should return a RECEIVED purchase', async () => {
      const purchase = {
        id: 'ph-1',
        status: PurchaseStatus.RECEIVED,
        metadata: {},
        notes: null,
      };
      repository.findOne!.mockResolvedValue(purchase);
      repository.save!.mockImplementation((p) => Promise.resolve(p));

      const result = await service.returnPurchase('ph-1', { reason: 'Defective' } as any);

      expect(result.status).toBe(PurchaseStatus.RETURNED);
      expect(result.metadata.returnReason).toBe('Defective');
    });

    it('should throw BadRequestException when returning non-RECEIVED purchase', async () => {
      const purchase = { id: 'ph-1', status: PurchaseStatus.PENDING };
      repository.findOne!.mockResolvedValue(purchase);

      await expect(
        service.returnPurchase('ph-1', { reason: 'Defective' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should append return notes when provided', async () => {
      const purchase = {
        id: 'ph-1',
        status: PurchaseStatus.RECEIVED,
        metadata: {},
        notes: 'Previous note',
      };
      repository.findOne!.mockResolvedValue(purchase);
      repository.save!.mockImplementation((p) => Promise.resolve(p));

      const result = await service.returnPurchase('ph-1', {
        reason: 'Wrong item',
        notes: 'Returned to supplier',
      } as any);

      expect(result.notes).toContain('[Returned] Returned to supplier');
    });
  });

  // ==========================================================================
  // remove
  // ==========================================================================

  describe('remove', () => {
    it('should soft-delete a PENDING purchase', async () => {
      const purchase = { id: 'ph-1', status: PurchaseStatus.PENDING };
      repository.findOne!.mockResolvedValue(purchase);
      repository.softDelete!.mockResolvedValue({ affected: 1 });

      await service.remove('ph-1');

      expect(repository.softDelete).toHaveBeenCalledWith('ph-1');
    });

    it('should soft-delete a CANCELLED purchase', async () => {
      const purchase = { id: 'ph-1', status: PurchaseStatus.CANCELLED };
      repository.findOne!.mockResolvedValue(purchase);
      repository.softDelete!.mockResolvedValue({ affected: 1 });

      await service.remove('ph-1');

      expect(repository.softDelete).toHaveBeenCalledWith('ph-1');
    });

    it('should throw BadRequestException when deleting RECEIVED purchase', async () => {
      const purchase = { id: 'ph-1', status: PurchaseStatus.RECEIVED };
      repository.findOne!.mockResolvedValue(purchase);

      await expect(service.remove('ph-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deleting RETURNED purchase', async () => {
      const purchase = { id: 'ph-1', status: PurchaseStatus.RETURNED };
      repository.findOne!.mockResolvedValue(purchase);

      await expect(service.remove('ph-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe('getStats', () => {
    it('should return parsed purchase statistics', async () => {
      const mockQb = createMockQueryBuilder();
      const clonedQb = createMockQueryBuilder();
      mockQb.clone.mockReturnValue(clonedQb);

      clonedQb.getRawOne.mockResolvedValue({
        totalPurchases: '50',
        totalAmount: '5000000.00',
      });
      clonedQb.getRawMany.mockResolvedValue([]);
      clonedQb.clone.mockReturnValue(clonedQb);

      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getStats(orgId);

      expect(result.totalPurchases).toBe(50);
      expect(result.totalAmount).toBe(5000000);
      expect(result.bySupplier).toEqual([]);
      expect(result.byProduct).toEqual([]);
    });

    it('should parse supplier and product breakdowns', async () => {
      const mockQb = createMockQueryBuilder();
      const clonedQb = createMockQueryBuilder();
      mockQb.clone.mockReturnValue(clonedQb);
      clonedQb.clone.mockReturnValue(clonedQb);

      let callCount = 0;
      clonedQb.getRawOne.mockResolvedValue({ totalPurchases: '10', totalAmount: '100000' });
      clonedQb.getRawMany.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([
            { supplierId: 's-1', count: '5', totalAmount: '50000' },
          ]);
        }
        return Promise.resolve([
          { productId: 'p-1', count: '3', totalAmount: '30000' },
        ]);
      });

      repository.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getStats(orgId);

      expect(result.bySupplier).toHaveLength(1);
      expect(result.bySupplier[0].supplierId).toBe('s-1');
      expect(result.byProduct).toHaveLength(1);
      expect(result.byProduct[0].productId).toBe('p-1');
    });
  });
});
