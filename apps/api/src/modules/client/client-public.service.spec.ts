import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { ClientPublicService } from "./client-public.service";
import { Product } from "../products/entities/product.entity";
import { ClientOrder } from "./entities/client-order.entity";
import { ClientUser } from "./entities/client-user.entity";

describe("ClientPublicService", () => {
  let service: ClientPublicService;
  let productRepo: {
    createQueryBuilder: jest.Mock;
    manager: { createQueryBuilder: jest.Mock };
  };
  let orderRepo: { createQueryBuilder: jest.Mock };
  let clientUserRepo: { createQueryBuilder: jest.Mock };

  const mockQb = () => {
    const qb: Record<string, jest.Mock> = {};
    qb.select = jest.fn().mockReturnValue(qb);
    qb.addSelect = jest.fn().mockReturnValue(qb);
    qb.from = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.orderBy = jest.fn().mockReturnValue(qb);
    qb.addOrderBy = jest.fn().mockReturnValue(qb);
    qb.skip = jest.fn().mockReturnValue(qb);
    qb.take = jest.fn().mockReturnValue(qb);
    qb.limit = jest.fn().mockReturnValue(qb);
    qb.getCount = jest.fn().mockResolvedValue(0);
    qb.getMany = jest.fn().mockResolvedValue([]);
    qb.getRawOne = jest.fn().mockResolvedValue(null);
    qb.getRawMany = jest.fn().mockResolvedValue([]);
    return qb;
  };

  beforeEach(async () => {
    const qb1 = mockQb();
    const qb2 = mockQb();
    const qb3 = mockQb();
    const managerQb = mockQb();

    productRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb1),
      manager: { createQueryBuilder: jest.fn().mockReturnValue(managerQb) },
    };
    orderRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb2) };
    clientUserRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb3) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPublicService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(ClientOrder), useValue: orderRepo },
        { provide: getRepositoryToken(ClientUser), useValue: clientUserRepo },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue("a0000000-0000-0000-0000-000000000001"),
          },
        },
      ],
    }).compile();

    service = module.get<ClientPublicService>(ClientPublicService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getStats", () => {
    it("should return platform statistics with defaults", async () => {
      const result = await service.getStats();

      expect(result).toHaveProperty("totalMachines");
      expect(result).toHaveProperty("totalProducts");
      expect(result).toHaveProperty("totalOrders");
      expect(result).toHaveProperty("totalClients");
      expect(result).toHaveProperty("avgRating");
      expect(typeof result.totalMachines).toBe("number");
      expect(typeof result.avgRating).toBe("number");
    });

    it("should return 0 for empty database", async () => {
      const result = await service.getStats();

      expect(result.totalMachines).toBe(0);
      expect(result.totalProducts).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.totalClients).toBe(0);
    });
  });

  describe("getProducts", () => {
    it("should return paginated products", async () => {
      const result = await service.getProducts();

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("totalPages");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should apply search filter", async () => {
      await service.getProducts({ search: "espresso" });

      const qb = productRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it("should apply category filter", async () => {
      await service.getProducts({ category: "coffee" });

      const qb = productRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it("should use default pagination", async () => {
      const result = await service.getProducts();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });
  });

  describe("getPromotions", () => {
    it("should return promotions list", async () => {
      const result = await service.getPromotions();

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe("getLoyaltyTiers", () => {
    it("should return all 4 loyalty tiers", async () => {
      const result = await service.getLoyaltyTiers();

      expect(result).toHaveProperty("tiers");
      expect(result.tiers).toHaveLength(4);
      expect(result.tiers[0].level).toBe("bronze");
      expect(result.tiers[1].level).toBe("silver");
      expect(result.tiers[2].level).toBe("gold");
      expect(result.tiers[3].level).toBe("platinum");
    });

    it("should have correct multipliers", async () => {
      const result = await service.getLoyaltyTiers();

      expect(result.tiers[0].multiplier).toBe(1.0);
      expect(result.tiers[1].multiplier).toBe(1.5);
      expect(result.tiers[2].multiplier).toBe(2.0);
      expect(result.tiers[3].multiplier).toBe(3.0);
    });

    it("should include currency info", async () => {
      const result = await service.getLoyaltyTiers();

      expect(result.currency).toBe("UZS");
      expect(result.pointsPerUzs).toBe(1);
    });
  });
});
