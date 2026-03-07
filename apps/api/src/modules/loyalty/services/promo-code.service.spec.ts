/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";

import { LoyaltyPromoCodeService } from "./promo-code.service";
import {
  LoyaltyPromoCode,
  LoyaltyPromoCodeType,
} from "../entities/promo-code.entity";
import { LoyaltyPromoCodeUsage } from "../entities/promo-code-usage.entity";
import { LoyaltyService } from "../loyalty.service";
import { PointsSource } from "../constants/loyalty.constants";

describe("LoyaltyPromoCodeService", () => {
  let service: LoyaltyPromoCodeService;
  let promoCodeRepo: any;
  let usageRepo: any;
  let loyaltyService: any;
  let _dataSource: any;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const promoCodeId = "pc-uuid-1";
  const orderId = "order-uuid-1";

  const mockPromoCode: Partial<LoyaltyPromoCode> = {
    id: promoCodeId,
    organizationId: orgId,
    code: "SUMMER25",
    name: "Summer Sale",
    description: "Summer bonus",
    type: LoyaltyPromoCodeType.POINTS_BONUS,
    value: 500,
    maxUsageTotal: 1000,
    maxUsagePerUser: 1,
    currentUsage: 0,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    minimumOrderAmount: null,
  };

  const mockQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue(null),
  };

  const mockTxPromoCodeRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockTxUsageRepo = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockManager = {
    getRepository: jest.fn().mockImplementation((entity) => {
      if (entity === LoyaltyPromoCode) return mockTxPromoCodeRepo;
      if (entity === LoyaltyPromoCodeUsage) return mockTxUsageRepo;
      return {};
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyPromoCodeService,
        {
          provide: getRepositoryToken(LoyaltyPromoCode),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto })),
            save: jest
              .fn()
              .mockImplementation((entity) =>
                Promise.resolve({ id: promoCodeId, ...entity }),
              ),
            findOne: jest.fn(),
            softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue({ ...mockQb }),
          },
        },
        {
          provide: getRepositoryToken(LoyaltyPromoCodeUsage),
          useValue: {
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue({ ...mockQb }),
          },
        },
        {
          provide: LoyaltyService,
          useValue: {
            earnPoints: jest.fn().mockResolvedValue({ newBalance: 1000 }),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
          },
        },
      ],
    }).compile();

    service = module.get<LoyaltyPromoCodeService>(LoyaltyPromoCodeService);
    promoCodeRepo = module.get(getRepositoryToken(LoyaltyPromoCode));
    usageRepo = module.get(getRepositoryToken(LoyaltyPromoCodeUsage));
    loyaltyService = module.get(LoyaltyService);
    _dataSource = module.get(DataSource);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a promo code", async () => {
      promoCodeRepo.findOne.mockResolvedValue(null);

      const dto = {
        code: "summer25",
        name: "Summer Sale",
        type: LoyaltyPromoCodeType.POINTS_BONUS,
        value: 500,
      } as any;

      const result = await service.create(dto, orgId);

      expect(promoCodeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          code: "SUMMER25",
          currentUsage: 0,
        }),
      );
      expect(promoCodeRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty("code", "SUMMER25");
    });

    it("should uppercase the code", async () => {
      promoCodeRepo.findOne.mockResolvedValue(null);

      await service.create(
        {
          code: "  test10  ",
          name: "Test",
          type: LoyaltyPromoCodeType.POINTS_BONUS,
          value: 10,
        } as any,
        orgId,
      );

      expect(promoCodeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "TEST10",
        }),
      );
    });

    it("should throw ConflictException when code already exists", async () => {
      promoCodeRepo.findOne.mockResolvedValue({ ...mockPromoCode });

      await expect(
        service.create(
          {
            code: "SUMMER25",
            name: "Dupe",
            type: LoyaltyPromoCodeType.POINTS_BONUS,
            value: 100,
          } as any,
          orgId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("update", () => {
    it("should update promo code fields", async () => {
      promoCodeRepo.findOne.mockResolvedValue({ ...mockPromoCode });

      const result = await service.update(
        promoCodeId,
        { name: "Updated" } as any,
        orgId,
      );

      expect(promoCodeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated",
        }),
      );
      expect(result).toHaveProperty("name", "Updated");
    });

    it("should throw NotFoundException when promo code not found", async () => {
      promoCodeRepo.findOne.mockResolvedValue(null);

      await expect(service.update("bad-id", {} as any, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should set startsAt to null when empty string", async () => {
      promoCodeRepo.findOne.mockResolvedValue({ ...mockPromoCode });

      await service.update(promoCodeId, { startsAt: "" } as any, orgId);

      expect(promoCodeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          startsAt: null,
        }),
      );
    });
  });

  describe("remove", () => {
    it("should soft-delete a promo code", async () => {
      promoCodeRepo.findOne.mockResolvedValue({ ...mockPromoCode });

      await service.remove(promoCodeId, orgId);

      expect(promoCodeRepo.softDelete).toHaveBeenCalledWith(promoCodeId);
    });

    it("should throw NotFoundException when not found", async () => {
      promoCodeRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("bad-id", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated promo codes", async () => {
      const qb = { ...mockQb };
      qb.getCount.mockResolvedValue(1);
      qb.getMany.mockResolvedValue([mockPromoCode]);
      promoCodeRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(orgId, {
        page: 1,
        limit: 20,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should apply filters", async () => {
      const qb = { ...mockQb };
      qb.getCount.mockResolvedValue(0);
      qb.getMany.mockResolvedValue([]);
      promoCodeRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(orgId, {
        isActive: true,
        type: LoyaltyPromoCodeType.DISCOUNT_PERCENT,
        search: "summer",
        page: 1,
        limit: 10,
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith("pc.isActive = :isActive", {
        isActive: true,
      });
      expect(qb.andWhere).toHaveBeenCalledWith("pc.type = :type", {
        type: LoyaltyPromoCodeType.DISCOUNT_PERCENT,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "(pc.code ILIKE :search OR pc.name ILIKE :search)",
        { search: "%summer%" },
      );
    });
  });

  describe("validateCode", () => {
    it("should return valid for an active promo code", async () => {
      promoCodeRepo.findOne.mockResolvedValue({ ...mockPromoCode });
      usageRepo.count.mockResolvedValue(0);

      const result = await service.validateCode("SUMMER25", userId, orgId);

      expect(result.valid).toBe(true);
      expect(result.type).toBe(LoyaltyPromoCodeType.POINTS_BONUS);
    });

    it("should return invalid when code not found", async () => {
      promoCodeRepo.findOne.mockResolvedValue(null);

      const result = await service.validateCode("BADCODE", userId, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Promo code not found");
    });

    it("should return invalid when code is inactive", async () => {
      promoCodeRepo.findOne.mockResolvedValue({
        ...mockPromoCode,
        isActive: false,
      });

      const result = await service.validateCode("SUMMER25", userId, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Promo code is not active");
    });

    it("should return invalid when code is not yet active", async () => {
      const futureDate = new Date("2099-01-01");
      promoCodeRepo.findOne.mockResolvedValue({
        ...mockPromoCode,
        startsAt: futureDate,
      });

      const result = await service.validateCode("SUMMER25", userId, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Promo code is not yet active");
    });

    it("should return invalid when code has expired", async () => {
      const pastDate = new Date("2020-01-01");
      promoCodeRepo.findOne.mockResolvedValue({
        ...mockPromoCode,
        expiresAt: pastDate,
      });

      const result = await service.validateCode("SUMMER25", userId, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Promo code has expired");
    });

    it("should return invalid when total usage limit reached", async () => {
      promoCodeRepo.findOne.mockResolvedValue({
        ...mockPromoCode,
        maxUsageTotal: 100,
        currentUsage: 100,
      });

      const result = await service.validateCode("SUMMER25", userId, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("maximum usage limit");
    });

    it("should return invalid when per-user usage limit reached", async () => {
      promoCodeRepo.findOne.mockResolvedValue({ ...mockPromoCode });
      usageRepo.count.mockResolvedValue(1);

      const result = await service.validateCode("SUMMER25", userId, orgId);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("maximum number of times");
    });

    it("should return invalid when order amount below minimum", async () => {
      promoCodeRepo.findOne.mockResolvedValue({
        ...mockPromoCode,
        minimumOrderAmount: 50000,
      });
      usageRepo.count.mockResolvedValue(0);

      const result = await service.validateCode(
        "SUMMER25",
        userId,
        orgId,
        10000,
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Minimum order amount");
    });

    it("should calculate discount for DISCOUNT_PERCENT type", async () => {
      promoCodeRepo.findOne.mockResolvedValue({
        ...mockPromoCode,
        type: LoyaltyPromoCodeType.DISCOUNT_PERCENT,
        value: 10,
      });
      usageRepo.count.mockResolvedValue(0);

      const result = await service.validateCode(
        "SUMMER25",
        userId,
        orgId,
        100000,
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(10000);
    });

    it("should handle unlimited total usage (maxUsageTotal = null)", async () => {
      promoCodeRepo.findOne.mockResolvedValue({
        ...mockPromoCode,
        maxUsageTotal: null,
        currentUsage: 9999,
      });
      usageRepo.count.mockResolvedValue(0);

      const result = await service.validateCode("SUMMER25", userId, orgId);

      expect(result.valid).toBe(true);
    });
  });

  describe("applyCode", () => {
    beforeEach(() => {
      promoCodeRepo.findOne.mockResolvedValue({ ...mockPromoCode });
      usageRepo.count.mockResolvedValue(0);
      mockTxPromoCodeRepo.findOne.mockResolvedValue({ ...mockPromoCode });
    });

    it("should apply POINTS_BONUS promo code and earn points", async () => {
      const result = await service.applyCode(
        "SUMMER25",
        userId,
        orgId,
        orderId,
        100000,
      );

      expect(result.applied).toBe(true);
      expect(result.pointsAwarded).toBe(500);
      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          organizationId: orgId,
          amount: 500,
          source: PointsSource.PROMO,
        }),
      );
      expect(result.newBalance).toBe(1000);
    });

    it("should apply DISCOUNT_PERCENT promo code", async () => {
      const discountPromo = {
        ...mockPromoCode,
        type: LoyaltyPromoCodeType.DISCOUNT_PERCENT,
        value: 10,
      };
      promoCodeRepo.findOne.mockResolvedValue(discountPromo);
      mockTxPromoCodeRepo.findOne.mockResolvedValue({ ...discountPromo });

      const result = await service.applyCode(
        "SUMMER25",
        userId,
        orgId,
        orderId,
        100000,
      );

      expect(result.applied).toBe(true);
      expect(result.discountApplied).toBe(10000);
      expect(result.message).toContain("10%");
    });

    it("should apply DISCOUNT_FIXED promo code", async () => {
      const fixedPromo = {
        ...mockPromoCode,
        type: LoyaltyPromoCodeType.DISCOUNT_FIXED,
        value: 5000,
      };
      promoCodeRepo.findOne.mockResolvedValue(fixedPromo);
      mockTxPromoCodeRepo.findOne.mockResolvedValue({ ...fixedPromo });

      const result = await service.applyCode(
        "SUMMER25",
        userId,
        orgId,
        orderId,
        100000,
      );

      expect(result.applied).toBe(true);
      expect(result.discountApplied).toBe(5000);
      expect(result.message).toContain("5000 UZS");
    });

    it("should apply FREE_ITEM promo code", async () => {
      const freePromo = {
        ...mockPromoCode,
        type: LoyaltyPromoCodeType.FREE_ITEM,
        value: 1,
      };
      promoCodeRepo.findOne.mockResolvedValue(freePromo);
      mockTxPromoCodeRepo.findOne.mockResolvedValue({ ...freePromo });

      const result = await service.applyCode(
        "SUMMER25",
        userId,
        orgId,
        orderId,
      );

      expect(result.applied).toBe(true);
      expect(result.message).toContain("Free item");
    });

    it("should throw BadRequestException when validation fails", async () => {
      promoCodeRepo.findOne.mockResolvedValue(null);

      await expect(service.applyCode("BADCODE", userId, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw when pessimistic lock finds usage limit reached", async () => {
      mockTxPromoCodeRepo.findOne.mockResolvedValue({
        ...mockPromoCode,
        maxUsageTotal: 10,
        currentUsage: 10,
      });

      await expect(
        service.applyCode("SUMMER25", userId, orgId, orderId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when promo code vanishes during transaction", async () => {
      mockTxPromoCodeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.applyCode("SUMMER25", userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should increment currentUsage within transaction", async () => {
      const promoWithUsage = { ...mockPromoCode, currentUsage: 5 };
      mockTxPromoCodeRepo.findOne.mockResolvedValue(promoWithUsage);

      await service.applyCode("SUMMER25", userId, orgId, orderId);

      expect(mockTxPromoCodeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentUsage: 6,
        }),
      );
    });

    it("should create usage record within transaction", async () => {
      await service.applyCode("SUMMER25", userId, orgId, orderId);

      expect(mockTxUsageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          promoCodeId,
          userId,
          orderId,
        }),
      );
      expect(mockTxUsageRepo.save).toHaveBeenCalled();
    });

    it("should handle earnPoints failure gracefully after transaction commits", async () => {
      loyaltyService.earnPoints.mockRejectedValue(
        new Error("Points service error"),
      );

      const result = await service.applyCode(
        "SUMMER25",
        userId,
        orgId,
        orderId,
      );

      expect(result.applied).toBe(true);
      expect(result.newBalance).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("should return usage statistics for a promo code", async () => {
      promoCodeRepo.findOne.mockResolvedValue({ ...mockPromoCode });
      const qb = { ...mockQb };
      qb.getRawOne.mockResolvedValue({
        totalUsages: "42",
        uniqueUsers: "30",
        totalPointsAwarded: "21000",
        totalDiscountApplied: "0",
        averageDiscount: "0",
      });
      usageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getStats(promoCodeId, orgId);

      expect(result.totalUsages).toBe(42);
      expect(result.uniqueUsers).toBe(30);
      expect(result.totalPointsAwarded).toBe(21000);
      expect(result.remainingUsages).toBe(1000);
    });

    it("should return null remainingUsages when maxUsageTotal is null", async () => {
      promoCodeRepo.findOne.mockResolvedValue({
        ...mockPromoCode,
        maxUsageTotal: null,
      });
      const qb = { ...mockQb };
      qb.getRawOne.mockResolvedValue({
        totalUsages: "5",
        uniqueUsers: "5",
        totalPointsAwarded: "2500",
        totalDiscountApplied: "0",
        averageDiscount: "0",
      });
      usageRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getStats(promoCodeId, orgId);

      expect(result.remainingUsages).toBeNull();
    });

    it("should throw NotFoundException when promo code not found", async () => {
      promoCodeRepo.findOne.mockResolvedValue(null);

      await expect(service.getStats("bad-id", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
