/**
 * DirectoriesService Unit Tests
 *
 * Comprehensive Jest unit tests for DirectoriesService.
 * Tests CRUD operations, sync, audit logging, hierarchy, and inline create.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";

import { DirectoriesService } from "./directories.service";
import { DirectoryEntryService } from "./services/directory-entry.service";
import { DirectorySourceService } from "./services/directory-source.service";
import { DirectoryAuditService } from "./services/directory-audit.service";
import {
  Directory,
  DirectoryField,
  DirectoryEntry,
  DirectoryScope,
  EntryStatus,
  EntryOrigin,
  DirectoryType,
  SourceType,
} from "./entities/directory.entity";
import { DirectorySource } from "./entities/directory-source.entity";
import {
  DirectorySyncLog,
  SyncLogStatus,
} from "./entities/directory-sync-log.entity";
import {
  DirectoryEntryAudit,
  DirectoryAuditAction,
} from "./entities/directory-entry-audit.entity";
import {
  CreateDirectorySourceDto,
  UpdateDirectorySourceDto,
  QueryDirectorySourcesDto,
} from "./dto/directory-source.dto";
import {
  InlineCreateEntryDto,
  MoveEntryDto,
} from "./dto/directory-hierarchy.dto";

// ============================================================================
// MOCK HELPERS
// ============================================================================

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  withDeleted: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
});

const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  softDelete: jest.fn(),
  remove: jest.fn(),
  softRemove: jest.fn(),
});

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockOrganizationId = "org-123";
const mockUserId = "user-456";
const mockDirectoryId = "dir-789";
const mockSourceId = "src-abc";
const mockEntryId = "entry-def";

const mockDirectory: Partial<Directory> = {
  id: mockDirectoryId,
  name: "Test Directory",
  slug: "test-directory",
  type: DirectoryType.MANUAL,
  scope: DirectoryScope.ORGANIZATION,
  organizationId: mockOrganizationId,
  isHierarchical: false,
  isSystem: false,
  settings: {
    allow_inline_create: true,
    approval_required: false,
  },
  fields: [],
};

const mockSource: Partial<DirectorySource> = {
  id: mockSourceId,
  directoryId: mockDirectoryId,
  name: "Test Source",
  sourceType: SourceType.URL,
  url: "https://example.com/data",
  isActive: true,
  consecutiveFailures: 0,
};

const mockSyncLog: Partial<DirectorySyncLog> = {
  id: "log-123",
  directoryId: mockDirectoryId,
  sourceId: mockSourceId,
  status: SyncLogStatus.STARTED,
  startedAt: new Date(),
  totalRecords: 0,
  createdCount: 0,
  updatedCount: 0,
  errorCount: 0,
};

const mockEntry: Partial<DirectoryEntry> = {
  id: mockEntryId,
  directoryId: mockDirectoryId,
  name: "Test Entry",
  normalizedName: "test entry",
  code: "TEST",
  status: EntryStatus.ACTIVE,
  origin: EntryOrigin.LOCAL,
  version: 1,
  data: {},
  organizationId: mockOrganizationId,
  parentId: null,
};

const mockAudit: Partial<DirectoryEntryAudit> = {
  id: "audit-123",
  entryId: mockEntryId,
  action: DirectoryAuditAction.CREATE,
  changedBy: mockUserId,
  changedAt: new Date(),
  oldValues: null,
  newValues: { name: "Test Entry" },
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe("DirectoriesService", () => {
  let service: DirectoriesService;
  let directoryRepository: jest.Mocked<Repository<Directory>>;
  let entryService: jest.Mocked<DirectoryEntryService>;
  let sourceService: jest.Mocked<DirectorySourceService>;
  let auditService: jest.Mocked<DirectoryAuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectoriesService,
        {
          provide: getRepositoryToken(Directory),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(DirectoryField),
          useValue: createMockRepository(),
        },
        {
          provide: DirectoryEntryService,
          useValue: {
            createEntry: jest.fn(),
            findAllEntries: jest.fn(),
            findOneEntry: jest.fn(),
            updateEntry: jest.fn(),
            removeEntry: jest.fn(),
            searchEntries: jest.fn(),
            getHierarchyTree: jest.fn(),
            moveEntry: jest.fn(),
            inlineCreateEntry: jest.fn(),
          },
        },
        {
          provide: DirectorySourceService,
          useValue: {
            createSource: jest.fn(),
            findAllSources: jest.fn(),
            findOneSource: jest.fn(),
            updateSource: jest.fn(),
            removeSource: jest.fn(),
            triggerSync: jest.fn(),
            findSyncLogs: jest.fn(),
          },
        },
        {
          provide: DirectoryAuditService,
          useValue: {
            createAuditEntry: jest.fn(),
            findAuditLogs: jest.fn(),
            findEntryAuditLogs: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DirectoriesService>(DirectoriesService);
    directoryRepository = module.get(getRepositoryToken(Directory));
    entryService = module.get(
      DirectoryEntryService,
    ) as jest.Mocked<DirectoryEntryService>;
    sourceService = module.get(
      DirectorySourceService,
    ) as jest.Mocked<DirectorySourceService>;
    auditService = module.get(
      DirectoryAuditService,
    ) as jest.Mocked<DirectoryAuditService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // SOURCE CRUD (delegated to DirectorySourceService)
  // ==========================================================================

  describe("createSource", () => {
    it("should create a source for a valid directory", async () => {
      const dto: CreateDirectorySourceDto = {
        name: "Test Source",
        sourceType: SourceType.URL,
        url: "https://example.com/data",
        isActive: true,
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceService.createSource.mockResolvedValue(
        mockSource as DirectorySource,
      );

      const result = await service.createSource(
        mockDirectoryId,
        dto,
        mockOrganizationId,
      );

      expect(directoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockDirectoryId },
        relations: ["fields"],
      });
      expect(sourceService.createSource).toHaveBeenCalledWith(
        mockDirectoryId,
        dto,
      );
      expect(result).toEqual(mockSource);
    });

    it("should throw NotFoundException if directory does not exist", async () => {
      const dto: CreateDirectorySourceDto = {
        name: "Test Source",
        sourceType: SourceType.URL,
      };

      directoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createSource(mockDirectoryId, dto, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAllSources", () => {
    it("should return paginated sources", async () => {
      const filters: QueryDirectorySourcesDto = {
        page: 1,
        limit: 50,
      };

      const expectedResult = {
        data: [mockSource, mockSource],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceService.findAllSources.mockResolvedValue(expectedResult as any);

      const result = await service.findAllSources(
        mockDirectoryId,
        mockOrganizationId,
        filters,
      );

      expect(directoryRepository.findOne).toHaveBeenCalled();
      expect(sourceService.findAllSources).toHaveBeenCalledWith(
        mockDirectoryId,
        filters,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe("findOneSource", () => {
    it("should return a source if found", async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceService.findOneSource.mockResolvedValue(
        mockSource as DirectorySource,
      );

      const result = await service.findOneSource(
        mockDirectoryId,
        mockSourceId,
        mockOrganizationId,
      );

      expect(sourceService.findOneSource).toHaveBeenCalledWith(
        mockDirectoryId,
        mockSourceId,
      );
      expect(result).toEqual(mockSource);
    });

    it("should throw NotFoundException if source not found", async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceService.findOneSource.mockRejectedValue(
        new NotFoundException(`Source with ID ${mockSourceId} not found`),
      );

      await expect(
        service.findOneSource(
          mockDirectoryId,
          mockSourceId,
          mockOrganizationId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateSource", () => {
    it("should update source fields", async () => {
      const dto: UpdateDirectorySourceDto = {
        name: "Updated Source",
        isActive: false,
      };

      const updatedSource = { ...mockSource, ...dto };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceService.updateSource.mockResolvedValue(
        updatedSource as DirectorySource,
      );

      const result = await service.updateSource(
        mockDirectoryId,
        mockSourceId,
        dto,
        mockOrganizationId,
      );

      expect(sourceService.updateSource).toHaveBeenCalledWith(
        mockDirectoryId,
        mockSourceId,
        dto,
      );
      expect(result).toEqual(updatedSource);
    });
  });

  describe("removeSource", () => {
    it("should delete a source", async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceService.removeSource.mockResolvedValue(undefined);

      await service.removeSource(
        mockDirectoryId,
        mockSourceId,
        mockOrganizationId,
      );

      expect(sourceService.removeSource).toHaveBeenCalledWith(
        mockDirectoryId,
        mockSourceId,
      );
    });
  });

  // ==========================================================================
  // TRIGGER SYNC
  // ==========================================================================

  describe("triggerSync", () => {
    it("should delegate to sourceService.triggerSync", async () => {
      const completedLog = {
        ...mockSyncLog,
        status: SyncLogStatus.SUCCESS,
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceService.triggerSync.mockResolvedValue(
        completedLog as DirectorySyncLog,
      );

      const result = await service.triggerSync(
        mockDirectoryId,
        mockSourceId,
        mockOrganizationId,
        mockUserId,
      );

      expect(sourceService.triggerSync).toHaveBeenCalledWith(
        mockDirectoryId,
        mockSourceId,
        mockOrganizationId,
        mockUserId,
        undefined,
      );
      expect(result).toBeDefined();
      expect(result.status).toBe(SyncLogStatus.SUCCESS);
    });

    it("should throw BadRequestException if source is inactive", async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceService.triggerSync.mockRejectedValue(
        new BadRequestException("Cannot sync from an inactive source"),
      );

      await expect(
        service.triggerSync(
          mockDirectoryId,
          mockSourceId,
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // AUDIT LOGGING
  // ==========================================================================

  describe("createAuditEntry", () => {
    it("should delegate to auditService.createAuditEntry", async () => {
      auditService.createAuditEntry.mockResolvedValue(
        mockAudit as DirectoryEntryAudit,
      );

      const result = await service.createAuditEntry(
        mockEntryId,
        DirectoryAuditAction.CREATE,
        mockUserId,
        null,
        { name: "Test Entry" },
      );

      expect(auditService.createAuditEntry).toHaveBeenCalledWith(
        mockEntryId,
        DirectoryAuditAction.CREATE,
        mockUserId,
        null,
        { name: "Test Entry" },
        undefined,
      );
      expect(result).toEqual(mockAudit);
    });

    it("should accept optional changeReason", async () => {
      auditService.createAuditEntry.mockResolvedValue(
        mockAudit as DirectoryEntryAudit,
      );

      await service.createAuditEntry(
        mockEntryId,
        DirectoryAuditAction.UPDATE,
        mockUserId,
        { name: "Old" },
        { name: "New" },
        "User requested change",
      );

      expect(auditService.createAuditEntry).toHaveBeenCalledWith(
        mockEntryId,
        DirectoryAuditAction.UPDATE,
        mockUserId,
        { name: "Old" },
        { name: "New" },
        "User requested change",
      );
    });
  });

  describe("findAuditLogs", () => {
    it("should return paginated audit logs", async () => {
      const expectedResult = {
        data: [mockAudit],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      auditService.findAuditLogs.mockResolvedValue(expectedResult as any);

      const result = await service.findAuditLogs(
        mockDirectoryId,
        mockOrganizationId,
        {
          page: 1,
          limit: 50,
        },
      );

      expect(auditService.findAuditLogs).toHaveBeenCalledWith(
        mockDirectoryId,
        mockOrganizationId,
        { page: 1, limit: 50 },
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe("createEntry - audit logging", () => {
    it("should delegate to entryService.createEntry", async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryService.createEntry.mockResolvedValue(mockEntry as DirectoryEntry);

      await service.createEntry(
        mockDirectoryId,
        {
          name: "Test Entry",
          code: "TEST",
          status: EntryStatus.ACTIVE,
          data: {},
        },
        mockOrganizationId,
        mockUserId,
      );

      expect(entryService.createEntry).toHaveBeenCalledWith(
        mockDirectory,
        {
          name: "Test Entry",
          code: "TEST",
          status: EntryStatus.ACTIVE,
          data: {},
        },
        mockOrganizationId,
        mockUserId,
      );
    });
  });

  describe("updateEntry - audit logging", () => {
    it("should delegate to entryService.updateEntry", async () => {
      const updatedEntry = { ...mockEntry, name: "New Name", version: 2 };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryService.updateEntry.mockResolvedValue(
        updatedEntry as DirectoryEntry,
      );

      await service.updateEntry(
        mockDirectoryId,
        mockEntryId,
        { name: "New Name" },
        mockOrganizationId,
        mockUserId,
      );

      expect(entryService.updateEntry).toHaveBeenCalledWith(
        mockDirectory,
        mockEntryId,
        { name: "New Name" },
        mockOrganizationId,
        mockUserId,
      );
    });
  });

  // ==========================================================================
  // HIERARCHY
  // ==========================================================================

  describe("getHierarchyTree", () => {
    it("should delegate to entryService.getHierarchyTree", async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };
      const mockTree = [
        {
          id: "root-1",
          name: "Root",
          code: null,
          parentId: null,
          sortOrder: 1,
          data: {},
          children: [
            {
              id: "child-1",
              name: "Child",
              code: null,
              parentId: "root-1",
              sortOrder: 2,
              data: {},
              children: [],
            },
          ],
        },
      ];

      directoryRepository.findOne.mockResolvedValue(
        hierarchicalDir as Directory,
      );
      entryService.getHierarchyTree.mockResolvedValue(mockTree);

      const result = await service.getHierarchyTree(
        mockDirectoryId,
        mockOrganizationId,
      );

      expect(entryService.getHierarchyTree).toHaveBeenCalledWith(
        hierarchicalDir,
        mockOrganizationId,
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("root-1");
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe("child-1");
    });

    it("should throw BadRequestException for non-hierarchical directory", async () => {
      const nonHierarchicalDir = { ...mockDirectory, isHierarchical: false };

      directoryRepository.findOne.mockResolvedValue(
        nonHierarchicalDir as Directory,
      );
      entryService.getHierarchyTree.mockRejectedValue(
        new BadRequestException("Directory is not hierarchical"),
      );

      await expect(
        service.getHierarchyTree(mockDirectoryId, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("moveEntry", () => {
    it("should delegate to entryService.moveEntry", async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };
      const movedEntry = { ...mockEntry, parentId: "parent-1", version: 2 };

      directoryRepository.findOne.mockResolvedValue(
        hierarchicalDir as Directory,
      );
      entryService.moveEntry.mockResolvedValue(movedEntry as DirectoryEntry);

      const dto: MoveEntryDto = { newParentId: "parent-1" };

      const result = await service.moveEntry(
        mockDirectoryId,
        "move-1",
        dto,
        mockOrganizationId,
        mockUserId,
      );

      expect(entryService.moveEntry).toHaveBeenCalledWith(
        hierarchicalDir,
        "move-1",
        dto,
        mockOrganizationId,
        mockUserId,
      );
      expect(result.parentId).toBe("parent-1");
      expect(result.version).toBe(2);
    });

    it("should throw BadRequestException when entry is its own parent", async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };

      directoryRepository.findOne.mockResolvedValue(
        hierarchicalDir as Directory,
      );
      entryService.moveEntry.mockRejectedValue(
        new BadRequestException("Entry cannot be its own parent"),
      );

      const dto: MoveEntryDto = { newParentId: mockEntryId };

      await expect(
        service.moveEntry(
          mockDirectoryId,
          mockEntryId,
          dto,
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should detect and prevent cycles", async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };

      directoryRepository.findOne.mockResolvedValue(
        hierarchicalDir as Directory,
      );
      entryService.moveEntry.mockRejectedValue(
        new BadRequestException(
          "Moving this entry would create a cycle in the hierarchy",
        ),
      );

      const dto: MoveEntryDto = { newParentId: "entry-3" };

      await expect(
        service.moveEntry(
          mockDirectoryId,
          "entry-1",
          dto,
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should validate parent exists", async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };

      directoryRepository.findOne.mockResolvedValue(
        hierarchicalDir as Directory,
      );
      entryService.moveEntry.mockRejectedValue(
        new NotFoundException(
          `Parent entry with ID non-existent not found in this directory`,
        ),
      );

      const dto: MoveEntryDto = { newParentId: "non-existent" };

      await expect(
        service.moveEntry(
          mockDirectoryId,
          mockEntryId,
          dto,
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // INLINE CREATE
  // ==========================================================================

  describe("inlineCreateEntry", () => {
    it("should create entry with ACTIVE status when no approval required", async () => {
      const dir = {
        ...mockDirectory,
        settings: { allow_inline_create: true, approval_required: false },
      };

      const newEntry = {
        ...mockEntry,
        name: "New Entry",
        status: EntryStatus.ACTIVE,
        origin: EntryOrigin.LOCAL,
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);
      entryService.inlineCreateEntry.mockResolvedValue(
        newEntry as DirectoryEntry,
      );

      const dto: InlineCreateEntryDto = {
        name: "New Entry",
        code: "NEW",
      };

      const result = await service.inlineCreateEntry(
        mockDirectoryId,
        dto,
        mockOrganizationId,
        mockUserId,
      );

      expect(entryService.inlineCreateEntry).toHaveBeenCalledWith(
        dir,
        dto,
        mockOrganizationId,
        mockUserId,
      );
      expect(result.status).toBe(EntryStatus.ACTIVE);
      expect(result.origin).toBe(EntryOrigin.LOCAL);
    });

    it("should create entry with PENDING_APPROVAL status when approval required", async () => {
      const dir = {
        ...mockDirectory,
        settings: { allow_inline_create: true, approval_required: true },
      };

      const newEntry = {
        ...mockEntry,
        name: "New Entry",
        status: EntryStatus.PENDING_APPROVAL,
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);
      entryService.inlineCreateEntry.mockResolvedValue(
        newEntry as DirectoryEntry,
      );

      const dto: InlineCreateEntryDto = {
        name: "New Entry",
      };

      const result = await service.inlineCreateEntry(
        mockDirectoryId,
        dto,
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe(EntryStatus.PENDING_APPROVAL);
    });

    it("should throw BadRequestException if allow_inline_create is false", async () => {
      const dir = {
        ...mockDirectory,
        settings: { allow_inline_create: false },
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);
      entryService.inlineCreateEntry.mockRejectedValue(
        new BadRequestException(
          "Inline create is not allowed for this directory",
        ),
      );

      const dto: InlineCreateEntryDto = {
        name: "New Entry",
      };

      await expect(
        service.inlineCreateEntry(
          mockDirectoryId,
          dto,
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should validate parentId for hierarchical directories", async () => {
      const dir = {
        ...mockDirectory,
        isHierarchical: true,
        settings: { allow_inline_create: true },
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);
      entryService.inlineCreateEntry.mockRejectedValue(
        new NotFoundException(`Parent entry with ID non-existent not found`),
      );

      const dto: InlineCreateEntryDto = {
        name: "New Entry",
        parentId: "non-existent",
      };

      await expect(
        service.inlineCreateEntry(
          mockDirectoryId,
          dto,
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when parentId provided for non-hierarchical directory", async () => {
      const dir = {
        ...mockDirectory,
        isHierarchical: false,
        settings: { allow_inline_create: true },
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);
      entryService.inlineCreateEntry.mockRejectedValue(
        new BadRequestException(
          "Cannot set parentId on a non-hierarchical directory",
        ),
      );

      const dto: InlineCreateEntryDto = {
        name: "New Entry",
        parentId: "some-parent",
      };

      await expect(
        service.inlineCreateEntry(
          mockDirectoryId,
          dto,
          mockOrganizationId,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // ADDITIONAL COVERAGE
  // ==========================================================================

  describe("findOne (Directory)", () => {
    it("should return directory with sorted fields", async () => {
      const field1 = { id: "f1", sortOrder: 2 } as DirectoryField;
      const field2 = { id: "f2", sortOrder: 1 } as DirectoryField;
      const dirWithFields = {
        ...mockDirectory,
        fields: [field1, field2],
      };

      directoryRepository.findOne.mockResolvedValue(dirWithFields as Directory);

      const result = await service.findOne(mockDirectoryId, mockOrganizationId);

      expect(result.fields[0].sortOrder).toBe(1);
      expect(result.fields[1].sortOrder).toBe(2);
    });

    it("should throw NotFoundException for wrong organization", async () => {
      const dir = {
        ...mockDirectory,
        scope: DirectoryScope.ORGANIZATION,
        organizationId: "other-org",
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);

      await expect(
        service.findOne(mockDirectoryId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should allow access to HQ-scoped directories from any org", async () => {
      const dir = {
        ...mockDirectory,
        scope: DirectoryScope.HQ,
        organizationId: "hq-org",
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);

      const result = await service.findOne(mockDirectoryId, mockOrganizationId);

      expect(result).toBeDefined();
      expect(result.scope).toBe(DirectoryScope.HQ);
    });
  });

  describe("findOneEntry", () => {
    it("should delegate to entryService.findOneEntry", async () => {
      const entryWithRelations = {
        ...mockEntry,
        parent: null,
        children: [],
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryService.findOneEntry.mockResolvedValue(
        entryWithRelations as DirectoryEntry,
      );

      const result = await service.findOneEntry(
        mockDirectoryId,
        mockEntryId,
        mockOrganizationId,
      );

      expect(entryService.findOneEntry).toHaveBeenCalledWith(
        mockDirectoryId,
        mockEntryId,
        mockOrganizationId,
      );
      expect(result).toEqual(entryWithRelations);
    });

    it("should throw NotFoundException for wrong organization", async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryService.findOneEntry.mockRejectedValue(
        new NotFoundException(`Entry with ID ${mockEntryId} not found`),
      );

      await expect(
        service.findOneEntry(mockDirectoryId, mockEntryId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeEntry", () => {
    it("should delegate to entryService.removeEntry", async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryService.removeEntry.mockResolvedValue(undefined);

      await service.removeEntry(
        mockDirectoryId,
        mockEntryId,
        mockOrganizationId,
        mockUserId,
      );

      expect(entryService.removeEntry).toHaveBeenCalledWith(
        mockDirectoryId,
        mockEntryId,
        mockOrganizationId,
        mockUserId,
      );
    });
  });
});
