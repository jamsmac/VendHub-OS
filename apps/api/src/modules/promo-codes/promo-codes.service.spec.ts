import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { PromoCode, PromoCodeStatus, PromoCodeType } from './entities/promo-code.entity';
import { PromoCodeRedemption } from './entities/promo-code-redemption.entity';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
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
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn(),
});

describe('PromoCodesService', () => {
  let service: PromoCodesService;
  let promoCodeRepo: MockRepository<PromoCode>;
  let redemptionRepo: MockRepository<PromoCodeRedemption>;

  const orgId = 'org-1';

  beforeEach(async () => {
    promoCodeRepo = createMockRepository<PromoCode>();
    redemptionRepo = createMockRepository<PromoCodeRedemption>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodesService,
        { provide: getRepositoryToken(PromoCode), useValue: promoCodeRepo },
        { provide: getRepositoryToken(PromoCodeRedemption), useValue: redemptionRepo },
      ],
    }).compile();

    service = module.get<PromoCodesService>(PromoCodesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    const dto = {
      code: 'SUMMER2024',
      name: 'Summer Sale',
      type: PromoCodeType.PERCENTAGE,
      value: 15,
      validFrom: '2024-06-01',
      validUntil: '2024-09-01',
    };

    it('should create a promo code with DRAFT status', async () => {
      promoCodeRepo.findOne!.mockResolvedValue(null);
      const created = { id: 'pc-1', code: 'SUMMER2024', status: PromoCodeStatus.DRAFT };
      promoCodeRepo.create!.mockReturnValue(created);
      promoCodeRepo.save!.mockResolvedValue(created);

      const result = await service.create(dto as any, orgId);

      expect(promoCodeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: orgId,
          code: 'SUMMER2024',
          status: PromoCodeStatus.DRAFT,
          current_total_uses: 0,
        }),
      );
      expect(result.status).toBe(PromoCodeStatus.DRAFT);
    });

    it('should throw ConflictException if code already exists', async () => {
      promoCodeRepo.findOne!.mockResolvedValue({ id: 'existing', code: 'SUMMER2024' });

      await expect(service.create(dto as any, orgId)).rejects.toThrow(ConflictException);
    });

    it('should uppercase the code on lookup', async () => {
      const dtoLower = { ...dto, code: 'summer2024' };
      promoCodeRepo.findOne!.mockResolvedValue(null);
      promoCodeRepo.create!.mockReturnValue({ id: 'pc-1' });
      promoCodeRepo.save!.mockResolvedValue({ id: 'pc-1' });

      await service.create(dtoLower as any, orgId);

      expect(promoCodeRepo.findOne).toHaveBeenCalledWith({
        where: { code: 'SUMMER2024' },
      });
    });
  });

  // ==========================================================================
  // findAll
  // ==========================================================================

  describe('findAll', () => {
    it('should return paginated promo codes', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(30);
      mockQb.getMany.mockResolvedValue([{ id: 'pc-1' }]);
      promoCodeRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 20 }, orgId);

      expect(result.total).toBe(30);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by status when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      promoCodeRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.findAll({ status: PromoCodeStatus.ACTIVE } as any, orgId);

      expect(mockQb.andWhere).toHaveBeenCalledWith('pc.status = :status', { status: PromoCodeStatus.ACTIVE });
    });

    it('should filter by search term when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      promoCodeRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.findAll({ search: 'summer' } as any, orgId);

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(pc.code ILIKE :search OR pc.name ILIKE :search)',
        { search: '%summer%' },
      );
    });
  });

  // ==========================================================================
  // findByCode / findById
  // ==========================================================================

  describe('findByCode', () => {
    it('should return promo code when found', async () => {
      const promo = { id: 'pc-1', code: 'SUMMER2024' };
      promoCodeRepo.findOne!.mockResolvedValue(promo);

      const result = await service.findByCode('summer2024', orgId);

      expect(result).toEqual(promo);
      expect(promoCodeRepo.findOne).toHaveBeenCalledWith({
        where: { code: 'SUMMER2024', organization_id: orgId },
      });
    });

    it('should throw NotFoundException when code not found', async () => {
      promoCodeRepo.findOne!.mockResolvedValue(null);

      await expect(service.findByCode('INVALID', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return promo code by ID', async () => {
      const promo = { id: 'pc-1', code: 'TEST' };
      promoCodeRepo.findOne!.mockResolvedValue(promo);

      const result = await service.findById('pc-1', orgId);

      expect(result).toEqual(promo);
    });

    it('should throw NotFoundException when ID not found', async () => {
      promoCodeRepo.findOne!.mockResolvedValue(null);

      await expect(service.findById('non-existent', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // update
  // ==========================================================================

  describe('update', () => {
    it('should update promo code fields', async () => {
      const promo = { id: 'pc-1', code: 'OLD', name: 'Old Name', organization_id: orgId };
      promoCodeRepo.findOne!.mockResolvedValue(promo);
      promoCodeRepo.save!.mockImplementation((p) => Promise.resolve(p));

      const result = await service.update('pc-1', { name: 'New Name' } as any, orgId);

      expect(result.name).toBe('New Name');
    });

    it('should throw ConflictException if new code already taken', async () => {
      const promo = { id: 'pc-1', code: 'OLD', organization_id: orgId };
      // First call: findById, second call: duplicate check
      promoCodeRepo.findOne!
        .mockResolvedValueOnce(promo)
        .mockResolvedValueOnce({ id: 'pc-2', code: 'TAKEN' });

      await expect(
        service.update('pc-1', { code: 'TAKEN' } as any, orgId),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==========================================================================
  // validate
  // ==========================================================================

  describe('validate', () => {
    const activePromo = {
      id: 'pc-1',
      code: 'VALID',
      status: PromoCodeStatus.ACTIVE,
      type: PromoCodeType.PERCENTAGE,
      value: 10,
      valid_from: new Date('2020-01-01'),
      valid_until: new Date('2030-12-31'),
      max_total_uses: 100,
      current_total_uses: 5,
      max_uses_per_user: 1,
      min_order_amount: null,
      max_discount_amount: null,
      organization_id: orgId,
    };

    it('should return valid=true for a valid promo code', async () => {
      promoCodeRepo.findOne!.mockResolvedValue(activePromo);
      redemptionRepo.count!.mockResolvedValue(0);

      const result = await service.validate(
        { code: 'VALID', orderAmount: 100000 },
        orgId,
      );

      expect(result.valid).toBe(true);
      expect(result.promoCode).toBeDefined();
      expect(result.discountAmount).toBeDefined();
    });

    it('should return valid=false when code not found', async () => {
      promoCodeRepo.findOne!.mockResolvedValue(null);

      const result = await service.validate({ code: 'INVALID' }, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Promo code not found');
    });

    it('should return valid=false when code is not ACTIVE', async () => {
      promoCodeRepo.findOne!.mockResolvedValue({ ...activePromo, status: PromoCodeStatus.PAUSED });

      const result = await service.validate({ code: 'VALID' }, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('paused');
    });

    it('should return valid=false when code is expired', async () => {
      promoCodeRepo.findOne!.mockResolvedValue({
        ...activePromo,
        valid_until: new Date('2020-01-01'),
      });

      const result = await service.validate({ code: 'VALID' }, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should return valid=false when max usage reached', async () => {
      promoCodeRepo.findOne!.mockResolvedValue({
        ...activePromo,
        max_total_uses: 5,
        current_total_uses: 5,
      });

      const result = await service.validate({ code: 'VALID' }, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('maximum usage');
    });

    it('should return valid=false when user exceeded per-user limit', async () => {
      promoCodeRepo.findOne!.mockResolvedValue(activePromo);
      redemptionRepo.count!.mockResolvedValue(1);

      const result = await service.validate(
        { code: 'VALID', clientUserId: 'user-1' },
        orgId,
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('maximum number of times');
    });

    it('should return valid=false when order amount below minimum', async () => {
      promoCodeRepo.findOne!.mockResolvedValue({
        ...activePromo,
        min_order_amount: 50000,
      });

      const result = await service.validate(
        { code: 'VALID', orderAmount: 10000 },
        orgId,
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Minimum order amount');
    });

    it('should calculate percentage discount correctly', async () => {
      promoCodeRepo.findOne!.mockResolvedValue(activePromo);
      redemptionRepo.count!.mockResolvedValue(0);

      const result = await service.validate(
        { code: 'VALID', orderAmount: 100000 },
        orgId,
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(10000); // 10% of 100000
    });

    it('should cap percentage discount at max_discount_amount', async () => {
      promoCodeRepo.findOne!.mockResolvedValue({
        ...activePromo,
        max_discount_amount: 5000,
      });
      redemptionRepo.count!.mockResolvedValue(0);

      const result = await service.validate(
        { code: 'VALID', orderAmount: 100000 },
        orgId,
      );

      expect(result.discountAmount).toBe(5000);
    });
  });

  // ==========================================================================
  // redeem
  // ==========================================================================

  describe('redeem', () => {
    it('should create redemption, increment usage counter, and return result', async () => {
      const promo = {
        id: 'pc-1',
        code: 'VALID',
        status: PromoCodeStatus.ACTIVE,
        type: PromoCodeType.FIXED_AMOUNT,
        value: 5000,
        valid_from: new Date('2020-01-01'),
        valid_until: new Date('2030-12-31'),
        max_total_uses: null,
        current_total_uses: 0,
        max_uses_per_user: 1,
        min_order_amount: null,
        max_discount_amount: null,
        organization_id: orgId,
      };
      promoCodeRepo.findOne!.mockResolvedValue(promo);
      redemptionRepo.count!.mockResolvedValue(0);
      const redemptionObj = { id: 'r-1' };
      redemptionRepo.create!.mockReturnValue(redemptionObj);
      redemptionRepo.save!.mockResolvedValue(redemptionObj);
      promoCodeRepo.save!.mockResolvedValue(promo);

      const result = await service.redeem(
        { code: 'VALID', clientUserId: 'user-1', orderAmount: 10000 },
        orgId,
      );

      expect(result.discountApplied).toBe(5000);
      expect(result.redemption).toBeDefined();
      expect(promo.current_total_uses).toBe(1);
    });

    it('should throw BadRequestException when validation fails', async () => {
      promoCodeRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.redeem({ code: 'INVALID', clientUserId: 'u-1' }, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should award loyalty points for LOYALTY_BONUS type', async () => {
      const promo = {
        id: 'pc-1',
        code: 'BONUS',
        status: PromoCodeStatus.ACTIVE,
        type: PromoCodeType.LOYALTY_BONUS,
        value: 500,
        valid_from: new Date('2020-01-01'),
        valid_until: new Date('2030-12-31'),
        max_total_uses: null,
        current_total_uses: 0,
        max_uses_per_user: 1,
        min_order_amount: null,
        max_discount_amount: null,
        organization_id: orgId,
      };
      promoCodeRepo.findOne!.mockResolvedValue(promo);
      redemptionRepo.count!.mockResolvedValue(0);
      redemptionRepo.create!.mockReturnValue({ id: 'r-1' });
      redemptionRepo.save!.mockResolvedValue({ id: 'r-1' });
      promoCodeRepo.save!.mockResolvedValue(promo);

      const result = await service.redeem({ code: 'BONUS', clientUserId: 'u-1' }, orgId);

      expect(result.loyaltyPointsAwarded).toBe(500);
      expect(result.discountApplied).toBe(0);
    });
  });

  // ==========================================================================
  // deactivate
  // ==========================================================================

  describe('deactivate', () => {
    it('should pause an active promo code', async () => {
      const promo = { id: 'pc-1', status: PromoCodeStatus.ACTIVE, organization_id: orgId };
      promoCodeRepo.findOne!.mockResolvedValue(promo);
      promoCodeRepo.save!.mockImplementation((p) => Promise.resolve(p));

      const result = await service.deactivate('pc-1', orgId);

      expect(result.status).toBe(PromoCodeStatus.PAUSED);
    });

    it('should throw BadRequestException when deactivating an expired code', async () => {
      const promo = { id: 'pc-1', status: PromoCodeStatus.EXPIRED, organization_id: orgId };
      promoCodeRepo.findOne!.mockResolvedValue(promo);

      await expect(service.deactivate('pc-1', orgId)).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe('getStats', () => {
    it('should return parsed statistics for a promo code', async () => {
      const promo = { id: 'pc-1', organization_id: orgId };
      promoCodeRepo.findOne!.mockResolvedValue(promo);

      const mockQb = createMockQueryBuilder();
      mockQb.getRawOne.mockResolvedValue({
        totalUses: '25',
        totalDiscountGiven: '125000.00',
        totalLoyaltyPointsAwarded: '0',
        averageDiscount: '5000.00',
        averageOrderAmount: '50000.00',
      });
      redemptionRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getStats('pc-1', orgId);

      expect(result.totalUses).toBe(25);
      expect(result.totalDiscountGiven).toBe(125000);
      expect(result.averageDiscount).toBe(5000);
      expect(result.averageOrderAmount).toBe(50000);
    });
  });

  // ==========================================================================
  // getRedemptions
  // ==========================================================================

  describe('getRedemptions', () => {
    it('should return paginated redemptions', async () => {
      const promo = { id: 'pc-1', organization_id: orgId };
      promoCodeRepo.findOne!.mockResolvedValue(promo);
      redemptionRepo.findAndCount!.mockResolvedValue([[{ id: 'r-1' }], 1]);

      const result = await service.getRedemptions('pc-1', { page: 1, limit: 20 }, orgId);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.totalPages).toBe(1);
    });
  });

  // ==========================================================================
  // expireCodes
  // ==========================================================================

  describe('expireCodes', () => {
    it('should expire active codes past valid_until', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.execute.mockResolvedValue({ affected: 3 });
      promoCodeRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.expireCodes();

      expect(mockQb.update).toHaveBeenCalled();
      expect(mockQb.set).toHaveBeenCalledWith({ status: PromoCodeStatus.EXPIRED });
    });
  });
});
