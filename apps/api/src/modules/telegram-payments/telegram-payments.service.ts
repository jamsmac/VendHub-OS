/**
 * Telegram Payments Service
 * VendHub Telegram Bot Payments Integration
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { TelegramPayment } from './entities/telegram-payment.entity';
import { Order, PaymentStatus } from '../orders/entities/order.entity';
import {
  TelegramPaymentStatus,
  TelegramPaymentProvider,
  TelegramPaymentCurrency,
  TELEGRAM_PAYMENT_PROVIDERS_CONFIG,
  TELEGRAM_PAYMENT_ERRORS,
} from './telegram-payments.constants';
import {
  CreateInvoiceDto,
  CreateInvoiceLinkDto,
  PreCheckoutQueryDto,
  SuccessfulPaymentDto,
  RefundPaymentDto,
  PaymentFilterDto,
  PaymentDto,
  PaymentListDto,
  PaymentStatsDto,
  InvoiceResponseDto,
} from './dto/telegram-payment.dto';

@Injectable()
export class TelegramPaymentsService {
  private readonly logger = new Logger(TelegramPaymentsService.name);
  private botToken: string;

  constructor(
    @InjectRepository(TelegramPayment)
    private readonly paymentRepo: Repository<TelegramPayment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
  }

  // ============================================================================
  // INVOICE CREATION
  // ============================================================================

  /**
   * Создать инвойс для заказа
   */
  async createInvoice(
    userId: string,
    organizationId: string,
    dto: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    // Validate provider
    const providerConfig = TELEGRAM_PAYMENT_PROVIDERS_CONFIG[dto.provider];
    if (!providerConfig) {
      throw new BadRequestException(TELEGRAM_PAYMENT_ERRORS.INVALID_PROVIDER);
    }

    // Validate currency
    if (!providerConfig.currencies.includes(dto.currency)) {
      throw new BadRequestException(TELEGRAM_PAYMENT_ERRORS.INVALID_CURRENCY);
    }

    // Get order
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId, organizationId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Convert amount to smallest units
    const amount = this.convertToSmallestUnits(order.totalAmount, dto.currency);

    // Validate amount limits
    const minAmount = providerConfig.minAmount[dto.currency];
    const maxAmount = providerConfig.maxAmount[dto.currency];

    if (amount < minAmount) {
      throw new BadRequestException(TELEGRAM_PAYMENT_ERRORS.AMOUNT_TOO_LOW);
    }

    if (amount > maxAmount) {
      throw new BadRequestException(TELEGRAM_PAYMENT_ERRORS.AMOUNT_TOO_HIGH);
    }

    // Create payment record
    const payment = this.paymentRepo.create({
      userId,
      organizationId,
      orderId: dto.orderId,
      provider: dto.provider,
      currency: dto.currency,
      amount: order.totalAmount,
      telegramUserId: dto.telegramUserId,
      telegramChatId: dto.telegramChatId,
      invoicePayload: JSON.stringify({
        orderId: dto.orderId,
        userId,
        organizationId,
      }),
      description: dto.description || `Order #${order.orderNumber}`,
      status: TelegramPaymentStatus.PENDING,
    });

    await this.paymentRepo.save(payment);

    // Build invoice items
    const prices = order.items.map(item => ({
      label: item.product?.name || 'Product',
      amount: this.convertToSmallestUnits(item.totalPrice, dto.currency),
    }));

    // Send invoice via Telegram Bot API
    try {
      await this.sendTelegramInvoice({
        chatId: dto.telegramChatId || dto.telegramUserId,
        title: `Order #${order.orderNumber}`,
        description: dto.description || `Payment for order #${order.orderNumber}`,
        payload: payment.invoicePayload,
        providerToken: providerConfig.token,
        currency: dto.currency,
        prices,
      });

      this.logger.log(`Invoice created for payment ${payment.id}`);

      return {
        success: true,
        paymentId: payment.id,
        message: 'Invoice sent to Telegram',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      payment.status = TelegramPaymentStatus.FAILED;
      payment.failureReason = errorMessage;
      await this.paymentRepo.save(payment);

      this.logger.error(`Failed to create invoice: ${errorMessage}`);

      return {
        success: false,
        paymentId: payment.id,
        message: errorMessage,
      };
    }
  }

  /**
   * Создать ссылку на инвойс
   */
  async createInvoiceLink(
    userId: string,
    organizationId: string,
    dto: CreateInvoiceLinkDto,
  ): Promise<InvoiceResponseDto> {
    const providerConfig = TELEGRAM_PAYMENT_PROVIDERS_CONFIG[dto.provider];
    if (!providerConfig) {
      throw new BadRequestException(TELEGRAM_PAYMENT_ERRORS.INVALID_PROVIDER);
    }

    if (!providerConfig.currencies.includes(dto.currency)) {
      throw new BadRequestException(TELEGRAM_PAYMENT_ERRORS.INVALID_CURRENCY);
    }

    const payment = this.paymentRepo.create({
      userId,
      organizationId,
      provider: dto.provider,
      currency: dto.currency,
      amount: this.convertFromSmallestUnits(dto.amount, dto.currency),
      telegramUserId: 0, // Will be set on payment
      invoicePayload: dto.payload || JSON.stringify({ userId, organizationId }),
      description: dto.description,
      status: TelegramPaymentStatus.PENDING,
    });

    await this.paymentRepo.save(payment);

    try {
      const invoiceLink = await this.createTelegramInvoiceLink({
        title: dto.title,
        description: dto.description,
        payload: payment.invoicePayload,
        providerToken: providerConfig.token,
        currency: dto.currency,
        prices: [{ label: dto.title, amount: dto.amount }],
      });

      return {
        success: true,
        paymentId: payment.id,
        invoiceLink,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      payment.status = TelegramPaymentStatus.FAILED;
      payment.failureReason = errorMessage;
      await this.paymentRepo.save(payment);

      return {
        success: false,
        paymentId: payment.id,
        message: errorMessage,
      };
    }
  }

  // ============================================================================
  // WEBHOOK HANDLERS
  // ============================================================================

  /**
   * Обработать pre_checkout_query
   */
  async handlePreCheckoutQuery(dto: PreCheckoutQueryDto): Promise<{ ok: boolean; errorMessage?: string }> {
    try {
      // Parse payload to get payment info
      const payload = JSON.parse(dto.invoicePayload);

      // Validate order still exists and valid
      if (payload.orderId) {
        const order = await this.orderRepo.findOne({
          where: { id: payload.orderId },
        });

        if (!order) {
          return { ok: false, errorMessage: 'Order not found' };
        }

        // Check if amount matches
        const expectedAmount = this.convertToSmallestUnits(
          order.totalAmount,
          dto.currency as TelegramPaymentCurrency,
        );

        if (dto.totalAmount !== expectedAmount) {
          return { ok: false, errorMessage: 'Amount mismatch' };
        }
      }

      // Answer pre-checkout query
      await this.answerPreCheckoutQuery(dto.preCheckoutQueryId, true);

      return { ok: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Pre-checkout validation failed: ${errorMessage}`);
      await this.answerPreCheckoutQuery(dto.preCheckoutQueryId, false, errorMessage);
      return { ok: false, errorMessage };
    }
  }

  /**
   * Обработать successful_payment
   */
  async handleSuccessfulPayment(
    telegramUserId: number,
    dto: SuccessfulPaymentDto,
  ): Promise<PaymentDto> {
    const payload = JSON.parse(dto.invoicePayload);

    // Find payment by payload
    const payment = await this.paymentRepo.findOne({
      where: {
        invoicePayload: dto.invoicePayload,
        status: TelegramPaymentStatus.PENDING,
      },
    });

    if (!payment) {
      // Create new payment record if not found
      const newPayment = this.paymentRepo.create({
        userId: payload.userId,
        organizationId: payload.organizationId,
        orderId: payload.orderId,
        provider: TelegramPaymentProvider.PAYME, // Default, should be determined
        currency: dto.currency as TelegramPaymentCurrency,
        amount: this.convertFromSmallestUnits(dto.totalAmount, dto.currency as TelegramPaymentCurrency),
        telegramUserId,
        telegramPaymentChargeId: dto.telegramPaymentChargeId,
        providerPaymentChargeId: dto.providerPaymentChargeId,
        invoicePayload: dto.invoicePayload,
        shippingOptionId: dto.shippingOptionId,
        orderInfo: dto.orderInfo,
        status: TelegramPaymentStatus.COMPLETED,
        completedAt: new Date(),
      });

      await this.paymentRepo.save(newPayment);

      this.eventEmitter.emit('payment.completed', {
        paymentId: newPayment.id,
        orderId: payload.orderId,
        userId: payload.userId,
        amount: newPayment.amount,
      });

      return this.mapToDto(newPayment);
    }

    // Update existing payment
    payment.telegramUserId = telegramUserId;
    payment.telegramPaymentChargeId = dto.telegramPaymentChargeId;
    payment.providerPaymentChargeId = dto.providerPaymentChargeId;
    payment.shippingOptionId = dto.shippingOptionId || '';
    payment.orderInfo = dto.orderInfo || {};
    payment.status = TelegramPaymentStatus.COMPLETED;
    payment.completedAt = new Date();

    await this.paymentRepo.save(payment);

    // Update order if exists
    if (payment.orderId) {
      await this.orderRepo.update(payment.orderId, {
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
      } as unknown as Parameters<typeof this.orderRepo.update>[1]);
    }

    this.eventEmitter.emit('payment.completed', {
      paymentId: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
    });

    this.logger.log(`Payment ${payment.id} completed`);

    return this.mapToDto(payment);
  }

  // ============================================================================
  // REFUNDS
  // ============================================================================

  /**
   * Возврат платежа
   */
  async refundPayment(
    organizationId: string,
    dto: RefundPaymentDto,
  ): Promise<PaymentDto> {
    const payment = await this.paymentRepo.findOne({
      where: { id: dto.paymentId, organizationId },
    });

    if (!payment) {
      throw new NotFoundException(TELEGRAM_PAYMENT_ERRORS.PAYMENT_NOT_FOUND);
    }

    if (payment.status !== TelegramPaymentStatus.COMPLETED) {
      throw new BadRequestException(TELEGRAM_PAYMENT_ERRORS.REFUND_NOT_ALLOWED);
    }

    if (payment.refundedAt) {
      throw new BadRequestException('Payment already refunded');
    }

    const refundAmount = dto.amount || payment.amount;

    try {
      await this.refundTelegramPayment(
        payment.telegramUserId,
        payment.telegramPaymentChargeId,
      );

      payment.status = TelegramPaymentStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.refundedAmount = refundAmount;

      await this.paymentRepo.save(payment);

      this.eventEmitter.emit('payment.refunded', {
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        amount: refundAmount,
        reason: dto.reason,
      });

      this.logger.log(`Payment ${payment.id} refunded`);

      return this.mapToDto(payment);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Refund failed: ${errorMessage}`);
      throw new BadRequestException(`Refund failed: ${errorMessage}`);
    }
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Получить платеж по ID
   */
  async getPayment(paymentId: string, organizationId: string): Promise<PaymentDto> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, organizationId },
    });

    if (!payment) {
      throw new NotFoundException(TELEGRAM_PAYMENT_ERRORS.PAYMENT_NOT_FOUND);
    }

    return this.mapToDto(payment);
  }

  /**
   * Получить платежи пользователя
   */
  async getUserPayments(
    userId: string,
    filter: PaymentFilterDto,
  ): Promise<PaymentListDto> {
    return this.getPayments({ ...filter, userId });
  }

  /**
   * Получить платежи организации
   */
  async getPayments(
    filter: PaymentFilterDto,
    organizationId?: string,
  ): Promise<PaymentListDto> {
    const { status, provider, userId, fromDate, toDate, page = 1, limit = 20 } = filter;

    const qb = this.paymentRepo.createQueryBuilder('p');

    if (organizationId) {
      qb.andWhere('p.organizationId = :organizationId', { organizationId });
    }

    if (userId) {
      qb.andWhere('p.userId = :userId', { userId });
    }

    if (status) {
      qb.andWhere('p.status = :status', { status });
    }

    if (provider) {
      qb.andWhere('p.provider = :provider', { provider });
    }

    if (fromDate) {
      qb.andWhere('p.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('p.createdAt <= :toDate', { toDate });
    }

    const [items, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(p => this.mapToDto(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить статистику
   */
  async getStats(
    organizationId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<PaymentStatsDto> {
    const qb = this.paymentRepo.createQueryBuilder('p')
      .where('p.organizationId = :organizationId', { organizationId });

    if (fromDate) {
      qb.andWhere('p.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('p.createdAt <= :toDate', { toDate });
    }

    const payments = await qb.getMany();

    const stats: PaymentStatsDto = {
      totalPayments: payments.length,
      completedPayments: 0,
      failedPayments: 0,
      refundedPayments: 0,
      totalAmount: 0,
      refundedAmount: 0,
      netAmount: 0,
      byProvider: {} as Record<TelegramPaymentProvider, { count: number; amount: number }>,
    };

    // Initialize provider stats
    for (const provider of Object.values(TelegramPaymentProvider)) {
      stats.byProvider[provider] = { count: 0, amount: 0 };
    }

    for (const payment of payments) {
      if (payment.status === TelegramPaymentStatus.COMPLETED) {
        stats.completedPayments++;
        stats.totalAmount += Number(payment.amount);
        stats.byProvider[payment.provider].count++;
        stats.byProvider[payment.provider].amount += Number(payment.amount);
      } else if (payment.status === TelegramPaymentStatus.FAILED) {
        stats.failedPayments++;
      } else if (payment.status === TelegramPaymentStatus.REFUNDED) {
        stats.refundedPayments++;
        stats.refundedAmount += Number(payment.refundedAmount || payment.amount);
      }
    }

    stats.netAmount = stats.totalAmount - stats.refundedAmount;

    return stats;
  }

  // ============================================================================
  // TELEGRAM API CALLS
  // ============================================================================

  private async sendTelegramInvoice(params: {
    chatId: number;
    title: string;
    description: string;
    payload: string;
    providerToken: string;
    currency: string;
    prices: { label: string; amount: number }[];
  }): Promise<unknown> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendInvoice`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: params.chatId,
        title: params.title,
        description: params.description,
        payload: params.payload,
        provider_token: params.providerToken,
        currency: params.currency,
        prices: params.prices,
      }),
    });

    const data = await response.json() as { ok: boolean; description?: string; result?: unknown };

    if (!data.ok) {
      throw new Error(data.description || 'Failed to send invoice');
    }

    return data.result;
  }

  private async createTelegramInvoiceLink(params: {
    title: string;
    description: string;
    payload: string;
    providerToken: string;
    currency: string;
    prices: { label: string; amount: number }[];
  }): Promise<string> {
    const url = `https://api.telegram.org/bot${this.botToken}/createInvoiceLink`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title,
        description: params.description,
        payload: params.payload,
        provider_token: params.providerToken,
        currency: params.currency,
        prices: params.prices,
      }),
    });

    const data = await response.json() as { ok: boolean; description?: string; result?: string };

    if (!data.ok) {
      throw new Error(data.description || 'Failed to create invoice link');
    }

    return data.result as string;
  }

  private async answerPreCheckoutQuery(
    preCheckoutQueryId: string,
    ok: boolean,
    errorMessage?: string,
  ): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/answerPreCheckoutQuery`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pre_checkout_query_id: preCheckoutQueryId,
        ok,
        error_message: errorMessage,
      }),
    });
  }

  private async refundTelegramPayment(
    telegramUserId: number,
    telegramPaymentChargeId: string,
  ): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/refundStarPayment`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: telegramUserId,
        telegram_payment_charge_id: telegramPaymentChargeId,
      }),
    });

    const data = await response.json() as { ok: boolean; description?: string };

    if (!data.ok) {
      throw new Error(data.description || 'Failed to refund payment');
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private convertToSmallestUnits(amount: number, currency: TelegramPaymentCurrency): number {
    // UZS doesn't have decimal places, USD/RUB have cents/kopeks
    if (currency === TelegramPaymentCurrency.UZS) {
      return Math.round(amount * 100); // Telegram requires *100 for all currencies
    }
    return Math.round(amount * 100);
  }

  private convertFromSmallestUnits(amount: number, _currency: TelegramPaymentCurrency): number {
    return amount / 100;
  }

  private mapToDto(payment: TelegramPayment): PaymentDto {
    return {
      id: payment.id,
      userId: payment.userId,
      organizationId: payment.organizationId,
      orderId: payment.orderId,
      provider: payment.provider,
      status: payment.status,
      currency: payment.currency,
      amount: Number(payment.amount),
      telegramUserId: Number(payment.telegramUserId),
      telegramPaymentChargeId: payment.telegramPaymentChargeId,
      providerPaymentChargeId: payment.providerPaymentChargeId,
      description: payment.description,
      failureReason: payment.failureReason,
      createdAt: payment.created_at,
      completedAt: payment.completedAt,
      refundedAt: payment.refundedAt,
      refundedAmount: payment.refundedAmount ? Number(payment.refundedAmount) : undefined,
    };
  }
}
