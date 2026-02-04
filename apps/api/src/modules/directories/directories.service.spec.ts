/**
 * DirectoriesService Unit Tests
 *
 * Comprehensive Jest unit tests for DirectoriesService.
 * Tests CRUD operations, sync, audit logging, hierarchy, and inline create.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { DirectoriesService } from './directories.service';
import {
  Directory,
  DirectoryField,
  DirectoryEntry,
  DirectoryScope,
  EntryStatus,
  EntryOrigin,
  DirectoryType,
  SourceType,
} from './entities/directory.entity';
import { DirectorySource } from './entities/directory-source.entity';
import { DirectorySyncLog, SyncLogStatus } from './entities/directory-sync-log.entity';
import { DirectoryEntryAudit, DirectoryAuditAction } from './entities/directory-entry-audit.entity';
import {
  CreateDirectorySourceDto,
  UpdateDirectorySourceDto,
  QueryDirectorySourcesDto,
} from './dto/directory-source.dto';
import { InlineCreateEntryDto, MoveEntryDto } from './dto/directory-hierarchy.dto';

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
});

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockOrganizationId = 'org-123';
const mockUserId = 'user-456';
const mockDirectoryId = 'dir-789';
const mockSourceId = 'src-abc';
const mockEntryId = 'entry-def';

const mockDirectory: Partial<Directory> = {
  id: mockDirectoryId,
  name: 'Test Directory',
  slug: 'test-directory',
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
  name: 'Test Source',
  sourceType: SourceType.URL,
  url: 'https://example.com/data',
  isActive: true,
  consecutiveFailures: 0,
};

const mockSyncLog: Partial<DirectorySyncLog> = {
  id: 'log-123',
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
  name: 'Test Entry',
  normalizedName: 'test entry',
  code: 'TEST',
  status: EntryStatus.ACTIVE,
  origin: EntryOrigin.LOCAL,
  version: 1,
  data: {},
  organizationId: mockOrganizationId,
  parentId: null,
};

const mockAudit: Partial<DirectoryEntryAudit> = {
  id: 'audit-123',
  entryId: mockEntryId,
  action: DirectoryAuditAction.CREATE,
  changedBy: mockUserId,
  changedAt: new Date(),
  oldValues: null,
  newValues: { name: 'Test Entry' },
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('DirectoriesService', () => {
  let service: DirectoriesService;
  let directoryRepository: jest.Mocked<Repository<Directory>>;
  let entryRepository: jest.Mocked<Repository<DirectoryEntry>>;
  let sourceRepository: jest.Mocked<Repository<DirectorySource>>;
  let syncLogRepository: jest.Mocked<Repository<DirectorySyncLog>>;
  let auditRepository: jest.Mocked<Repository<DirectoryEntryAudit>>;

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
          provide: getRepositoryToken(DirectoryEntry),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(DirectorySource),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(DirectorySyncLog),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(DirectoryEntryAudit),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<DirectoriesService>(DirectoriesService);
    directoryRepository = module.get(getRepositoryToken(Directory));
    entryRepository = module.get(getRepositoryToken(DirectoryEntry));
    sourceRepository = module.get(getRepositoryToken(DirectorySource));
    syncLogRepository = module.get(getRepositoryToken(DirectorySyncLog));
    auditRepository = module.get(getRepositoryToken(DirectoryEntryAudit));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // SOURCE CRUD
  // ==========================================================================

  describe('createSource', () => {
    it('should create a source for a valid directory', async () => {
      const dto: CreateDirectorySourceDto = {
        name: 'Test Source',
        sourceType: SourceType.URL,
        url: 'https://example.com/data',
        isActive: true,
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceRepository.create.mockReturnValue(mockSource as DirectorySource);
      sourceRepository.save.mockResolvedValue(mockSource as DirectorySource);

      const result = await service.createSource(mockDirectoryId, dto, mockOrganizationId);

      expect(directoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockDirectoryId },
        relations: ['fields'],
      });
      expect(sourceRepository.create).toHaveBeenCalledWith({
        ...dto,
        directoryId: mockDirectoryId,
      });
      expect(sourceRepository.save).toHaveBeenCalledWith(mockSource);
      expect(result).toEqual(mockSource);
    });

    it('should throw NotFoundException if directory does not exist', async () => {
      const dto: CreateDirectorySourceDto = {
        name: 'Test Source',
        sourceType: SourceType.URL,
      };

      directoryRepository.findOne.mockResolvedValue(null);

      await expect(service.createSource(mockDirectoryId, dto, mockOrganizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllSources', () => {
    it('should return paginated sources', async () => {
      const filters: QueryDirectorySourcesDto = {
        page: 1,
        limit: 50,
      };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getMany.mockResolvedValue([mockSource, mockSource]);

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAllSources(mockDirectoryId, mockOrganizationId, filters);

      expect(directoryRepository.findOne).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('s.directoryId = :directoryId', {
        directoryId: mockDirectoryId,
      });
      expect(result).toEqual({
        data: [mockSource, mockSource],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should filter by isActive when provided', async () => {
      const filters: QueryDirectorySourcesDto = {
        page: 1,
        limit: 50,
        isActive: true,
      };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockSource]);

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findAllSources(mockDirectoryId, mockOrganizationId, filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('s.isActive = :isActive', {
        isActive: true,
      });
    });
  });

  describe('findOneSource', () => {
    it('should return a source if found', async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceRepository.findOne.mockResolvedValue(mockSource as DirectorySource);

      const result = await service.findOneSource(mockDirectoryId, mockSourceId, mockOrganizationId);

      expect(sourceRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSourceId, directoryId: mockDirectoryId },
      });
      expect(result).toEqual(mockSource);
    });

    it('should throw NotFoundException if source not found', async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneSource(mockDirectoryId, mockSourceId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSource', () => {
    it('should update source fields', async () => {
      const dto: UpdateDirectorySourceDto = {
        name: 'Updated Source',
        isActive: false,
      };

      const updatedSource = { ...mockSource, ...dto };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceRepository.findOne.mockResolvedValue(mockSource as DirectorySource);
      sourceRepository.save.mockResolvedValue(updatedSource as DirectorySource);

      const result = await service.updateSource(
        mockDirectoryId,
        mockSourceId,
        dto,
        mockOrganizationId,
      );

      expect(sourceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Source',
          isActive: false,
        }),
      );
      expect(result).toEqual(updatedSource);
    });
  });

  describe('removeSource', () => {
    it('should hard delete a source', async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceRepository.findOne.mockResolvedValue(mockSource as DirectorySource);
      sourceRepository.remove.mockResolvedValue(mockSource as DirectorySource);

      await service.removeSource(mockDirectoryId, mockSourceId, mockOrganizationId);

      expect(sourceRepository.remove).toHaveBeenCalledWith(mockSource);
    });
  });

  // ==========================================================================
  // TRIGGER SYNC
  // ==========================================================================

  describe('triggerSync', () => {
    it('should create STARTED log and return sync log', async () => {
      const activeSource = { ...mockSource, isActive: true };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceRepository.findOne.mockResolvedValue(activeSource as DirectorySource);
      syncLogRepository.create.mockReturnValue(mockSyncLog as DirectorySyncLog);
      syncLogRepository.save.mockResolvedValue(mockSyncLog as DirectorySyncLog);

      // Mock fetchSourceData to return empty array (no external call)
      jest.spyOn(service as any, 'fetchSourceData').mockResolvedValue([]);

      const result = await service.triggerSync(
        mockDirectoryId,
        mockSourceId,
        mockOrganizationId,
        mockUserId,
      );

      expect(syncLogRepository.create).toHaveBeenCalledWith({
        directoryId: mockDirectoryId,
        sourceId: mockSourceId,
        status: SyncLogStatus.STARTED,
        triggeredBy: mockUserId,
      });
      expect(syncLogRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.status).toBe(SyncLogStatus.SUCCESS);
    });

    it('should throw BadRequestException if source is inactive', async () => {
      const inactiveSource = { ...mockSource, isActive: false };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      sourceRepository.findOne.mockResolvedValue(inactiveSource as DirectorySource);

      await expect(
        service.triggerSync(mockDirectoryId, mockSourceId, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // AUDIT LOGGING
  // ==========================================================================

  describe('createAuditEntry', () => {
    it('should create an audit record', async () => {
      auditRepository.create.mockReturnValue(mockAudit as DirectoryEntryAudit);
      auditRepository.save.mockResolvedValue(mockAudit as DirectoryEntryAudit);

      const result = await service.createAuditEntry(
        mockEntryId,
        DirectoryAuditAction.CREATE,
        mockUserId,
        null,
        { name: 'Test Entry' },
      );

      expect(auditRepository.create).toHaveBeenCalledWith({
        entryId: mockEntryId,
        action: DirectoryAuditAction.CREATE,
        changedBy: mockUserId,
        oldValues: null,
        newValues: { name: 'Test Entry' },
        changeReason: null,
      });
      expect(auditRepository.save).toHaveBeenCalledWith(mockAudit);
      expect(result).toEqual(mockAudit);
    });

    it('should accept optional changeReason', async () => {
      auditRepository.create.mockReturnValue(mockAudit as DirectoryEntryAudit);
      auditRepository.save.mockResolvedValue(mockAudit as DirectoryEntryAudit);

      await service.createAuditEntry(
        mockEntryId,
        DirectoryAuditAction.UPDATE,
        mockUserId,
        { name: 'Old' },
        { name: 'New' },
        'User requested change',
      );

      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changeReason: 'User requested change',
        }),
      );
    });
  });

  describe('findAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([mockAudit]);

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      auditRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAuditLogs(mockDirectoryId, mockOrganizationId, {
        page: 1,
        limit: 50,
      });

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'directory_entries',
        'e',
        'e.id = a.entryId',
      );
      expect(result).toEqual({
        data: [mockAudit],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });
  });

  describe('createEntry - audit logging', () => {
    it('should create audit record when creating entry', async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryRepository.create.mockReturnValue(mockEntry as DirectoryEntry);
      entryRepository.save.mockResolvedValue(mockEntry as DirectoryEntry);
      auditRepository.create.mockReturnValue(mockAudit as DirectoryEntryAudit);
      auditRepository.save.mockResolvedValue(mockAudit as DirectoryEntryAudit);

      await service.createEntry(
        mockDirectoryId,
        {
          name: 'Test Entry',
          code: 'TEST',
          status: EntryStatus.ACTIVE,
          data: {},
        },
        mockOrganizationId,
        mockUserId,
      );

      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entryId: mockEntryId,
          action: DirectoryAuditAction.CREATE,
          changedBy: mockUserId,
        }),
      );
      expect(auditRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateEntry - audit logging', () => {
    it('should capture old and new values when updating entry', async () => {
      const oldEntry = { ...mockEntry, name: 'Old Name', version: 1 };
      const updatedEntry = { ...mockEntry, name: 'New Name', version: 2 };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryRepository.findOne.mockResolvedValue(oldEntry as DirectoryEntry);
      entryRepository.save.mockResolvedValue(updatedEntry as DirectoryEntry);
      auditRepository.create.mockReturnValue(mockAudit as DirectoryEntryAudit);
      auditRepository.save.mockResolvedValue(mockAudit as DirectoryEntryAudit);

      await service.updateEntry(
        mockDirectoryId,
        mockEntryId,
        { name: 'New Name' },
        mockOrganizationId,
        mockUserId,
      );

      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entryId: mockEntryId,
          action: DirectoryAuditAction.UPDATE,
          changedBy: mockUserId,
          oldValues: { name: 'Old Name' },
          newValues: { name: 'New Name' },
        }),
      );
    });
  });

  // ==========================================================================
  // HIERARCHY
  // ==========================================================================

  describe('getHierarchyTree', () => {
    it('should build nested tree for hierarchical directory', async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };
      const rootEntry = { ...mockEntry, id: 'root-1', parentId: null, sortOrder: 1 };
      const childEntry = { ...mockEntry, id: 'child-1', parentId: 'root-1', sortOrder: 2 };

      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([rootEntry, childEntry]);

      directoryRepository.findOne.mockResolvedValue(hierarchicalDir as Directory);
      entryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getHierarchyTree(mockDirectoryId, mockOrganizationId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('root-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('child-1');
    });

    it('should throw BadRequestException for non-hierarchical directory', async () => {
      const nonHierarchicalDir = { ...mockDirectory, isHierarchical: false };

      directoryRepository.findOne.mockResolvedValue(nonHierarchicalDir as Directory);

      await expect(
        service.getHierarchyTree(mockDirectoryId, mockOrganizationId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveEntry', () => {
    it('should move entry to new parent', async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };
      const parentEntry = { ...mockEntry, id: 'parent-1' };
      const entryToMove = { ...mockEntry, id: 'move-1', parentId: null, version: 1 };
      const movedEntry = { ...entryToMove, parentId: 'parent-1', version: 2 };

      directoryRepository.findOne.mockResolvedValue(hierarchicalDir as Directory);
      entryRepository.findOne
        .mockResolvedValueOnce(entryToMove as DirectoryEntry)
        .mockResolvedValueOnce(parentEntry as DirectoryEntry);
      entryRepository.save.mockResolvedValue(movedEntry as DirectoryEntry);
      auditRepository.create.mockReturnValue(mockAudit as DirectoryEntryAudit);
      auditRepository.save.mockResolvedValue(mockAudit as DirectoryEntryAudit);

      const dto: MoveEntryDto = { newParentId: 'parent-1' };

      const result = await service.moveEntry(
        mockDirectoryId,
        'move-1',
        dto,
        mockOrganizationId,
        mockUserId,
      );

      expect(result.parentId).toBe('parent-1');
      expect(result.version).toBe(2);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: DirectoryAuditAction.UPDATE,
          oldValues: { parentId: null },
          newValues: { parentId: 'parent-1' },
          changeReason: 'Entry moved in hierarchy',
        }),
      );
    });

    it('should throw BadRequestException when entry is its own parent', async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };

      directoryRepository.findOne.mockResolvedValue(hierarchicalDir as Directory);
      entryRepository.findOne.mockResolvedValue(mockEntry as DirectoryEntry);

      const dto: MoveEntryDto = { newParentId: mockEntryId };

      await expect(
        service.moveEntry(mockDirectoryId, mockEntryId, dto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect and prevent cycles', async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };
      const entry1 = { ...mockEntry, id: 'entry-1', parentId: null };
      const entry2 = { ...mockEntry, id: 'entry-2', parentId: 'entry-1' };
      const entry3 = { ...mockEntry, id: 'entry-3', parentId: 'entry-2' };

      directoryRepository.findOne.mockResolvedValue(hierarchicalDir as Directory);
      entryRepository.findOne
        .mockResolvedValueOnce(entry1 as DirectoryEntry)
        .mockResolvedValueOnce(entry3 as DirectoryEntry)
        .mockResolvedValueOnce(entry2 as DirectoryEntry)
        .mockResolvedValueOnce(entry1 as DirectoryEntry);

      const dto: MoveEntryDto = { newParentId: 'entry-3' };

      await expect(
        service.moveEntry(mockDirectoryId, 'entry-1', dto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate parent exists', async () => {
      const hierarchicalDir = { ...mockDirectory, isHierarchical: true };

      directoryRepository.findOne.mockResolvedValue(hierarchicalDir as Directory);
      entryRepository.findOne
        .mockResolvedValueOnce(mockEntry as DirectoryEntry)
        .mockResolvedValueOnce(null);

      const dto: MoveEntryDto = { newParentId: 'non-existent' };

      await expect(
        service.moveEntry(mockDirectoryId, mockEntryId, dto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // INLINE CREATE
  // ==========================================================================

  describe('inlineCreateEntry', () => {
    it('should create entry with ACTIVE status when no approval required', async () => {
      const dir = {
        ...mockDirectory,
        settings: { allow_inline_create: true, approval_required: false },
      };

      const newEntry = {
        ...mockEntry,
        name: 'New Entry',
        status: EntryStatus.ACTIVE,
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);
      entryRepository.create.mockReturnValue(newEntry as DirectoryEntry);
      entryRepository.save.mockResolvedValue(newEntry as DirectoryEntry);
      auditRepository.create.mockReturnValue(mockAudit as DirectoryEntryAudit);
      auditRepository.save.mockResolvedValue(mockAudit as DirectoryEntryAudit);

      const dto: InlineCreateEntryDto = {
        name: 'New Entry',
        code: 'NEW',
      };

      const result = await service.inlineCreateEntry(
        mockDirectoryId,
        dto,
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe(EntryStatus.ACTIVE);
      expect(result.origin).toBe(EntryOrigin.LOCAL);
    });

    it('should create entry with PENDING_APPROVAL status when approval required', async () => {
      const dir = {
        ...mockDirectory,
        settings: { allow_inline_create: true, approval_required: true },
      };

      const newEntry = {
        ...mockEntry,
        name: 'New Entry',
        status: EntryStatus.PENDING_APPROVAL,
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);
      entryRepository.create.mockReturnValue(newEntry as DirectoryEntry);
      entryRepository.save.mockResolvedValue(newEntry as DirectoryEntry);
      auditRepository.create.mockReturnValue(mockAudit as DirectoryEntryAudit);
      auditRepository.save.mockResolvedValue(mockAudit as DirectoryEntryAudit);

      const dto: InlineCreateEntryDto = {
        name: 'New Entry',
      };

      const result = await service.inlineCreateEntry(
        mockDirectoryId,
        dto,
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe(EntryStatus.PENDING_APPROVAL);
    });

    it('should throw BadRequestException if allow_inline_create is false', async () => {
      const dir = {
        ...mockDirectory,
        settings: { allow_inline_create: false },
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);

      const dto: InlineCreateEntryDto = {
        name: 'New Entry',
      };

      await expect(
        service.inlineCreateEntry(mockDirectoryId, dto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate parentId for hierarchical directories', async () => {
      const dir = {
        ...mockDirectory,
        isHierarchical: true,
        settings: { allow_inline_create: true },
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);
      entryRepository.findOne.mockResolvedValue(null);

      const dto: InlineCreateEntryDto = {
        name: 'New Entry',
        parentId: 'non-existent',
      };

      await expect(
        service.inlineCreateEntry(mockDirectoryId, dto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when parentId provided for non-hierarchical directory', async () => {
      const dir = {
        ...mockDirectory,
        isHierarchical: false,
        settings: { allow_inline_create: true },
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);

      const dto: InlineCreateEntryDto = {
        name: 'New Entry',
        parentId: 'some-parent',
      };

      await expect(
        service.inlineCreateEntry(mockDirectoryId, dto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // ADDITIONAL COVERAGE
  // ==========================================================================

  describe('findOne (Directory)', () => {
    it('should return directory with sorted fields', async () => {
      const field1 = { id: 'f1', sortOrder: 2 } as DirectoryField;
      const field2 = { id: 'f2', sortOrder: 1 } as DirectoryField;
      const dirWithFields = {
        ...mockDirectory,
        fields: [field1, field2],
      };

      directoryRepository.findOne.mockResolvedValue(dirWithFields as Directory);

      const result = await service.findOne(mockDirectoryId, mockOrganizationId);

      expect(result.fields[0].sortOrder).toBe(1);
      expect(result.fields[1].sortOrder).toBe(2);
    });

    it('should throw NotFoundException for wrong organization', async () => {
      const dir = {
        ...mockDirectory,
        scope: DirectoryScope.ORGANIZATION,
        organizationId: 'other-org',
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);

      await expect(service.findOne(mockDirectoryId, mockOrganizationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow access to HQ-scoped directories from any org', async () => {
      const dir = {
        ...mockDirectory,
        scope: DirectoryScope.HQ,
        organizationId: 'hq-org',
      };

      directoryRepository.findOne.mockResolvedValue(dir as Directory);

      const result = await service.findOne(mockDirectoryId, mockOrganizationId);

      expect(result).toBeDefined();
      expect(result.scope).toBe(DirectoryScope.HQ);
    });
  });

  describe('findOneEntry', () => {
    it('should return entry with relations', async () => {
      const entryWithRelations = {
        ...mockEntry,
        parent: null,
        children: [],
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryRepository.findOne.mockResolvedValue(entryWithRelations as DirectoryEntry);

      const result = await service.findOneEntry(mockDirectoryId, mockEntryId, mockOrganizationId);

      expect(entryRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEntryId, directoryId: mockDirectoryId },
        relations: ['parent', 'children'],
      });
      expect(result).toEqual(entryWithRelations);
    });

    it('should throw NotFoundException for wrong organization', async () => {
      const entry = {
        ...mockEntry,
        organizationId: 'other-org',
      };

      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryRepository.findOne.mockResolvedValue(entry as DirectoryEntry);

      await expect(
        service.findOneEntry(mockDirectoryId, mockEntryId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeEntry', () => {
    it('should soft delete entry and create audit record', async () => {
      directoryRepository.findOne.mockResolvedValue(mockDirectory as Directory);
      entryRepository.findOne.mockResolvedValue(mockEntry as DirectoryEntry);
      entryRepository.softDelete.mockResolvedValue({ affected: 1 } as any);
      auditRepository.create.mockReturnValue(mockAudit as DirectoryEntryAudit);
      auditRepository.save.mockResolvedValue(mockAudit as DirectoryEntryAudit);

      await service.removeEntry(mockDirectoryId, mockEntryId, mockOrganizationId, mockUserId);

      expect(entryRepository.softDelete).toHaveBeenCalledWith(mockEntryId);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entryId: mockEntryId,
          action: DirectoryAuditAction.ARCHIVE,
          changedBy: mockUserId,
        }),
      );
    });
  });
});
