/**
 * Uzum Bank Payment Handler
 * REST/HMAC-SHA256 based integration with Uzum Bank
 * Split from payments.service.ts
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import * as crypto from "crypto";

import {
  PaymentTransaction,
  PaymentProvider,
  PaymentTransactionStatus,
} from "./entities/payment-transaction.entity";
import { UzumCreateDto } from "./dto/create-payment.dto";
import { UzumWebhookData, PaymentResult } from "./payments.service";
import { MetricsService } from "../metrics/metrics.service";

@Injectable()
export class UzumHandler {
  private readonly logger = new Logger(UzumHandler.name);

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    @InjectRepository(PaymentTransaction)
    private transactionRepo: Repository<PaymentTransaction>,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Create Uzum Bank checkout session
   */
  async createUzumTransaction(
    dto: UzumCreateDto,
    organizationId: string,
  ): Promise<PaymentResult> {
    const merchantId = this.configService.get<string>("UZUM_MERCHANT_ID");
    const secretKey = this.configService.get<string>("UZUM_SECRET_KEY");
    const apiUrl = this.configService.get<string>(
      "UZUM_API_URL",
      "https://api.uzumbank.uz",
    );

    if (!merchantId || !secretKey) {
      throw new BadRequestException("Uzum Bank integration not configured");
    }

    // Create pending transaction record
    const transaction = this.transactionRepo.create({
      organizationId: organizationId,
      provider: PaymentProvider.UZUM,
      amount: dto.amount,
      currency: "UZS",
      status: PaymentTransactionStatus.PENDING,
      orderId: dto.orderId,
      rawRequest: { ...dto, merchantId },
    });
    const saved = await this.transactionRepo.save(transaction);

    // Generate signature for Uzum checkout
    const signData = `${merchantId}:${saved.id}:${dto.amount}`;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(signData)
      .digest("hex");

    // Build checkout URL
    const returnUrl =
      dto.returnUrl || this.configService.get<string>("UZUM_RETURN_URL", "");
    const checkoutUrl = new URL(`${apiUrl}/checkout`);
    checkoutUrl.searchParams.set("merchant_id", merchantId);
    checkoutUrl.searchParams.set("transaction_id", saved.id);
    checkoutUrl.searchParams.set("amount", dto.amount.toString());
    checkoutUrl.searchParams.set("signature", signature);
    if (returnUrl) {
      checkoutUrl.searchParams.set("return_url", returnUrl);
    }

    return {
      provider: "uzum",
      status: "pending",
      amount: dto.amount,
      orderId: dto.orderId,
      transactionId: saved.id,
      checkoutUrl: checkoutUrl.toString(),
    };
  }

  /**
   * Verify Uzum webhook signature (HMAC SHA-256)
   */
  verifyUzumSignature(data: UzumWebhookData): boolean {
    const secretKey = this.configService.get<string>("UZUM_SECRET_KEY");
    if (!secretKey) {
      this.logger.error("Uzum webhook: UZUM_SECRET_KEY not configured");
      return false;
    }

    const { signature } = data;
    if (!signature) {
      return false;
    }

    // Uzum signature: HMAC-SHA256 of sorted payload fields
    const signData = `${data.transactionId}:${data.orderId}:${data.amount}:${data.status}`;
    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(signData)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle Uzum Bank webhook (REST-based)
   */
  async handleUzumWebhook(
    data: UzumWebhookData,
  ): Promise<Record<string, unknown>> {
    // Verify signature
    if (!this.verifyUzumSignature(data)) {
      this.logger.warn("Uzum webhook: Invalid signature");
      return {
        success: false,
        error: "Invalid signature",
      };
    }

    this.logger.log(
      `Uzum webhook: transactionId=${data.transactionId}, status=${data.status}`,
    );

    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(PaymentTransaction);

      // Find the transaction with pessimistic lock
      const transaction = await txRepo.findOne({
        where: { id: data.transactionId, provider: PaymentProvider.UZUM },
        lock: { mode: "pessimistic_write" },
      });

      if (!transaction) {
        this.logger.warn(
          `Uzum webhook: Transaction not found: ${data.transactionId}`,
        );
        return {
          success: false,
          error: "Transaction not found",
        };
      }

      // Idempotency: if transaction already in terminal state, return current status
      const terminalStatuses = [
        PaymentTransactionStatus.COMPLETED,
        PaymentTransactionStatus.FAILED,
        PaymentTransactionStatus.CANCELLED,
        PaymentTransactionStatus.REFUNDED,
      ];
      if (terminalStatuses.includes(transaction.status)) {
        this.logger.log(
          `Uzum webhook: Transaction ${transaction.id} already in terminal state ${transaction.status}, skipping`,
        );
        return {
          success: true,
          transactionId: transaction.id,
          status: transaction.status,
        };
      }

      // Update transaction based on Uzum status
      switch (data.status) {
        case "COMPLETED":
        case "SUCCESS":
          transaction.status = PaymentTransactionStatus.COMPLETED;
          transaction.processedAt = new Date();
          transaction.providerTxId = data.transactionId;
          break;
        case "FAILED":
        case "ERROR":
          transaction.status = PaymentTransactionStatus.FAILED;
          transaction.errorMessage = `Uzum payment failed: ${data.status}`;
          break;
        case "CANCELLED":
          transaction.status = PaymentTransactionStatus.CANCELLED;
          transaction.errorMessage = "Payment cancelled by user";
          break;
        default:
          transaction.status = PaymentTransactionStatus.PROCESSING;
      }

      transaction.rawResponse = data as Record<string, unknown>;
      await txRepo.save(transaction);

      // Payment metrics
      if (transaction.status === PaymentTransactionStatus.COMPLETED) {
        this.metricsService.paymentsTotal.inc({
          method: "uzum",
          result: "success",
        });
      } else if (transaction.status === PaymentTransactionStatus.FAILED) {
        this.metricsService.paymentsTotal.inc({
          method: "uzum",
          result: "failed",
        });
      }

      return {
        success: true,
        transactionId: transaction.id,
        status: transaction.status,
      };
    });
  }
}
