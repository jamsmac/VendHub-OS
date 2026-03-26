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
import { Repository } from "typeorm";
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
    private eventEmitter: EventEmitter2,
    private readonly queryService: TransactionQueryService,
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
        sku: item.productSku,
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
    const transaction = await this.transactionRepo.findOne({
      where: { paymentId: providerTransactionId },
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
      await this.transactionRepo.save(transaction);
      this.eventEmitter.emit("transaction.paid", transaction);
    } else {
      // Payment failed
      transaction.status = TransactionStatus.FAILED;
      transaction.metadata = {
        ...transaction.metadata,
        failureReason: "Платёж отклонён",
      };
      await this.transactionRepo.save(transaction);
      this.eventEmitter.emit("transaction.failed", transaction);
    }

    return this.queryService.findById(transaction.id);
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

      // Deduct ingredients from batches (FIFO) for dispensed items
      await this.deductIngredients(items);
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
    const transaction = await this.queryService.findById(id);

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

    await this.transactionRepo.save(transaction);

    this.eventEmitter.emit("transaction.cancelled", transaction);

    return this.queryService.findById(id);
  }

  /**
   * Create refund for transaction
   */
  async createRefund(
    transactionId: string,
    amount: number,
    reason: string,
  ): Promise<Transaction> {
    const transaction = await this.queryService.findById(transactionId);

    // Create refund transaction
    const refundTransaction = this.transactionRepo.create({
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

    const saved = await this.transactionRepo.save(refundTransaction);

    // Update original transaction
    transaction.refundedAmount = (transaction.refundedAmount || 0) + amount;
    transaction.refundedAt = new Date();
    if (transaction.refundedAmount >= transaction.totalAmount) {
      transaction.status = TransactionStatus.REFUNDED;
    } else {
      transaction.status = TransactionStatus.PARTIALLY_REFUNDED;
    }
    await this.transactionRepo.save(transaction);

    this.eventEmitter.emit("transaction.refund.requested", {
      transaction,
      refund: saved,
    });

    return saved;
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
      ofdName: fiscalData.ofdName,
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
   * Deduct recipe ingredients from batches using FIFO for dispensed items
   */
  private async deductIngredients(items: TransactionItem[]): Promise<void> {
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
  }
}
