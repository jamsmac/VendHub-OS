/**
 * Directories Service for VendHub OS
 *
 * CRUD operations for directories, fields, entries, sources, sync logs, and audit.
 * Implements EAV (Entity-Attribute-Value) pattern for flexible reference data.
 * All queries filter by organizationId for multi-tenancy.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import {
  Directory,
  DirectoryField,
  DirectoryEntry,
  DirectoryScope,
  EntryStatus,
  EntryOrigin,
} from './entities/directory.entity';
import { DirectorySource, SyncStatus } from './entities/directory-source.entity';
import { DirectorySyncLog, SyncLogStatus } from './entities/directory-sync-log.entity';
import { DirectoryEntryAudit, DirectoryAuditAction } from './entities/directory-entry-audit.entity';
import {
  CreateDirectoryDto,
  UpdateDirectoryDto,
  CreateDirectoryFieldDto,
  UpdateDirectoryFieldDto,
  CreateDirectoryEntryDto,
  UpdateDirectoryEntryDto,
  QueryDirectoriesDto,
  QueryEntriesDto,
} from './dto/directory.dto';
import {
  CreateDirectorySourceDto,
  UpdateDirectorySourceDto,
  QueryDirectorySourcesDto,
} from './dto/directory-source.dto';
import { QuerySyncLogsDto } from './dto/directory-sync.dto';
import { QueryAuditLogsDto } from './dto/directory-audit.dto';
import { MoveEntryDto, InlineCreateEntryDto } from './dto/directory-hierarchy.dto';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HierarchyNode {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  sortOrder: number;
  data: Record<string, unknown>;
  children: HierarchyNode[];
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class DirectoriesService {
  constructor(
    @InjectRepository(Directory)
    private readonly directoryRepository: Repository<Directory>,

    @InjectRepository(DirectoryField)
    private readonly fieldRepository: Repository<DirectoryField>,

    @InjectRepository(DirectoryEntry)
    private readonly entryRepository: Repository<DirectoryEntry>,

    @InjectRepository(DirectorySource)
    private readonly sourceRepository: Repository<DirectorySource>,

    @InjectRepository(DirectorySyncLog)
    private readonly syncLogRepository: Repository<DirectorySyncLog>,

    @InjectRepository(DirectoryEntryAudit)
    private readonly auditRepository: Repository<DirectoryEntryAudit>,
  ) {}

  // ==========================================================================
  // DIRECTORY CRUD
  // ==========================================================================

  /**
   * Create a new directory.
   * Slug must be unique among active (non-deleted) directories.
   */
  async create(
    dto: CreateDirectoryDto,
    organizationId: string,
    userId?: string,
  ): Promise<Directory> {
    // Check slug uniqueness
    const existing = await this.directoryRepository
      .createQueryBuilder('d')
      .where('d.slug = :slug', { slug: dto.slug })
      .withDeleted()
      .andWhere('d.deleted_at IS NULL')
      .getOne();

    if (existing) {
      throw new ConflictException(`Directory with slug "${dto.slug}" already exists`);
    }

    const directory = this.directoryRepository.create({
      ...dto,
      organizationId,
      scope: dto.scope ?? DirectoryScope.HQ,
      created_by_id: userId ?? null,
    });

    return this.directoryRepository.save(directory);
  }

  /**
   * List directories (paginated) with optional filters.
   * HQ-scoped directories are visible to all organizations.
   * ORGANIZATION-scoped directories are only visible to that organization.
   */
  async findAll(
    organizationId: string,
    filters?: QueryDirectoriesDto,
  ): Promise<PaginatedResult<Directory>> {
    const { page = 1, limit: rawLimit = 50, type, scope, search, includeSystem } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.directoryRepository
      .createQueryBuilder('d')
      .where(
        new Brackets((qb) => {
          qb.where('d.scope = :hqScope', { hqScope: DirectoryScope.HQ })
            .orWhere('d.organizationId = :organizationId', { organizationId });
        }),
      );

    if (type) {
      query.andWhere('d.type = :type', { type });
    }

    if (scope) {
      query.andWhere('d.scope = :scope', { scope });
    }

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('d.name ILIKE :search', { search: `%${search}%` })
            .orWhere('d.slug ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (includeSystem === false) {
      query.andWhere('d.isSystem = false');
    }

    const total = await query.getCount();

    query.orderBy('d.name', 'ASC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single directory by ID, including its field definitions.
   */
  async findOne(id: string, organizationId: string): Promise<Directory> {
    const directory = await this.directoryRepository.findOne({
      where: { id },
      relations: ['fields'],
    });

    if (!directory) {
      throw new NotFoundException(`Directory with ID ${id} not found`);
    }

    // Verify access: HQ directories are visible to everyone,
    // ORGANIZATION-scoped must match the user's org
    if (
      directory.scope !== DirectoryScope.HQ &&
      directory.organizationId !== organizationId
    ) {
      throw new NotFoundException(`Directory with ID ${id} not found`);
    }

    // Sort fields by sortOrder
    if (directory.fields) {
      directory.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return directory;
  }

  /**
   * Find directory by slug.
   */
  async findBySlug(slug: string, organizationId: string): Promise<Directory> {
    const directory = await this.directoryRepository.findOne({
      where: { slug },
      relations: ['fields'],
    });

    if (!directory) {
      throw new NotFoundException(`Directory with slug "${slug}" not found`);
    }

    if (
      directory.scope !== DirectoryScope.HQ &&
      directory.organizationId !== organizationId
    ) {
      throw new NotFoundException(`Directory with slug "${slug}" not found`);
    }

    if (directory.fields) {
      directory.fields.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return directory;
  }

  /**
   * Update a directory.
   * System directories cannot change slug or type.
   */
  async update(
    id: string,
    dto: UpdateDirectoryDto,
    organizationId: string,
    userId?: string,
  ): Promise<Directory> {
    const directory = await this.findOne(id, organizationId);

    if (directory.isSystem && directory.scope === DirectoryScope.HQ && directory.organizationId !== organizationId) {
      throw new BadRequestException('Cannot modify HQ system directories from organization scope');
    }

    Object.assign(directory, {
      ...dto,
      updated_by_id: userId ?? null,
    });

    return this.directoryRepository.save(directory);
  }

  /**
   * Soft delete a directory.
   * System directories cannot be deleted.
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const directory = await this.findOne(id, organizationId);

    if (directory.isSystem) {
      throw new BadRequestException('System directories cannot be deleted');
    }

    await this.directoryRepository.softDelete(id);
  }

  // ==========================================================================
  // FIELD CRUD
  // ==========================================================================

  /**
   * Add a field definition to a directory.
   * Field name must be unique within the directory.
   */
  async addField(
    directoryId: string,
    dto: CreateDirectoryFieldDto,
    organizationId: string,
  ): Promise<DirectoryField> {
    // Verify directory exists and user has access
    await this.findOne(directoryId, organizationId);

    // Check field name uniqueness within directory
    const existing = await this.fieldRepository.findOne({
      where: { directoryId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Field "${dto.name}" already exists in this directory`,
      );
    }

    const field = this.fieldRepository.create({
      ...dto,
      directoryId,
    });

    return this.fieldRepository.save(field);
  }

  /**
   * Update a field definition.
   */
  async updateField(
    directoryId: string,
    fieldId: string,
    dto: UpdateDirectoryFieldDto,
    organizationId: string,
  ): Promise<DirectoryField> {
    await this.findOne(directoryId, organizationId);

    const field = await this.fieldRepository.findOne({
      where: { id: fieldId, directoryId },
    });

    if (!field) {
      throw new NotFoundException(`Field with ID ${fieldId} not found`);
    }

    Object.assign(field, dto);

    return this.fieldRepository.save(field);
  }

  /**
   * Remove a field definition.
   * Hard-deletes the field (fields don't have soft delete in the migration).
   */
  async removeField(
    directoryId: string,
    fieldId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(directoryId, organizationId);

    const field = await this.fieldRepository.findOne({
      where: { id: fieldId, directoryId },
    });

    if (!field) {
      throw new NotFoundException(`Field with ID ${fieldId} not found`);
    }

    await this.fieldRepository.remove(field);
  }

  // ==========================================================================
  // ENTRY CRUD
  // ==========================================================================

  /**
   * Create a directory entry.
   * For ORGANIZATION-scoped directories, entries inherit the organization.
   */
  async createEntry(
    directoryId: string,
    dto: CreateDirectoryEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    const directory = await this.findOne(directoryId, organizationId);

    // Validate parentId for hierarchical directories
    if (dto.parentId) {
      if (!directory.isHierarchical) {
        throw new BadRequestException(
          'Cannot set parentId on a non-hierarchical directory',
        );
      }

      const parent = await this.entryRepository.findOne({
        where: { id: dto.parentId, directoryId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent entry with ID ${dto.parentId} not found in this directory`);
      }
    }

    const entry = this.entryRepository.create({
      ...dto,
      directoryId,
      organizationId,
      normalizedName: dto.name.toLowerCase().trim(),
      created_by_id: userId ?? null,
    });

    const saved = await this.entryRepository.save(entry);

    // Record audit
    await this.createAuditEntry(saved.id, DirectoryAuditAction.CREATE, userId ?? null, null, {
      name: saved.name,
      code: saved.code,
      status: saved.status,
      data: saved.data,
    });

    return saved;
  }

  /**
   * List entries for a directory (paginated) with optional filters.
   */
  async findAllEntries(
    directoryId: string,
    organizationId: string,
    filters?: QueryEntriesDto,
  ): Promise<PaginatedResult<DirectoryEntry>> {
    // Verify directory access
    await this.findOne(directoryId, organizationId);

    const { page = 1, limit: rawLimit = 50, status, origin, parentId, search, tag } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.entryRepository
      .createQueryBuilder('e')
      .where('e.directoryId = :directoryId', { directoryId })
      .andWhere(
        new Brackets((qb) => {
          qb.where('e.organizationId IS NULL')
            .orWhere('e.organizationId = :organizationId', { organizationId });
        }),
      );

    if (status) {
      query.andWhere('e.status = :status', { status });
    }

    if (origin) {
      query.andWhere('e.origin = :origin', { origin });
    }

    if (parentId) {
      query.andWhere('e.parentId = :parentId', { parentId });
    } else if (filters?.parentId === undefined) {
      // Do not filter by parentId if not specified -- return all entries
    }

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('e.name ILIKE :search', { search: `%${search}%` })
            .orWhere('e.code ILIKE :search', { search: `%${search}%` })
            .orWhere('e.normalizedName ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (tag) {
      query.andWhere(':tag = ANY(e.tags)', { tag });
    }

    const total = await query.getCount();

    query.orderBy('e.sortOrder', 'ASC');
    query.addOrderBy('e.name', 'ASC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single entry by ID.
   */
  async findOneEntry(
    directoryId: string,
    entryId: string,
    organizationId: string,
  ): Promise<DirectoryEntry> {
    await this.findOne(directoryId, organizationId);

    const entry = await this.entryRepository.findOne({
      where: { id: entryId, directoryId },
      relations: ['parent', 'children'],
    });

    if (!entry) {
      throw new NotFoundException(`Entry with ID ${entryId} not found`);
    }

    // Verify org access
    if (entry.organizationId && entry.organizationId !== organizationId) {
      throw new NotFoundException(`Entry with ID ${entryId} not found`);
    }

    return entry;
  }

  /**
   * Update a directory entry.
   */
  async updateEntry(
    directoryId: string,
    entryId: string,
    dto: UpdateDirectoryEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    const entry = await this.findOneEntry(directoryId, entryId, organizationId);
    const directory = await this.findOne(directoryId, organizationId);

    // Capture old values for audit
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const key of Object.keys(dto)) {
      if ((dto as Record<string, unknown>)[key] !== undefined) {
        oldValues[key] = (entry as unknown as Record<string, unknown>)[key];
        newValues[key] = (dto as Record<string, unknown>)[key];
      }
    }

    // Validate parentId for hierarchical directories
    if (dto.parentId !== undefined) {
      if (!directory.isHierarchical) {
        throw new BadRequestException(
          'Cannot set parentId on a non-hierarchical directory',
        );
      }

      if (dto.parentId) {
        if (dto.parentId === entryId) {
          throw new BadRequestException('Entry cannot be its own parent');
        }

        const parent = await this.entryRepository.findOne({
          where: { id: dto.parentId, directoryId },
        });
        if (!parent) {
          throw new NotFoundException(
            `Parent entry with ID ${dto.parentId} not found in this directory`,
          );
        }
      }
    }

    // Increment version on update
    const newVersion = entry.version + 1;

    Object.assign(entry, {
      ...dto,
      version: newVersion,
      updated_by_id: userId ?? null,
    });

    // Update normalizedName if name changed
    if (dto.name) {
      entry.normalizedName = dto.name.toLowerCase().trim();
    }

    const saved = await this.entryRepository.save(entry);

    // Record audit
    await this.createAuditEntry(entryId, DirectoryAuditAction.UPDATE, userId ?? null, oldValues, newValues);

    return saved;
  }

  /**
   * Soft delete a directory entry.
   */
  async removeEntry(
    directoryId: string,
    entryId: string,
    organizationId: string,
    userId?: string,
  ): Promise<void> {
    const entry = await this.findOneEntry(directoryId, entryId, organizationId);

    await this.entryRepository.softDelete(entryId);

    // Record audit
    await this.createAuditEntry(entryId, DirectoryAuditAction.ARCHIVE, userId ?? null, {
      name: entry.name,
      status: entry.status,
    }, null);
  }

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  /**
   * Search entries within a directory using ILIKE on name, code, and data JSONB.
   */
  async searchEntries(
    directoryId: string,
    q: string,
    organizationId: string,
    limit: number = 50,
  ): Promise<DirectoryEntry[]> {
    // Verify directory access
    await this.findOne(directoryId, organizationId);

    const clampedLimit = Math.min(limit, 200);

    const query = this.entryRepository
      .createQueryBuilder('e')
      .where('e.directoryId = :directoryId', { directoryId })
      .andWhere('e.status = :status', { status: EntryStatus.ACTIVE })
      .andWhere(
        new Brackets((qb) => {
          qb.where('e.organizationId IS NULL')
            .orWhere('e.organizationId = :organizationId', { organizationId });
        }),
      )
      .andWhere(
        new Brackets((qb) => {
          qb.where('e.name ILIKE :search', { search: `%${q}%` })
            .orWhere('e.normalizedName ILIKE :search', { search: `%${q}%` })
            .orWhere('e.code ILIKE :codeSearch', { codeSearch: `${q}%` })
            .orWhere('CAST(e.data AS text) ILIKE :search', { search: `%${q}%` });
        }),
      )
      .orderBy('e.sortOrder', 'ASC')
      .addOrderBy('e.name', 'ASC')
      .take(clampedLimit);

    return query.getMany();
  }

  // ==========================================================================
  // SOURCE CRUD
  // ==========================================================================

  /**
   * Create an external source configuration for a directory.
   */
  async createSource(
    directoryId: string,
    dto: CreateDirectorySourceDto,
    organizationId: string,
  ): Promise<DirectorySource> {
    await this.findOne(directoryId, organizationId);

    const source = this.sourceRepository.create({
      ...dto,
      directoryId,
    });

    return this.sourceRepository.save(source);
  }

  /**
   * List sources for a directory (paginated).
   */
  async findAllSources(
    directoryId: string,
    organizationId: string,
    filters?: QueryDirectorySourcesDto,
  ): Promise<PaginatedResult<DirectorySource>> {
    await this.findOne(directoryId, organizationId);

    const { page = 1, limit: rawLimit = 50, isActive } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.sourceRepository
      .createQueryBuilder('s')
      .where('s.directoryId = :directoryId', { directoryId });

    if (isActive !== undefined) {
      query.andWhere('s.isActive = :isActive', { isActive });
    }

    const total = await query.getCount();

    query.orderBy('s.name', 'ASC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single source by ID.
   */
  async findOneSource(
    directoryId: string,
    sourceId: string,
    organizationId: string,
  ): Promise<DirectorySource> {
    await this.findOne(directoryId, organizationId);

    const source = await this.sourceRepository.findOne({
      where: { id: sourceId, directoryId },
    });

    if (!source) {
      throw new NotFoundException(`Source with ID ${sourceId} not found`);
    }

    return source;
  }

  /**
   * Update a source configuration.
   */
  async updateSource(
    directoryId: string,
    sourceId: string,
    dto: UpdateDirectorySourceDto,
    organizationId: string,
  ): Promise<DirectorySource> {
    const source = await this.findOneSource(directoryId, sourceId, organizationId);

    Object.assign(source, dto);

    return this.sourceRepository.save(source);
  }

  /**
   * Delete a source configuration (hard delete).
   */
  async removeSource(
    directoryId: string,
    sourceId: string,
    organizationId: string,
  ): Promise<void> {
    const source = await this.findOneSource(directoryId, sourceId, organizationId);
    await this.sourceRepository.remove(source);
  }

  // ==========================================================================
  // SYNC
  // ==========================================================================

  /**
   * Trigger a sync from an external source.
   * Creates a STARTED log, fetches data, upserts entries, updates log on completion.
   */
  async triggerSync(
    directoryId: string,
    sourceId: string,
    organizationId: string,
    userId?: string,
    sourceVersion?: string,
  ): Promise<DirectorySyncLog> {
    const source = await this.findOneSource(directoryId, sourceId, organizationId);

    if (!source.isActive) {
      throw new BadRequestException('Cannot sync from an inactive source');
    }

    // Create STARTED log
    const syncLog = this.syncLogRepository.create({
      directoryId,
      sourceId,
      status: SyncLogStatus.STARTED,
      triggeredBy: userId ?? null,
    });
    const savedLog = await this.syncLogRepository.save(syncLog);

    try {
      // Fetch data from source
      const records = await this.fetchSourceData(source);

      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      const errors: Record<string, unknown>[] = [];

      for (const record of records) {
        try {
          const mappedData = this.mapSourceRecord(record, source.columnMapping);
          const entryName = (mappedData.name as string) || '';
          const entryCode = (mappedData.code as string) || null;
          const externalKey = source.uniqueKeyField
            ? (record[source.uniqueKeyField] as string)
            : null;

          // Try to find existing entry by externalKey
          let existingEntry: DirectoryEntry | null = null;
          if (externalKey) {
            existingEntry = await this.entryRepository.findOne({
              where: { directoryId, externalKey },
            });
          }

          if (existingEntry) {
            // Update
            const oldData = { ...existingEntry.data };
            Object.assign(existingEntry, {
              name: entryName || existingEntry.name,
              normalizedName: (entryName || existingEntry.name).toLowerCase().trim(),
              code: entryCode ?? existingEntry.code,
              data: { ...existingEntry.data, ...mappedData.data as Record<string, unknown> },
              origin: EntryOrigin.OFFICIAL,
              originSource: source.name,
              originDate: new Date(),
              version: existingEntry.version + 1,
            });
            await this.entryRepository.save(existingEntry);
            await this.createAuditEntry(existingEntry.id, DirectoryAuditAction.SYNC, userId ?? null, oldData, existingEntry.data);
            updatedCount++;
          } else {
            // Create
            const newEntry = this.entryRepository.create({
              directoryId,
              name: entryName,
              normalizedName: entryName.toLowerCase().trim(),
              code: entryCode,
              externalKey,
              data: (mappedData.data as Record<string, unknown>) || {},
              origin: EntryOrigin.OFFICIAL,
              originSource: source.name,
              originDate: new Date(),
              status: EntryStatus.ACTIVE,
              organizationId,
            });
            const savedEntry = await this.entryRepository.save(newEntry);
            await this.createAuditEntry(savedEntry.id, DirectoryAuditAction.SYNC, userId ?? null, null, {
              name: savedEntry.name,
              code: savedEntry.code,
            });
            createdCount++;
          }
        } catch (err) {
          errorCount++;
          errors.push({
            record,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Update sync log
      const finalStatus = errorCount > 0
        ? (createdCount + updatedCount > 0 ? SyncLogStatus.PARTIAL : SyncLogStatus.FAILED)
        : SyncLogStatus.SUCCESS;

      savedLog.status = finalStatus;
      savedLog.finishedAt = new Date();
      savedLog.totalRecords = records.length;
      savedLog.createdCount = createdCount;
      savedLog.updatedCount = updatedCount;
      savedLog.errorCount = errorCount;
      savedLog.errors = errors.length > 0 ? errors : null;
      await this.syncLogRepository.save(savedLog);

      // Update source status
      source.lastSyncAt = new Date();
      source.lastSyncStatus = finalStatus === SyncLogStatus.SUCCESS
        ? SyncStatus.SUCCESS
        : finalStatus === SyncLogStatus.PARTIAL
          ? SyncStatus.PARTIAL
          : SyncStatus.FAILED;
      source.lastSyncError = errors.length > 0 ? errors[0].error as string : null;
      source.consecutiveFailures = finalStatus === SyncLogStatus.FAILED
        ? source.consecutiveFailures + 1
        : 0;
      if (sourceVersion) {
        source.sourceVersion = sourceVersion;
      }
      await this.sourceRepository.save(source);

      return savedLog;
    } catch (err) {
      // Update sync log on failure
      savedLog.status = SyncLogStatus.FAILED;
      savedLog.finishedAt = new Date();
      savedLog.errors = [{ error: err instanceof Error ? err.message : String(err) }];
      await this.syncLogRepository.save(savedLog);

      // Update source
      source.lastSyncAt = new Date();
      source.lastSyncStatus = SyncStatus.FAILED;
      source.lastSyncError = err instanceof Error ? err.message : String(err);
      source.consecutiveFailures += 1;
      await this.sourceRepository.save(source);

      return savedLog;
    }
  }

  /**
   * List sync logs for a directory (paginated).
   */
  async findSyncLogs(
    directoryId: string,
    organizationId: string,
    filters?: QuerySyncLogsDto,
  ): Promise<PaginatedResult<DirectorySyncLog>> {
    await this.findOne(directoryId, organizationId);

    const { page = 1, limit: rawLimit = 50, sourceId } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.syncLogRepository
      .createQueryBuilder('sl')
      .where('sl.directoryId = :directoryId', { directoryId })
      .leftJoinAndSelect('sl.source', 'source');

    if (sourceId) {
      query.andWhere('sl.sourceId = :sourceId', { sourceId });
    }

    const total = await query.getCount();

    query.orderBy('sl.startedAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================================================
  // AUDIT
  // ==========================================================================

  /**
   * Internal helper: record an audit entry.
   */
  async createAuditEntry(
    entryId: string,
    action: DirectoryAuditAction,
    changedBy: string | null,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    changeReason?: string,
  ): Promise<DirectoryEntryAudit> {
    const audit = this.auditRepository.create({
      entryId,
      action,
      changedBy,
      oldValues,
      newValues,
      changeReason: changeReason ?? null,
    });

    return this.auditRepository.save(audit);
  }

  /**
   * List audit logs for a directory (paginated).
   */
  async findAuditLogs(
    directoryId: string,
    organizationId: string,
    filters?: QueryAuditLogsDto,
  ): Promise<PaginatedResult<DirectoryEntryAudit>> {
    await this.findOne(directoryId, organizationId);

    const { page = 1, limit: rawLimit = 50, entryId, action } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.auditRepository
      .createQueryBuilder('a')
      .innerJoin('directory_entries', 'e', 'e.id = a.entry_id')
      .where('e.directory_id = :directoryId', { directoryId })
      .andWhere('e.deleted_at IS NULL')
      .andWhere(
        new Brackets((qb) => {
          qb.where('e.organization_id IS NULL')
            .orWhere('e.organization_id = :organizationId', { organizationId });
        }),
      );

    if (entryId) {
      query.andWhere('a.entryId = :entryId', { entryId });
    }

    if (action) {
      query.andWhere('a.action = :action', { action });
    }

    const total = await query.getCount();

    query.orderBy('a.changedAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit logs for a specific entry.
   */
  async findEntryAuditLogs(
    directoryId: string,
    entryId: string,
    organizationId: string,
    filters?: QueryAuditLogsDto,
  ): Promise<PaginatedResult<DirectoryEntryAudit>> {
    await this.findOneEntry(directoryId, entryId, organizationId);

    const { page = 1, limit: rawLimit = 50, action } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.auditRepository
      .createQueryBuilder('a')
      .where('a.entryId = :entryId', { entryId });

    if (action) {
      query.andWhere('a.action = :action', { action });
    }

    const total = await query.getCount();

    query.orderBy('a.changedAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================================================
  // HIERARCHY
  // ==========================================================================

  /**
   * Build a nested tree from entries in a hierarchical directory.
   */
  async getHierarchyTree(
    directoryId: string,
    organizationId: string,
  ): Promise<HierarchyNode[]> {
    const directory = await this.findOne(directoryId, organizationId);

    if (!directory.isHierarchical) {
      throw new BadRequestException('Directory is not hierarchical');
    }

    const entries = await this.entryRepository
      .createQueryBuilder('e')
      .where('e.directoryId = :directoryId', { directoryId })
      .andWhere('e.status = :status', { status: EntryStatus.ACTIVE })
      .andWhere(
        new Brackets((qb) => {
          qb.where('e.organizationId IS NULL')
            .orWhere('e.organizationId = :organizationId', { organizationId });
        }),
      )
      .orderBy('e.sortOrder', 'ASC')
      .addOrderBy('e.name', 'ASC')
      .getMany();

    // Build map
    const nodeMap = new Map<string, HierarchyNode>();
    for (const entry of entries) {
      nodeMap.set(entry.id, {
        id: entry.id,
        name: entry.name,
        code: entry.code,
        parentId: entry.parentId,
        sortOrder: entry.sortOrder,
        data: entry.data,
        children: [],
      });
    }

    // Build tree
    const roots: HierarchyNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Move an entry to a new parent (with cycle detection).
   */
  async moveEntry(
    directoryId: string,
    entryId: string,
    dto: MoveEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    const directory = await this.findOne(directoryId, organizationId);

    if (!directory.isHierarchical) {
      throw new BadRequestException('Directory is not hierarchical');
    }

    const entry = await this.findOneEntry(directoryId, entryId, organizationId);
    const oldParentId = entry.parentId;

    if (dto.newParentId) {
      // Cannot be its own parent
      if (dto.newParentId === entryId) {
        throw new BadRequestException('Entry cannot be its own parent');
      }

      // Verify new parent exists
      const newParent = await this.entryRepository.findOne({
        where: { id: dto.newParentId, directoryId },
      });
      if (!newParent) {
        throw new NotFoundException(`Parent entry with ID ${dto.newParentId} not found in this directory`);
      }

      // Cycle detection: walk up from newParentId and ensure entryId is not an ancestor
      let current: DirectoryEntry | null = newParent;
      while (current && current.parentId) {
        if (current.parentId === entryId) {
          throw new BadRequestException('Moving this entry would create a cycle in the hierarchy');
        }
        current = await this.entryRepository.findOne({
          where: { id: current.parentId, directoryId },
        });
      }
    }

    entry.parentId = dto.newParentId ?? null;
    entry.version += 1;
    entry.updated_by_id = userId ?? null;
    const saved = await this.entryRepository.save(entry);

    // Record audit
    await this.createAuditEntry(entryId, DirectoryAuditAction.UPDATE, userId ?? null,
      { parentId: oldParentId },
      { parentId: dto.newParentId ?? null },
      'Entry moved in hierarchy',
    );

    return saved;
  }

  // ==========================================================================
  // INLINE CREATE
  // ==========================================================================

  /**
   * Minimal create for DirectorySelect popup.
   * Creates an entry with just name (and optionally code, parentId, data).
   */
  async inlineCreateEntry(
    directoryId: string,
    dto: InlineCreateEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    const directory = await this.findOne(directoryId, organizationId);

    // Check if inline create is allowed
    if (directory.settings && directory.settings.allow_inline_create === false) {
      throw new BadRequestException('Inline create is not allowed for this directory');
    }

    // Validate parentId if provided
    if (dto.parentId) {
      if (!directory.isHierarchical) {
        throw new BadRequestException('Cannot set parentId on a non-hierarchical directory');
      }

      const parent = await this.entryRepository.findOne({
        where: { id: dto.parentId, directoryId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent entry with ID ${dto.parentId} not found`);
      }
    }

    const entry = this.entryRepository.create({
      directoryId,
      name: dto.name,
      normalizedName: dto.name.toLowerCase().trim(),
      code: dto.code ?? null,
      parentId: dto.parentId ?? null,
      data: dto.data ?? {},
      origin: EntryOrigin.LOCAL,
      status: directory.settings?.approval_required
        ? EntryStatus.PENDING_APPROVAL
        : EntryStatus.ACTIVE,
      organizationId,
      created_by_id: userId ?? null,
    });

    const saved = await this.entryRepository.save(entry);

    // Record audit
    await this.createAuditEntry(saved.id, DirectoryAuditAction.CREATE, userId ?? null, null, {
      name: saved.name,
      code: saved.code,
      origin: 'inline_create',
    });

    return saved;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Fetch data from an external source. Currently supports URL/API sources.
   * Returns array of raw records.
   */
  private async fetchSourceData(source: DirectorySource): Promise<Record<string, unknown>[]> {
    if (!source.url) {
      return [];
    }

    try {
      const headers: Record<string, string> = {};
      if (source.requestConfig && typeof source.requestConfig === 'object') {
        const rc = source.requestConfig as Record<string, unknown>;
        if (rc.headers && typeof rc.headers === 'object') {
          Object.assign(headers, rc.headers);
        }
      }

      if (source.authConfig && typeof source.authConfig === 'object') {
        const ac = source.authConfig as Record<string, unknown>;
        if (ac.type === 'bearer' && ac.token) {
          headers['Authorization'] = `Bearer ${ac.token}`;
        } else if (ac.type === 'basic' && ac.username && ac.password) {
          const credentials = Buffer.from(`${ac.username}:${ac.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
      }

      // Validate URL protocol (prevent SSRF with file://, ftp://, etc.)
      const parsedUrl = new URL(source.url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
      }

      // Timeout after 30 seconds
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      let data: unknown;
      try {
        const response = await fetch(source.url, {
          method: (source.requestConfig as Record<string, unknown>)?.method as string || 'GET',
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        data = await response.json();
      } finally {
        clearTimeout(timeout);
      }

      // Handle response: if it's an array, return directly; if object with data key, extract
      if (Array.isArray(data)) {
        return data;
      }
      if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
        if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
        if (Array.isArray(obj.results)) return obj.results as Record<string, unknown>[];
      }

      return [];
    } catch (err) {
      throw new Error(`Failed to fetch source data: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Map a raw source record using the column mapping configuration.
   */
  private mapSourceRecord(
    record: Record<string, unknown>,
    columnMapping: Record<string, unknown> | null,
  ): { name: string; code: string | null; data: Record<string, unknown> } {
    if (!columnMapping) {
      return {
        name: (record.name as string) || '',
        code: (record.code as string) || null,
        data: record,
      };
    }

    const result: Record<string, unknown> = {};
    let name = '';
    let code: string | null = null;

    for (const [targetField, sourceField] of Object.entries(columnMapping)) {
      const value = record[sourceField as string];
      if (targetField === 'name') {
        name = (value as string) || '';
      } else if (targetField === 'code') {
        code = (value as string) || null;
      } else {
        result[targetField] = value;
      }
    }

    return { name, code, data: result };
  }
}
