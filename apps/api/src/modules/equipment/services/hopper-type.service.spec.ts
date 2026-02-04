import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { HopperTypeService } from './hopper-type.service';
import { HopperType } from '../entities/equipment-component.entity';

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

describe('HopperTypeService', () => {
  let service: HopperTypeService;
  let repo: MockRepository<HopperType>;

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';

  const mockHopperType: Partial<HopperType> = {
    id: 'ht-uuid-1',
    organizationId: orgId,
    name: 'Standard Hopper',
    isActive: true,
    created_at: new Date(),
  };

  beforeEach(async () => {
    repo = createMockRepository<HopperType>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HopperTypeService,
        { provide: getRepositoryToken(HopperType), useValue: repo },
      ],
    }).compile();

    service = module.get<HopperTypeService>(HopperTypeService);
  });

  describe('create', () => {
    it('should create a hopper type successfully', async () => {
      const dto = { name: 'Large Hopper', capacity: 500 };
      const created = { id: 'ht-new', ...dto, organizationId: orgId };
      repo.create!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const result = await service.create(orgId, userId, dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          created_by_id: userId,
          name: 'Large Hopper',
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should return paginated list with defaults', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[mockHopperType], 1]);

      const result = await service.findAll(orgId, {});

      expect(qb.where).toHaveBeenCalledWith(
        'h.organizationId = :organizationId',
        { organizationId: orgId },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('h.deleted_at IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith('h.isActive = true');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should not filter by active when activeOnly is false', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { activeOnly: false } as any);

      const activeCalls = qb.andWhere.mock.calls.filter(
        (c: string[]) => c[0] === 'h.isActive = true',
      );
      expect(activeCalls).toHaveLength(0);
    });

    it('should apply search filter', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { search: 'standard' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'h.name ILIKE :search',
        { search: '%standard%' },
      );
    });

    it('should apply custom pagination', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { page: 2, limit: 5 } as any);

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
    });

    it('should order by name ascending', async () => {
      const qb = createMockQueryBuilder();
      repo.createQueryBuilder!.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(orgId, {});

      expect(qb.orderBy).toHaveBeenCalledWith('h.name', 'ASC');
    });
  });

  describe('findOne', () => {
    it('should return hopper type when found', async () => {
      repo.findOne!.mockResolvedValue(mockHopperType);

      const result = await service.findOne(orgId, 'ht-uuid-1');

      expect(result).toEqual(mockHopperType);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'ht-uuid-1', organizationId: orgId },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.findOne(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update hopper type fields', async () => {
      const existing = { ...mockHopperType };
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (d) => d);

      const result = await service.update(orgId, 'ht-uuid-1', { name: 'Big Hopper' } as any);

      expect(result.name).toBe('Big Hopper');
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent hopper type', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(
        service.update(orgId, 'missing', { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should soft-delete the hopper type', async () => {
      repo.findOne!.mockResolvedValue(mockHopperType);
      repo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.delete(orgId, 'ht-uuid-1');

      expect(repo.softDelete).toHaveBeenCalledWith('ht-uuid-1');
    });

    it('should throw NotFoundException for non-existent hopper type', async () => {
      repo.findOne!.mockResolvedValue(null);

      await expect(service.delete(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
