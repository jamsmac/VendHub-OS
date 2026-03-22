import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CustomFieldsService } from "./custom-fields.service";
import {
  EntityCustomTab,
  EntityCustomField,
  CustomFieldType,
} from "./entities/custom-field.entity";

const createMockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  softRemove: jest.fn(),
  count: jest.fn(),
});

describe("CustomFieldsService", () => {
  let service: CustomFieldsService;
  let tabRepo: jest.Mocked<Repository<EntityCustomTab>>;
  let fieldRepo: jest.Mocked<Repository<EntityCustomField>>;

  const orgId = "550e8400-e29b-41d4-a716-446655440000";

  const mockTab: EntityCustomTab = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    organizationId: orgId,
    entityType: "machine",
    tabName: "Technical Info",
    tabNameUz: "Texnik ma'lumot",
    tabIcon: "settings",
    sortOrder: 100,
    visibilityRoles: [],
    isActive: true,
    metadata: {},
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    createdById: null,
    updatedById: null,
  };

  const mockField: EntityCustomField = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    organizationId: orgId,
    entityType: "machine",
    fieldKey: "serial_number",
    fieldLabel: "Serial Number",
    fieldLabelUz: "Seriya raqami",
    fieldType: CustomFieldType.TEXT,
    tabName: "Technical Info",
    isRequired: false,
    sortOrder: 0,
    options: null,
    defaultValue: null,
    placeholder: "Enter serial number",
    helpText: null,
    validationMin: null,
    validationMax: null,
    validationPattern: null,
    isActive: true,
    metadata: {},
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    createdById: null,
    updatedById: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        {
          provide: getRepositoryToken(EntityCustomTab),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(EntityCustomField),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<CustomFieldsService>(CustomFieldsService);
    tabRepo = module.get(getRepositoryToken(EntityCustomTab));
    fieldRepo = module.get(getRepositoryToken(EntityCustomField));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // getTabs
  // =========================================================================

  describe("getTabs", () => {
    it("should return all active tabs for an organization", async () => {
      const tabs = [mockTab];
      tabRepo.find.mockResolvedValue(tabs);

      const result = await service.getTabs(orgId);

      expect(result).toEqual(tabs);
      expect(tabRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId, isActive: true },
        order: { sortOrder: "ASC" },
      });
    });

    it("should filter tabs by entityType when provided", async () => {
      const tabs = [mockTab];
      tabRepo.find.mockResolvedValue(tabs);

      const result = await service.getTabs(orgId, "machine");

      expect(result).toEqual(tabs);
      expect(tabRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId, isActive: true, entityType: "machine" },
        order: { sortOrder: "ASC" },
      });
    });

    it("should return empty array when no tabs exist", async () => {
      tabRepo.find.mockResolvedValue([]);

      const result = await service.getTabs(orgId, "product");

      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // createTab
  // =========================================================================

  describe("createTab", () => {
    it("should create a new tab successfully", async () => {
      const dto = {
        entityType: "machine",
        tabName: "Technical Info",
        tabIcon: "settings",
        sortOrder: 100,
      };

      tabRepo.findOne.mockResolvedValue(null);
      tabRepo.create.mockReturnValue(mockTab);
      tabRepo.save.mockResolvedValue(mockTab);

      const result = await service.createTab(orgId, dto);

      expect(result).toEqual(mockTab);
      expect(tabRepo.findOne).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          entityType: dto.entityType,
          tabName: dto.tabName,
        },
      });
      expect(tabRepo.create).toHaveBeenCalledWith({
        ...dto,
        organizationId: orgId,
      });
      expect(tabRepo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException when tab name already exists for entity type", async () => {
      const dto = {
        entityType: "machine",
        tabName: "Technical Info",
      };

      tabRepo.findOne.mockResolvedValue(mockTab);

      await expect(service.createTab(orgId, dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createTab(orgId, dto)).rejects.toThrow(
        "Tab with this name already exists",
      );
      expect(tabRepo.save).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // updateTab
  // =========================================================================

  describe("updateTab", () => {
    it("should update an existing tab", async () => {
      const dto = { tabName: "Updated Tab Name", sortOrder: 200 };
      const updatedTab = { ...mockTab, ...dto };

      tabRepo.findOne.mockResolvedValue({ ...mockTab });
      tabRepo.save.mockResolvedValue(updatedTab);

      const result = await service.updateTab(mockTab.id, orgId, dto);

      expect(result).toEqual(updatedTab);
      expect(tabRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockTab.id, organizationId: orgId },
      });
      expect(tabRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when tab does not exist", async () => {
      tabRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateTab("nonexistent-id", orgId, { tabName: "New Name" }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateTab("nonexistent-id", orgId, { tabName: "New Name" }),
      ).rejects.toThrow("Tab not found");
    });

    it("should apply partial updates via Object.assign", async () => {
      const dto = { tabIcon: "file-text" };
      const originalTab = { ...mockTab };

      tabRepo.findOne.mockResolvedValue(originalTab);
      tabRepo.save.mockImplementation(async (tab) => tab as EntityCustomTab);

      const result = await service.updateTab(mockTab.id, orgId, dto);

      expect(result.tabIcon).toBe("file-text");
      expect(result.tabName).toBe(mockTab.tabName);
    });
  });

  // =========================================================================
  // deleteTab
  // =========================================================================

  describe("deleteTab", () => {
    it("should soft delete the tab and deactivate associated fields", async () => {
      tabRepo.findOne.mockResolvedValue(mockTab);
      tabRepo.softDelete.mockResolvedValue({ affected: 1 } as any);
      fieldRepo.update.mockResolvedValue({ affected: 2 } as any);

      await service.deleteTab(mockTab.id, orgId);

      expect(tabRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockTab.id, organizationId: orgId },
      });
      expect(tabRepo.softDelete).toHaveBeenCalledWith(mockTab.id);
      expect(fieldRepo.update).toHaveBeenCalledWith(
        {
          organizationId: orgId,
          entityType: mockTab.entityType,
          tabName: mockTab.tabName,
        },
        { isActive: false },
      );
    });

    it("should throw NotFoundException when tab does not exist", async () => {
      tabRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteTab("nonexistent-id", orgId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteTab("nonexistent-id", orgId)).rejects.toThrow(
        "Tab not found",
      );
      expect(tabRepo.softDelete).not.toHaveBeenCalled();
      expect(fieldRepo.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getFields
  // =========================================================================

  describe("getFields", () => {
    it("should return active fields for entity type", async () => {
      const fields = [mockField];
      fieldRepo.find.mockResolvedValue(fields);

      const result = await service.getFields(orgId, "machine");

      expect(result).toEqual(fields);
      expect(fieldRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId, entityType: "machine", isActive: true },
        order: { sortOrder: "ASC" },
      });
    });

    it("should filter fields by tabName when provided", async () => {
      const fields = [mockField];
      fieldRepo.find.mockResolvedValue(fields);

      const result = await service.getFields(
        orgId,
        "machine",
        "Technical Info",
      );

      expect(result).toEqual(fields);
      expect(fieldRepo.find).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          entityType: "machine",
          isActive: true,
          tabName: "Technical Info",
        },
        order: { sortOrder: "ASC" },
      });
    });
  });

  // =========================================================================
  // createField
  // =========================================================================

  describe("createField", () => {
    it("should create a new field successfully", async () => {
      const dto = {
        entityType: "machine",
        fieldKey: "serial_number",
        fieldLabel: "Serial Number",
        fieldType: CustomFieldType.TEXT,
      };

      fieldRepo.findOne.mockResolvedValue(null);
      fieldRepo.create.mockReturnValue(mockField);
      fieldRepo.save.mockResolvedValue(mockField);

      const result = await service.createField(orgId, dto);

      expect(result).toEqual(mockField);
      expect(fieldRepo.findOne).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          entityType: dto.entityType,
          fieldKey: dto.fieldKey,
        },
      });
      expect(fieldRepo.create).toHaveBeenCalledWith({
        ...dto,
        organizationId: orgId,
      });
    });

    it("should throw ConflictException when fieldKey already exists", async () => {
      const dto = {
        entityType: "machine",
        fieldKey: "serial_number",
        fieldLabel: "Serial Number",
        fieldType: CustomFieldType.TEXT,
      };

      fieldRepo.findOne.mockResolvedValue(mockField);

      await expect(service.createField(orgId, dto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createField(orgId, dto)).rejects.toThrow(
        'Field key "serial_number" already exists for this entity type',
      );
    });
  });

  // =========================================================================
  // updateField
  // =========================================================================

  describe("updateField", () => {
    it("should update an existing field", async () => {
      const dto = { fieldLabel: "Updated Label", isRequired: true };
      const updatedField = { ...mockField, ...dto };

      fieldRepo.findOne.mockResolvedValue({ ...mockField });
      fieldRepo.save.mockResolvedValue(updatedField);

      const result = await service.updateField(mockField.id, orgId, dto);

      expect(result).toEqual(updatedField);
      expect(fieldRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockField.id, organizationId: orgId },
      });
    });

    it("should throw NotFoundException when field does not exist", async () => {
      fieldRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateField("nonexistent-id", orgId, { fieldLabel: "X" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // deleteField
  // =========================================================================

  describe("deleteField", () => {
    it("should soft delete an existing field", async () => {
      fieldRepo.findOne.mockResolvedValue(mockField);
      fieldRepo.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteField(mockField.id, orgId);

      expect(fieldRepo.softDelete).toHaveBeenCalledWith(mockField.id);
    });

    it("should throw NotFoundException when field does not exist", async () => {
      fieldRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteField("nonexistent-id", orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // getFieldValues
  // =========================================================================

  describe("getFieldValues", () => {
    it("should return custom field values from metadata", async () => {
      const fields = [
        { ...mockField, fieldKey: "serial_number", defaultValue: null },
        { ...mockField, fieldKey: "model", defaultValue: "Standard" },
      ];
      fieldRepo.find.mockResolvedValue(fields);

      const metadata = {
        customFields: { serial_number: "SN-12345" },
      };

      const result = await service.getFieldValues(orgId, "machine", metadata);

      expect(result).toEqual({
        serial_number: "SN-12345",
        model: "Standard",
      });
    });

    it("should return defaults when metadata has no custom fields", async () => {
      const fields = [
        { ...mockField, fieldKey: "color", defaultValue: "white" },
      ];
      fieldRepo.find.mockResolvedValue(fields);

      const result = await service.getFieldValues(orgId, "machine", {});

      expect(result).toEqual({ color: "white" });
    });

    it("should return null when no default and no value", async () => {
      const fields = [{ ...mockField, fieldKey: "notes", defaultValue: null }];
      fieldRepo.find.mockResolvedValue(fields);

      const result = await service.getFieldValues(orgId, "machine", {});

      expect(result).toEqual({ notes: null });
    });
  });

  // =========================================================================
  // mergeFieldValues
  // =========================================================================

  describe("mergeFieldValues", () => {
    it("should merge new values into existing metadata", () => {
      const current = {
        someKey: "existing",
        customFields: { serial_number: "old" },
      };
      const values = { serial_number: "new", color: "red" };

      const result = service.mergeFieldValues(current, values);

      expect(result).toEqual({
        someKey: "existing",
        customFields: {
          serial_number: "new",
          color: "red",
        },
      });
    });

    it("should create customFields key when metadata has none", () => {
      const result = service.mergeFieldValues({}, { model: "X200" });

      expect(result).toEqual({
        customFields: { model: "X200" },
      });
    });
  });
});
