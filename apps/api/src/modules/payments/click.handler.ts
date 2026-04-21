/**
 * Click Payment Handler
 * REST/MD5 based integration with Click (my.click.uz)
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
import { ClickWebhookData, PaymentResult } from "./payments.service";
import { MetricsService } from "../metrics/metrics.service";

@Injectable()
export class ClickHandler {
  private readonly logger = new Logger(ClickHandler.name);

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    @InjectRepository(PaymentTransaction)
    private transactionRepo: Repository<PaymentTransaction>,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Create Click transaction
   */
  async createClickTransaction(
    amount: number,
    orderId: string,
    organizationId?: string,
    machineId?: string,
    clientUserId?: string,
  ): Promise<PaymentResult> {
    const merchantId = this.configService.get<string>("CLICK_MERCHANT_ID");
    const serviceId = this.configService.get<string>("CLICK_SERVICE_ID");
    const baseUrl = this.configService.get<string>(
      "CLICK_CHECKOUT_URL",
      "https://my.click.uz/services/pay",
    );
    const returnUrl = this.configService.get<string>("CLICK_RETURN_URL", "");

    if (!merchantId || !serviceId) {
      throw new BadRequestException("Click integration not configured");
    }

    // Build checkout URL
    const checkoutUrl = new URL(baseUrl);
    checkoutUrl.searchParams.set("service_id", serviceId);
    checkoutUrl.searchParams.set("merchant_id", merchantId);
    checkoutUrl.searchParams.set("amount", amount.toString());
    checkoutUrl.searchParams.set("transaction_param", orderId);
    if (returnUrl) {
      checkoutUrl.searchParams.set("return_url", returnUrl);
    }

    // Create pending transaction record if organization context is available
    let transactionId: string | undefined;
    if (organizationId) {
      const transaction = this.transactionRepo.create({
        organizationId: organizationId,
        provider: PaymentProvider.CLICK,
        amount,
        currency: "UZS",
        status: PaymentTransactionStatus.PENDING,
        orderId: orderId,
        machineId: machineId || null,
        clientUserId: clientUserId || null,
        rawRequest: { amount, orderId },
      });
      const saved = await this.transactionRepo.save(transaction);
      transactionId = saved.id;
    }

    return {
      provider: "click",
      status: "pending",
      amount,
      orderId,
      ...(transactionId !== undefined && { transactionId }),
      checkoutUrl: checkoutUrl.toString(),
    };
  }

  /**
   * Verify Click webhook signature
   */
  verifyClickSignature(data: ClickWebhookData): boolean {
    const secretKey = this.configService.get<string>("CLICK_SECRET_KEY");
    if (!secretKey) {
      this.logger.error("Click webhook: CLICK_SECRET_KEY not configured");
      return false;
    }

    // Click signature: MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
    const signString = [
      data.click_trans_id,
      data.service_id,
      secretKey,
      data.merchant_trans_id,
      data.amount,
      data.action,
      data.sign_time,
    ].join("");

    const expectedSign = crypto
      .createHash("md5")
      .update(signString)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSign),
        Buffer.from(data.sign_string || ""),
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle Click webhook
   */
  async handleClickWebhook(
    data: ClickWebhookData,
  ): Promise<Record<string, unknown>> {
    // Verify signature
    if (!this.verifyClickSignature(data)) {
      this.logger.warn("Click webhook: Invalid signature");
      return {
        error: -1,
        error_note: "Invalid signature",
      };
    }

    this.logger.log(
      `Click webhook: action=${data.action}, trans_id=${data.click_trans_id}`,
    );

    switch (data.action) {
      case 0: // Prepare (check availability)
        return this.clickPrepare(data);
      case 1: // Complete
        return this.clickComplete(data);
      default:
        return {
          error: -3,
          error_note: "Unknown action",
        };
    }
  }

  private async clickPrepare(data: ClickWebhookData) {
    const orderId = data.merchant_trans_id;

    const existing = await this.transactionRepo.findOne({
      where: { orderId: orderId, provider: PaymentProvider.CLICK },
    });

    if (!existing) {
      this.logger.warn(
        `Click webhook received for unknown transaction: orderId=${orderId}, clickTransId=${data.click_trans_id}`,
      );
      return {
        click_trans_id: data.click_trans_id,
        merchant_trans_id: data.merchant_trans_id,
        error: -5,
        error_note: "Order not found",
      };
    }

    // Verify amount matches
    if (Number(existing.amount) !== Number(data.amount)) {
      return {
        click_trans_id: data.click_trans_id,
        merchant_trans_id: data.merchant_trans_id,
        error: -2,
        error_note: "Incorrect amount",
      };
    }

    // Update providerTxId on existing transaction
    existing.providerTxId = data.click_trans_id;
    existing.rawRequest = data as unknown as Record<string, unknown>;
    await this.transactionRepo.save(existing);

    return {
      click_trans_id: data.click_trans_id,
      merchant_trans_id: data.merchant_trans_id,
      merchant_prepare_id: existing.id,
      error: 0,
      error_note: "Success",
    };
  }

  private async clickComplete(data: ClickWebhookData) {
    // Check for error from Click
    if (data.error < 0) {
      const transaction = await this.transactionRepo.findOne({
        where: {
          providerTxId: data.click_trans_id,
          provider: PaymentProvider.CLICK,
        },
      });

      if (transaction) {
        transaction.status = PaymentTransactionStatus.FAILED;
        transaction.errorMessage = data.error_note;
        transaction.rawResponse = data as unknown as Record<string, unknown>;
        await this.transactionRepo.save(transaction);
      }

      return {
        click_trans_id: data.click_trans_id,
        merchant_trans_id: data.merchant_trans_id,
        error: -4,
        error_note: "Transaction cancelled",
      };
    }

    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(PaymentTransaction);
      const transaction = await txRepo.findOne({
        where: {
          providerTxId: data.click_trans_id,
          provider: PaymentProvider.CLICK,
        },
        lock: { mode: "pessimistic_write" },
      });

      if (!transaction) {
        return {
          click_trans_id: data.click_trans_id,
          merchant_trans_id: data.merchant_trans_id,
          error: -6,
          error_note: "Transaction not found",
        };
      }

      // Idempotency: already completed
      if (transaction.status === PaymentTransactionStatus.COMPLETED) {
        return {
          click_trans_id: data.click_trans_id,
          merchant_trans_id: data.merchant_trans_id,
          merchant_confirm_id: transaction.id,
          error: 0,
          error_note: "Success",
        };
      }

      // Mark as completed
      transaction.status = PaymentTransactionStatus.COMPLETED;
      transaction.processedAt = new Date();
      transaction.rawResponse = data as unknown as Record<string, unknown>;
      await txRepo.save(transaction);

      this.metricsService.paymentsTotal.inc({
        method: "click",
        result: "success",
      });

      return {
        click_trans_id: data.click_trans_id,
        merchant_trans_id: data.merchant_trans_id,
        merchant_confirm_id: transaction.id,
        error: 0,
        error_note: "Success",
      };
    });
  }
}
