/**
 * Transaction Create Service
 * Handles transaction lifecycle: create, payment, dispense, cancel, refund, fiscalize
 * Split from transactions.service.ts
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Transaction,
  TransactionItem,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from "./entities/transaction.entity";
import {
  CreateTransactionDto,
  ProcessPaymentDto,
  DispenseResultDto,
} from "./transactions.service";
import { TransactionQueryService } from "./transaction-query.service";
import {
  Recipe,
  RecipeIngredient,
  RecipeType,
  IngredientBatch,
} from "../products/entities/product.entity";
import { SaleIngredient } from "./entities/sale-ingredient.entity";
import { ContainersService } from "../containers/containers.service";

// Interface for item metadata with dispense status
interface ItemMetadata {
  dispenseStatus?:
    | "pending"
    | "dispensing"
    | "dispensed"
    | "failed"
    | "partial";
  dispensedQuantity?: number;
  dispenseError?: string;
  dispenseErrorMessage?: string;
  dispensedAt?: string;
}

@Injectable()
export class TransactionCreateService {
  private readonly logger = new Logger(TransactionCreateService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionItem)
    private itemRepo: Repository<TransactionItem>,
    @InjectRepository(Recipe)
    private recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private recipeIngredientRepo: Repository<RecipeIngredient>,
    @InjectRepository(IngredientBatch)
    private ingredientBatchRepo: Repository<IngredientBatch>,
    @InjectRepository(SaleIngredient)
    private saleIngredientRepo: Repository<SaleIngredient>,
    private readonly containersService: ContainersService,
    private eventEmitter: EventEmitter2,
    private readonly queryService: TransactionQueryService,
    private dataSource: DataSource,
  ) {}

  /**
   * Create new transaction (when customer starts purchase)
   */
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    // Calculate totals
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const itemCount = dto.items.reduce((sum, item) => sum + item.quantity, 0);

    const transaction = this.transactionRepo.create({
      organizationId: dto.organizationId,
      machineId: dto.machineId,
      type: TransactionType.SALE,
      status: TransactionStatus.PENDING,
      amount: subtotal,
      totalAmount: subtotal,
      quantity: itemCount,
      currency: dto.currency || "UZS",
      transactionDate: new Date(),
      metadata: {
        customerPhone: dto.customerPhone,
        customerTelegramId: dto.customerTelegramId,
        sessionId: dto.sessionId,
        locationId: dto.locationId,
      },
    });

    const saved = await this.transactionRepo.save(transaction);

    // Create items
    for (const item of dto.items) {
      const transactionItem = this.itemRepo.create({
        transactionId: saved.id,
        productId: item.productId,
        productName: item.productName,
        ...(item.productSku !== undefined && { sku: item.productSku }),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.unitPrice * item.quantity,
        slotNumber: String(item.slotNumber),
        metadata: { dispenseStatus: "pending" },
      });
      await this.itemRepo.save(transactionItem);
    }

    this.eventEmitter.emit("transaction.created", saved);

    return this.queryService.findById(saved.id);
  }

  /**
   * Process payment for transaction
   */
  async processPayment(dto: ProcessPaymentDto): Promise<Transaction> {
    const transaction = await this.queryService.findById(dto.transactionId);

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException("Транзакция уже обработана");
    }

    // Update transaction with payment info
    transaction.paymentMethod = dto.method;
    if (dto.providerTransactionId) {
      transaction.paymentId = dto.providerTransactionId;
    }
    transaction.metadata = {
      ...transaction.metadata,
      paymentData: dto.providerData,
    };

    // For cash payments, mark as completed immediately
    if (dto.method === PaymentMethod.CASH) {
      transaction.status = TransactionStatus.COMPLETED;
      await this.transactionRepo.save(transaction);
      this.eventEmitter.emit("transaction.paid", transaction);
    } else {
      transaction.status = TransactionStatus.PROCESSING;
      await this.transactionRepo.save(transaction);
    }

    return this.queryService.findById(transaction.id);
  }

  /**
   * Confirm payment from provider callback
   */
  async confirmPayment(
    providerTransactionId: string,
    provider: string,
    success: boolean,
    providerData?: Record<string, unknown>,
  ): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);
      const transaction = await txRepo.findOne({
        where: { paymentId: providerTransactionId },
        lock: { mode: "pessimistic_write" },
      });

      if (!transaction) {
        throw new NotFoundException("Транзакция не найдена");
      }

      transaction.metadata = {
        ...transaction.metadata,
        paymentProvider: provider,
        paymentConfirmedAt: new Date().toISOString(),
        ...providerData,
      };

      if (success) {
        transaction.status = TransactionStatus.COMPLETED;
        await txRepo.save(transaction);
        this.eventEmitter.emit("transaction.paid", transaction);
      } else {
        // Payment failed
        transaction.status = TransactionStatus.FAILED;
        transaction.metadata = {
          ...transaction.metadata,
          failureReason: "Платёж отклонён",
        };
        await txRepo.save(transaction);
        this.eventEmitter.emit("transaction.failed", transaction);
      }

      return this.queryService.findById(transaction.id);
    });
  }

  /**
   * Record dispense result for an item
   */
  async recordDispense(dto: DispenseResultDto): Promise<Transaction> {
    const transaction = await this.queryService.findById(dto.transactionId);

    if (
      ![TransactionStatus.COMPLETED, TransactionStatus.PROCESSING].includes(
        transaction.status,
      )
    ) {
      throw new BadRequestException("Транзакция не оплачена");
    }

    // Update item status in metadata
    const item = await this.itemRepo.findOne({
      where: { id: dto.itemId, transactionId: dto.transactionId },
    });

    if (!item) {
      throw new NotFoundException("Товар транзакции не найден");
    }

    item.metadata = {
      ...item.metadata,
      dispenseStatus: dto.status,
      dispensedQuantity: dto.dispensedQuantity,
      dispenseError: dto.errorCode,
      dispenseErrorMessage: dto.errorMessage,
      dispensedAt: new Date().toISOString(),
    };
    await this.itemRepo.save(item);

    // Update transaction metadata
    transaction.metadata = {
      ...transaction.metadata,
      lastDispenseAt: new Date().toISOString(),
    };

    // Update transaction status based on all items
    const items = await this.itemRepo.find({
      where: { transactionId: transaction.id },
    });
    const allDispensed = items.every(
      (i) => (i.metadata as ItemMetadata)?.dispenseStatus === "dispensed",
    );
    const anyFailed = items.some(
      (i) => (i.metadata as ItemMetadata)?.dispenseStatus === "failed",
    );

    if (allDispensed) {
      transaction.status = TransactionStatus.COMPLETED;
      this.eventEmitter.emit("transaction.completed", transaction);

      // Deduct ingredients from batches (FIFO), track COGS, sync containers
      await this.deductIngredients(
        items,
        transaction.id,
        transaction.organizationId,
        transaction.machineId,
      );
    } else if (anyFailed) {
      transaction.status = TransactionStatus.PARTIALLY_REFUNDED;
      this.eventEmitter.emit("transaction.partial", transaction);
    }

    await this.transactionRepo.save(transaction);

    return this.queryService.findById(transaction.id);
  }

  /**
   * Cancel transaction
   */
  async cancel(id: string, reason: string): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);
      const transaction = await txRepo.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });

      if (!transaction) {
        throw new NotFoundException("Транзакция не найдена");
      }

      if (
        [TransactionStatus.COMPLETED, TransactionStatus.REFUNDED].includes(
          transaction.status,
        )
      ) {
        throw new BadRequestException(
          "Невозможно отменить завершённую транзакцию",
        );
      }

      transaction.status = TransactionStatus.CANCELLED;
      transaction.metadata = {
        ...transaction.metadata,
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
      };

      await txRepo.save(transaction);

      this.eventEmitter.emit("transaction.cancelled", transaction);

      return this.queryService.findById(id);
    });
  }

  /**
   * Create refund for transaction
   */
  async createRefund(
    transactionId: string,
    amount: number,
    reason: string,
  ): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);

      // Lock original transaction to prevent concurrent refunds
      const transaction = await txRepo.findOne({
        where: { id: transactionId },
        lock: { mode: "pessimistic_write" },
      });

      if (!transaction) {
        throw new NotFoundException("Транзакция не найдена");
      }

      // Create refund transaction
      const refundTransaction = txRepo.create({
        organizationId: transaction.organizationId,
        machineId: transaction.machineId,
        type: TransactionType.REFUND,
        status: TransactionStatus.PENDING,
        amount,
        totalAmount: amount,
        currency: transaction.currency,
        originalTransactionId: transactionId,
        refundReason: reason,
        transactionDate: new Date(),
      });

      const saved = await txRepo.save(refundTransaction);

      // Update original transaction
      transaction.refundedAmount = (transaction.refundedAmount || 0) + amount;
      transaction.refundedAt = new Date();
      if (transaction.refundedAmount >= transaction.totalAmount) {
        transaction.status = TransactionStatus.REFUNDED;
      } else {
        transaction.status = TransactionStatus.PARTIALLY_REFUNDED;
      }
      await txRepo.save(transaction);

      this.eventEmitter.emit("transaction.refund.requested", {
        transaction,
        refund: saved,
      });

      return saved;
    });
  }

  /**
   * Process a pending refund
   */
  async processRefund(
    refundId: string,
    success: boolean,
    referenceNumber?: string,
  ): Promise<Transaction> {
    const refund = await this.transactionRepo.findOne({
      where: { id: refundId, type: TransactionType.REFUND },
    });
    if (!refund) {
      throw new NotFoundException("Возврат не найден");
    }

    refund.status = success
      ? TransactionStatus.COMPLETED
      : TransactionStatus.FAILED;
    refund.metadata = {
      ...refund.metadata,
      processedAt: new Date().toISOString(),
      referenceNumber,
    };

    await this.transactionRepo.save(refund);

    return refund;
  }

  /**
   * Record fiscal data for a transaction
   */
  async fiscalize(
    transactionId: string,
    fiscalData: Partial<{
      receiptNumber: string;
      fiscalSign: string;
      qrCode: string;
      ofdName: string;
    }>,
  ): Promise<Transaction> {
    const transaction = await this.queryService.findById(transactionId);

    transaction.isFiscalized = true;
    if (fiscalData.receiptNumber)
      transaction.fiscalReceiptNumber = fiscalData.receiptNumber;
    if (fiscalData.fiscalSign) transaction.fiscalSign = fiscalData.fiscalSign;
    if (fiscalData.qrCode) transaction.fiscalQrCode = fiscalData.qrCode;
    transaction.fiscalizedAt = new Date();
    transaction.fiscalData = {
      ...transaction.fiscalData,
      ...(fiscalData.ofdName !== undefined && { ofdName: fiscalData.ofdName }),
    };

    return this.transactionRepo.save(transaction);
  }

  /**
   * Update transaction metadata
   */
  async update(
    id: string,
    data: Partial<{
      metadata: Record<string, unknown>;
      notes: string;
      operatorId: string;
    }>,
  ): Promise<Transaction> {
    const transaction = await this.queryService.findById(id);

    if (data.metadata) {
      transaction.metadata = { ...transaction.metadata, ...data.metadata };
    }
    if (data.notes !== undefined) {
      transaction.notes = data.notes;
    }
    if (data.operatorId) {
      transaction.userId = data.operatorId;
    }

    await this.transactionRepo.save(transaction);
    return this.queryService.findById(id);
  }

  /**
   * Soft delete transaction (for cancelled/test transactions only)
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const transaction = await this.transactionRepo.findOne({
      where: { id, organizationId },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    if (
      ![TransactionStatus.CANCELLED, TransactionStatus.FAILED].includes(
        transaction.status,
      )
    ) {
      throw new BadRequestException(
        "Можно удалить только отменённые или неудачные транзакции",
      );
    }

    await this.transactionRepo.softDelete(id);
    this.logger.log(`Transaction ${id} soft deleted`);
  }

  /**
   * Deduct recipe ingredients from batches using FIFO for dispensed items.
   * Creates SaleIngredient records for COGS (Cost of Goods Sold) tracking.
   * Syncs container levels on the machine (Phase 4).
   * Emits 'sale.cogs.calculated' event with total cost for EXPENSE transaction creation.
   */
  private async deductIngredients(
    items: TransactionItem[],
    transactionId: string,
    organizationId: string,
    machineId?: string,
  ): Promise<void> {
    let totalCogs = 0;
    const saleIngredients: SaleIngredient[] = [];

    // Phase 4: Pre-load machine containers for ingredient→container mapping
    let containerMap: Map<string, { id: string }> | null = null;
    if (machineId) {
      try {
        const containers = await this.containersService.findByMachine(
          machineId,
          organizationId,
        );
        containerMap = new Map();
        for (const c of containers) {
          if (c.nomenclatureId) {
            containerMap.set(c.nomenclatureId, { id: c.id });
          }
        }
      } catch {
        this.logger.warn(
          `Could not load containers for machine ${machineId}, skipping container sync`,
        );
      }
    }

    for (const item of items) {
      try {
        const recipe = await this.recipeRepo.findOne({
          where: { productId: item.productId, typeCode: RecipeType.PRIMARY },
        });
        if (!recipe) continue;

        const ingredients = await this.recipeIngredientRepo.find({
          where: { recipeId: recipe.id },
        });

        for (const ingredient of ingredients) {
          let remaining = Number(ingredient.quantity) * item.quantity;

          // Phase 4: Find matching container on this machine
          const matchedContainer = containerMap?.get(ingredient.ingredientId);

          // FIFO: oldest batches first
          const batches = await this.ingredientBatchRepo.find({
            where: { productId: ingredient.ingredientId },
            order: { createdAt: "ASC" },
          });

          for (const batch of batches) {
            if (remaining <= 0) break;
            const available = Number(batch.remainingQuantity);
            if (available <= 0) continue;

            const deduct = Math.min(available, remaining);
            batch.remainingQuantity = available - deduct;
            remaining -= deduct;
            await this.ingredientBatchRepo.save(batch);

            // Track cost from this batch deduction
            const unitCost = Number(batch.purchasePrice) || 0;
            const costTotal = deduct * unitCost;
            totalCogs += costTotal;

            // Create SaleIngredient record for COGS tracking
            if (unitCost > 0) {
              const saleIngredient = this.saleIngredientRepo.create({
                organizationId,
                transactionId,
                ingredientId: ingredient.ingredientId,
                batchId: batch.id,
                containerId: matchedContainer?.id ?? null,
                quantityUsed: deduct,
                unitCostAtTime: unitCost,
                costTotal,
              });
              saleIngredients.push(saleIngredient);
            }
          }

          // Phase 4: Deduct from machine container
          if (matchedContainer) {
            const totalDeducted =
              Number(ingredient.quantity) * item.quantity - remaining;
            if (totalDeducted > 0) {
              try {
                await this.containersService.deductQuantity(
                  matchedContainer.id,
                  totalDeducted,
                  organizationId,
                );
              } catch (err) {
                this.logger.warn(
                  `Container deduct failed for ${matchedContainer.id}: ` +
                    `${err instanceof Error ? err.message : err}`,
                );
              }
            }
          }

          if (remaining > 0) {
            this.logger.warn(
              `Insufficient ingredient stock for product ${item.productId}, ingredient ${ingredient.ingredientId}: short by ${remaining}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to deduct ingredients for item ${item.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    // Batch save all SaleIngredient records
    if (saleIngredients.length > 0) {
      await this.saleIngredientRepo.save(saleIngredients);

      this.logger.log(
        `COGS tracked for transaction ${transactionId}: ${saleIngredients.length} ingredients, total cost ${totalCogs} UZS`,
      );
    }

    // Emit COGS event for automatic EXPENSE transaction creation + auto task check
    if (totalCogs > 0) {
      this.eventEmitter.emit("sale.cogs.calculated", {
        transactionId,
        organizationId,
        totalCost: totalCogs,
        ingredientCount: saleIngredients.length,
      });
    }
  }
}
