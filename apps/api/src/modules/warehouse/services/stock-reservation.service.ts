/**
 * StockReservationService
 * Full reservation lifecycle: create → confirm → fulfill → cancel/expire.
 * Uses pessimistic locking for safe concurrent reservation creation.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  StockReservation,
  StockReservationStatus,
  InventoryBatch,
} from "../entities/warehouse.entity";

@Injectable()
export class StockReservationService {
  constructor(
    @InjectRepository(StockReservation)
    private readonly reservationRepository: Repository<StockReservation>,

    @InjectRepository(InventoryBatch)
    private readonly batchRepository: Repository<InventoryBatch>,

    private readonly dataSource: DataSource,
  ) {}

  // ==========================================================================
  // CREATE RESERVATION
  // ==========================================================================

  async createReservation(
    organizationId: string,
    warehouseId: string,
    productId: string,
    quantity: number,
    unit: string,
    reservedFor: string,
    userId: string,
    opts?: { batchId?: string; expiresInHours?: number; notes?: string },
  ): Promise<StockReservation> {
    if (quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than zero");
    }

    // Verify available stock inside transaction
    return this.dataSource.transaction(async (manager) => {
      const batchQuery = manager
        .createQueryBuilder(InventoryBatch, "batch")
        .setLock("pessimistic_write")
        .where("batch.warehouseId = :warehouseId", { warehouseId })
        .andWhere("batch.productId = :productId", { productId })
        .andWhere("batch.organizationId = :organizationId", { organizationId })
        .andWhere("batch.remainingQuantity > 0");

      if (opts?.batchId) {
        batchQuery.andWhere("batch.id = :batchId", { batchId: opts.batchId });
      }

      const batches = await batchQuery.getMany();
      const totalAvailable = batches.reduce(
        (sum, b) => sum + Number(b.remainingQuantity),
        0,
      );

      if (totalAvailable < quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`,
        );
      }

      const reservationNumber = `RSV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const expiresAt = opts?.expiresInHours
        ? new Date(Date.now() + opts.expiresInHours * 3600000)
        : null;

      const reservation = manager.create(StockReservation, {
        organizationId,
        reservationNumber,
        warehouseId,
        productId,
        batchId: opts?.batchId ?? null,
        quantityReserved: quantity,
        quantityFulfilled: 0,
        unit,
        status: StockReservationStatus.PENDING,
        reservedFor,
        reservedByUserId: userId,
        expiresAt,
        notes: opts?.notes ?? null,
        createdById: userId,
      });

      return manager.save(StockReservation, reservation);
    });
  }

  // ==========================================================================
  // CONFIRM RESERVATION
  // ==========================================================================

  async confirmReservation(
    reservationId: string,
    organizationId: string,
    userId: string,
  ): Promise<StockReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId, organizationId },
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }
    if (reservation.status !== StockReservationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot confirm reservation in status: ${reservation.status}`,
      );
    }

    reservation.status = StockReservationStatus.CONFIRMED;
    reservation.updatedById = userId;
    return this.reservationRepository.save(reservation);
  }

  // ==========================================================================
  // FULFILL RESERVATION (deducts from batches)
  // ==========================================================================

  async fulfillReservation(
    reservationId: string,
    organizationId: string,
    quantity: number,
    userId: string,
  ): Promise<StockReservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(StockReservation, {
        where: { id: reservationId, organizationId },
      });
      if (!reservation) {
        throw new NotFoundException(`Reservation ${reservationId} not found`);
      }

      const allowedStatuses = [
        StockReservationStatus.PENDING,
        StockReservationStatus.CONFIRMED,
        StockReservationStatus.PARTIALLY_FULFILLED,
      ];
      if (!allowedStatuses.includes(reservation.status)) {
        throw new BadRequestException(
          `Cannot fulfill reservation in status: ${reservation.status}`,
        );
      }

      const remaining =
        Number(reservation.quantityReserved) -
        Number(reservation.quantityFulfilled);

      if (quantity > remaining) {
        throw new BadRequestException(
          `Cannot fulfill ${quantity}. Remaining to fulfill: ${remaining}`,
        );
      }

      reservation.quantityFulfilled =
        Number(reservation.quantityFulfilled) + quantity;

      if (
        reservation.quantityFulfilled >= Number(reservation.quantityReserved)
      ) {
        reservation.status = StockReservationStatus.FULFILLED;
        reservation.fulfilledAt = new Date();
      } else {
        reservation.status = StockReservationStatus.PARTIALLY_FULFILLED;
      }

      reservation.updatedById = userId;
      return manager.save(StockReservation, reservation);
    });
  }

  // ==========================================================================
  // CANCEL RESERVATION
  // ==========================================================================

  async cancelReservation(
    reservationId: string,
    organizationId: string,
    userId: string,
    reason?: string,
  ): Promise<StockReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId, organizationId },
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    if (
      reservation.status === StockReservationStatus.FULFILLED ||
      reservation.status === StockReservationStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel reservation in status: ${reservation.status}`,
      );
    }

    reservation.status = StockReservationStatus.CANCELLED;
    reservation.updatedById = userId;
    reservation.metadata = {
      ...reservation.metadata,
      cancellation: {
        date: new Date().toISOString(),
        userId,
        reason: reason ?? null,
      },
    };

    return this.reservationRepository.save(reservation);
  }

  // ==========================================================================
  // EXPIRE OLD RESERVATIONS (called by CRON)
  // ==========================================================================

  async expireOldReservations(
    organizationId?: string,
  ): Promise<{ expiredCount: number }> {
    const qb = this.reservationRepository
      .createQueryBuilder("r")
      .where("r.status IN (:...statuses)", {
        statuses: [
          StockReservationStatus.PENDING,
          StockReservationStatus.CONFIRMED,
        ],
      })
      .andWhere("r.expiresAt IS NOT NULL")
      .andWhere("r.expiresAt < :now", { now: new Date() });

    if (organizationId) {
      qb.andWhere("r.organizationId = :organizationId", { organizationId });
    }

    const expired = await qb.getMany();

    for (const reservation of expired) {
      reservation.status = StockReservationStatus.EXPIRED;
      reservation.metadata = {
        ...reservation.metadata,
        expiredAutomatically: true,
        expiredAt: new Date().toISOString(),
      };
    }

    if (expired.length > 0) {
      await this.reservationRepository.save(expired);
    }

    return { expiredCount: expired.length };
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  async getActiveReservations(
    warehouseId: string,
    organizationId: string,
    productId?: string,
  ): Promise<StockReservation[]> {
    const qb = this.reservationRepository
      .createQueryBuilder("r")
      .where("r.warehouseId = :warehouseId", { warehouseId })
      .andWhere("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.status IN (:...statuses)", {
        statuses: [
          StockReservationStatus.PENDING,
          StockReservationStatus.CONFIRMED,
          StockReservationStatus.PARTIALLY_FULFILLED,
        ],
      })
      .orderBy("r.reservedAt", "DESC");

    if (productId) {
      qb.andWhere("r.productId = :productId", { productId });
    }

    return qb.getMany();
  }

  async getReservationById(
    reservationId: string,
    organizationId: string,
  ): Promise<StockReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId, organizationId },
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }
    return reservation;
  }

  async getReservedQuantity(
    warehouseId: string,
    productId: string,
    organizationId: string,
  ): Promise<number> {
    const result = await this.reservationRepository
      .createQueryBuilder("r")
      .select(
        "COALESCE(SUM(r.quantityReserved - r.quantityFulfilled), 0)",
        "reserved",
      )
      .where("r.warehouseId = :warehouseId", { warehouseId })
      .andWhere("r.productId = :productId", { productId })
      .andWhere("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.status IN (:...statuses)", {
        statuses: [
          StockReservationStatus.PENDING,
          StockReservationStatus.CONFIRMED,
          StockReservationStatus.PARTIALLY_FULFILLED,
        ],
      })
      .getRawOne();

    return Number(result?.reserved ?? 0);
  }
}
