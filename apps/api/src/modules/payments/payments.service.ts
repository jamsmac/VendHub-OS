/**
 * Payments Service (Orchestrator)
 * Delegates provider-specific logic to split handlers:
 * - PaymeHandler → Payme (JSON-RPC)
 * - ClickHandler → Click (REST/MD5)
 * - UzumHandler → Uzum Bank (REST/HMAC-SHA256)
 *
 * Keeps cross-provider logic: QR payments, refunds, transaction queries
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
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
import { PaymentRefund, RefundStatus } from "./entities/payment-refund.entity";
import { UzumCreateDto } from "./dto/create-payment.dto";
import { InitiateRefundDto, QueryTransactionsDto } from "./dto/refund.dto";
import { PaymeHandler } from "./payme.handler";
import { ClickHandler } from "./click.handler";
import { UzumHandler } from "./uzum.handler";

// ============================================================================
// INTERFACES (re-exported for backward compatibility)
// ============================================================================

export interface PaymeWebhookData {
  method: string;
  params: {
    id?: string;
    amount?: number;
    account?: Record<string, string>;
    time?: number;
    reason?: number;
  };
  id: number;
}

export interface ClickWebhookData {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id: string;
  merchant_trans_id: string;
  amount: number;
  action: number;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
}

export interface UzumWebhookData {
  transactionId: string;
  orderId: string;
  amount: number;
  status: string;
  signature: string;
  [key: string]: unknown;
}

export interface PaymentResult {
  provider: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  amount: number;
  orderId: string;
  transactionId?: string;
  checkoutUrl?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    @InjectRepository(PaymentTransaction)
    private transactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(PaymentRefund)
    private refundRepo: Repository<PaymentRefund>,
    private readonly paymeHandler: PaymeHandler,
    private readonly clickHandler: ClickHandler,
    private readonly uzumHandler: UzumHandler,
  ) {}

  // ============================================
  // PAYME (delegated to PaymeHandler)
  // ============================================

  async createPaymeTransaction(
    amount: number,
    orderId: string,
    organizationId?: string,
    machineId?: string,
    clientUserId?: string,
  ): Promise<PaymentResult> {
    return this.paymeHandler.createPaymeTransaction(
      amount,
      orderId,
      organizationId,
      machineId,
      clientUserId,
    );
  }

  verifyPaymeSignature(authHeader: string | undefined): boolean {
    return this.paymeHandler.verifyPaymeSignature(authHeader);
  }

  async handlePaymeWebhook(
    data: PaymeWebhookData,
    authHeader?: string,
  ): Promise<Record<string, unknown>> {
    return this.paymeHandler.handlePaymeWebhook(data, authHeader);
  }

  // ============================================
  // CLICK (delegated to ClickHandler)
  // ============================================

  async createClickTransaction(
    amount: number,
    orderId: string,
    organizationId?: string,
    machineId?: string,
    clientUserId?: string,
  ): Promise<PaymentResult> {
    return this.clickHandler.createClickTransaction(
      amount,
      orderId,
      organizationId,
      machineId,
      clientUserId,
    );
  }

  verifyClickSignature(data: ClickWebhookData): boolean {
    return this.clickHandler.verifyClickSignature(data);
  }

  async handleClickWebhook(
    data: ClickWebhookData,
  ): Promise<Record<string, unknown>> {
    return this.clickHandler.handleClickWebhook(data);
  }

  // ============================================
  // UZUM (delegated to UzumHandler)
  // ============================================

  async createUzumTransaction(
    dto: UzumCreateDto,
    organizationId: string,
  ): Promise<PaymentResult> {
    return this.uzumHandler.createUzumTransaction(dto, organizationId);
  }

  verifyUzumSignature(data: UzumWebhookData): boolean {
    return this.uzumHandler.verifyUzumSignature(data);
  }

  async handleUzumWebhook(
    data: UzumWebhookData,
  ): Promise<Record<string, unknown>> {
    return this.uzumHandler.handleUzumWebhook(data);
  }

  // ============================================
  // QR PAYMENT (cross-provider)
  // ============================================

  /**
   * Generate QR code for vending machine payment.
   * Creates a pending transaction and returns QR data for payment providers.
   */
  async generateQRPayment(
    amount: number,
    machineId: string,
    organizationId?: string,
  ): Promise<{
    qrCode: string;
    paymentId: string;
    amount: number;
    machineId: string;
    expiresAt: Date;
    checkoutUrls: Record<string, string>;
  }> {
    const paymentId = crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Store payment request in database
    if (organizationId) {
      const transaction = this.transactionRepo.create({
        organizationId: organizationId,
        provider: PaymentProvider.CASH,
        amount,
        currency: "UZS",
        status: PaymentTransactionStatus.PENDING,
        orderId: paymentId,
        machineId: machineId,
        metadata: { type: "qr_payment", expires_at: expiresAt.toISOString() },
      });
      await this.transactionRepo.save(transaction);
    }

    // Build QR data containing deep links to each payment provider
    const qrPayload = {
      v: 1,
      id: paymentId,
      a: amount,
      m: machineId,
      exp: expiresAt.toISOString(),
    };

    // Generate checkout URLs for each configured provider
    const checkoutUrls: Record<string, string> = {};

    const paymeMerchantId = this.configService.get<string>("PAYME_MERCHANT_ID");
    if (paymeMerchantId) {
      const paymeParams = Buffer.from(
        JSON.stringify({
          m: paymeMerchantId,
          ac: { order_id: paymentId },
          a: Math.round(amount * 100),
        }),
      ).toString("base64");
      const paymeBaseUrl = this.configService.get<string>(
        "PAYME_CHECKOUT_URL",
        "https://checkout.paycom.uz",
      );
      checkoutUrls.payme = `${paymeBaseUrl}/${paymeParams}`;
    }

    const clickServiceId = this.configService.get<string>("CLICK_SERVICE_ID");
    const clickMerchantId = this.configService.get<string>("CLICK_MERCHANT_ID");
    if (clickServiceId && clickMerchantId) {
      const clickBaseUrl = this.configService.get<string>(
        "CLICK_CHECKOUT_URL",
        "https://my.click.uz/services/pay",
      );
      checkoutUrls.click = `${clickBaseUrl}?service_id=${clickServiceId}&merchant_id=${clickMerchantId}&amount=${amount}&transaction_param=${paymentId}`;
    }

    // QR content: JSON payload with payment info
    const qrCode = Buffer.from(JSON.stringify(qrPayload)).toString("base64");

    return {
      qrCode,
      paymentId,
      amount,
      machineId,
      expiresAt,
      checkoutUrls,
    };
  }

  // ============================================
  // REFUNDS (cross-provider)
  // ============================================

  /**
   * Initiate a refund for a completed payment transaction
   */
  async initiateRefund(
    dto: InitiateRefundDto,
    organizationId: string,
    userId: string,
  ): Promise<PaymentRefund> {
    const transaction = await this.transactionRepo.findOne({
      where: {
        id: dto.paymentTransactionId,
        organizationId: organizationId,
      },
    });

    if (!transaction) {
      throw new NotFoundException("Payment transaction not found");
    }

    if (transaction.status !== PaymentTransactionStatus.COMPLETED) {
      throw new BadRequestException(
        "Only completed transactions can be refunded",
      );
    }

    const refundAmount = dto.amount || Number(transaction.amount);

    const existingRefunds = await this.refundRepo.find({
      where: {
        paymentTransactionId: transaction.id,
        status: RefundStatus.COMPLETED,
      },
    });
    const totalRefunded = existingRefunds.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    const remainingAmount = Number(transaction.amount) - totalRefunded;

    if (refundAmount > remainingAmount) {
      throw new BadRequestException(
        `Refund amount (${refundAmount}) exceeds remaining refundable amount (${remainingAmount})`,
      );
    }

    const refund = this.refundRepo.create({
      organizationId: organizationId,
      paymentTransactionId: transaction.id,
      amount: refundAmount,
      reason: dto.reason,
      reasonNote: dto.reasonNote || null,
      status: RefundStatus.PENDING,
      processedByUserId: userId,
    });
    const saved = await this.refundRepo.save(refund);

    // Initiate provider-specific refund (async, non-blocking)
    this.processProviderRefund(saved, transaction).catch((err) => {
      this.logger.error(
        `Failed to process provider refund: ${err.message}`,
        err.stack,
      );
    });

    return saved;
  }

  /**
   * Process refund with the payment provider
   */
  async processRefund(refundId: string): Promise<PaymentRefund> {
    const refund = await this.refundRepo.findOne({
      where: { id: refundId },
      relations: ["paymentTransaction"],
    });

    if (!refund) {
      throw new NotFoundException("Refund not found");
    }

    return this.processProviderRefund(refund, refund.paymentTransaction);
  }

  private async processProviderRefund(
    refund: PaymentRefund,
    transaction: PaymentTransaction,
  ): Promise<PaymentRefund> {
    refund.status = RefundStatus.PROCESSING;
    await this.refundRepo.save(refund);

    try {
      switch (transaction.provider) {
        case PaymentProvider.PAYME:
          this.logger.warn(
            `Payme refund for transaction ${transaction.providerTxId} requires manual processing or webhook confirmation`,
          );
          refund.status = RefundStatus.PROCESSING;
          break;

        case PaymentProvider.CLICK:
          this.logger.warn(
            `Click refund for transaction ${transaction.providerTxId} requires manual processing or API integration`,
          );
          refund.status = RefundStatus.PROCESSING;
          break;

        case PaymentProvider.UZUM: {
          const secretKey = this.configService.get<string>("UZUM_SECRET_KEY");
          const apiUrl = this.configService.get<string>(
            "UZUM_API_URL",
            "https://api.uzumbank.uz",
          );

          if (!secretKey) {
            throw new InternalServerErrorException(
              "UZUM_SECRET_KEY not configured",
            );
          }

          const signData = `${transaction.id}:${refund.amount}`;
          const signature = crypto
            .createHmac("sha256", secretKey)
            .update(signData)
            .digest("hex");

          this.logger.warn(
            `Uzum refund requires API call: ${apiUrl}/refund, tx=${transaction.id}, signature=${signature}. Marked as PROCESSING.`,
          );
          refund.status = RefundStatus.PROCESSING;
          break;
        }

        case PaymentProvider.CASH:
        case PaymentProvider.WALLET:
        case PaymentProvider.TELEGRAM_STARS:
          // Internal refunds: mark as completed immediately
          refund.status = RefundStatus.COMPLETED;
          refund.processedAt = new Date();
          break;

        default:
          throw new InternalServerErrorException(
            `Unsupported provider for refund: ${transaction.provider}`,
          );
      }

      // Update transaction status if fully refunded
      const allRefunds = await this.refundRepo.find({
        where: { paymentTransactionId: transaction.id },
      });
      const totalRefunded = allRefunds
        .filter(
          (r) => r.status === RefundStatus.COMPLETED || r.id === refund.id,
        )
        .reduce((sum, r) => sum + Number(r.amount), 0);

      if (totalRefunded >= Number(transaction.amount)) {
        transaction.status = PaymentTransactionStatus.REFUNDED;
        await this.transactionRepo.save(transaction);
      }
    } catch (error) {
      refund.status = RefundStatus.FAILED;
      this.logger.error(
        `Refund processing failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    return this.refundRepo.save(refund);
  }

  // ============================================
  // TRANSACTION QUERIES (cross-provider)
  // ============================================

  async getTransactions(
    query: QueryTransactionsDto,
    organizationId: string,
  ): Promise<{
    data: PaymentTransaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.transactionRepo
      .createQueryBuilder("tx")
      .where("tx.organizationId = :organizationId", { organizationId })
      .orderBy("tx.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (query.provider) {
      qb.andWhere("tx.provider = :provider", { provider: query.provider });
    }

    if (query.status) {
      qb.andWhere("tx.status = :status", { status: query.status });
    }

    if (query.dateFrom) {
      qb.andWhere("tx.createdAt >= :dateFrom", { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere("tx.createdAt <= :dateTo", { dateTo: query.dateTo });
    }

    if (query.orderId) {
      qb.andWhere("tx.orderId = :orderId", { orderId: query.orderId });
    }

    if (query.machineId) {
      qb.andWhere("tx.machineId = :machineId", { machineId: query.machineId });
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async getTransaction(
    id: string,
    organizationId: string,
  ): Promise<PaymentTransaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id, organizationId: organizationId },
      relations: ["refunds"],
    });

    if (!transaction) {
      throw new NotFoundException("Payment transaction not found");
    }

    return transaction;
  }

  async getTransactionStats(organizationId: string): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    byProvider: Record<string, { count: number; amount: number }>;
    byStatus: Record<string, number>;
  }> {
    const revenueResult = await this.transactionRepo
      .createQueryBuilder("tx")
      .select("COALESCE(SUM(tx.amount), 0)", "total_revenue")
      .addSelect("COUNT(tx.id)", "total_count")
      .where("tx.organizationId = :organizationId", { organizationId })
      .andWhere("tx.status = :status", {
        status: PaymentTransactionStatus.COMPLETED,
      })
      .getRawOne();

    const providerResults = await this.transactionRepo
      .createQueryBuilder("tx")
      .select("tx.provider", "provider")
      .addSelect("COUNT(tx.id)", "count")
      .addSelect("COALESCE(SUM(tx.amount), 0)", "amount")
      .where("tx.organizationId = :organizationId", { organizationId })
      .andWhere("tx.status = :status", {
        status: PaymentTransactionStatus.COMPLETED,
      })
      .groupBy("tx.provider")
      .getRawMany();

    const byProvider: Record<string, { count: number; amount: number }> = {};
    for (const row of providerResults) {
      byProvider[row.provider] = {
        count: parseInt(row.count, 10),
        amount: parseFloat(row.amount),
      };
    }

    const statusResults = await this.transactionRepo
      .createQueryBuilder("tx")
      .select("tx.status", "status")
      .addSelect("COUNT(tx.id)", "count")
      .where("tx.organizationId = :organizationId", { organizationId })
      .groupBy("tx.status")
      .getRawMany();

    const byStatus: Record<string, number> = {};
    for (const row of statusResults) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    return {
      totalRevenue: parseFloat(revenueResult?.total_revenue || "0"),
      totalTransactions: parseInt(revenueResult?.total_count || "0", 10),
      byProvider,
      byStatus,
    };
  }
}
