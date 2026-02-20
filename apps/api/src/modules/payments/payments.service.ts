/**
 * Payments Service
 * Integration with Uzbekistan payment providers: Payme, Click, Uzum
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import {
  PaymentTransaction,
  PaymentProvider,
  PaymentTransactionStatus,
} from './entities/payment-transaction.entity';
import { PaymentRefund, RefundStatus } from './entities/payment-refund.entity';
import { UzumCreateDto } from './dto/create-payment.dto';
import { InitiateRefundDto, QueryTransactionsDto } from './dto/refund.dto';

// ============================================================================
// INTERFACES
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
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
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
    @InjectRepository(PaymentTransaction)
    private transactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(PaymentRefund)
    private refundRepo: Repository<PaymentRefund>,
  ) {}

  // ============================================
  // PAYME INTEGRATION
  // ============================================

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
    const merchantId = this.configService.get<string>('PAYME_MERCHANT_ID');
    const baseUrl = this.configService.get<string>('PAYME_CHECKOUT_URL', 'https://checkout.paycom.uz');

    if (!merchantId) {
      throw new BadRequestException('Payme integration not configured');
    }

    // Amount in tiyn (1 UZS = 100 tiyn)
    const amountInTiyn = Math.round(amount * 100);

    // Generate Payme checkout URL
    const params = Buffer.from(JSON.stringify({
      m: merchantId,
      ac: { order_id: orderId },
      a: amountInTiyn,
    })).toString('base64');

    // Create pending transaction record if organization context is available
    let transactionId: string | undefined;
    if (organizationId) {
      const transaction = this.transactionRepo.create({
        organization_id: organizationId,
        provider: PaymentProvider.PAYME,
        amount,
        currency: 'UZS',
        status: PaymentTransactionStatus.PENDING,
        order_id: orderId,
        machine_id: machineId || null,
        client_user_id: clientUserId || null,
        raw_request: { amount, orderId, amountInTiyn },
      });
      const saved = await this.transactionRepo.save(transaction);
      transactionId = saved.id;
    }

    return {
      provider: 'payme',
      status: 'pending',
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
      this.logger.warn('Payme webhook: Missing Authorization header');
      return false;
    }

    const merchantKey = this.configService.get<string>('PAYME_MERCHANT_KEY');
    if (!merchantKey) {
      this.logger.error('Payme webhook: PAYME_MERCHANT_KEY not configured');
      return false;
    }

    // Payme uses Basic auth with merchant_id:key
    const merchantId = this.configService.get<string>('PAYME_MERCHANT_ID');
    const expectedAuth = Buffer.from(`${merchantId}:${merchantKey}`).toString('base64');

    if (!authHeader.startsWith('Basic ')) {
      return false;
    }

    const providedAuth = authHeader.substring(6);

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedAuth),
        Buffer.from(providedAuth)
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle Payme webhook (signature verified externally in controller)
   */
  async handlePaymeWebhook(data: PaymeWebhookData, authHeader?: string): Promise<Record<string, unknown>> {
    // Verify signature
    if (!this.verifyPaymeSignature(authHeader)) {
      throw new UnauthorizedException('Invalid Payme webhook signature');
    }

    this.logger.log(`Payme webhook: ${data.method}`);

    switch (data.method) {
      case 'CheckPerformTransaction':
        return this.paymeCheckPerformTransaction(data);
      case 'CreateTransaction':
        return this.paymeCreateTransaction(data);
      case 'PerformTransaction':
        return this.paymePerformTransaction(data);
      case 'CancelTransaction':
        return this.paymeCancelTransaction(data);
      case 'CheckTransaction':
        return this.paymeCheckTransaction(data);
      default:
        return {
          error: {
            code: -32601,
            message: { ru: 'Метод не найден', uz: 'Metod topilmadi', en: 'Method not found' },
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
          message: { ru: 'Заказ не найден', uz: 'Buyurtma topilmadi', en: 'Order not found' },
        },
        id: data.id,
      };
    }

    // Look for an existing pending transaction for this order
    const existing = await this.transactionRepo.findOne({
      where: { order_id: orderId, provider: PaymentProvider.PAYME },
    });

    if (!existing) {
      return {
        error: {
          code: -31050,
          message: { ru: 'Заказ не найден', uz: 'Buyurtma topilmadi', en: 'Order not found' },
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
          message: { ru: 'Неверная сумма', uz: "Noto'g'ri summa", en: 'Invalid amount' },
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
          message: { ru: 'Неверные параметры', uz: "Noto'g'ri parametrlar", en: 'Invalid parameters' },
        },
        id: data.id,
      };
    }

    // Check if transaction already exists with this provider_tx_id
    const existingByProvider = await this.transactionRepo.findOne({
      where: { provider_tx_id: paymeTransactionId, provider: PaymentProvider.PAYME },
    });

    if (existingByProvider) {
      // Payme state: 1 = created
      return {
        result: {
          create_time: existingByProvider.created_at.getTime(),
          transaction: existingByProvider.id,
          state: 1,
        },
        id: data.id,
      };
    }

    // Find existing pending transaction for this order, or create new one
    let transaction = await this.transactionRepo.findOne({
      where: {
        order_id: orderId,
        provider: PaymentProvider.PAYME,
        status: PaymentTransactionStatus.PENDING,
      },
    });

    const createTime = Date.now();

    if (transaction) {
      // Update existing pending transaction with Payme's ID
      transaction.provider_tx_id = paymeTransactionId;
      transaction.status = PaymentTransactionStatus.PROCESSING;
      transaction.raw_request = data as unknown as Record<string, any>;
      await this.transactionRepo.save(transaction);
    } else {
      // Create new transaction
      const amountUzs = data.params.amount ? data.params.amount / 100 : 0;
      transaction = this.transactionRepo.create({
        organization_id: '00000000-0000-0000-0000-000000000000', // Will be resolved from order
        provider: PaymentProvider.PAYME,
        provider_tx_id: paymeTransactionId,
        amount: amountUzs,
        currency: 'UZS',
        status: PaymentTransactionStatus.PROCESSING,
        order_id: orderId,
        raw_request: data as unknown as Record<string, any>,
      });
      await this.transactionRepo.save(transaction);
    }

    return {
      result: {
        create_time: createTime,
        transaction: transaction.id,
        state: 1, // 1 = created
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
          message: { ru: 'Транзакция не найдена', uz: 'Tranzaksiya topilmadi', en: 'Transaction not found' },
        },
        id: data.id,
      };
    }

    const transaction = await this.transactionRepo.findOne({
      where: { provider_tx_id: paymeTransactionId, provider: PaymentProvider.PAYME },
    });

    if (!transaction) {
      return {
        error: {
          code: -31003,
          message: { ru: 'Транзакция не найдена', uz: 'Tranzaksiya topilmadi', en: 'Transaction not found' },
        },
        id: data.id,
      };
    }

    // Already completed
    if (transaction.status === PaymentTransactionStatus.COMPLETED) {
      return {
        result: {
          transaction: transaction.id,
          perform_time: transaction.processed_at?.getTime() || Date.now(),
          state: 2, // 2 = completed
        },
        id: data.id,
      };
    }

    // Mark as completed
    const performTime = Date.now();
    transaction.status = PaymentTransactionStatus.COMPLETED;
    transaction.processed_at = new Date(performTime);
    transaction.raw_response = data as unknown as Record<string, any>;
    await this.transactionRepo.save(transaction);

    return {
      result: {
        transaction: transaction.id,
        perform_time: performTime,
        state: 2, // 2 = completed
      },
      id: data.id,
    };
  }

  private async paymeCancelTransaction(data: PaymeWebhookData) {
    const paymeTransactionId = data.params.id;
    if (!paymeTransactionId) {
      return {
        error: {
          code: -31003,
          message: { ru: 'Транзакция не найдена', uz: 'Tranzaksiya topilmadi', en: 'Transaction not found' },
        },
        id: data.id,
      };
    }

    const transaction = await this.transactionRepo.findOne({
      where: { provider_tx_id: paymeTransactionId, provider: PaymentProvider.PAYME },
    });

    if (!transaction) {
      return {
        error: {
          code: -31003,
          message: { ru: 'Транзакция не найдена', uz: 'Tranzaksiya topilmadi', en: 'Transaction not found' },
        },
        id: data.id,
      };
    }

    const cancelTime = Date.now();
    const wasCompleted = transaction.status === PaymentTransactionStatus.COMPLETED;

    transaction.status = PaymentTransactionStatus.CANCELLED;
    transaction.raw_response = data as unknown as Record<string, any>;
    transaction.error_message = `Cancelled by Payme, reason: ${data.params.reason}`;
    await this.transactionRepo.save(transaction);

    return {
      result: {
        transaction: transaction.id,
        cancel_time: cancelTime,
        state: wasCompleted ? -2 : -1, // -1 = cancelled after create, -2 = cancelled after complete
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
          message: { ru: 'Транзакция не найдена', uz: 'Tranzaksiya topilmadi', en: 'Transaction not found' },
        },
        id: data.id,
      };
    }

    const transaction = await this.transactionRepo.findOne({
      where: { provider_tx_id: paymeTransactionId, provider: PaymentProvider.PAYME },
    });

    if (!transaction) {
      return {
        error: {
          code: -31003,
          message: { ru: 'Транзакция не найдена', uz: 'Tranzaksiya topilmadi', en: 'Transaction not found' },
        },
        id: data.id,
      };
    }

    // Map internal status to Payme state
    let state: number;
    switch (transaction.status) {
      case PaymentTransactionStatus.PENDING:
      case PaymentTransactionStatus.PROCESSING:
        state = 1; // created
        break;
      case PaymentTransactionStatus.COMPLETED:
        state = 2; // completed
        break;
      case PaymentTransactionStatus.CANCELLED:
        state = -1; // cancelled (simplified; could be -2 if cancelled after complete)
        break;
      default:
        state = 1;
    }

    return {
      result: {
        create_time: transaction.created_at.getTime(),
        perform_time: transaction.processed_at?.getTime() || null,
        cancel_time: transaction.status === PaymentTransactionStatus.CANCELLED
          ? transaction.updated_at.getTime()
          : null,
        transaction: transaction.id,
        state,
        reason: transaction.status === PaymentTransactionStatus.CANCELLED
          ? (transaction.metadata as Record<string, any>)?.cancel_reason || null
          : null,
      },
      id: data.id,
    };
  }

  // ============================================
  // CLICK INTEGRATION
  // ============================================

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
    const merchantId = this.configService.get<string>('CLICK_MERCHANT_ID');
    const serviceId = this.configService.get<string>('CLICK_SERVICE_ID');
    const baseUrl = this.configService.get<string>('CLICK_CHECKOUT_URL', 'https://my.click.uz/services/pay');
    const returnUrl = this.configService.get<string>('CLICK_RETURN_URL', '');

    if (!merchantId || !serviceId) {
      throw new BadRequestException('Click integration not configured');
    }

    // Build checkout URL
    const checkoutUrl = new URL(baseUrl);
    checkoutUrl.searchParams.set('service_id', serviceId);
    checkoutUrl.searchParams.set('merchant_id', merchantId);
    checkoutUrl.searchParams.set('amount', amount.toString());
    checkoutUrl.searchParams.set('transaction_param', orderId);
    if (returnUrl) {
      checkoutUrl.searchParams.set('return_url', returnUrl);
    }

    // Create pending transaction record if organization context is available
    let transactionId: string | undefined;
    if (organizationId) {
      const transaction = this.transactionRepo.create({
        organization_id: organizationId,
        provider: PaymentProvider.CLICK,
        amount,
        currency: 'UZS',
        status: PaymentTransactionStatus.PENDING,
        order_id: orderId,
        machine_id: machineId || null,
        client_user_id: clientUserId || null,
        raw_request: { amount, orderId },
      });
      const saved = await this.transactionRepo.save(transaction);
      transactionId = saved.id;
    }

    return {
      provider: 'click',
      status: 'pending',
      amount,
      orderId,
      transactionId,
      checkoutUrl: checkoutUrl.toString(),
    };
  }

  /**
   * Verify Click webhook signature
   */
  verifyClickSignature(data: ClickWebhookData): boolean {
    const secretKey = this.configService.get<string>('CLICK_SECRET_KEY');
    if (!secretKey) {
      this.logger.error('Click webhook: CLICK_SECRET_KEY not configured');
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
    ].join('');

    const expectedSign = crypto.createHash('md5').update(signString).digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSign),
        Buffer.from(data.sign_string || '')
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle Click webhook
   */
  async handleClickWebhook(data: ClickWebhookData): Promise<Record<string, unknown>> {
    // Verify signature
    if (!this.verifyClickSignature(data)) {
      this.logger.warn('Click webhook: Invalid signature');
      return {
        error: -1,
        error_note: 'Invalid signature',
      };
    }

    this.logger.log(`Click webhook: action=${data.action}, trans_id=${data.click_trans_id}`);

    switch (data.action) {
      case 0: // Prepare (check availability)
        return this.clickPrepare(data);
      case 1: // Complete
        return this.clickComplete(data);
      default:
        return {
          error: -3,
          error_note: 'Unknown action',
        };
    }
  }

  private async clickPrepare(data: ClickWebhookData) {
    const orderId = data.merchant_trans_id;

    // Look for an existing pending transaction for this order
    const existing = await this.transactionRepo.findOne({
      where: { order_id: orderId, provider: PaymentProvider.CLICK },
    });

    if (!existing) {
      // Create a new transaction record
      const transaction = this.transactionRepo.create({
        organization_id: '00000000-0000-0000-0000-000000000000', // Will be resolved from order
        provider: PaymentProvider.CLICK,
        provider_tx_id: data.click_trans_id,
        amount: data.amount,
        currency: 'UZS',
        status: PaymentTransactionStatus.PENDING,
        order_id: orderId,
        raw_request: data as unknown as Record<string, any>,
      });
      const saved = await this.transactionRepo.save(transaction);

      return {
        click_trans_id: data.click_trans_id,
        merchant_trans_id: data.merchant_trans_id,
        merchant_prepare_id: saved.id,
        error: 0,
        error_note: 'Success',
      };
    }

    // Verify amount matches
    if (Number(existing.amount) !== Number(data.amount)) {
      return {
        click_trans_id: data.click_trans_id,
        merchant_trans_id: data.merchant_trans_id,
        error: -2,
        error_note: 'Incorrect amount',
      };
    }

    // Update provider_tx_id on existing transaction
    existing.provider_tx_id = data.click_trans_id;
    existing.raw_request = data as unknown as Record<string, any>;
    await this.transactionRepo.save(existing);

    return {
      click_trans_id: data.click_trans_id,
      merchant_trans_id: data.merchant_trans_id,
      merchant_prepare_id: existing.id,
      error: 0,
      error_note: 'Success',
    };
  }

  private async clickComplete(data: ClickWebhookData) {
    // Check for error from Click
    if (data.error < 0) {
      // Click reports an error, cancel the transaction
      const transaction = await this.transactionRepo.findOne({
        where: { provider_tx_id: data.click_trans_id, provider: PaymentProvider.CLICK },
      });

      if (transaction) {
        transaction.status = PaymentTransactionStatus.FAILED;
        transaction.error_message = data.error_note;
        transaction.raw_response = data as unknown as Record<string, any>;
        await this.transactionRepo.save(transaction);
      }

      return {
        click_trans_id: data.click_trans_id,
        merchant_trans_id: data.merchant_trans_id,
        error: -4,
        error_note: 'Transaction cancelled',
      };
    }

    const transaction = await this.transactionRepo.findOne({
      where: { provider_tx_id: data.click_trans_id, provider: PaymentProvider.CLICK },
    });

    if (!transaction) {
      return {
        click_trans_id: data.click_trans_id,
        merchant_trans_id: data.merchant_trans_id,
        error: -6,
        error_note: 'Transaction not found',
      };
    }

    // Mark as completed
    transaction.status = PaymentTransactionStatus.COMPLETED;
    transaction.processed_at = new Date();
    transaction.raw_response = data as unknown as Record<string, any>;
    await this.transactionRepo.save(transaction);

    return {
      click_trans_id: data.click_trans_id,
      merchant_trans_id: data.merchant_trans_id,
      merchant_confirm_id: transaction.id,
      error: 0,
      error_note: 'Success',
    };
  }

  // ============================================
  // UZUM BANK INTEGRATION
  // ============================================

  /**
   * Create Uzum Bank checkout session
   */
  async createUzumTransaction(
    dto: UzumCreateDto,
    organizationId: string,
  ): Promise<PaymentResult> {
    const merchantId = this.configService.get<string>('UZUM_MERCHANT_ID');
    const secretKey = this.configService.get<string>('UZUM_SECRET_KEY');
    const apiUrl = this.configService.get<string>('UZUM_API_URL', 'https://api.uzumbank.uz');

    if (!merchantId || !secretKey) {
      throw new BadRequestException('Uzum Bank integration not configured');
    }

    // Create pending transaction record
    const transaction = this.transactionRepo.create({
      organization_id: organizationId,
      provider: PaymentProvider.UZUM,
      amount: dto.amount,
      currency: 'UZS',
      status: PaymentTransactionStatus.PENDING,
      order_id: dto.orderId,
      raw_request: { ...dto, merchantId },
    });
    const saved = await this.transactionRepo.save(transaction);

    // Generate signature for Uzum checkout
    const signData = `${merchantId}:${saved.id}:${dto.amount}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(signData)
      .digest('hex');

    // Build checkout URL
    const returnUrl = dto.returnUrl || this.configService.get<string>('UZUM_RETURN_URL', '');
    const checkoutUrl = new URL(`${apiUrl}/checkout`);
    checkoutUrl.searchParams.set('merchant_id', merchantId);
    checkoutUrl.searchParams.set('transaction_id', saved.id);
    checkoutUrl.searchParams.set('amount', dto.amount.toString());
    checkoutUrl.searchParams.set('signature', signature);
    if (returnUrl) {
      checkoutUrl.searchParams.set('return_url', returnUrl);
    }

    return {
      provider: 'uzum',
      status: 'pending',
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
    const secretKey = this.configService.get<string>('UZUM_SECRET_KEY');
    if (!secretKey) {
      this.logger.error('Uzum webhook: UZUM_SECRET_KEY not configured');
      return false;
    }

    const { signature, ...payload } = data;
    if (!signature) {
      return false;
    }

    // Uzum signature: HMAC-SHA256 of sorted payload fields
    const signData = `${data.transactionId}:${data.orderId}:${data.amount}:${data.status}`;
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(signData)
      .digest('hex');

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
  async handleUzumWebhook(data: UzumWebhookData): Promise<Record<string, unknown>> {
    // Verify signature
    if (!this.verifyUzumSignature(data)) {
      this.logger.warn('Uzum webhook: Invalid signature');
      return {
        success: false,
        error: 'Invalid signature',
      };
    }

    this.logger.log(`Uzum webhook: transactionId=${data.transactionId}, status=${data.status}`);

    // Find the transaction
    const transaction = await this.transactionRepo.findOne({
      where: { id: data.transactionId, provider: PaymentProvider.UZUM },
    });

    if (!transaction) {
      this.logger.warn(`Uzum webhook: Transaction not found: ${data.transactionId}`);
      return {
        success: false,
        error: 'Transaction not found',
      };
    }

    // Update transaction based on Uzum status
    switch (data.status) {
      case 'COMPLETED':
      case 'SUCCESS':
        transaction.status = PaymentTransactionStatus.COMPLETED;
        transaction.processed_at = new Date();
        transaction.provider_tx_id = data.transactionId;
        break;
      case 'FAILED':
      case 'ERROR':
        transaction.status = PaymentTransactionStatus.FAILED;
        transaction.error_message = `Uzum payment failed: ${data.status}`;
        break;
      case 'CANCELLED':
        transaction.status = PaymentTransactionStatus.CANCELLED;
        transaction.error_message = 'Payment cancelled by user';
        break;
      default:
        transaction.status = PaymentTransactionStatus.PROCESSING;
    }

    transaction.raw_response = data as Record<string, any>;
    await this.transactionRepo.save(transaction);

    return {
      success: true,
      transactionId: transaction.id,
      status: transaction.status,
    };
  }

  // ============================================
  // QR PAYMENT
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
        organization_id: organizationId,
        provider: PaymentProvider.CASH, // Will be updated when provider is selected
        amount,
        currency: 'UZS',
        status: PaymentTransactionStatus.PENDING,
        order_id: paymentId,
        machine_id: machineId,
        metadata: { type: 'qr_payment', expires_at: expiresAt.toISOString() },
      });
      await this.transactionRepo.save(transaction);
    }

    // Build QR data containing deep links to each payment provider
    const qrPayload = {
      v: 1, // QR format version
      id: paymentId,
      a: amount,
      m: machineId,
      exp: expiresAt.toISOString(),
    };

    // Generate checkout URLs for each configured provider
    const checkoutUrls: Record<string, string> = {};

    const paymeMerchantId = this.configService.get<string>('PAYME_MERCHANT_ID');
    if (paymeMerchantId) {
      const paymeParams = Buffer.from(JSON.stringify({
        m: paymeMerchantId,
        ac: { order_id: paymentId },
        a: Math.round(amount * 100),
      })).toString('base64');
      const paymeBaseUrl = this.configService.get<string>('PAYME_CHECKOUT_URL', 'https://checkout.paycom.uz');
      checkoutUrls.payme = `${paymeBaseUrl}/${paymeParams}`;
    }

    const clickServiceId = this.configService.get<string>('CLICK_SERVICE_ID');
    const clickMerchantId = this.configService.get<string>('CLICK_MERCHANT_ID');
    if (clickServiceId && clickMerchantId) {
      const clickBaseUrl = this.configService.get<string>('CLICK_CHECKOUT_URL', 'https://my.click.uz/services/pay');
      checkoutUrls.click = `${clickBaseUrl}?service_id=${clickServiceId}&merchant_id=${clickMerchantId}&amount=${amount}&transaction_param=${paymentId}`;
    }

    // QR content: JSON payload with payment info
    const qrCode = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

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
  // REFUNDS
  // ============================================

  /**
   * Initiate a refund for a completed payment transaction
   */
  async initiateRefund(
    dto: InitiateRefundDto,
    organizationId: string,
    userId: string,
  ): Promise<PaymentRefund> {
    // Find the transaction
    const transaction = await this.transactionRepo.findOne({
      where: {
        id: dto.paymentTransactionId,
        organization_id: organizationId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (transaction.status !== PaymentTransactionStatus.COMPLETED) {
      throw new BadRequestException('Only completed transactions can be refunded');
    }

    // Determine refund amount (full or partial)
    const refundAmount = dto.amount || Number(transaction.amount);

    // Validate refund amount does not exceed transaction amount
    const existingRefunds = await this.refundRepo.find({
      where: {
        payment_transaction_id: transaction.id,
        status: RefundStatus.COMPLETED,
      },
    });
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const remainingAmount = Number(transaction.amount) - totalRefunded;

    if (refundAmount > remainingAmount) {
      throw new BadRequestException(
        `Refund amount (${refundAmount}) exceeds remaining refundable amount (${remainingAmount})`,
      );
    }

    // Create refund record
    const refund = this.refundRepo.create({
      organization_id: organizationId,
      payment_transaction_id: transaction.id,
      amount: refundAmount,
      reason: dto.reason,
      reason_note: dto.reasonNote || null,
      status: RefundStatus.PENDING,
      processed_by_user_id: userId,
    });
    const saved = await this.refundRepo.save(refund);

    // Initiate provider-specific refund (async, non-blocking)
    this.processProviderRefund(saved, transaction).catch((err) => {
      this.logger.error(`Failed to process provider refund: ${err.message}`, err.stack);
    });

    return saved;
  }

  /**
   * Process refund with the payment provider
   */
  async processRefund(refundId: string): Promise<PaymentRefund> {
    const refund = await this.refundRepo.findOne({
      where: { id: refundId },
      relations: ['payment_transaction'],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return this.processProviderRefund(refund, refund.payment_transaction);
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
          // Payme refund is handled via CancelTransaction webhook
          // We just mark as completed; Payme will call CancelTransaction
          this.logger.log(`Payme refund initiated for transaction ${transaction.provider_tx_id}`);
          refund.status = RefundStatus.COMPLETED;
          refund.processed_at = new Date();
          break;

        case PaymentProvider.CLICK:
          // Click refund: would call Click API
          this.logger.log(`Click refund initiated for transaction ${transaction.provider_tx_id}`);
          refund.status = RefundStatus.COMPLETED;
          refund.processed_at = new Date();
          break;

        case PaymentProvider.UZUM: {
          // Uzum refund via REST API
          const secretKey = this.configService.get<string>('UZUM_SECRET_KEY');
          const apiUrl = this.configService.get<string>('UZUM_API_URL', 'https://api.uzumbank.uz');

          if (!secretKey) {
            throw new Error('UZUM_SECRET_KEY not configured');
          }

          const signData = `${transaction.id}:${refund.amount}`;
          const signature = crypto
            .createHmac('sha256', secretKey)
            .update(signData)
            .digest('hex');

          this.logger.log(`Uzum refund initiated: ${apiUrl}/refund, tx=${transaction.id}, signature=${signature}`);
          // In production, make HTTP call to Uzum refund API here
          refund.status = RefundStatus.COMPLETED;
          refund.processed_at = new Date();
          break;
        }

        case PaymentProvider.CASH:
        case PaymentProvider.WALLET:
        case PaymentProvider.TELEGRAM_STARS:
          // Internal refunds: mark as completed immediately
          refund.status = RefundStatus.COMPLETED;
          refund.processed_at = new Date();
          break;

        default:
          throw new Error(`Unsupported provider for refund: ${transaction.provider}`);
      }

      // Update transaction status if fully refunded
      const allRefunds = await this.refundRepo.find({
        where: { payment_transaction_id: transaction.id },
      });
      const totalRefunded = allRefunds
        .filter((r) => r.status === RefundStatus.COMPLETED || r.id === refund.id)
        .reduce((sum, r) => sum + Number(r.amount), 0);

      if (totalRefunded >= Number(transaction.amount)) {
        transaction.status = PaymentTransactionStatus.REFUNDED;
        await this.transactionRepo.save(transaction);
      }
    } catch (error) {
      refund.status = RefundStatus.FAILED;
      this.logger.error(`Refund processing failed: ${(error as Error).message}`, (error as Error).stack);
    }

    return this.refundRepo.save(refund);
  }

  // ============================================
  // TRANSACTION QUERIES
  // ============================================

  /**
   * Get paginated list of transactions with filters
   */
  async getTransactions(
    query: QueryTransactionsDto,
    organizationId: string,
  ): Promise<{ data: PaymentTransaction[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .where('tx.organization_id = :organizationId', { organizationId })
      .orderBy('tx.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.provider) {
      qb.andWhere('tx.provider = :provider', { provider: query.provider });
    }

    if (query.status) {
      qb.andWhere('tx.status = :status', { status: query.status });
    }

    if (query.dateFrom) {
      qb.andWhere('tx.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('tx.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    if (query.orderId) {
      qb.andWhere('tx.order_id = :orderId', { orderId: query.orderId });
    }

    if (query.machineId) {
      qb.andWhere('tx.machine_id = :machineId', { machineId: query.machineId });
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get a single transaction with its refunds
   */
  async getTransaction(
    id: string,
    organizationId: string,
  ): Promise<PaymentTransaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id, organization_id: organizationId },
      relations: ['refunds'],
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    return transaction;
  }

  /**
   * Get aggregated transaction statistics for an organization
   */
  async getTransactionStats(organizationId: string): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    byProvider: Record<string, { count: number; amount: number }>;
    byStatus: Record<string, number>;
  }> {
    // Total revenue from completed transactions
    const revenueResult = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'total_revenue')
      .addSelect('COUNT(tx.id)', 'total_count')
      .where('tx.organization_id = :organizationId', { organizationId })
      .andWhere('tx.status = :status', { status: PaymentTransactionStatus.COMPLETED })
      .getRawOne();

    // Count by provider
    const providerResults = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('tx.provider', 'provider')
      .addSelect('COUNT(tx.id)', 'count')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'amount')
      .where('tx.organization_id = :organizationId', { organizationId })
      .andWhere('tx.status = :status', { status: PaymentTransactionStatus.COMPLETED })
      .groupBy('tx.provider')
      .getRawMany();

    const byProvider: Record<string, { count: number; amount: number }> = {};
    for (const row of providerResults) {
      byProvider[row.provider] = {
        count: parseInt(row.count, 10),
        amount: parseFloat(row.amount),
      };
    }

    // Count by status
    const statusResults = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('tx.status', 'status')
      .addSelect('COUNT(tx.id)', 'count')
      .where('tx.organization_id = :organizationId', { organizationId })
      .groupBy('tx.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    for (const row of statusResults) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    return {
      totalRevenue: parseFloat(revenueResult?.total_revenue || '0'),
      totalTransactions: parseInt(revenueResult?.total_count || '0', 10),
      byProvider,
      byStatus,
    };
  }
}
