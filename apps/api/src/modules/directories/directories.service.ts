/**
 * Directories Service for VendHub OS
 *
 * Thin orchestrator facade for directories, fields, entries, sources, sync, and audit.
 * Delegates to sub-services for entry, source, and audit operations.
 * Implements EAV (Entity-Attribute-Value) pattern for flexible reference data.
 * All queries filter by organizationId for multi-tenancy.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Brackets } from "typeorm";
import {
  Directory,
  DirectoryField,
  DirectoryEntry,
  DirectoryScope,
} from "./entities/directory.entity";
import { DirectorySource } from "./entities/directory-source.entity";
import { DirectorySyncLog } from "./entities/directory-sync-log.entity";
import {
  DirectoryEntryAudit,
  DirectoryAuditAction,
} from "./entities/directory-entry-audit.entity";
import {
  CreateDirectoryDto,
  UpdateDirectoryDto,
  CreateDirectoryFieldDto,
  UpdateDirectoryFieldDto,
  CreateDirectoryEntryDto,
  UpdateDirectoryEntryDto,
  QueryDirectoriesDto,
  QueryEntriesDto,
} from "./dto/directory.dto";
import {
  CreateDirectorySourceDto,
  UpdateDirectorySourceDto,
  QueryDirectorySourcesDto,
} from "./dto/directory-source.dto";
import { QuerySyncLogsDto } from "./dto/directory-sync.dto";
import { QueryAuditLogsDto } from "./dto/directory-audit.dto";
import {
  MoveEntryDto,
  InlineCreateEntryDto,
} from "./dto/directory-hierarchy.dto";
import { DirectoryEntryService } from "./services/directory-entry.service";
import { DirectorySourceService } from "./services/directory-source.service";
import { DirectoryAuditService } from "./services/directory-audit.service";

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

    private readonly entryService: DirectoryEntryService,
    private readonly sourceService: DirectorySourceService,
    private readonly auditService: DirectoryAuditService,
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
      .createQueryBuilder("d")
      .where("d.slug = :slug", { slug: dto.slug })
      .withDeleted()
      .andWhere("d.deletedAt IS NULL")
      .getOne();

    if (existing) {
      throw new ConflictException(
        `Directory with slug "${dto.slug}" already exists`,
      );
    }

    const directory = this.directoryRepository.create({
      ...dto,
      organizationId,
      scope: dto.scope ?? DirectoryScope.HQ,
      createdById: userId ?? null,
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
    const {
      page = 1,
      limit: rawLimit = 50,
      type,
      scope,
      search,
      includeSystem,
    } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.directoryRepository.createQueryBuilder("d").where(
      new Brackets((qb) => {
        qb.where("d.scope = :hqScope", { hqScope: DirectoryScope.HQ }).orWhere(
          "d.organizationId = :organizationId",
          { organizationId },
        );
      }),
    );

    if (type) {
      query.andWhere("d.type = :type", { type });
    }

    if (scope) {
      query.andWhere("d.scope = :scope", { scope });
    }

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where("d.name ILIKE :search", { search: `%${search}%` }).orWhere(
            "d.slug ILIKE :search",
            { search: `%${search}%` },
          );
        }),
      );
    }

    if (includeSystem === false) {
      query.andWhere("d.isSystem = false");
    }

    const total = await query.getCount();

    query.orderBy("d.name", "ASC");
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
      relations: ["fields"],
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
      relations: ["fields"],
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

    if (
      directory.isSystem &&
      directory.scope === DirectoryScope.HQ &&
      directory.organizationId !== organizationId
    ) {
      throw new BadRequestException(
        "Cannot modify HQ system directories from organization scope",
      );
    }

    Object.assign(directory, {
      ...dto,
      updatedById: userId ?? null,
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
      throw new BadRequestException("System directories cannot be deleted");
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

    await this.fieldRepository.softRemove(field);
  }

  // ==========================================================================
  // ENTRY CRUD (delegated to DirectoryEntryService)
  // ==========================================================================

  /**
   * Create a directory entry.
   */
  async createEntry(
    directoryId: string,
    dto: CreateDirectoryEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    const directory = await this.findOne(directoryId, organizationId);
    return this.entryService.createEntry(
      directory,
      dto,
      organizationId,
      userId,
    );
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
    return this.entryService.findAllEntries(
      directoryId,
      organizationId,
      filters,
    );
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
    return this.entryService.findOneEntry(directoryId, entryId, organizationId);
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
    const directory = await this.findOne(directoryId, organizationId);
    return this.entryService.updateEntry(
      directory,
      entryId,
      dto,
      organizationId,
      userId,
    );
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
    await this.findOne(directoryId, organizationId);
    return this.entryService.removeEntry(
      directoryId,
      entryId,
      organizationId,
      userId,
    );
  }

  // ==========================================================================
  // SEARCH (delegated to DirectoryEntryService)
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
    return this.entryService.searchEntries(
      directoryId,
      q,
      organizationId,
      limit,
    );
  }

  // ==========================================================================
  // SOURCE CRUD (delegated to DirectorySourceService)
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
    return this.sourceService.createSource(directoryId, dto);
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
    return this.sourceService.findAllSources(directoryId, filters);
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
    return this.sourceService.findOneSource(directoryId, sourceId);
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
    await this.findOne(directoryId, organizationId);
    return this.sourceService.updateSource(directoryId, sourceId, dto);
  }

  /**
   * Delete a source configuration (hard delete).
   */
  async removeSource(
    directoryId: string,
    sourceId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(directoryId, organizationId);
    return this.sourceService.removeSource(directoryId, sourceId);
  }

  // ==========================================================================
  // SYNC (delegated to DirectorySourceService)
  // ==========================================================================

  /**
   * Trigger a sync from an external source.
   */
  async triggerSync(
    directoryId: string,
    sourceId: string,
    organizationId: string,
    userId?: string,
    sourceVersion?: string,
  ): Promise<DirectorySyncLog> {
    await this.findOne(directoryId, organizationId);
    return this.sourceService.triggerSync(
      directoryId,
      sourceId,
      organizationId,
      userId,
      sourceVersion,
    );
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
    return this.sourceService.findSyncLogs(directoryId, filters);
  }

  // ==========================================================================
  // AUDIT (delegated to DirectoryAuditService)
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
    return this.auditService.createAuditEntry(
      entryId,
      action,
      changedBy,
      oldValues,
      newValues,
      changeReason,
    );
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
    return this.auditService.findAuditLogs(
      directoryId,
      organizationId,
      filters,
    );
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
    return this.auditService.findEntryAuditLogs(entryId, filters);
  }

  // ==========================================================================
  // HIERARCHY (delegated to DirectoryEntryService)
  // ==========================================================================

  /**
   * Build a nested tree from entries in a hierarchical directory.
   */
  async getHierarchyTree(
    directoryId: string,
    organizationId: string,
  ): Promise<HierarchyNode[]> {
    const directory = await this.findOne(directoryId, organizationId);
    return this.entryService.getHierarchyTree(directory, organizationId);
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
    return this.entryService.moveEntry(
      directory,
      entryId,
      dto,
      organizationId,
      userId,
    );
  }

  /**
   * Minimal create for DirectorySelect popup.
   */
  async inlineCreateEntry(
    directoryId: string,
    dto: InlineCreateEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    const directory = await this.findOne(directoryId, organizationId);
    return this.entryService.inlineCreateEntry(
      directory,
      dto,
      organizationId,
      userId,
    );
  }
}
