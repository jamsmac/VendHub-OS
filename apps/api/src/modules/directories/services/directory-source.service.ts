/**
 * Directory Source Service
 *
 * Handles Source CRUD, sync triggering, sync logs, and external data fetching.
 * Extracted from DirectoriesService for separation of concerns.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  DirectoryEntry,
  EntryStatus,
  EntryOrigin,
} from "../entities/directory.entity";
import {
  DirectorySource,
  SyncStatus,
} from "../entities/directory-source.entity";
import {
  DirectorySyncLog,
  SyncLogStatus,
} from "../entities/directory-sync-log.entity";
import { DirectoryAuditAction } from "../entities/directory-entry-audit.entity";
import {
  CreateDirectorySourceDto,
  UpdateDirectorySourceDto,
  QueryDirectorySourcesDto,
} from "../dto/directory-source.dto";
import { QuerySyncLogsDto } from "../dto/directory-sync.dto";
import { PaginatedResult } from "../directories.service";
import { DirectoryAuditService } from "./directory-audit.service";

@Injectable()
export class DirectorySourceService {
  constructor(
    @InjectRepository(DirectoryEntry)
    private readonly entryRepository: Repository<DirectoryEntry>,

    @InjectRepository(DirectorySource)
    private readonly sourceRepository: Repository<DirectorySource>,

    @InjectRepository(DirectorySyncLog)
    private readonly syncLogRepository: Repository<DirectorySyncLog>,

    private readonly auditService: DirectoryAuditService,
  ) {}

  /**
   * Create an external source configuration for a directory.
   */
  async createSource(
    directoryId: string,
    dto: CreateDirectorySourceDto,
  ): Promise<DirectorySource> {
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
    filters?: QueryDirectorySourcesDto,
  ): Promise<PaginatedResult<DirectorySource>> {
    const { page = 1, limit: rawLimit = 50, isActive } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.sourceRepository
      .createQueryBuilder("s")
      .where("s.directoryId = :directoryId", { directoryId });

    if (isActive !== undefined) {
      query.andWhere("s.isActive = :isActive", { isActive });
    }

    const total = await query.getCount();

    query.orderBy("s.name", "ASC");
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
  ): Promise<DirectorySource> {
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
  ): Promise<DirectorySource> {
    const source = await this.findOneSource(directoryId, sourceId);

    Object.assign(source, dto);

    return this.sourceRepository.save(source);
  }

  /**
   * Delete a source configuration (soft delete).
   */
  async removeSource(directoryId: string, sourceId: string): Promise<void> {
    const source = await this.findOneSource(directoryId, sourceId);
    await this.sourceRepository.softRemove(source);
  }

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
    const source = await this.findOneSource(directoryId, sourceId);

    if (!source.isActive) {
      throw new BadRequestException("Cannot sync from an inactive source");
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
          const entryName = (mappedData.name as string) || "";
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
              normalizedName: (entryName || existingEntry.name)
                .toLowerCase()
                .trim(),
              code: entryCode ?? existingEntry.code,
              data: {
                ...existingEntry.data,
                ...(mappedData.data as Record<string, unknown>),
              },
              origin: EntryOrigin.OFFICIAL,
              originSource: source.name,
              originDate: new Date(),
              version: existingEntry.version + 1,
            });
            await this.entryRepository.save(existingEntry);
            await this.auditService.createAuditEntry(
              existingEntry.id,
              DirectoryAuditAction.SYNC,
              userId ?? null,
              oldData,
              existingEntry.data,
            );
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
            await this.auditService.createAuditEntry(
              savedEntry.id,
              DirectoryAuditAction.SYNC,
              userId ?? null,
              null,
              {
                name: savedEntry.name,
                code: savedEntry.code,
              },
            );
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
      const finalStatus =
        errorCount > 0
          ? createdCount + updatedCount > 0
            ? SyncLogStatus.PARTIAL
            : SyncLogStatus.FAILED
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
      source.lastSyncStatus =
        finalStatus === SyncLogStatus.SUCCESS
          ? SyncStatus.SUCCESS
          : finalStatus === SyncLogStatus.PARTIAL
            ? SyncStatus.PARTIAL
            : SyncStatus.FAILED;
      source.lastSyncError =
        errors.length > 0 ? (errors[0].error as string) : null;
      source.consecutiveFailures =
        finalStatus === SyncLogStatus.FAILED
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
      savedLog.errors = [
        { error: err instanceof Error ? err.message : String(err) },
      ];
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
    filters?: QuerySyncLogsDto,
  ): Promise<PaginatedResult<DirectorySyncLog>> {
    const { page = 1, limit: rawLimit = 50, sourceId } = filters || {};
    const limit = Math.min(rawLimit, 200);

    const query = this.syncLogRepository
      .createQueryBuilder("sl")
      .where("sl.directoryId = :directoryId", { directoryId })
      .leftJoinAndSelect("sl.source", "source");

    if (sourceId) {
      query.andWhere("sl.sourceId = :sourceId", { sourceId });
    }

    const total = await query.getCount();

    query.orderBy("sl.startedAt", "DESC");
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
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Fetch data from an external source. Currently supports URL/API sources.
   * Returns array of raw records.
   */
  private async fetchSourceData(
    source: DirectorySource,
  ): Promise<Record<string, unknown>[]> {
    if (!source.url) {
      return [];
    }

    try {
      const headers: Record<string, string> = {};
      if (source.requestConfig && typeof source.requestConfig === "object") {
        const rc = source.requestConfig as Record<string, unknown>;
        if (rc.headers && typeof rc.headers === "object") {
          Object.assign(headers, rc.headers);
        }
      }

      if (source.authConfig && typeof source.authConfig === "object") {
        const ac = source.authConfig as Record<string, unknown>;
        if (ac.type === "bearer" && ac.token) {
          headers["Authorization"] = `Bearer ${ac.token}`;
        } else if (ac.type === "basic" && ac.username && ac.password) {
          const credentials = Buffer.from(
            `${ac.username}:${ac.password}`,
          ).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        }
      }

      // Validate URL protocol (prevent SSRF with file://, ftp://, etc.)
      const parsedUrl = new URL(source.url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new BadRequestException(
          `Unsupported URL protocol: ${parsedUrl.protocol}`,
        );
      }

      // Timeout after 30 seconds
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      let data: unknown;
      try {
        const response = await fetch(source.url, {
          method:
            ((source.requestConfig as Record<string, unknown>)
              ?.method as string) || "GET",
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new BadGatewayException(
            `HTTP ${response.status}: ${response.statusText}`,
          );
        }

        data = await response.json();
      } finally {
        clearTimeout(timeout);
      }

      // Handle response: if it's an array, return directly; if object with data key, extract
      if (Array.isArray(data)) {
        return data;
      }
      if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.data))
          return obj.data as Record<string, unknown>[];
        if (Array.isArray(obj.items))
          return obj.items as Record<string, unknown>[];
        if (Array.isArray(obj.results))
          return obj.results as Record<string, unknown>[];
      }

      return [];
    } catch (err) {
      throw new BadGatewayException(
        `Failed to fetch source data: ${err instanceof Error ? err.message : String(err)}`,
      );
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
        name: (record.name as string) || "",
        code: (record.code as string) || null,
        data: record,
      };
    }

    const result: Record<string, unknown> = {};
    let name = "";
    let code: string | null = null;

    for (const [targetField, sourceField] of Object.entries(columnMapping)) {
      const value = record[sourceField as string];
      if (targetField === "name") {
        name = (value as string) || "";
      } else if (targetField === "code") {
        code = (value as string) || null;
      } else {
        result[targetField] = value;
      }
    }

    return { name, code, data: result };
  }
}
