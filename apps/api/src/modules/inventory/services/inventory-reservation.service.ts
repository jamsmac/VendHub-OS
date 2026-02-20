/**
 * Inventory Reservation Sub-Service
 *
 * Handles all reservation lifecycle operations:
 * create, confirm, fulfill, cancel, expire (CRON),
 * and reservation queries/summaries.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, In, LessThanOrEqual } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  WarehouseInventory,
  OperatorInventory,
  InventoryMovement,
  InventoryReservation,
  MovementType,
  ReservationStatus,
  InventoryLevel,
} from "../entities/inventory.entity";
import type { CreateReservationDto } from "../inventory.service";

@Injectable()
export class InventoryReservationService {
  private readonly logger = new Logger(InventoryReservationService.name);

  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly warehouseRepo: Repository<WarehouseInventory>,
    @InjectRepository(OperatorInventory)
    private readonly operatorRepo: Repository<OperatorInventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @InjectRepository(InventoryReservation)
    private readonly reservationRepo: Repository<InventoryReservation>,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================================================
  // RESERVATION MUTATIONS
  // ==========================================================================

  /**
   * Create inventory reservation for a task
   */
  async createReservation(
    dto: CreateReservationDto,
  ): Promise<InventoryReservation> {
    return this.dataSource.transaction(async (manager) => {
      // Validate available quantity based on level
      if (dto.inventoryLevel === InventoryLevel.WAREHOUSE) {
        const warehouse = await manager.findOne(WarehouseInventory, {
          where: {
            organizationId: dto.organizationId,
            productId: dto.productId,
          },
          lock: { mode: "pessimistic_write" },
        });

        if (!warehouse || warehouse.availableQuantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient warehouse stock for reservation. Available: ${warehouse?.availableQuantity || 0}`,
          );
        }

        // Increase reserved quantity
        warehouse.reservedQuantity =
          Number(warehouse.reservedQuantity) + dto.quantity;
        await manager.save(WarehouseInventory, warehouse);
      } else if (dto.inventoryLevel === InventoryLevel.OPERATOR) {
        const operator = await manager.findOne(OperatorInventory, {
          where: {
            organizationId: dto.organizationId,
            operatorId: dto.referenceId,
            productId: dto.productId,
          },
          lock: { mode: "pessimistic_write" },
        });

        if (!operator || operator.availableQuantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient operator stock for reservation. Available: ${operator?.availableQuantity || 0}`,
          );
        }

        // Increase reserved quantity
        operator.reservedQuantity =
          Number(operator.reservedQuantity) + dto.quantity;
        await manager.save(OperatorInventory, operator);
      }

      // Create reservation record
      const reservation = manager.create(InventoryReservation, {
        organizationId: dto.organizationId,
        taskId: dto.taskId,
        productId: dto.productId,
        quantityReserved: dto.quantity,
        quantityFulfilled: 0,
        status: ReservationStatus.PENDING,
        inventoryLevel: dto.inventoryLevel,
        referenceId: dto.referenceId,
        expiresAt: dto.expiresAt,
        notes: dto.notes,
        createdByUserId: dto.createdByUserId,
      });

      await manager.save(InventoryReservation, reservation);

      // Create movement record for reservation
      const movement = manager.create(InventoryMovement, {
        organizationId: dto.organizationId,
        movementType:
          dto.inventoryLevel === InventoryLevel.WAREHOUSE
            ? MovementType.WAREHOUSE_RESERVATION
            : MovementType.OPERATOR_RESERVATION,
        productId: dto.productId,
        quantity: dto.quantity,
        performedByUserId: dto.createdByUserId,
        operatorId:
          dto.inventoryLevel === InventoryLevel.OPERATOR
            ? dto.referenceId
            : undefined,
        taskId: dto.taskId,
        operationDate: new Date(),
        notes: `Reservation created: ${dto.quantity}`,
      });

      await manager.save(InventoryMovement, movement);

      this.logger.log(
        `Reservation created: task=${dto.taskId}, product=${dto.productId}, qty=${dto.quantity}`,
      );

      return reservation;
    });
  }

  /**
   * Fulfill reservation (mark as completed)
   */
  async fulfillReservation(
    reservationId: string,
    fulfilledQuantity: number,
    _userId?: string,
  ): Promise<InventoryReservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(InventoryReservation, {
        where: { id: reservationId },
        lock: { mode: "pessimistic_write" },
      });

      if (!reservation) {
        throw new NotFoundException(`Reservation ${reservationId} not found`);
      }

      if (!reservation.isActive) {
        throw new BadRequestException(
          `Reservation ${reservationId} is not active (status: ${reservation.status})`,
        );
      }

      // Compute release quantity BEFORE updating quantityFulfilled
      const previousRemaining =
        Number(reservation.quantityReserved) -
        Number(reservation.quantityFulfilled);
      const releaseQty = Math.min(fulfilledQuantity, previousRemaining);

      // Update reservation
      reservation.quantityFulfilled =
        Number(reservation.quantityFulfilled) + fulfilledQuantity;

      if (reservation.quantityFulfilled >= reservation.quantityReserved) {
        reservation.status = ReservationStatus.FULFILLED;
        reservation.fulfilledAt = new Date();
      } else {
        reservation.status = ReservationStatus.PARTIALLY_FULFILLED;
      }

      await manager.save(InventoryReservation, reservation);

      // Release reserved quantity from inventory

      if (reservation.inventoryLevel === InventoryLevel.WAREHOUSE) {
        const warehouse = await manager.findOne(WarehouseInventory, {
          where: {
            organizationId: reservation.organizationId,
            productId: reservation.productId,
          },
          lock: { mode: "pessimistic_write" },
        });

        if (warehouse) {
          warehouse.reservedQuantity = Math.max(
            0,
            Number(warehouse.reservedQuantity) - releaseQty,
          );
          await manager.save(WarehouseInventory, warehouse);
        }
      } else if (reservation.inventoryLevel === InventoryLevel.OPERATOR) {
        const operator = await manager.findOne(OperatorInventory, {
          where: {
            organizationId: reservation.organizationId,
            operatorId: reservation.referenceId,
            productId: reservation.productId,
          },
          lock: { mode: "pessimistic_write" },
        });

        if (operator) {
          operator.reservedQuantity = Math.max(
            0,
            Number(operator.reservedQuantity) - releaseQty,
          );
          await manager.save(OperatorInventory, operator);
        }
      }

      this.logger.log(
        `Reservation fulfilled: id=${reservationId}, qty=${fulfilledQuantity}`,
      );

      return reservation;
    });
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(
    reservationId: string,
    reason?: string,
    userId?: string,
  ): Promise<InventoryReservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(InventoryReservation, {
        where: { id: reservationId },
        lock: { mode: "pessimistic_write" },
      });

      if (!reservation) {
        throw new NotFoundException(`Reservation ${reservationId} not found`);
      }

      if (!reservation.isActive) {
        throw new BadRequestException(
          `Reservation ${reservationId} is already inactive`,
        );
      }

      const releaseQty = reservation.quantityRemaining;

      // Release reserved quantity from inventory
      if (reservation.inventoryLevel === InventoryLevel.WAREHOUSE) {
        const warehouse = await manager.findOne(WarehouseInventory, {
          where: {
            organizationId: reservation.organizationId,
            productId: reservation.productId,
          },
          lock: { mode: "pessimistic_write" },
        });

        if (warehouse) {
          warehouse.reservedQuantity = Math.max(
            0,
            Number(warehouse.reservedQuantity) - releaseQty,
          );
          await manager.save(WarehouseInventory, warehouse);
        }
      } else if (reservation.inventoryLevel === InventoryLevel.OPERATOR) {
        const operator = await manager.findOne(OperatorInventory, {
          where: {
            organizationId: reservation.organizationId,
            operatorId: reservation.referenceId,
            productId: reservation.productId,
          },
          lock: { mode: "pessimistic_write" },
        });

        if (operator) {
          operator.reservedQuantity = Math.max(
            0,
            Number(operator.reservedQuantity) - releaseQty,
          );
          await manager.save(OperatorInventory, operator);
        }
      }

      // Update reservation status
      reservation.status = ReservationStatus.CANCELLED;
      reservation.cancelledAt = new Date();
      if (reason) {
        reservation.notes = reason;
      }
      await manager.save(InventoryReservation, reservation);

      // Create movement record
      const movement = manager.create(InventoryMovement, {
        organizationId: reservation.organizationId,
        movementType:
          reservation.inventoryLevel === InventoryLevel.WAREHOUSE
            ? MovementType.WAREHOUSE_RESERVATION_RELEASE
            : MovementType.OPERATOR_RESERVATION_RELEASE,
        productId: reservation.productId,
        quantity: releaseQty,
        performedByUserId: userId,
        operatorId:
          reservation.inventoryLevel === InventoryLevel.OPERATOR
            ? reservation.referenceId
            : undefined,
        taskId: reservation.taskId,
        operationDate: new Date(),
        notes: `Reservation cancelled: ${releaseQty}`,
      });

      await manager.save(InventoryMovement, movement);

      this.logger.log(`Reservation cancelled: id=${reservationId}`);

      return reservation;
    });
  }

  /**
   * Confirm a pending reservation
   * Optionally adjust the reserved quantity
   */
  async confirmReservation(
    reservationId: string,
    adjustedQuantity?: number,
  ): Promise<InventoryReservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(InventoryReservation, {
        where: { id: reservationId },
        lock: { mode: "pessimistic_write" },
      });

      if (!reservation) {
        throw new NotFoundException(`Reservation ${reservationId} not found`);
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(
          `Reservation ${reservationId} is not in PENDING status (current: ${reservation.status})`,
        );
      }

      // If adjustedQuantity is provided, adjust reserved quantity on inventory
      if (
        adjustedQuantity !== undefined &&
        adjustedQuantity !== Number(reservation.quantityReserved)
      ) {
        const originalQty = Number(reservation.quantityReserved);
        const difference = adjustedQuantity - originalQty;

        if (reservation.inventoryLevel === InventoryLevel.WAREHOUSE) {
          const warehouse = await manager.findOne(WarehouseInventory, {
            where: {
              organizationId: reservation.organizationId,
              productId: reservation.productId,
            },
            lock: { mode: "pessimistic_write" },
          });

          if (warehouse) {
            if (difference > 0 && warehouse.availableQuantity < difference) {
              throw new BadRequestException(
                `Insufficient warehouse stock to increase reservation. Available: ${warehouse.availableQuantity}, Additional needed: ${difference}`,
              );
            }
            warehouse.reservedQuantity = Math.max(
              0,
              Number(warehouse.reservedQuantity) + difference,
            );
            await manager.save(WarehouseInventory, warehouse);
          }
        } else if (reservation.inventoryLevel === InventoryLevel.OPERATOR) {
          const operator = await manager.findOne(OperatorInventory, {
            where: {
              organizationId: reservation.organizationId,
              operatorId: reservation.referenceId,
              productId: reservation.productId,
            },
            lock: { mode: "pessimistic_write" },
          });

          if (operator) {
            if (difference > 0 && operator.availableQuantity < difference) {
              throw new BadRequestException(
                `Insufficient operator stock to increase reservation. Available: ${operator.availableQuantity}, Additional needed: ${difference}`,
              );
            }
            operator.reservedQuantity = Math.max(
              0,
              Number(operator.reservedQuantity) + difference,
            );
            await manager.save(OperatorInventory, operator);
          }
        }

        reservation.quantityReserved = adjustedQuantity;
      }

      reservation.status = ReservationStatus.CONFIRMED;
      await manager.save(InventoryReservation, reservation);

      this.logger.log(
        `Reservation confirmed: id=${reservationId}${adjustedQuantity !== undefined ? `, adjustedQty=${adjustedQuantity}` : ""}`,
      );

      return reservation;
    });
  }

  // ==========================================================================
  // RESERVATION QUERIES
  // ==========================================================================

  /**
   * Get reservations for task
   */
  async getReservationsByTask(
    organizationId: string,
    taskId: string,
  ): Promise<InventoryReservation[]> {
    return this.reservationRepo.find({
      where: { organizationId, taskId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get active reservations
   */
  async getActiveReservations(
    organizationId: string,
  ): Promise<InventoryReservation[]> {
    return this.reservationRepo.find({
      where: {
        organizationId,
        status: In([
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.PARTIALLY_FULFILLED,
        ]),
      },
      order: { createdAt: "DESC" },
      take: 100,
    });
  }

  /**
   * Get reservation by ID
   */
  async getReservationById(
    organizationId: string,
    id: string,
  ): Promise<InventoryReservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { organizationId, id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    return reservation;
  }

  /**
   * Get reservations with filters (paginated)
   */
  async getReservations(
    organizationId: string,
    filters?: {
      taskId?: string;
      productId?: string;
      status?: ReservationStatus;
      inventoryLevel?: InventoryLevel;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: InventoryReservation[]; total: number }> {
    const query = this.reservationRepo
      .createQueryBuilder("r")
      .where("r.organizationId = :organizationId", { organizationId });

    if (filters?.taskId) {
      query.andWhere("r.taskId = :taskId", { taskId: filters.taskId });
    }

    if (filters?.productId) {
      query.andWhere("r.productId = :productId", {
        productId: filters.productId,
      });
    }

    if (filters?.status) {
      query.andWhere("r.status = :status", { status: filters.status });
    }

    if (filters?.inventoryLevel) {
      query.andWhere("r.inventoryLevel = :inventoryLevel", {
        inventoryLevel: filters.inventoryLevel,
      });
    }

    const total = await query.getCount();

    query.orderBy("r.createdAt", "DESC");

    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    query.skip((page - 1) * limit).take(limit);

    const data = await query.getMany();

    return { data, total };
  }

  /**
   * Get reservations summary for organization
   */
  async getReservationsSummary(organizationId: string): Promise<{
    byStatus: Record<string, number>;
    totalActiveReservedQuantity: number;
    expiringWithin24h: number;
  }> {
    // Count by status
    const statusCounts = await this.reservationRepo
      .createQueryBuilder("r")
      .select("r.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("r.organizationId = :organizationId", { organizationId })
      .groupBy("r.status")
      .getRawMany();

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    // Total reserved quantity for active reservations
    const activeResult = await this.reservationRepo
      .createQueryBuilder("r")
      .select(
        "COALESCE(SUM(r.quantityReserved - r.quantityFulfilled), 0)",
        "totalReserved",
      )
      .where("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.status IN (:...statuses)", {
        statuses: [
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.PARTIALLY_FULFILLED,
        ],
      })
      .getRawOne();

    const totalActiveReservedQuantity = parseFloat(
      activeResult?.totalReserved || "0",
    );

    // Count expiring within 24 hours
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const expiringResult = await this.reservationRepo
      .createQueryBuilder("r")
      .where("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.status IN (:...statuses)", {
        statuses: [
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.PARTIALLY_FULFILLED,
        ],
      })
      .andWhere("r.expiresAt IS NOT NULL")
      .andWhere("r.expiresAt <= :in24h", { in24h })
      .andWhere("r.expiresAt > :now", { now })
      .getCount();

    return {
      byStatus,
      totalActiveReservedQuantity,
      expiringWithin24h: expiringResult,
    };
  }

  // ==========================================================================
  // CRON: EXPIRE OLD RESERVATIONS
  // ==========================================================================

  /**
   * Expire old reservations (CRON: every 10 minutes)
   * Finds PENDING or CONFIRMED reservations past their expiresAt
   * and releases the reserved quantities back to inventory.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireOldReservations(): Promise<void> {
    const now = new Date();

    // Find expired reservations
    const expiredReservations = await this.reservationRepo.find({
      where: [
        {
          status: ReservationStatus.PENDING,
          expiresAt: LessThanOrEqual(now),
        },
        {
          status: ReservationStatus.CONFIRMED,
          expiresAt: LessThanOrEqual(now),
        },
      ],
    });

    if (expiredReservations.length === 0) {
      return;
    }

    this.logger.log(
      `Expiring ${expiredReservations.length} old reservation(s)...`,
    );

    for (const reservation of expiredReservations) {
      try {
        await this.dataSource.transaction(async (manager) => {
          // Re-fetch with lock to avoid race conditions
          const locked = await manager.findOne(InventoryReservation, {
            where: { id: reservation.id },
            lock: { mode: "pessimistic_write" },
          });

          if (!locked || !locked.isActive) {
            return; // Already processed
          }

          const releaseQty = locked.quantityRemaining;

          // Release reserved quantity from inventory
          if (locked.inventoryLevel === InventoryLevel.WAREHOUSE) {
            const warehouse = await manager.findOne(WarehouseInventory, {
              where: {
                organizationId: locked.organizationId,
                productId: locked.productId,
              },
              lock: { mode: "pessimistic_write" },
            });

            if (warehouse) {
              warehouse.reservedQuantity = Math.max(
                0,
                Number(warehouse.reservedQuantity) - releaseQty,
              );
              await manager.save(WarehouseInventory, warehouse);
            }
          } else if (locked.inventoryLevel === InventoryLevel.OPERATOR) {
            const operator = await manager.findOne(OperatorInventory, {
              where: {
                organizationId: locked.organizationId,
                operatorId: locked.referenceId,
                productId: locked.productId,
              },
              lock: { mode: "pessimistic_write" },
            });

            if (operator) {
              operator.reservedQuantity = Math.max(
                0,
                Number(operator.reservedQuantity) - releaseQty,
              );
              await manager.save(OperatorInventory, operator);
            }
          }

          // Update reservation status
          locked.status = ReservationStatus.EXPIRED;
          await manager.save(InventoryReservation, locked);

          // Create movement record for release
          const movement = manager.create(InventoryMovement, {
            organizationId: locked.organizationId,
            movementType:
              locked.inventoryLevel === InventoryLevel.WAREHOUSE
                ? MovementType.WAREHOUSE_RESERVATION_RELEASE
                : MovementType.OPERATOR_RESERVATION_RELEASE,
            productId: locked.productId,
            quantity: releaseQty,
            operatorId:
              locked.inventoryLevel === InventoryLevel.OPERATOR
                ? locked.referenceId
                : undefined,
            taskId: locked.taskId,
            operationDate: new Date(),
            notes: `Reservation expired: ${releaseQty} released`,
          });

          await manager.save(InventoryMovement, movement);

          this.logger.log(
            `Reservation expired: id=${locked.id}, qty=${releaseQty}`,
          );
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to expire reservation ${reservation.id}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
