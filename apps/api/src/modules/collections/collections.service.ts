/**
 * Collections Service
 * Двухэтапный сбор наличных из вендинговых автоматов
 *
 * Stage 1 (COLLECTED): Оператор регистрирует сбор через Telegram бот, GPS фиксируется
 * Stage 2 (RECEIVED): Менеджер принимает наличные и вводит сумму
 *
 * Anti-fraud: расстояние до автомата по Haversine, проверка дубликатов
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In, Between } from "typeorm";
import {
  Collection,
  CollectionHistory,
  CollectionStatus,
  CollectionSource,
} from "./entities/collection.entity";
import {
  CreateCollectionDto,
  ReceiveCollectionDto,
  EditCollectionDto,
  CancelCollectionDto,
  BulkCreateCollectionDto,
  BulkCancelCollectionDto,
  CollectionQueryDto,
} from "./dto/collection.dto";
import { MachinesService } from "../machines/machines.service";

/** Distance in meters above which a warning is logged */
const DISTANCE_WARNING_THRESHOLD = 50;
/** Default window in minutes for duplicate detection */
const DUPLICATE_WINDOW_MINUTES = 30;

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);

  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(CollectionHistory)
    private readonly historyRepo: Repository<CollectionHistory>,
    private readonly dataSource: DataSource,
    private readonly machinesService: MachinesService,
  ) {}

  // ============================================================================
  // STAGE 1: CREATE (Operator)
  // ============================================================================

  async create(
    organizationId: string,
    operatorId: string,
    dto: CreateCollectionDto,
  ): Promise<Collection> {
    // Check for duplicates within the time window
    if (!dto.skipDuplicateCheck) {
      const duplicate = await this.checkDuplicate(
        dto.machineId,
        new Date(dto.collectedAt),
      );
      if (duplicate) {
        throw new ConflictException({
          code: "DUPLICATE_COLLECTION",
          message: `A collection for this machine already exists within ${DUPLICATE_WINDOW_MINUTES} minutes`,
          existingId: duplicate.id,
        });
      }
    }

    // Calculate distance from machine if GPS provided
    let distanceFromMachine: number | null = null;
    if (dto.latitude != null && dto.longitude != null) {
      const machine = await this.machinesService.findById(dto.machineId);
      if (machine && machine.latitude != null && machine.longitude != null) {
        distanceFromMachine = this.calculateDistanceMeters(
          dto.latitude,
          dto.longitude,
          machine.latitude,
          machine.longitude,
        );
      }
    }

    const collection = this.collectionRepo.create({
      organizationId,
      machineId: dto.machineId,
      operatorId,
      collectedAt: new Date(dto.collectedAt),
      status: CollectionStatus.COLLECTED,
      source: dto.source ?? CollectionSource.REALTIME,
      notes: dto.notes ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      distanceFromMachine,
      createdById: operatorId,
    });

    const saved = await this.collectionRepo.save(collection);

    this.logger.log(
      `Collection ${saved.id} created by operator ${operatorId} for machine ${dto.machineId}`,
    );

    if (
      distanceFromMachine != null &&
      distanceFromMachine > DISTANCE_WARNING_THRESHOLD
    ) {
      this.logger.warn(
        `Collection ${saved.id}: operator is ${distanceFromMachine}m from machine (threshold: ${DISTANCE_WARNING_THRESHOLD}m)`,
      );
    }

    return saved;
  }

  // ============================================================================
  // BULK CREATE (Manager/Admin — historical import)
  // ============================================================================

  async bulkCreate(
    organizationId: string,
    userId: string,
    dto: BulkCreateCollectionDto,
  ): Promise<{ created: number; skipped: number }> {
    const source = dto.source ?? CollectionSource.MANUAL_HISTORY;
    let created = 0;
    let skipped = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const item of dto.collections) {
        const machineId = item.machineId;
        if (!machineId) {
          skipped++;
          continue;
        }

        const collection = manager.create(Collection, {
          organizationId,
          machineId,
          operatorId: userId,
          collectedAt: new Date(item.collectedAt),
          status: item.amount
            ? CollectionStatus.RECEIVED
            : CollectionStatus.COLLECTED,
          source,
          amount: item.amount ?? null,
          notes: item.notes ?? null,
          managerId: item.amount ? userId : null,
          receivedAt: item.amount ? new Date() : null,
          locationId: item.locationId ?? null,
          createdById: userId,
        });

        await manager.save(Collection, collection);
        created++;
      }
    });

    this.logger.log(
      `Bulk import: ${created} created, ${skipped} skipped for org ${organizationId}`,
    );

    return { created, skipped };
  }

  // ============================================================================
  // STAGE 2: RECEIVE (Manager)
  // ============================================================================

  async receive(
    id: string,
    organizationId: string,
    managerId: string,
    dto: ReceiveCollectionDto,
  ): Promise<Collection> {
    // Use pessimistic lock to prevent race conditions
    const collection = await this.dataSource.transaction(async (manager) => {
      const coll = await manager.findOne(Collection, {
        where: { id, organizationId },
        lock: { mode: "pessimistic_write" },
      });

      if (!coll) {
        throw new NotFoundException("Collection not found");
      }

      if (coll.status !== CollectionStatus.COLLECTED) {
        throw new BadRequestException(
          `Cannot receive collection with status "${coll.status}". Only COLLECTED collections can be received.`,
        );
      }

      // Update collection
      coll.managerId = managerId;
      coll.amount = dto.amount;
      coll.receivedAt = new Date();
      coll.status = CollectionStatus.RECEIVED;
      if (dto.notes) {
        coll.notes = dto.notes;
      }
      coll.updatedById = managerId;

      await manager.save(Collection, coll);

      // Audit trail: status change
      await manager.save(CollectionHistory, {
        collectionId: id,
        changedById: managerId,
        fieldName: "status",
        oldValue: CollectionStatus.COLLECTED,
        newValue: CollectionStatus.RECEIVED,
        reason: null,
      });

      // Audit trail: amount set
      await manager.save(CollectionHistory, {
        collectionId: id,
        changedById: managerId,
        fieldName: "amount",
        oldValue: null,
        newValue: String(dto.amount),
        reason: null,
      });

      return coll;
    });

    this.logger.log(
      `Collection ${id} received by manager ${managerId}, amount: ${dto.amount}`,
    );

    return collection;
  }

  // ============================================================================
  // EDIT (Manager/Admin)
  // ============================================================================

  async edit(
    id: string,
    organizationId: string,
    userId: string,
    dto: EditCollectionDto,
  ): Promise<Collection> {
    const collection = await this.collectionRepo.findOne({
      where: { id, organizationId },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    if (collection.status !== CollectionStatus.RECEIVED) {
      throw new BadRequestException("Only received collections can be edited");
    }

    const historyRecords: Partial<CollectionHistory>[] = [];

    if (dto.amount !== undefined && dto.amount !== collection.amount) {
      historyRecords.push({
        collectionId: id,
        changedById: userId,
        fieldName: "amount",
        oldValue: collection.amount != null ? String(collection.amount) : null,
        newValue: String(dto.amount),
        reason: dto.reason,
      });
      collection.amount = dto.amount;
    }

    if (dto.notes !== undefined && dto.notes !== collection.notes) {
      historyRecords.push({
        collectionId: id,
        changedById: userId,
        fieldName: "notes",
        oldValue: collection.notes,
        newValue: dto.notes,
        reason: dto.reason,
      });
      collection.notes = dto.notes;
    }

    if (historyRecords.length === 0) {
      return collection;
    }

    collection.updatedById = userId;
    await this.collectionRepo.save(collection);
    await this.historyRepo.save(
      historyRecords.map((h) => this.historyRepo.create(h)),
    );

    this.logger.log(
      `Collection ${id} edited by ${userId}: ${historyRecords.length} field(s) changed`,
    );

    return collection;
  }

  // ============================================================================
  // CANCEL
  // ============================================================================

  async cancel(
    id: string,
    organizationId: string,
    userId: string,
    dto?: CancelCollectionDto,
  ): Promise<Collection> {
    const collection = await this.collectionRepo.findOne({
      where: { id, organizationId },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    if (collection.status === CollectionStatus.CANCELLED) {
      throw new BadRequestException("Collection is already cancelled");
    }

    const oldStatus = collection.status;
    collection.status = CollectionStatus.CANCELLED;
    collection.updatedById = userId;

    await this.collectionRepo.save(collection);

    await this.historyRepo.save(
      this.historyRepo.create({
        collectionId: id,
        changedById: userId,
        fieldName: "status",
        oldValue: oldStatus,
        newValue: CollectionStatus.CANCELLED,
        reason: dto?.reason ?? null,
      }),
    );

    this.logger.log(`Collection ${id} cancelled by ${userId}`);

    return collection;
  }

  // ============================================================================
  // BULK CANCEL
  // ============================================================================

  async bulkCancel(
    organizationId: string,
    userId: string,
    dto: BulkCancelCollectionDto,
  ): Promise<{ cancelled: number }> {
    let collections: Collection[];

    if (dto.ids && dto.ids.length > 0) {
      collections = await this.collectionRepo.find({
        where: {
          id: In(dto.ids),
          organizationId,
        },
      });
    } else if (dto.useFilters) {
      const qb = this.collectionRepo
        .createQueryBuilder("c")
        .where("c.organizationId = :organizationId", { organizationId })
        .andWhere("c.status != :cancelled", {
          cancelled: CollectionStatus.CANCELLED,
        });

      if (dto.status) qb.andWhere("c.status = :status", { status: dto.status });
      if (dto.machineId)
        qb.andWhere("c.machineId = :machineId", {
          machineId: dto.machineId,
        });
      if (dto.operatorId)
        qb.andWhere("c.operatorId = :operatorId", {
          operatorId: dto.operatorId,
        });
      if (dto.source) qb.andWhere("c.source = :source", { source: dto.source });
      if (dto.from) qb.andWhere("c.collectedAt >= :from", { from: dto.from });
      if (dto.to) qb.andWhere("c.collectedAt <= :to", { to: dto.to });

      collections = await qb.getMany();
    } else {
      throw new BadRequestException(
        "Provide either 'ids' or set 'useFilters: true' with filter parameters",
      );
    }

    const cancellable = collections.filter(
      (c) => c.status !== CollectionStatus.CANCELLED,
    );

    if (cancellable.length === 0) {
      return { cancelled: 0 };
    }

    await this.dataSource.transaction(async (manager) => {
      for (const coll of cancellable) {
        const oldStatus = coll.status;
        coll.status = CollectionStatus.CANCELLED;
        coll.updatedById = userId;

        await manager.save(Collection, coll);
        await manager.save(
          CollectionHistory,
          manager.create(CollectionHistory, {
            collectionId: coll.id,
            changedById: userId,
            fieldName: "status",
            oldValue: oldStatus,
            newValue: CollectionStatus.CANCELLED,
            reason: dto.reason ?? "bulk_cancel",
          }),
        );
      }
    });

    this.logger.log(
      `Bulk cancel: ${cancellable.length} collections cancelled by ${userId}`,
    );

    return { cancelled: cancellable.length };
  }

  // ============================================================================
  // HARD DELETE (Admin only)
  // ============================================================================

  async remove(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const collection = await this.collectionRepo.findOne({
      where: { id, organizationId },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    // Write deletion record to history before removing
    await this.historyRepo.save(
      this.historyRepo.create({
        collectionId: id,
        changedById: userId,
        fieldName: "deleted",
        oldValue: JSON.stringify({
          status: collection.status,
          amount: collection.amount,
          machineId: collection.machineId,
        }),
        newValue: null,
        reason: "hard_delete",
      }),
    );

    await this.collectionRepo.remove(collection);

    this.logger.log(`Collection ${id} hard deleted by admin ${userId}`);
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  async findAll(
    organizationId: string,
    query: CollectionQueryDto,
    requesterId?: string,
    requesterRole?: string,
  ): Promise<{
    items: Collection[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.collectionRepo
      .createQueryBuilder("c")
      .where("c.organizationId = :organizationId", { organizationId });

    // IDOR guard: operators can only see their own collections
    if (requesterRole === "operator" && requesterId) {
      qb.andWhere("c.operatorId = :requesterId", { requesterId });
    }

    if (query.status)
      qb.andWhere("c.status = :status", { status: query.status });
    if (query.machineId)
      qb.andWhere("c.machineId = :machineId", { machineId: query.machineId });
    if (query.operatorId)
      qb.andWhere("c.operatorId = :operatorId", {
        operatorId: query.operatorId,
      });
    if (query.source)
      qb.andWhere("c.source = :source", { source: query.source });
    if (query.from) qb.andWhere("c.collectedAt >= :from", { from: query.from });
    if (query.to) qb.andWhere("c.collectedAt <= :to", { to: query.to });

    const sortBy = query.sortBy ?? "collectedAt";
    const sortOrder = query.sortOrder ?? "DESC";
    qb.orderBy(`c.${sortBy}`, sortOrder);

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPending(organizationId: string): Promise<Collection[]> {
    return this.collectionRepo.find({
      where: {
        organizationId,
        status: CollectionStatus.COLLECTED,
      },
      order: { collectedAt: "ASC" },
    });
  }

  async findByOperator(operatorId: string, date?: Date): Promise<Collection[]> {
    const today = date ?? new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return this.collectionRepo.find({
      where: {
        operatorId,
        collectedAt: Between(startOfDay, endOfDay),
      },
      order: { collectedAt: "DESC" },
    });
  }

  async findOne(id: string, organizationId?: string): Promise<Collection> {
    const where: Record<string, string> = { id };
    if (organizationId) where.organizationId = organizationId;

    const collection = await this.collectionRepo.findOne({
      where,
      relations: ["history"],
    });

    if (!collection) {
      throw new NotFoundException("Collection not found");
    }

    return collection;
  }

  async getHistory(id: string): Promise<CollectionHistory[]> {
    return this.historyRepo.find({
      where: { collectionId: id },
      order: { createdAt: "ASC" },
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  async checkDuplicate(
    machineId: string,
    collectedAt: Date,
  ): Promise<Collection | null> {
    const windowMs = DUPLICATE_WINDOW_MINUTES * 60 * 1000;
    const from = new Date(collectedAt.getTime() - windowMs);
    const to = new Date(collectedAt.getTime() + windowMs);

    return this.collectionRepo.findOne({
      where: {
        machineId,
        collectedAt: Between(from, to),
        status: In([CollectionStatus.COLLECTED, CollectionStatus.RECEIVED]),
      },
      order: { collectedAt: "DESC" },
    });
  }

  async countByMachine(machineId: string): Promise<number> {
    return this.collectionRepo.count({ where: { machineId } });
  }

  /**
   * Haversine formula: distance in meters between two GPS points
   */
  private calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ============================================================================
  // STATS
  // ============================================================================

  async getStats(organizationId: string): Promise<{
    totalCollections: number;
    totalReceived: number;
    pendingCount: number;
    totalAmount: number;
    todayCount: number;
    todayAmount: number;
  }> {
    const [totalCollections, totalReceived, pendingCount] = await Promise.all([
      this.collectionRepo.count({ where: { organizationId } }),
      this.collectionRepo.count({
        where: { organizationId, status: CollectionStatus.RECEIVED },
      }),
      this.collectionRepo.count({
        where: { organizationId, status: CollectionStatus.COLLECTED },
      }),
    ]);

    const totalAmountResult = await this.collectionRepo
      .createQueryBuilder("c")
      .select("COALESCE(SUM(c.amount), 0)", "total")
      .where("c.organizationId = :organizationId", { organizationId })
      .andWhere("c.status = :status", { status: CollectionStatus.RECEIVED })
      .getRawOne();

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayResult = await this.collectionRepo
      .createQueryBuilder("c")
      .select("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(c.amount), 0)", "amount")
      .where("c.organizationId = :organizationId", { organizationId })
      .andWhere("c.collectedAt >= :today", { today })
      .getRawOne();

    return {
      totalCollections,
      totalReceived,
      pendingCount,
      totalAmount: parseFloat(totalAmountResult?.total ?? "0"),
      todayCount: parseInt(todayResult?.count ?? "0", 10),
      todayAmount: parseFloat(todayResult?.amount ?? "0"),
    };
  }
}
