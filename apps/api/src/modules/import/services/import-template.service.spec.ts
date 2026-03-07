import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { ImportTemplateService } from "./import-template.service";
import {
  ImportTemplate,
  ImportType,
  ImportSource,
} from "../entities/import.entity";

describe("ImportTemplateService", () => {
  let service: ImportTemplateService;
  let templateRepo: any;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";

  const mockTemplate: Partial<ImportTemplate> = {
    id: "tpl-uuid-1",
    organizationId: orgId,
    name: "Products Import Template",
    importType: ImportType.PRODUCTS,
    source: ImportSource.CSV,
    columnMappings: { col_a: "name", col_b: "price" },
    isActive: true,
    createdByUserId: userId,
  };

  beforeEach(async () => {
    templateRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: "tpl-uuid-1", ...entity }),
        ),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportTemplateService,
        {
          provide: getRepositoryToken(ImportTemplate),
          useValue: templateRepo,
        },
      ],
    }).compile();

    service = module.get<ImportTemplateService>(ImportTemplateService);
  });

  // --------------------------------------------------------------------------
  // createTemplate
  // --------------------------------------------------------------------------

  it("should create a template with organizationId and userId", async () => {
    const data: Partial<ImportTemplate> = {
      name: "Products CSV",
      importType: ImportType.PRODUCTS,
      source: ImportSource.CSV,
      columnMappings: { product: "name" },
    };

    const result = await service.createTemplate(orgId, userId, data);

    expect(templateRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: orgId,
        createdByUserId: userId,
        name: "Products CSV",
      }),
    );
    expect(templateRepo.save).toHaveBeenCalled();
    expect(result).toHaveProperty("id");
  });

  it("should pass all template data fields through to create", async () => {
    const data: Partial<ImportTemplate> = {
      name: "With Options",
      importType: ImportType.MACHINES,
      source: ImportSource.EXCEL,
      columnMappings: {},
      options: { delimiter: ";", encoding: "utf-8" },
    };

    await service.createTemplate(orgId, userId, data);

    expect(templateRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { delimiter: ";", encoding: "utf-8" },
      }),
    );
  });

  // --------------------------------------------------------------------------
  // getTemplates
  // --------------------------------------------------------------------------

  it("should return active templates for organization", async () => {
    templateRepo.find.mockResolvedValue([mockTemplate]);

    const result = await service.getTemplates(orgId);

    expect(templateRepo.find).toHaveBeenCalledWith({
      where: { organizationId: orgId, isActive: true },
      order: { name: "ASC" },
    });
    expect(result).toHaveLength(1);
  });

  it("should filter templates by importType when provided", async () => {
    templateRepo.find.mockResolvedValue([mockTemplate]);

    await service.getTemplates(orgId, ImportType.PRODUCTS);

    expect(templateRepo.find).toHaveBeenCalledWith({
      where: {
        organizationId: orgId,
        isActive: true,
        importType: ImportType.PRODUCTS,
      },
      order: { name: "ASC" },
    });
  });

  it("should return empty array when no templates exist", async () => {
    templateRepo.find.mockResolvedValue([]);

    const result = await service.getTemplates(orgId);
    expect(result).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // getTemplate
  // --------------------------------------------------------------------------

  it("should return a template by id and organizationId", async () => {
    templateRepo.findOne.mockResolvedValue(mockTemplate);

    const result = await service.getTemplate(orgId, "tpl-uuid-1");

    expect(templateRepo.findOne).toHaveBeenCalledWith({
      where: { id: "tpl-uuid-1", organizationId: orgId },
    });
    expect(result).toEqual(mockTemplate);
  });

  it("should throw NotFoundException when template does not exist", async () => {
    templateRepo.findOne.mockResolvedValue(null);

    await expect(service.getTemplate(orgId, "nonexistent-id")).rejects.toThrow(
      NotFoundException,
    );
  });

  // --------------------------------------------------------------------------
  // deleteTemplate
  // --------------------------------------------------------------------------

  it("should soft-delete template by setting isActive to false", async () => {
    await service.deleteTemplate(orgId, "tpl-uuid-1");

    expect(templateRepo.update).toHaveBeenCalledWith(
      { id: "tpl-uuid-1", organizationId: orgId },
      { isActive: false },
    );
  });

  it("should not throw when deleting a non-existent template", async () => {
    templateRepo.update.mockResolvedValue({ affected: 0 });

    await expect(
      service.deleteTemplate(orgId, "nonexistent-id"),
    ).resolves.toBeUndefined();
  });
});
