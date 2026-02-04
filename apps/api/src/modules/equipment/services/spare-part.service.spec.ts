import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { SparePartService } from './spare-part.service';
import { SparePart } from '../entities/equipment-component.entity';

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
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
});

describe('SparePartService', () => {
  let service: SparePartService;
  let repo: MockRepository<SparePart>;
  let eventEmitter: { emit: jest.Mock };

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';
  const sparePartId = 'sp-uuid-1';

  const mockSparePart: Partial<SparePart> = {
    id: sparePartId,
    organizationId: orgId,
    name: 'Water Filter',
    partNumber: 'WF-001',
    quantity: 10,
    minQuantity: 5,
    isActive: true,
    created_at: new Date(),
  };

  beforeEach(async () => {
    repo = createMockRepository<SparePart>();
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SparePartService,
        { provide: getRepositoryToken(SparePart), useValue: repo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<SparePartService>(SparePartService);
  });

  // ================================================================
  // CRUD Operations
  // ================================================================

  describe('create', () => {
    it('should create a spare part successfully', async () => {
      const dto = { name: 'Water Filter', partNumber: 'WF-001' };
      const created = { id: 'sp-new', ...dto, organizationId: orgId };
      repo.create!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const result = await service.create(orgId, userId, dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          created_by_id: userId,
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return paginated results with defaults', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[mockSparePart], 1]);

      const result = await service.findAll(orgId, {});

      expect(qb.where).toHaveBeenCalledWith(
        's.organizationId = :organizationId',
        { organizationId: orgId },
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply search filter', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { search: 'filter' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(s.name ILIKE :search OR s.partNumber ILIKE :search)',
        { search: '%filter%' },
      );
    });

    it('should apply compatibleWith filter', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { compatibleWith: 'pump' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        's.compatibleComponentTypes ::jsonb @> :compatibleWith',
        { compatibleWith: JSON.stringify(['pump']) },
      );
    });

    it('should apply lowStockOnly filter', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { lowStockOnly: true } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('s.quantity <= s.minQuantity');
    });

    it('should apply supplierId filter', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { supplierId: 'sup-1' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        's.supplierId = :supplierId',
        { supplierId: 'sup-1' },
      );
    });

    it('should not filter by active when activeOnly is false', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { activeOnly: false } as any);

      const activeCalls = qb.andWhere.mock.calls.filter(
        (c: string[]) => c[0] === 's.isActive = true',
      );
      expect(activeCalls).toHaveLength(0);
    });

    it('should respect custom sort options', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { sortBy: 'partNumber', sortOrder: 'DESC' } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('s.partNumber', 'DESC');
    });
  });

  describe('findOne', () => {
    it('should return spare part when found', async () => {
      repo.findOne!.mockResolvedValue(mockSparePart);
      const result = await service.findOne(orgId, sparePartId);
      expect(result).toEqual(mockSparePart);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.findOne(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update spare part fields', async () => {
      const existing = { ...mockSparePart, quantity: 10, minQuantity: 5 };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      const result = await service.update(orgId, sparePartId, { name: 'Updated Filter' } as any);

      expect(result.name).toBe('Updated Filter');
    });

    it('should emit low_stock event when quantity drops below minimum', async () => {
      const existing = { ...mockSparePart, quantity: 3, minQuantity: 5 };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      await service.update(orgId, sparePartId, { quantity: 3 } as any);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.spare_part.low_stock',
        expect.objectContaining({ sparePart: expect.any(Object) }),
      );
    });

    it('should not emit low_stock when quantity is above minimum', async () => {
      const existing = { ...mockSparePart, quantity: 100, minQuantity: 5 };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      await service.update(orgId, sparePartId, {} as any);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft-delete the spare part', async () => {
      repo.findOne!.mockResolvedValue(mockSparePart);
      repo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.delete(orgId, sparePartId);

      expect(repo.softDelete).toHaveBeenCalledWith(sparePartId);
    });

    it('should throw NotFoundException for non-existent spare part', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.delete(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ================================================================
  // Quantity Adjustment
  // ================================================================

  describe('adjustQuantity', () => {
    it('should increase quantity', async () => {
      const existing = { ...mockSparePart, quantity: 10, minQuantity: 5 };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      const result = await service.adjustQuantity(orgId, sparePartId, 5);

      expect(result.quantity).toBe(15);
    });

    it('should decrease quantity', async () => {
      const existing = { ...mockSparePart, quantity: 10, minQuantity: 5 };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      const result = await service.adjustQuantity(orgId, sparePartId, -3);

      expect(result.quantity).toBe(7);
    });

    it('should not go below zero', async () => {
      const existing = { ...mockSparePart, quantity: 3, minQuantity: 5 };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      const result = await service.adjustQuantity(orgId, sparePartId, -10);

      expect(result.quantity).toBe(0);
    });

    it('should emit low_stock event when resulting quantity is at or below minimum', async () => {
      const existing = { ...mockSparePart, quantity: 6, minQuantity: 5 };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      await service.adjustQuantity(orgId, sparePartId, -2);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'equipment.spare_part.low_stock',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException for non-existent spare part', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.adjustQuantity(orgId, 'missing', 5)).rejects.toThrow(NotFoundException);
    });
  });
});
