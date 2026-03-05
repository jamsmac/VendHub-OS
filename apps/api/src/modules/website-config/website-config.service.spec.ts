import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { WebsiteConfigService } from "./website-config.service";
import {
  WebsiteConfig,
  WebsiteConfigSection,
} from "./entities/website-config.entity";

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
  softRemove: jest.fn(),
  softDelete: jest.fn(),
  count: jest.fn(),
});

describe("WebsiteConfigService", () => {
  let service: WebsiteConfigService;
  let configRepo: MockRepository<WebsiteConfig>;

  const organizationId = "123e4567-e89b-12d3-a456-426614174000";
  const updatedBy = "123e4567-e89b-12d3-a456-426614174001";

  beforeEach(async () => {
    configRepo = createMockRepository<WebsiteConfig>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsiteConfigService,
        { provide: getRepositoryToken(WebsiteConfig), useValue: configRepo },
      ],
    }).compile();

    service = module.get<WebsiteConfigService>(WebsiteConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // GET ALL
  // ==========================================================================

  describe("getAll", () => {
    it("should return all website configs for an organization", async () => {
      const configs = [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          organizationId,
          key: "site_name",
          value: "My Site",
          section: WebsiteConfigSection.GENERAL,
          deletedAt: null,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          organizationId,
          key: "site_description",
          value: "My Site Description",
          section: WebsiteConfigSection.GENERAL,
          deletedAt: null,
        },
      ];

      configRepo.find!.mockResolvedValue(configs);

      const result = await service.getAll(organizationId);

      expect(result).toEqual(configs);
      expect(configRepo.find).toHaveBeenCalledWith({
        where: { organizationId, deletedAt: expect.any(Object) },
        order: { section: "ASC", key: "ASC" },
      });
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(service.getAll("")).rejects.toThrow(BadRequestException);
    });

    it("should return empty array when organization has no configs", async () => {
      configRepo.find!.mockResolvedValue([]);

      const result = await service.getAll(organizationId);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET BY SECTION
  // ==========================================================================

  describe("getBySection", () => {
    it("should return configs for a specific section", async () => {
      const configs = [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          organizationId,
          key: "meta_title",
          value: "My Title",
          section: WebsiteConfigSection.SEO,
          deletedAt: null,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          organizationId,
          key: "meta_description",
          value: "My Description",
          section: WebsiteConfigSection.SEO,
          deletedAt: null,
        },
      ];

      configRepo.find!.mockResolvedValue(configs);

      const result = await service.getBySection(
        organizationId,
        WebsiteConfigSection.SEO,
      );

      expect(result).toEqual(configs);
      expect(configRepo.find).toHaveBeenCalledWith({
        where: {
          organizationId,
          section: WebsiteConfigSection.SEO,
          deletedAt: expect.any(Object),
        },
        order: { key: "ASC" },
      });
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        service.getBySection("", WebsiteConfigSection.GENERAL),
      ).rejects.toThrow(BadRequestException);
    });

    it("should return empty array when section has no configs", async () => {
      configRepo.find!.mockResolvedValue([]);

      const result = await service.getBySection(
        organizationId,
        WebsiteConfigSection.ANALYTICS,
      );

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET BY KEY
  // ==========================================================================

  describe("getByKey", () => {
    it("should return a config by organization and key", async () => {
      const config = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        key: "site_name",
        value: "My Site",
        section: WebsiteConfigSection.GENERAL,
        deletedAt: null,
      };

      configRepo.findOne!.mockResolvedValue(config);

      const result = await service.getByKey(organizationId, "site_name");

      expect(result).toEqual(config);
      expect(configRepo.findOne).toHaveBeenCalledWith({
        where: {
          organizationId,
          key: "site_name",
          deletedAt: expect.any(Object),
        },
      });
    });

    it("should throw NotFoundException when config not found", async () => {
      configRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getByKey(organizationId, "non_existent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(service.getByKey("", "site_name")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // CREATE
  // ==========================================================================

  describe("create", () => {
    it("should create a new config with default section", async () => {
      const dto = { key: "site_name", value: "My Site" };
      const created = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        key: "site_name",
        value: "My Site",
        section: WebsiteConfigSection.GENERAL,
        updatedBy,
        createdAt: new Date(),
      };

      configRepo.findOne!.mockResolvedValue(null);
      configRepo.create!.mockReturnValue(created);
      configRepo.save!.mockResolvedValue(created);

      const result = await service.create(organizationId, dto, updatedBy);

      expect(result).toEqual(created);
      expect(configRepo.findOne).toHaveBeenCalledWith({
        where: {
          organizationId,
          key: "site_name",
          deletedAt: expect.any(Object),
        },
      });
      expect(configRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId,
          key: "site_name",
          value: "My Site",
          section: WebsiteConfigSection.GENERAL,
          updatedBy,
        }),
      );
      expect(configRepo.save).toHaveBeenCalled();
    });

    it("should create a config with specified section", async () => {
      const dto = {
        key: "meta_title",
        value: "Title",
        section: WebsiteConfigSection.SEO,
      };
      const created = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        key: "meta_title",
        value: "Title",
        section: WebsiteConfigSection.SEO,
        updatedBy,
      };

      configRepo.findOne!.mockResolvedValue(null);
      configRepo.create!.mockReturnValue(created);
      configRepo.save!.mockResolvedValue(created);

      const result = await service.create(organizationId, dto, updatedBy);

      expect(result.section).toBe(WebsiteConfigSection.SEO);
      expect(configRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          section: WebsiteConfigSection.SEO,
        }),
      );
    });

    it("should throw BadRequestException when key already exists", async () => {
      const dto = { key: "site_name", value: "My Site" };
      const existing = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        key: "site_name",
      };

      configRepo.findOne!.mockResolvedValue(existing);

      await expect(
        service.create(organizationId, dto, updatedBy),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      const dto = { key: "site_name", value: "My Site" };

      await expect(service.create("", dto, updatedBy)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // UPDATE BY KEY
  // ==========================================================================

  describe("updateByKey", () => {
    it("should update a config value", async () => {
      const existing = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        key: "site_name",
        value: "Old Site Name",
        section: WebsiteConfigSection.GENERAL,
        updatedBy: "123e4567-e89b-12d3-a456-426614174002",
      };

      const dto = { value: "New Site Name" };

      configRepo.findOne!.mockResolvedValue(existing);
      configRepo.save!.mockImplementation((config) => Promise.resolve(config));

      const result = await service.updateByKey(
        organizationId,
        "site_name",
        dto,
        updatedBy,
      );

      expect(result.value).toBe("New Site Name");
      expect(result.updatedBy).toBe(updatedBy);
      expect(configRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when config not found", async () => {
      const dto = { value: "New Value" };

      configRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateByKey(organizationId, "non_existent", dto, updatedBy),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update config section", async () => {
      const existing = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        key: "meta_title",
        value: "Title",
        section: WebsiteConfigSection.GENERAL,
      };

      const dto = { section: WebsiteConfigSection.SEO };

      configRepo.findOne!.mockResolvedValue(existing);
      configRepo.save!.mockImplementation((config) => Promise.resolve(config));

      const result = await service.updateByKey(
        organizationId,
        "meta_title",
        dto,
        updatedBy,
      );

      expect(result.section).toBe(WebsiteConfigSection.SEO);
    });
  });

  // ==========================================================================
  // BULK UPDATE
  // ==========================================================================

  describe("bulkUpdate", () => {
    it("should create and update configs in bulk (upsert)", async () => {
      const configs = [
        { key: "site_name", value: "My Site" },
        { key: "site_email", value: "admin@example.com" },
      ];

      configRepo.findOne!.mockResolvedValue(null);
      configRepo.create!.mockImplementation((config) => config);
      configRepo.save!.mockImplementation((config) =>
        Promise.resolve(config as unknown as WebsiteConfig),
      );

      const result = await service.bulkUpdate(
        organizationId,
        configs,
        updatedBy,
      );

      expect(result).toHaveLength(2);
      expect(configRepo.create).toHaveBeenCalledTimes(2);
      expect(configRepo.save).toHaveBeenCalledTimes(2);
    });

    it("should update existing configs in bulk", async () => {
      const configs = [{ key: "site_name", value: "Updated Site Name" }];

      const existing = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        key: "site_name",
        value: "Old Name",
        section: WebsiteConfigSection.GENERAL,
      };

      configRepo.findOne!.mockResolvedValue(existing);
      configRepo.save!.mockImplementation((config) =>
        Promise.resolve(config as unknown as WebsiteConfig),
      );

      const result = await service.bulkUpdate(
        organizationId,
        configs,
        updatedBy,
      );

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("Updated Site Name");
      expect(configRepo.save).toHaveBeenCalled();
    });

    it("should mix creating and updating in bulk", async () => {
      const configs = [
        { key: "existing_key", value: "Updated Value" },
        { key: "new_key", value: "New Value" },
      ];

      configRepo
        .findOne!.mockResolvedValueOnce({
          id: "550e8400-e29b-41d4-a716-446655440000",
          key: "existing_key",
        })
        .mockResolvedValueOnce(null);

      configRepo.create!.mockImplementation((config) => config);
      configRepo.save!.mockImplementation((config) =>
        Promise.resolve(config as unknown as WebsiteConfig),
      );

      const result = await service.bulkUpdate(
        organizationId,
        configs,
        updatedBy,
      );

      expect(result).toHaveLength(2);
      expect(configRepo.create).toHaveBeenCalledTimes(1);
      expect(configRepo.save).toHaveBeenCalledTimes(2);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      const configs = [{ key: "site_name", value: "My Site" }];

      await expect(service.bulkUpdate("", configs, updatedBy)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should handle empty config list", async () => {
      const result = await service.bulkUpdate(organizationId, [], updatedBy);

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // DELETE BY KEY
  // ==========================================================================

  describe("deleteByKey", () => {
    it("should soft delete a config", async () => {
      const config = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        key: "site_name",
        value: "My Site",
        section: WebsiteConfigSection.GENERAL,
      };

      configRepo.findOne!.mockResolvedValue(config);
      configRepo.softRemove!.mockResolvedValue(config);

      await service.deleteByKey(organizationId, "site_name");

      expect(configRepo.findOne).toHaveBeenCalledWith({
        where: {
          organizationId,
          key: "site_name",
          deletedAt: expect.any(Object),
        },
      });
      expect(configRepo.softRemove).toHaveBeenCalledWith(config);
    });

    it("should throw NotFoundException when config not found", async () => {
      configRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.deleteByKey(organizationId, "non_existent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // INTEGRATION SCENARIOS
  // ==========================================================================

  describe("Integration scenarios", () => {
    it("should handle multiple sections independently", async () => {
      const seoConfigs = [
        { key: "meta_title", section: WebsiteConfigSection.SEO },
      ];
      const themeConfigs = [
        { key: "primary_color", section: WebsiteConfigSection.THEME },
      ];

      configRepo
        .find!.mockResolvedValueOnce(seoConfigs)
        .mockResolvedValueOnce(themeConfigs);

      const seo = await service.getBySection(
        organizationId,
        WebsiteConfigSection.SEO,
      );
      const theme = await service.getBySection(
        organizationId,
        WebsiteConfigSection.THEME,
      );

      expect(seo).toEqual(seoConfigs);
      expect(theme).toEqual(themeConfigs);
      expect(configRepo.find).toHaveBeenCalledTimes(2);
    });

    it("should maintain organization isolation", async () => {
      const org1Id = "123e4567-e89b-12d3-a456-426614174000";
      const org2Id = "223e4567-e89b-12d3-a456-426614174000";

      configRepo
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      configRepo.create!.mockImplementation((config) => config);
      configRepo.save!.mockImplementation((config) =>
        Promise.resolve(config as unknown as WebsiteConfig),
      );

      await service.create(
        org1Id,
        { key: "site_name", value: "Org 1 Site" },
        updatedBy,
      );
      await service.create(
        org2Id,
        { key: "site_name", value: "Org 2 Site" },
        updatedBy,
      );

      expect(configRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ organizationId: org1Id }),
      );
      expect(configRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ organizationId: org2Id }),
      );
    });
  });
});
