/**
 * Payme Payment Handler
 * JSON-RPC based integration with Payme (Paycom.uz)
 * Split from payments.service.ts
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import * as crypto from "crypto";

import {
  PaymentTransaction,
  PaymentProvider,
  PaymentTransactionStatus,
} from "./entities/payment-transaction.entity";
import { PaymeWebhookData, PaymentResult } from "./payments.service";

@Injectable()
export class PaymeHandler {
  private readonly logger = new Logger(PaymeHandler.name);

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    @InjectRepository(PaymentTransaction)
    private transactionRepo: Repository<PaymentTransaction>,
  ) {}

  /**
   * Create Payme transaction
   */
  async createPaymeTransaction(
    amount: number,
    orderId: string,
    organizationId?: string,
    machineId?: string,
    clientUserId?: string,
  ): Promise<PaymentResult> {
    const merchantId = this.configService.get<string>("PAYME_MERCHANT_ID");
    const baseUrl = this.configService.get<string>(
      "PAYME_CHECKOUT_URL",
      "https://checkout.paycom.uz",
    );

    if (!merchantId) {
      throw new BadRequestException("Payme integration not configured");
    }

    // Amount in tiyn (1 UZS = 100 tiyn)
    const amountInTiyn = Math.round(amount * 100);

    // Generate Payme checkout URL
    const params = Buffer.from(
      JSON.stringify({
        m: merchantId,
        ac: { order_id: orderId },
        a: amountInTiyn,
      }),
    ).toString("base64");

    // Create pending transaction record if organization context is available
    let transactionId: string | undefined;
    if (organizationId) {
      const transaction = this.transactionRepo.create({
        organizationId: organizationId,
        provider: PaymentProvider.PAYME,
        amount,
        currency: "UZS",
        status: PaymentTransactionStatus.PENDING,
        orderId: orderId,
        machineId: machineId || null,
        clientUserId: clientUserId || null,
        rawRequest: { amount, orderId, amountInTiyn },
      });
      const saved = await this.transactionRepo.save(transaction);
      transactionId = saved.id;
    }

    return {
      provider: "payme",
      status: "pending",
      amount,
      orderId,
      transactionId,
      checkoutUrl: `${baseUrl}/${params}`,
    };
  }

  /**
   * Verify Payme webhook signature (Basic Auth)
   */
  verifyPaymeSignature(authHeader: string | undefined): boolean {
    if (!authHeader) {
      this.logger.warn("Payme webhook: Missing Authorization header");
      return false;
    }

    const merchantKey = this.configService.get<string>("PAYME_MERCHANT_KEY");
    if (!merchantKey) {
      this.logger.error("Payme webhook: PAYME_MERCHANT_KEY not configured");
      return false;
    }

    // Payme uses Basic auth with merchant_id:key
    const merchantId = this.configService.get<string>("PAYME_MERCHANT_ID");
    const expectedAuth = Buffer.from(`${merchantId}:${merchantKey}`).toString(
      "base64",
    );

    if (!authHeader.startsWith("Basic ")) {
      return false;
    }

    const providedAuth = authHeader.substring(6);

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedAuth),
        Buffer.from(providedAuth),
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle Payme webhook (JSON-RPC)
   */
  async handlePaymeWebhook(
    data: PaymeWebhookData,
    authHeader?: string,
  ): Promise<Record<string, unknown>> {
    // Verify signature
    if (!this.verifyPaymeSignature(authHeader)) {
      throw new UnauthorizedException("Invalid Payme webhook signature");
    }

    this.logger.log(`Payme webhook: ${data.method}`);

    switch (data.method) {
      case "CheckPerformTransaction":
        return this.paymeCheckPerformTransaction(data);
      case "CreateTransaction":
        return this.paymeCreateTransaction(data);
      case "PerformTransaction":
        return this.paymePerformTransaction(data);
      case "CancelTransaction":
        return this.paymeCancelTransaction(data);
      case "CheckTransaction":
        return this.paymeCheckTransaction(data);
      default:
        return {
          error: {
            code: -32601,
            message: {
              ru: "Метод не найден",
              uz: "Metod topilmadi",
              en: "Method not found",
            },
          },
          id: data.id,
        };
    }
  }

  private async paymeCheckPerformTransaction(data: PaymeWebhookData) {
    const orderId = data.params.account?.order_id;
    if (!orderId) {
      return {
        error: {
          code: -31050,
          message: {
            ru: "Заказ не найден",
            uz: "Buyurtma topilmadi",
            en: "Order not found",
          },
        },
        id: data.id,
      };
    }

    const existing = await this.transactionRepo.findOne({
      where: { orderId: orderId, provider: PaymentProvider.PAYME },
    });

    if (!existing) {
      return {
        error: {
          code: -31050,
          message: {
            ru: "Заказ не найден",
            uz: "Buyurtma topilmadi",
            en: "Order not found",
          },
        },
        id: data.id,
      };
    }

    // Payme sends amount in tiyn (1 UZS = 100 tiyn)
    const expectedAmountTiyn = Math.round(existing.amount * 100);
    if (data.params.amount && data.params.amount !== expectedAmountTiyn) {
      return {
        error: {
          code: -31001,
          message: {
            ru: "Неверная сумма",
            uz: "Noto'g'ri summa",
            en: "Invalid amount",
          },
        },
        id: data.id,
      };
    }

    return {
      result: { allow: true },
      id: data.id,
    };
  }

  private async paymeCreateTransaction(data: PaymeWebhookData) {
    const orderId = data.params.account?.order_id;
    const paymeTransactionId = data.params.id;

    if (!orderId || !paymeTransactionId) {
      return {
        error: {
          code: -31050,
          message: {
            ru: "Неверные параметры",
            uz: "Noto'g'ri parametrlar",
            en: "Invalid parameters",
          },
        },
        id: data.id,
      };
    }

    // Check if transaction already exists with this providerTxId
    const existingByProvider = await this.transactionRepo.findOne({
      where: {
        providerTxId: paymeTransactionId,
        provider: PaymentProvider.PAYME,
      },
    });

    if (existingByProvider) {
      return {
        result: {
          create_time: existingByProvider.createdAt.getTime(),
          transaction: existingByProvider.id,
          state: 1,
        },
        id: data.id,
      };
    }

    // Find existing pending transaction for this order, or create new one
    let transaction = await this.transactionRepo.findOne({
      where: {
        orderId: orderId,
        provider: PaymentProvider.PAYME,
        status: PaymentTransactionStatus.PENDING,
      },
    });

    const createTime = Date.now();

    if (transaction) {
      transaction.providerTxId = paymeTransactionId;
      transaction.status = PaymentTransactionStatus.PROCESSING;
      transaction.rawRequest = data as unknown as Record<string, unknown>;
      await this.transactionRepo.save(transaction);
    } else {
      const amountUzs = data.params.amount ? data.params.amount / 100 : 0;
      transaction = this.transactionRepo.create({
        organizationId: "00000000-0000-0000-0000-000000000000",
        provider: PaymentProvider.PAYME,
        providerTxId: paymeTransactionId,
        amount: amountUzs,
        currency: "UZS",
        status: PaymentTransactionStatus.PROCESSING,
        orderId: orderId,
        rawRequest: data as unknown as Record<string, unknown>,
      });
      await this.transactionRepo.save(transaction);
    }

    return {
      result: {
        create_time: createTime,
        transaction: transaction.id,
        state: 1,
      },
      id: data.id,
    };
  }

  private async paymePerformTransaction(data: PaymeWebhookData) {
    const paymeTransactionId = data.params.id;
    if (!paymeTransactionId) {
      return {
        error: {
          code: -31003,
          message: {
            ru: "Транзакция не найдена",
            uz: "Tranzaksiya topilmadi",
            en: "Transaction not found",
          },
        },
        id: data.id,
      };
    }

    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(PaymentTransaction);
      const transaction = await txRepo.findOne({
        where: {
          providerTxId: paymeTransactionId,
          provider: PaymentProvider.PAYME,
        },
        lock: { mode: "pessimistic_write" },
      });

      if (!transaction) {
        return {
          error: {
            code: -31003,
            message: {
              ru: "Транзакция не найдена",
              uz: "Tranzaksiya topilmadi",
              en: "Transaction not found",
            },
          },
          id: data.id,
        };
      }

      // Already completed
      if (transaction.status === PaymentTransactionStatus.COMPLETED) {
        return {
          result: {
            transaction: transaction.id,
            perform_time: transaction.processedAt?.getTime() || Date.now(),
            state: 2,
          },
          id: data.id,
        };
      }

      // Mark as completed
      const performTime = Date.now();
      transaction.status = PaymentTransactionStatus.COMPLETED;
      transaction.processedAt = new Date(performTime);
      transaction.rawResponse = data as unknown as Record<string, unknown>;
      await txRepo.save(transaction);

      return {
        result: {
          transaction: transaction.id,
          perform_time: performTime,
          state: 2,
        },
        id: data.id,
      };
    });
  }

  private async paymeCancelTransaction(data: PaymeWebhookData) {
    const paymeTransactionId = data.params.id;
    if (!paymeTransactionId) {
      return {
        error: {
          code: -31003,
          message: {
            ru: "Транзакция не найдена",
            uz: "Tranzaksiya topilmadi",
            en: "Transaction not found",
          },
        },
        id: data.id,
      };
    }

    const transaction = await this.transactionRepo.findOne({
      where: {
        providerTxId: paymeTransactionId,
        provider: PaymentProvider.PAYME,
      },
    });

    if (!transaction) {
      return {
        error: {
          code: -31003,
          message: {
            ru: "Транзакция не найдена",
            uz: "Tranzaksiya topilmadi",
            en: "Transaction not found",
          },
        },
        id: data.id,
      };
    }

    const cancelTime = Date.now();
    const wasCompleted =
      transaction.status === PaymentTransactionStatus.COMPLETED;

    transaction.status = PaymentTransactionStatus.CANCELLED;
    transaction.rawResponse = data as unknown as Record<string, unknown>;
    transaction.errorMessage = `Cancelled by Payme, reason: ${data.params.reason}`;
    await this.transactionRepo.save(transaction);

    return {
      result: {
        transaction: transaction.id,
        cancel_time: cancelTime,
        state: wasCompleted ? -2 : -1,
      },
      id: data.id,
    };
  }

  private async paymeCheckTransaction(data: PaymeWebhookData) {
    const paymeTransactionId = data.params.id;
    if (!paymeTransactionId) {
      return {
        error: {
          code: -31003,
          message: {
            ru: "Транзакция не найдена",
            uz: "Tranzaksiya topilmadi",
            en: "Transaction not found",
          },
        },
        id: data.id,
      };
    }

    const transaction = await this.transactionRepo.findOne({
      where: {
        providerTxId: paymeTransactionId,
        provider: PaymentProvider.PAYME,
      },
    });

    if (!transaction) {
      return {
        error: {
          code: -31003,
          message: {
            ru: "Транзакция не найдена",
            uz: "Tranzaksiya topilmadi",
            en: "Transaction not found",
          },
        },
        id: data.id,
      };
    }

    let state: number;
    switch (transaction.status) {
      case PaymentTransactionStatus.PENDING:
      case PaymentTransactionStatus.PROCESSING:
        state = 1;
        break;
      case PaymentTransactionStatus.COMPLETED:
        state = 2;
        break;
      case PaymentTransactionStatus.CANCELLED:
        state = -1;
        break;
      default:
        state = 1;
    }

    return {
      result: {
        create_time: transaction.createdAt.getTime(),
        perform_time: transaction.processedAt?.getTime() || null,
        cancel_time:
          transaction.status === PaymentTransactionStatus.CANCELLED
            ? transaction.updatedAt.getTime()
            : null,
        transaction: transaction.id,
        state,
        reason:
          transaction.status === PaymentTransactionStatus.CANCELLED
            ? (transaction.metadata as Record<string, unknown>)
                ?.cancel_reason || null
            : null,
      },
      id: data.id,
    };
  }
}
