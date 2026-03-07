import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DirectoryEntryService } from "./directory-entry.service";
import { DirectoryAuditService } from "./directory-audit.service";
import {
  Directory,
  DirectoryEntry,
  EntryStatus,
  EntryOrigin,
} from "../entities/directory.entity";

describe("DirectoryEntryService", () => {
  let service: DirectoryEntryService;
  let entryRepo: any;
  let auditService: any;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const directoryId = "dir-uuid-1";
  const entryId = "entry-uuid-1";

  const mockDirectory: Partial<Directory> = {
    id: directoryId,
    isHierarchical: true,
    settings: {},
  };

  const mockEntry: Partial<DirectoryEntry> = {
    id: entryId,
    directoryId,
    organizationId: orgId,
    name: "Test Entry",
    normalizedName: "test entry",
    code: "TE-001",
    status: EntryStatus.ACTIVE,
    version: 1,
    parentId: null,
    data: {},
    sortOrder: 0,
  };

  beforeEach(async () => {
    entryRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: entryId, ...entity }),
        ),
      findOne: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    auditService = {
      createAuditEntry: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectoryEntryService,
        { provide: getRepositoryToken(DirectoryEntry), useValue: entryRepo },
        { provide: DirectoryAuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<DirectoryEntryService>(DirectoryEntryService);
  });

  // --------------------------------------------------------------------------
  // createEntry
  // --------------------------------------------------------------------------

  it("should create a directory entry", async () => {
    const dto = { name: "New Entry", code: "NE-001", data: { key: "val" } };

    await service.createEntry(
      mockDirectory as Directory,
      dto as any,
      orgId,
      userId,
    );

    expect(entryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        directoryId,
        organizationId: orgId,
        name: "New Entry",
        normalizedName: "new entry",
      }),
    );
    expect(auditService.createAuditEntry).toHaveBeenCalled();
  });

  it("should reject parentId on non-hierarchical directory", async () => {
    const flatDir = { ...mockDirectory, isHierarchical: false } as Directory;
    const dto = { name: "Child", parentId: "some-parent-id" };

    await expect(
      service.createEntry(flatDir, dto as any, orgId, userId),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw NotFoundException for missing parent entry", async () => {
    entryRepo.findOne.mockResolvedValue(null);
    const dto = { name: "Child", parentId: "nonexistent-parent" };

    await expect(
      service.createEntry(
        mockDirectory as Directory,
        dto as any,
        orgId,
        userId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  // --------------------------------------------------------------------------
  // findOneEntry
  // --------------------------------------------------------------------------

  it("should return an entry by id", async () => {
    entryRepo.findOne.mockResolvedValue(mockEntry);

    const result = await service.findOneEntry(directoryId, entryId, orgId);
    expect(result).toEqual(mockEntry);
  });

  it("should throw NotFoundException for wrong organization", async () => {
    entryRepo.findOne.mockResolvedValue({
      ...mockEntry,
      organizationId: "other-org",
    });

    await expect(
      service.findOneEntry(directoryId, entryId, orgId),
    ).rejects.toThrow(NotFoundException);
  });

  // --------------------------------------------------------------------------
  // updateEntry
  // --------------------------------------------------------------------------

  it("should update entry and increment version", async () => {
    entryRepo.findOne.mockResolvedValue({ ...mockEntry, version: 1 });

    const result = await service.updateEntry(
      mockDirectory as Directory,
      entryId,
      { name: "Updated Name" } as any,
      orgId,
      userId,
    );

    expect(result.version).toBe(2);
    expect(result.normalizedName).toBe("updated name");
    expect(auditService.createAuditEntry).toHaveBeenCalled();
  });

  it("should reject self-referencing parentId on update", async () => {
    entryRepo.findOne.mockResolvedValue({ ...mockEntry });

    await expect(
      service.updateEntry(
        mockDirectory as Directory,
        entryId,
        { parentId: entryId } as any,
        orgId,
        userId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // removeEntry
  // --------------------------------------------------------------------------

  it("should soft-delete an entry and record audit", async () => {
    entryRepo.findOne.mockResolvedValue(mockEntry);

    await service.removeEntry(directoryId, entryId, orgId, userId);

    expect(entryRepo.softDelete).toHaveBeenCalledWith(entryId);
    expect(auditService.createAuditEntry).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // moveEntry
  // --------------------------------------------------------------------------

  it("should reject move on non-hierarchical directory", async () => {
    const flatDir = { ...mockDirectory, isHierarchical: false } as Directory;

    await expect(
      service.moveEntry(flatDir, entryId, { newParentId: "x" } as any, orgId),
    ).rejects.toThrow(BadRequestException);
  });

  it("should reject moving entry to itself", async () => {
    entryRepo.findOne.mockResolvedValue(mockEntry);

    await expect(
      service.moveEntry(
        mockDirectory as Directory,
        entryId,
        { newParentId: entryId } as any,
        orgId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // inlineCreateEntry
  // --------------------------------------------------------------------------

  it("should reject inline create when directory setting disallows it", async () => {
    const restrictedDir = {
      ...mockDirectory,
      settings: { allow_inline_create: false },
    } as Directory;

    await expect(
      service.inlineCreateEntry(restrictedDir, { name: "Quick" } as any, orgId),
    ).rejects.toThrow(BadRequestException);
  });

  it("should create an entry via inline create with audit", async () => {
    const dir = {
      ...mockDirectory,
      settings: { allow_inline_create: true },
    } as Directory;

    await service.inlineCreateEntry(
      dir,
      { name: "Quick Entry" } as any,
      orgId,
      userId,
    );

    expect(entryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Quick Entry",
        normalizedName: "quick entry",
        origin: EntryOrigin.LOCAL,
      }),
    );
    expect(auditService.createAuditEntry).toHaveBeenCalled();
  });
});
