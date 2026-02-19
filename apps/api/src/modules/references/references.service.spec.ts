import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

import { ReferencesService } from "./references.service";
import { GoodsClassifier } from "./entities/goods-classifier.entity";
import { IkpuCode } from "./entities/ikpu-code.entity";
import { VatRate } from "./entities/vat-rate.entity";
import { PackageType } from "./entities/package-type.entity";
import {
  PaymentProvider,
  PaymentProviderType,
} from "./entities/payment-provider.entity";
import { QueryGoodsClassifiersDto } from "./dto/query-goods-classifiers.dto";
import { QueryIkpuCodesDto } from "./dto/query-ikpu-codes.dto";
import { QueryReferencesDto } from "./dto/query-references.dto";
import {
  CreateGoodsClassifierDto,
  UpdateGoodsClassifierDto,
} from "./dto/create-goods-classifier.dto";
import {
  CreateIkpuCodeDto,
  UpdateIkpuCodeDto,
} from "./dto/create-ikpu-code.dto";
import { CreateVatRateDto, UpdateVatRateDto } from "./dto/create-vat-rate.dto";
import { CreatePackageTypeDto } from "./dto/create-package-type.dto";
import {
  CreatePaymentProviderDto,
  UpdatePaymentProviderDto,
} from "./dto/create-payment-provider.dto";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
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
});

describe("ReferencesService", () => {
  let service: ReferencesService;
  let goodsClassifierRepo: MockRepository<GoodsClassifier>;
  let ikpuCodeRepo: MockRepository<IkpuCode>;
  let vatRateRepo: MockRepository<VatRate>;
  let packageTypeRepo: MockRepository<PackageType>;
  let paymentProviderRepo: MockRepository<PaymentProvider>;
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const mockClassifier: Partial<GoodsClassifier> = {
    id: "gc-uuid-1",
    code: "10710001001000000",
    name_ru: "Шоколад",
    is_active: true,
  } as Partial<GoodsClassifier>;

  const mockIkpu: Partial<IkpuCode> = {
    id: "ikpu-uuid-1",
    code: "10710001001000001",
    name_ru: "Шоколад молочный",
    is_active: true,
  } as Partial<IkpuCode>;

  const mockVatRate: Partial<VatRate> = {
    id: "vat-uuid-1",
    code: "VAT12",
    rate: 12,
    is_active: true,
    is_default: true,
  } as Partial<VatRate>;

  const mockPackageType: Partial<PackageType> = {
    id: "pt-uuid-1",
    code: "BOX",
    name_ru: "Коробка",
    is_active: true,
  } as Partial<PackageType>;

  const mockPaymentProvider: Partial<PaymentProvider> = {
    id: "pp-uuid-1",
    code: "payme",
    name: "Payme",
    type: PaymentProviderType.CARD,
    is_active: true,
  } as Partial<PaymentProvider>;

  beforeEach(async () => {
    goodsClassifierRepo = createMockRepository<GoodsClassifier>();
    ikpuCodeRepo = createMockRepository<IkpuCode>();
    vatRateRepo = createMockRepository<VatRate>();
    packageTypeRepo = createMockRepository<PackageType>();
    paymentProviderRepo = createMockRepository<PaymentProvider>();
    cacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferencesService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        {
          provide: getRepositoryToken(GoodsClassifier),
          useValue: goodsClassifierRepo,
        },
        { provide: getRepositoryToken(IkpuCode), useValue: ikpuCodeRepo },
        { provide: getRepositoryToken(VatRate), useValue: vatRateRepo },
        { provide: getRepositoryToken(PackageType), useValue: packageTypeRepo },
        {
          provide: getRepositoryToken(PaymentProvider),
          useValue: paymentProviderRepo,
        },
      ],
    }).compile();

    service = module.get<ReferencesService>(ReferencesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ========================================================================
  // GOODS CLASSIFIERS
  // ========================================================================

  describe("findAllGoodsClassifiers", () => {
    it("should return paginated goods classifiers", async () => {
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(1);
      qb.getMany.mockResolvedValue([mockClassifier]);
      goodsClassifierRepo.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.findAllGoodsClassifiers({
        page: 1,
        limit: 50,
      } as QueryGoodsClassifiersDto);

      expect(result.data).toEqual([mockClassifier]);
      expect(result.total).toBe(1);
      expect(result.total_pages).toBe(1);
    });

    it("should apply search filter", async () => {
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(0);
      qb.getMany.mockResolvedValue([]);
      goodsClassifierRepo.createQueryBuilder!.mockReturnValue(qb);

      await service.findAllGoodsClassifiers({
        search: "chocolate",
        page: 1,
        limit: 50,
      } as QueryGoodsClassifiersDto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("gc.code ILIKE :search"),
        expect.objectContaining({ search: "%chocolate%" }),
      );
    });
  });

  describe("findGoodsClassifierByCode", () => {
    it("should return classifier when found", async () => {
      goodsClassifierRepo.findOne!.mockResolvedValue(mockClassifier);

      const result =
        await service.findGoodsClassifierByCode("10710001001000000");

      expect(result).toEqual(mockClassifier);
    });

    it("should throw NotFoundException when not found", async () => {
      goodsClassifierRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.findGoodsClassifierByCode("invalid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("createGoodsClassifier", () => {
    it("should create a goods classifier", async () => {
      goodsClassifierRepo.findOne!.mockResolvedValue(null); // no duplicate
      goodsClassifierRepo.create!.mockReturnValue(mockClassifier);
      goodsClassifierRepo.save!.mockResolvedValue(mockClassifier);

      const result = await service.createGoodsClassifier({
        code: "10710001001000000",
        name_ru: "Шоколад",
      } as CreateGoodsClassifierDto);

      expect(result).toEqual(mockClassifier);
    });

    it("should throw ConflictException when code already exists", async () => {
      goodsClassifierRepo.findOne!.mockResolvedValue(mockClassifier);

      await expect(
        service.createGoodsClassifier({
          code: "10710001001000000",
        } as CreateGoodsClassifierDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("updateGoodsClassifier", () => {
    it("should update an existing goods classifier", async () => {
      goodsClassifierRepo.findOne!.mockResolvedValue({ ...mockClassifier });
      goodsClassifierRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.updateGoodsClassifier("gc-uuid-1", {
        name_ru: "Updated",
      } as UpdateGoodsClassifierDto);

      expect(result.name_ru).toBe("Updated");
    });

    it("should throw NotFoundException when not found", async () => {
      goodsClassifierRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateGoodsClassifier("bad", {} as UpdateGoodsClassifierDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================================================
  // IKPU CODES
  // ========================================================================

  describe("findAllIkpuCodes", () => {
    it("should return paginated IKPU codes", async () => {
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(1);
      qb.getMany.mockResolvedValue([mockIkpu]);
      ikpuCodeRepo.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.findAllIkpuCodes({
        page: 1,
        limit: 50,
      } as QueryIkpuCodesDto);

      expect(result.data).toEqual([mockIkpu]);
      expect(result.total).toBe(1);
    });
  });

  describe("findIkpuCodeByCode", () => {
    it("should return IKPU code when found", async () => {
      ikpuCodeRepo.findOne!.mockResolvedValue(mockIkpu);
      expect(await service.findIkpuCodeByCode("10710001001000001")).toEqual(
        mockIkpu,
      );
    });

    it("should throw NotFoundException when not found", async () => {
      ikpuCodeRepo.findOne!.mockResolvedValue(null);
      await expect(service.findIkpuCodeByCode("bad")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createIkpuCode", () => {
    it("should create an IKPU code", async () => {
      ikpuCodeRepo.findOne!.mockResolvedValue(null);
      ikpuCodeRepo.create!.mockReturnValue(mockIkpu);
      ikpuCodeRepo.save!.mockResolvedValue(mockIkpu);

      const result = await service.createIkpuCode({
        code: "10710001001000001",
      } as CreateIkpuCodeDto);
      expect(result).toEqual(mockIkpu);
    });

    it("should throw ConflictException on duplicate", async () => {
      ikpuCodeRepo.findOne!.mockResolvedValue(mockIkpu);
      await expect(
        service.createIkpuCode({
          code: "10710001001000001",
        } as CreateIkpuCodeDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("updateIkpuCode", () => {
    it("should update an IKPU code", async () => {
      ikpuCodeRepo.findOne!.mockResolvedValue({ ...mockIkpu });
      ikpuCodeRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.updateIkpuCode("ikpu-uuid-1", {
        name_ru: "New name",
      } as UpdateIkpuCodeDto);
      expect(result.name_ru).toBe("New name");
    });

    it("should throw NotFoundException when not found", async () => {
      ikpuCodeRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.updateIkpuCode("bad", {} as UpdateIkpuCodeDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================================================
  // VAT RATES
  // ========================================================================

  describe("findAllVatRates", () => {
    it("should return paginated VAT rates", async () => {
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(1);
      qb.getMany.mockResolvedValue([mockVatRate]);
      vatRateRepo.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.findAllVatRates({
        page: 1,
        limit: 50,
      } as QueryReferencesDto);
      expect(result.data).toEqual([mockVatRate]);
    });
  });

  describe("findVatRateByCode", () => {
    it("should return VAT rate when found", async () => {
      vatRateRepo.findOne!.mockResolvedValue(mockVatRate);
      expect(await service.findVatRateByCode("VAT12")).toEqual(mockVatRate);
    });

    it("should throw NotFoundException when not found", async () => {
      vatRateRepo.findOne!.mockResolvedValue(null);
      await expect(service.findVatRateByCode("bad")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createVatRate", () => {
    it("should create a VAT rate and clear cache", async () => {
      vatRateRepo.findOne!.mockResolvedValue(null);
      vatRateRepo.create!.mockReturnValue(mockVatRate);
      vatRateRepo.save!.mockResolvedValue(mockVatRate);

      const result = await service.createVatRate({
        code: "VAT12",
        rate: 12,
      } as CreateVatRateDto);

      expect(result).toEqual(mockVatRate);
      expect(cacheManager.del).toHaveBeenCalledWith("ref:default_vat_rate");
    });

    it("should throw ConflictException on duplicate", async () => {
      vatRateRepo.findOne!.mockResolvedValue(mockVatRate);
      await expect(
        service.createVatRate({ code: "VAT12" } as CreateVatRateDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("updateVatRate", () => {
    it("should update VAT rate and clear cache", async () => {
      vatRateRepo.findOne!.mockResolvedValue({ ...mockVatRate });
      vatRateRepo.save!.mockImplementation(async (entity) => entity);

      await service.updateVatRate("vat-uuid-1", {
        rate: 15,
      } as UpdateVatRateDto);

      expect(cacheManager.del).toHaveBeenCalledWith("ref:default_vat_rate");
    });
  });

  describe("getDefaultVatRate", () => {
    it("should return cached value when available", async () => {
      cacheManager.get.mockResolvedValue(12);

      const result = await service.getDefaultVatRate();

      expect(result).toBe(12);
      expect(vatRateRepo.findOne).not.toHaveBeenCalled();
    });

    it("should query DB and cache when not cached", async () => {
      cacheManager.get.mockResolvedValue(null);
      vatRateRepo.findOne!.mockResolvedValue(mockVatRate);

      const result = await service.getDefaultVatRate();

      expect(result).toBe(12);
      expect(cacheManager.set).toHaveBeenCalledWith(
        "ref:default_vat_rate",
        12,
        600_000,
      );
    });

    it("should return 12 as default when no default rate in DB", async () => {
      cacheManager.get.mockResolvedValue(null);
      vatRateRepo.findOne!.mockResolvedValue(null);

      const result = await service.getDefaultVatRate();

      expect(result).toBe(12);
    });
  });

  // ========================================================================
  // PACKAGE TYPES
  // ========================================================================

  describe("findAllPackageTypes", () => {
    it("should return paginated package types", async () => {
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(1);
      qb.getMany.mockResolvedValue([mockPackageType]);
      packageTypeRepo.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.findAllPackageTypes({
        page: 1,
        limit: 50,
      } as QueryReferencesDto);
      expect(result.data).toEqual([mockPackageType]);
    });
  });

  describe("findPackageTypeByCode", () => {
    it("should return package type when found", async () => {
      packageTypeRepo.findOne!.mockResolvedValue(mockPackageType);
      expect(await service.findPackageTypeByCode("BOX")).toEqual(
        mockPackageType,
      );
    });

    it("should throw NotFoundException when not found", async () => {
      packageTypeRepo.findOne!.mockResolvedValue(null);
      await expect(service.findPackageTypeByCode("bad")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createPackageType", () => {
    it("should create a package type", async () => {
      packageTypeRepo.findOne!.mockResolvedValue(null);
      packageTypeRepo.create!.mockReturnValue(mockPackageType);
      packageTypeRepo.save!.mockResolvedValue(mockPackageType);

      const result = await service.createPackageType({
        code: "BOX",
        name_ru: "Коробка",
      } as CreatePackageTypeDto);
      expect(result).toEqual(mockPackageType);
    });

    it("should throw ConflictException on duplicate", async () => {
      packageTypeRepo.findOne!.mockResolvedValue(mockPackageType);
      await expect(
        service.createPackageType({ code: "BOX" } as CreatePackageTypeDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ========================================================================
  // PAYMENT PROVIDERS
  // ========================================================================

  describe("findAllPaymentProviders", () => {
    it("should return paginated payment providers", async () => {
      const qb = createMockQueryBuilder();
      qb.getCount.mockResolvedValue(1);
      qb.getMany.mockResolvedValue([mockPaymentProvider]);
      paymentProviderRepo.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.findAllPaymentProviders({
        page: 1,
        limit: 50,
      } as QueryReferencesDto);
      expect(result.data).toEqual([mockPaymentProvider]);
    });
  });

  describe("findPaymentProviderByCode", () => {
    it("should return payment provider when found", async () => {
      paymentProviderRepo.findOne!.mockResolvedValue(mockPaymentProvider);
      expect(await service.findPaymentProviderByCode("payme")).toEqual(
        mockPaymentProvider,
      );
    });

    it("should throw NotFoundException when not found", async () => {
      paymentProviderRepo.findOne!.mockResolvedValue(null);
      await expect(service.findPaymentProviderByCode("bad")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createPaymentProvider", () => {
    it("should create a payment provider", async () => {
      paymentProviderRepo.findOne!.mockResolvedValue(null);
      paymentProviderRepo.create!.mockReturnValue(mockPaymentProvider);
      paymentProviderRepo.save!.mockResolvedValue(mockPaymentProvider);

      const result = await service.createPaymentProvider({
        code: "payme",
      } as CreatePaymentProviderDto);
      expect(result).toEqual(mockPaymentProvider);
    });

    it("should throw ConflictException on duplicate", async () => {
      paymentProviderRepo.findOne!.mockResolvedValue(mockPaymentProvider);
      await expect(
        service.createPaymentProvider({
          code: "payme",
        } as CreatePaymentProviderDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("updatePaymentProvider", () => {
    it("should update payment provider", async () => {
      paymentProviderRepo.findOne!.mockResolvedValue({
        ...mockPaymentProvider,
      });
      paymentProviderRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.updatePaymentProvider("pp-uuid-1", {
        name: "Payme Updated",
      } as UpdatePaymentProviderDto);
      expect(result.name).toBe("Payme Updated");
    });

    it("should throw NotFoundException when not found", async () => {
      paymentProviderRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.updatePaymentProvider("bad", {} as UpdatePaymentProviderDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================================================
  // STATIC UTILITY METHODS
  // ========================================================================

  describe("getMarkingRequirements", () => {
    it("should return marking requirements list", () => {
      const requirements = service.getMarkingRequirements();

      expect(requirements).toBeInstanceOf(Array);
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements[0]).toHaveProperty("category");
      expect(requirements[0]).toHaveProperty("name_ru");
      expect(requirements[0]).toHaveProperty("required");
    });
  });

  describe("isMarkingRequired", () => {
    it("should return true for tobacco", () => {
      expect(service.isMarkingRequired("tobacco")).toBe(true);
    });

    it("should return true for alcohol", () => {
      expect(service.isMarkingRequired("alcohol")).toBe(true);
    });

    it("should return false for soft_drinks", () => {
      expect(service.isMarkingRequired("soft_drinks")).toBe(false);
    });

    it("should return false for unknown category", () => {
      expect(service.isMarkingRequired("unknown_category")).toBe(false);
    });
  });

  describe("getCurrencies", () => {
    it("should return currencies with UZS as default", () => {
      const currencies = service.getCurrencies();

      expect(currencies).toBeInstanceOf(Array);
      const defaultCurrency = currencies.find((c) => c.is_default);
      expect(defaultCurrency?.code).toBe("UZS");
    });
  });

  describe("getDefaultCurrency", () => {
    it("should return UZS", () => {
      expect(service.getDefaultCurrency()).toBe("UZS");
    });
  });

  describe("getRegions", () => {
    it("should return Uzbekistan regions", () => {
      const regions = service.getRegions();

      expect(regions).toBeInstanceOf(Array);
      expect(regions.length).toBe(14);
      expect(regions[0]).toHaveProperty("code");
      expect(regions[0]).toHaveProperty("name_ru");
      expect(regions[0]).toHaveProperty("name_uz");
      // Tashkent should be first
      expect(regions[0].code).toBe("TAS");
    });
  });
});
