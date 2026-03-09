/**
 * Directory Audit Service
 *
 * Handles audit logging for directory entry changes.
 * Extracted from DirectoriesService for separation of concerns.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Brackets } from "typeorm";
import {
  DirectoryEntryAudit,
  DirectoryAuditAction,
} from "../entities/directory-entry-audit.entity";
import { DirectoryQueryAuditLogsDto } from "../dto/directory-audit.dto";
import { PaginatedResult } from "../directories.service";

@Injectable()
export class DirectoryAuditService {
  constructor(
    @InjectRepository(DirectoryEntryAudit)
    private readonly auditRepository: Repository<DirectoryEntryAudit>,
  ) {}

  /**
   * Record an audit entry.
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
    filters?: DirectoryQueryAuditLogsDto,
  ): Promise<PaginatedResult<DirectoryEntryAudit>> {
    const { page = 1, limit: rawLimit = 50, entryId, action } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.auditRepository
      .createQueryBuilder("a")
      .innerJoin("directory_entries", "e", "e.id = a.entry_id")
      .where("e.directory_id = :directoryId", { directoryId })
      .andWhere("e.deletedAt IS NULL")
      .andWhere(
        new Brackets((qb) => {
          qb.where("e.organization_id IS NULL").orWhere(
            "e.organization_id = :organizationId",
            { organizationId },
          );
        }),
      );

    if (entryId) {
      query.andWhere("a.entryId = :entryId", { entryId });
    }

    if (action) {
      query.andWhere("a.action = :action", { action });
    }

    const total = await query.getCount();

    query.orderBy("a.changedAt", "DESC");
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
    entryId: string,
    filters?: DirectoryQueryAuditLogsDto,
  ): Promise<PaginatedResult<DirectoryEntryAudit>> {
    const { page = 1, limit: rawLimit = 50, action } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.auditRepository
      .createQueryBuilder("a")
      .where("a.entryId = :entryId", { entryId });

    if (action) {
      query.andWhere("a.action = :action", { action });
    }

    const total = await query.getCount();

    query.orderBy("a.changedAt", "DESC");
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
}
