/**
 * Directory Entry Service
 *
 * Handles Entry CRUD, search, hierarchy tree, move, and inline create.
 * Extracted from DirectoriesService for separation of concerns.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Brackets } from "typeorm";
import {
  Directory,
  DirectoryEntry,
  EntryStatus,
  EntryOrigin,
} from "../entities/directory.entity";
import { DirectoryAuditAction } from "../entities/directory-entry-audit.entity";
import {
  CreateDirectoryEntryDto,
  UpdateDirectoryEntryDto,
  QueryEntriesDto,
} from "../dto/directory.dto";
import {
  MoveEntryDto,
  InlineCreateEntryDto,
} from "../dto/directory-hierarchy.dto";
import { PaginatedResult, HierarchyNode } from "../directories.service";
import { DirectoryAuditService } from "./directory-audit.service";

@Injectable()
export class DirectoryEntryService {
  constructor(
    @InjectRepository(DirectoryEntry)
    private readonly entryRepository: Repository<DirectoryEntry>,

    private readonly auditService: DirectoryAuditService,
  ) {}

  /**
   * Create a directory entry.
   * For ORGANIZATION-scoped directories, entries inherit the organization.
   */
  async createEntry(
    directory: Directory,
    dto: CreateDirectoryEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    // Validate parentId for hierarchical directories
    if (dto.parentId) {
      if (!directory.isHierarchical) {
        throw new BadRequestException(
          "Cannot set parentId on a non-hierarchical directory",
        );
      }

      const parent = await this.entryRepository.findOne({
        where: { id: dto.parentId, directoryId: directory.id },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent entry with ID ${dto.parentId} not found in this directory`,
        );
      }
    }

    const entry = this.entryRepository.create({
      ...dto,
      directoryId: directory.id,
      organizationId,
      normalizedName: dto.name.toLowerCase().trim(),
      created_by_id: userId ?? null,
    });

    const saved = await this.entryRepository.save(entry);

    // Record audit
    await this.auditService.createAuditEntry(
      saved.id,
      DirectoryAuditAction.CREATE,
      userId ?? null,
      null,
      {
        name: saved.name,
        code: saved.code,
        status: saved.status,
        data: saved.data,
      },
    );

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
    const {
      page = 1,
      limit: rawLimit = 50,
      status,
      origin,
      parentId,
      search,
      tag,
    } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.entryRepository
      .createQueryBuilder("e")
      .where("e.directoryId = :directoryId", { directoryId })
      .andWhere(
        new Brackets((qb) => {
          qb.where("e.organizationId IS NULL").orWhere(
            "e.organizationId = :organizationId",
            { organizationId },
          );
        }),
      );

    if (status) {
      query.andWhere("e.status = :status", { status });
    }

    if (origin) {
      query.andWhere("e.origin = :origin", { origin });
    }

    if (parentId) {
      query.andWhere("e.parentId = :parentId", { parentId });
    } else if (filters?.parentId === undefined) {
      // Do not filter by parentId if not specified -- return all entries
    }

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where("e.name ILIKE :search", { search: `%${search}%` })
            .orWhere("e.code ILIKE :search", { search: `%${search}%` })
            .orWhere("e.normalizedName ILIKE :search", {
              search: `%${search}%`,
            });
        }),
      );
    }

    if (tag) {
      query.andWhere(":tag = ANY(e.tags)", { tag });
    }

    const total = await query.getCount();

    query.orderBy("e.sortOrder", "ASC");
    query.addOrderBy("e.name", "ASC");
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
    const entry = await this.entryRepository.findOne({
      where: { id: entryId, directoryId },
      relations: ["parent", "children"],
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
    directory: Directory,
    entryId: string,
    dto: UpdateDirectoryEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    const entry = await this.findOneEntry(
      directory.id,
      entryId,
      organizationId,
    );

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
          "Cannot set parentId on a non-hierarchical directory",
        );
      }

      if (dto.parentId) {
        if (dto.parentId === entryId) {
          throw new BadRequestException("Entry cannot be its own parent");
        }

        const parent = await this.entryRepository.findOne({
          where: { id: dto.parentId, directoryId: directory.id },
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
    await this.auditService.createAuditEntry(
      entryId,
      DirectoryAuditAction.UPDATE,
      userId ?? null,
      oldValues,
      newValues,
    );

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
    await this.auditService.createAuditEntry(
      entryId,
      DirectoryAuditAction.ARCHIVE,
      userId ?? null,
      {
        name: entry.name,
        status: entry.status,
      },
      null,
    );
  }

  /**
   * Search entries within a directory using ILIKE on name, code, and data JSONB.
   */
  async searchEntries(
    directoryId: string,
    q: string,
    organizationId: string,
    limit: number = 50,
  ): Promise<DirectoryEntry[]> {
    const clampedLimit = Math.min(limit, 200);

    const query = this.entryRepository
      .createQueryBuilder("e")
      .where("e.directoryId = :directoryId", { directoryId })
      .andWhere("e.status = :status", { status: EntryStatus.ACTIVE })
      .andWhere(
        new Brackets((qb) => {
          qb.where("e.organizationId IS NULL").orWhere(
            "e.organizationId = :organizationId",
            { organizationId },
          );
        }),
      )
      .andWhere(
        new Brackets((qb) => {
          qb.where("e.name ILIKE :search", { search: `%${q}%` })
            .orWhere("e.normalizedName ILIKE :search", { search: `%${q}%` })
            .orWhere("e.code ILIKE :codeSearch", { codeSearch: `${q}%` })
            .orWhere("CAST(e.data AS text) ILIKE :search", {
              search: `%${q}%`,
            });
        }),
      )
      .orderBy("e.sortOrder", "ASC")
      .addOrderBy("e.name", "ASC")
      .take(clampedLimit);

    return query.getMany();
  }

  /**
   * Build a nested tree from entries in a hierarchical directory.
   */
  async getHierarchyTree(
    directory: Directory,
    organizationId: string,
  ): Promise<HierarchyNode[]> {
    if (!directory.isHierarchical) {
      throw new BadRequestException("Directory is not hierarchical");
    }

    const entries = await this.entryRepository
      .createQueryBuilder("e")
      .where("e.directoryId = :directoryId", { directoryId: directory.id })
      .andWhere("e.status = :status", { status: EntryStatus.ACTIVE })
      .andWhere(
        new Brackets((qb) => {
          qb.where("e.organizationId IS NULL").orWhere(
            "e.organizationId = :organizationId",
            { organizationId },
          );
        }),
      )
      .orderBy("e.sortOrder", "ASC")
      .addOrderBy("e.name", "ASC")
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
    directory: Directory,
    entryId: string,
    dto: MoveEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    if (!directory.isHierarchical) {
      throw new BadRequestException("Directory is not hierarchical");
    }

    const entry = await this.findOneEntry(
      directory.id,
      entryId,
      organizationId,
    );
    const oldParentId = entry.parentId;

    if (dto.newParentId) {
      // Cannot be its own parent
      if (dto.newParentId === entryId) {
        throw new BadRequestException("Entry cannot be its own parent");
      }

      // Verify new parent exists
      const newParent = await this.entryRepository.findOne({
        where: { id: dto.newParentId, directoryId: directory.id },
      });
      if (!newParent) {
        throw new NotFoundException(
          `Parent entry with ID ${dto.newParentId} not found in this directory`,
        );
      }

      // Cycle detection: walk up from newParentId and ensure entryId is not an ancestor
      let current: DirectoryEntry | null = newParent;
      while (current && current.parentId) {
        if (current.parentId === entryId) {
          throw new BadRequestException(
            "Moving this entry would create a cycle in the hierarchy",
          );
        }
        current = await this.entryRepository.findOne({
          where: { id: current.parentId, directoryId: directory.id },
        });
      }
    }

    entry.parentId = dto.newParentId ?? null;
    entry.version += 1;
    entry.updated_by_id = userId ?? null;
    const saved = await this.entryRepository.save(entry);

    // Record audit
    await this.auditService.createAuditEntry(
      entryId,
      DirectoryAuditAction.UPDATE,
      userId ?? null,
      { parentId: oldParentId },
      { parentId: dto.newParentId ?? null },
      "Entry moved in hierarchy",
    );

    return saved;
  }

  /**
   * Minimal create for DirectorySelect popup.
   * Creates an entry with just name (and optionally code, parentId, data).
   */
  async inlineCreateEntry(
    directory: Directory,
    dto: InlineCreateEntryDto,
    organizationId: string,
    userId?: string,
  ): Promise<DirectoryEntry> {
    // Check if inline create is allowed
    if (
      directory.settings &&
      directory.settings.allow_inline_create === false
    ) {
      throw new BadRequestException(
        "Inline create is not allowed for this directory",
      );
    }

    // Validate parentId if provided
    if (dto.parentId) {
      if (!directory.isHierarchical) {
        throw new BadRequestException(
          "Cannot set parentId on a non-hierarchical directory",
        );
      }

      const parent = await this.entryRepository.findOne({
        where: { id: dto.parentId, directoryId: directory.id },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent entry with ID ${dto.parentId} not found`,
        );
      }
    }

    const entry = this.entryRepository.create({
      directoryId: directory.id,
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
    await this.auditService.createAuditEntry(
      saved.id,
      DirectoryAuditAction.CREATE,
      userId ?? null,
      null,
      {
        name: saved.name,
        code: saved.code,
        origin: "inline_create",
      },
    );

    return saved;
  }
}
