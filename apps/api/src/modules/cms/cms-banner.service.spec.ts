import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { CmsBannerService } from "./cms-banner.service";
import {
  CmsBanner,
  BannerStatus,
  BannerPosition,
} from "./entities/cms-banner.entity";
import { CmsArticle } from "./entities/cms-article.entity";

describe("CmsBannerService", () => {
  let service: CmsBannerService;
  let bannerRepo: Record<string, jest.Mock>;
  let articleRepo: Record<string, jest.Mock>;

  const mockBanner: Partial<CmsBanner> = {
    id: "banner-1",
    organizationId: "org-1",
    titleRu: "Test Banner",
    descriptionRu: "Test description",
    titleUz: null,
    descriptionUz: null,
    imageUrl: "https://example.com/img.jpg",
    linkUrl: "/promo",
    position: BannerPosition.HERO,
    status: BannerStatus.ACTIVE,
    sortOrder: 0,
    impressions: 100,
    clicks: 10,
    validFrom: null,
    validUntil: null,
  };

  const mockQb = () => {
    const qb: Record<string, jest.Mock> = {};
    qb.select = jest.fn().mockReturnValue(qb);
    qb.where = jest.fn().mockReturnValue(qb);
    qb.andWhere = jest.fn().mockReturnValue(qb);
    qb.orderBy = jest.fn().mockReturnValue(qb);
    qb.addOrderBy = jest.fn().mockReturnValue(qb);
    qb.update = jest.fn().mockReturnValue(qb);
    qb.set = jest.fn().mockReturnValue(qb);
    qb.getMany = jest.fn().mockResolvedValue([mockBanner]);
    qb.execute = jest.fn().mockResolvedValue({});
    return qb;
  };

  beforeEach(async () => {
    const qb = mockQb();
    const articleQb = mockQb();
    articleQb.getMany = jest.fn().mockResolvedValue([]);

    bannerRepo = {
      find: jest.fn().mockResolvedValue([mockBanner]),
      findOne: jest.fn().mockResolvedValue(mockBanner),
      create: jest
        .fn()
        .mockImplementation((data) => ({ ...mockBanner, ...data })),
      save: jest
        .fn()
        .mockImplementation((data) =>
          Promise.resolve({ ...mockBanner, ...data }),
        ),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    articleRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(articleQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmsBannerService,
        { provide: getRepositoryToken(CmsBanner), useValue: bannerRepo },
        { provide: getRepositoryToken(CmsArticle), useValue: articleRepo },
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

    service = module.get<CmsBannerService>(CmsBannerService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getActiveBanners", () => {
    it("should return active banners", async () => {
      const result = await service.getActiveBanners();

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result.total).toBe(1);
    });

    it("should filter by position", async () => {
      await service.getActiveBanners(BannerPosition.HERO);

      const qb = bannerRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  describe("getPublicSiteContent", () => {
    it("should return grouped content", async () => {
      const result = await service.getPublicSiteContent();

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
    });

    it("should filter by category", async () => {
      await service.getPublicSiteContent("hero");

      const qb = articleRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  describe("getAllBanners", () => {
    it("should return all banners for organization", async () => {
      const result = await service.getAllBanners("org-1");

      expect(bannerRepo.find).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        order: { position: "ASC", sortOrder: "ASC" },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("getBannerById", () => {
    it("should return banner", async () => {
      const result = await service.getBannerById("org-1", "banner-1");

      expect(result).toEqual(mockBanner);
    });

    it("should throw NotFoundException if not found", async () => {
      bannerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getBannerById("org-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("createBanner", () => {
    it("should create a banner", async () => {
      const result = await service.createBanner(
        "org-1",
        {
          titleRu: "New Banner",
          position: BannerPosition.TOP,
          status: BannerStatus.DRAFT,
        },
        "user-1",
      );

      expect(bannerRepo.create).toHaveBeenCalled();
      expect(bannerRepo.save).toHaveBeenCalled();
      expect(result.titleRu).toBe("New Banner");
    });
  });

  describe("updateBanner", () => {
    it("should update a banner", async () => {
      const result = await service.updateBanner(
        "org-1",
        "banner-1",
        {
          titleRu: "Updated Banner",
          status: BannerStatus.ACTIVE,
        },
        "user-1",
      );

      expect(bannerRepo.save).toHaveBeenCalled();
      expect(result.titleRu).toBe("Updated Banner");
    });
  });

  describe("deleteBanner", () => {
    it("should soft delete a banner", async () => {
      await service.deleteBanner("org-1", "banner-1");

      expect(bannerRepo.softDelete).toHaveBeenCalledWith("banner-1");
    });

    it("should throw NotFoundException if not found", async () => {
      bannerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteBanner("org-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
