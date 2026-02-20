import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

import { TelegramPaymentsService } from './telegram-payments.service';
import { TelegramPayment } from './entities/telegram-payment.entity';
import { Order } from '../orders/entities/order.entity';
import {
  TelegramPaymentStatus,
  TelegramPaymentProvider,
  TelegramPaymentCurrency,
  TELEGRAM_PAYMENT_ERRORS,
} from './telegram-payments.constants';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
});

// Mock global fetch
const mockFetchResponse = (data: any) => ({
  json: jest.fn().mockResolvedValue(data),
});

describe('TelegramPaymentsService', () => {
  let service: TelegramPaymentsService;
  let paymentRepo: MockRepository<TelegramPayment>;
  let orderRepo: MockRepository<Order>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';
  const paymentId = 'pay-uuid-1';
  const orderId = 'order-uuid-1';

  const mockPayment: Partial<TelegramPayment> = {
    id: paymentId,
    userId,
    organizationId: orgId,
    orderId,
    provider: TelegramPaymentProvider.PAYME,
    status: TelegramPaymentStatus.COMPLETED,
    currency: TelegramPaymentCurrency.UZS,
    amount: 50000,
    telegramUserId: 123456789,
    telegramPaymentChargeId: 'charge-1',
    providerPaymentChargeId: 'provider-charge-1',
    invoicePayload: JSON.stringify({ orderId, userId, organizationId: orgId }),
    description: 'Order #ORD-001',
    created_at: new Date(),
    completedAt: new Date(),
  } as any;

  const mockOrder: Partial<Order> = {
    id: orderId,
    organizationId: orgId,
    orderNumber: 'ORD-001',
    totalAmount: 50000,
    items: [
      {
        totalPrice: 25000,
        product: { name: 'Cola' },
      },
      {
        totalPrice: 25000,
        product: { name: 'Snickers' },
      },
    ],
  } as any;

  beforeEach(async () => {
    paymentRepo = createMockRepository<TelegramPayment>();
    orderRepo = createMockRepository<Order>();
    eventEmitter = { emit: jest.fn() } as any;
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return 'test-bot-token';
        return '';
      }),
    } as any;

    // Mock global fetch
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramPaymentsService,
        { provide: getRepositoryToken(TelegramPayment), useValue: paymentRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<TelegramPaymentsService>(TelegramPaymentsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================================================
  // createInvoice
  // ========================================================================

  describe('createInvoice', () => {
    it('should create an invoice and send via Telegram API', async () => {
      orderRepo.findOne!.mockResolvedValue(mockOrder);
      paymentRepo.create!.mockReturnValue({ ...mockPayment, status: TelegramPaymentStatus.PENDING });
      paymentRepo.save!.mockImplementation(async (entity) => entity);
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({ ok: true, result: {} }));

      const result = await service.createInvoice(userId, orgId, {
        orderId,
        provider: TelegramPaymentProvider.PAYME,
        currency: TelegramPaymentCurrency.UZS,
        telegramUserId: 123456789,
        telegramChatId: 123456789,
      } as any);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBeDefined();
      expect(paymentRepo.create).toHaveBeenCalled();
      expect(paymentRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid provider', async () => {
      await expect(
        service.createInvoice(userId, orgId, {
          provider: 'invalid_provider',
          currency: TelegramPaymentCurrency.UZS,
          orderId,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unsupported currency', async () => {
      await expect(
        service.createInvoice(userId, orgId, {
          provider: TelegramPaymentProvider.PAYME,
          currency: TelegramPaymentCurrency.USD, // Payme only supports UZS
          orderId,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.createInvoice(userId, orgId, {
          provider: TelegramPaymentProvider.PAYME,
          currency: TelegramPaymentCurrency.UZS,
          orderId: 'nonexistent',
          telegramUserId: 123,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return failure when Telegram API call fails', async () => {
      orderRepo.findOne!.mockResolvedValue(mockOrder);
      paymentRepo.create!.mockReturnValue({ ...mockPayment, status: TelegramPaymentStatus.PENDING });
      paymentRepo.save!.mockImplementation(async (entity) => entity);
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ ok: false, description: 'Bot blocked' }),
      );

      const result = await service.createInvoice(userId, orgId, {
        orderId,
        provider: TelegramPaymentProvider.PAYME,
        currency: TelegramPaymentCurrency.UZS,
        telegramUserId: 123,
        telegramChatId: 123,
      } as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Bot blocked');
    });
  });

  // ========================================================================
  // createInvoiceLink
  // ========================================================================

  describe('createInvoiceLink', () => {
    it('should create an invoice link', async () => {
      paymentRepo.create!.mockReturnValue({ ...mockPayment, status: TelegramPaymentStatus.PENDING });
      paymentRepo.save!.mockImplementation(async (entity) => entity);
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ ok: true, result: 'https://t.me/invoice/xxx' }),
      );

      const result = await service.createInvoiceLink(userId, orgId, {
        provider: TelegramPaymentProvider.PAYME,
        currency: TelegramPaymentCurrency.UZS,
        amount: 5000000, // smallest units
        title: 'Order Payment',
        description: 'Pay for order',
      } as any);

      expect(result.success).toBe(true);
      expect(result.invoiceLink).toBe('https://t.me/invoice/xxx');
    });
  });

  // ========================================================================
  // handlePreCheckoutQuery
  // ========================================================================

  describe('handlePreCheckoutQuery', () => {
    it('should return ok when order and amount are valid', async () => {
      orderRepo.findOne!.mockResolvedValue(mockOrder);
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({ ok: true }));

      const result = await service.handlePreCheckoutQuery({
        preCheckoutQueryId: 'query-1',
        invoicePayload: JSON.stringify({ orderId }),
        currency: 'UZS',
        totalAmount: 5000000, // 50000 * 100
      } as any);

      expect(result.ok).toBe(true);
    });

    it('should return not ok when order not found', async () => {
      orderRepo.findOne!.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({ ok: true }));

      const result = await service.handlePreCheckoutQuery({
        preCheckoutQueryId: 'query-1',
        invoicePayload: JSON.stringify({ orderId: 'nonexistent' }),
        currency: 'UZS',
        totalAmount: 5000000,
      } as any);

      expect(result.ok).toBe(false);
      expect(result.errorMessage).toBe('Order not found');
    });

    it('should return not ok when amount does not match', async () => {
      orderRepo.findOne!.mockResolvedValue(mockOrder);
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({ ok: true }));

      const result = await service.handlePreCheckoutQuery({
        preCheckoutQueryId: 'query-1',
        invoicePayload: JSON.stringify({ orderId }),
        currency: 'UZS',
        totalAmount: 9999999,
      } as any);

      expect(result.ok).toBe(false);
      expect(result.errorMessage).toBe('Amount mismatch');
    });

    it('should handle invalid JSON in payload gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({ ok: true }));

      const result = await service.handlePreCheckoutQuery({
        preCheckoutQueryId: 'query-1',
        invoicePayload: 'invalid-json',
        currency: 'UZS',
        totalAmount: 100,
      } as any);

      expect(result.ok).toBe(false);
    });
  });

  // ========================================================================
  // handleSuccessfulPayment
  // ========================================================================

  describe('handleSuccessfulPayment', () => {
    it('should update existing pending payment to COMPLETED', async () => {
      const pendingPayment = { ...mockPayment, status: TelegramPaymentStatus.PENDING, orderId };
      paymentRepo.findOne!.mockResolvedValue(pendingPayment);
      paymentRepo.save!.mockImplementation(async (entity) => entity);
      orderRepo.update!.mockResolvedValue({ affected: 1 });

      const result = await service.handleSuccessfulPayment(123456789, {
        invoicePayload: JSON.stringify({ orderId, userId, organizationId: orgId }),
        currency: 'UZS',
        totalAmount: 5000000,
        telegramPaymentChargeId: 'charge-new',
        providerPaymentChargeId: 'prov-charge',
      } as any);

      expect(result.status).toBe(TelegramPaymentStatus.COMPLETED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.completed', expect.any(Object));
      expect(orderRepo.update).toHaveBeenCalled();
    });

    it('should create new payment record when no pending payment found', async () => {
      paymentRepo.findOne!.mockResolvedValue(null);
      paymentRepo.create!.mockReturnValue({ ...mockPayment, status: TelegramPaymentStatus.COMPLETED });
      paymentRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.handleSuccessfulPayment(123456789, {
        invoicePayload: JSON.stringify({ orderId, userId, organizationId: orgId }),
        currency: 'UZS',
        totalAmount: 5000000,
        telegramPaymentChargeId: 'charge-new',
        providerPaymentChargeId: 'prov-charge',
      } as any);

      expect(paymentRepo.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.completed', expect.any(Object));
    });
  });

  // ========================================================================
  // refundPayment
  // ========================================================================

  describe('refundPayment', () => {
    it('should refund a completed payment', async () => {
      const completedPayment = {
        ...mockPayment,
        status: TelegramPaymentStatus.COMPLETED,
        refundedAt: null,
      };
      paymentRepo.findOne!.mockResolvedValue(completedPayment);
      paymentRepo.save!.mockImplementation(async (entity) => entity);
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({ ok: true }));

      const result = await service.refundPayment(orgId, {
        paymentId,
        reason: 'Customer request',
      } as any);

      expect(result.status).toBe(TelegramPaymentStatus.REFUNDED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('payment.refunded', expect.any(Object));
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.refundPayment(orgId, { paymentId: 'nonexistent' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payment not completed', async () => {
      paymentRepo.findOne!.mockResolvedValue({
        ...mockPayment,
        status: TelegramPaymentStatus.PENDING,
      });

      await expect(
        service.refundPayment(orgId, { paymentId } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already refunded', async () => {
      paymentRepo.findOne!.mockResolvedValue({
        ...mockPayment,
        status: TelegramPaymentStatus.COMPLETED,
        refundedAt: new Date(),
      });

      await expect(
        service.refundPayment(orgId, { paymentId } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Telegram refund API fails', async () => {
      paymentRepo.findOne!.mockResolvedValue({
        ...mockPayment,
        status: TelegramPaymentStatus.COMPLETED,
        refundedAt: null,
      });
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ ok: false, description: 'Refund failed' }),
      );

      await expect(
        service.refundPayment(orgId, { paymentId } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // getPayment
  // ========================================================================

  describe('getPayment', () => {
    it('should return a payment DTO', async () => {
      paymentRepo.findOne!.mockResolvedValue(mockPayment);

      const result = await service.getPayment(paymentId, orgId);

      expect(result.id).toBe(paymentId);
      expect(result.amount).toBe(50000);
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentRepo.findOne!.mockResolvedValue(null);

      await expect(service.getPayment('bad', orgId))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ========================================================================
  // getPayments
  // ========================================================================

  describe('getPayments', () => {
    it('should return paginated payments list', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockPayment], 1]);
      paymentRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getPayments({ page: 1, limit: 20 } as any, orgId);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should apply all optional filters', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      paymentRepo.createQueryBuilder!.mockReturnValue(qb as any);

      await service.getPayments(
        {
          status: TelegramPaymentStatus.COMPLETED,
          provider: TelegramPaymentProvider.PAYME,
          userId: 'u1',
          fromDate: new Date(),
          toDate: new Date(),
          page: 1,
          limit: 10,
        } as any,
        orgId,
      );

      // org + userId + status + provider + fromDate + toDate = 6
      expect(qb.andWhere).toHaveBeenCalledTimes(6);
    });
  });

  // ========================================================================
  // getStats
  // ========================================================================

  describe('getStats', () => {
    it('should return aggregated payment statistics', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([
        { status: TelegramPaymentStatus.COMPLETED, amount: 50000, provider: TelegramPaymentProvider.PAYME, refundedAmount: null },
        { status: TelegramPaymentStatus.COMPLETED, amount: 30000, provider: TelegramPaymentProvider.PAYME, refundedAmount: null },
        { status: TelegramPaymentStatus.FAILED, amount: 10000, provider: TelegramPaymentProvider.CLICK, refundedAmount: null },
        { status: TelegramPaymentStatus.REFUNDED, amount: 20000, provider: TelegramPaymentProvider.PAYME, refundedAmount: 20000 },
      ]);
      paymentRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getStats(orgId);

      expect(result.totalPayments).toBe(4);
      expect(result.completedPayments).toBe(2);
      expect(result.failedPayments).toBe(1);
      expect(result.refundedPayments).toBe(1);
      expect(result.totalAmount).toBe(80000);
      expect(result.refundedAmount).toBe(20000);
      expect(result.netAmount).toBe(60000);
    });

    it('should return zero stats when no payments', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      paymentRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getStats(orgId);

      expect(result.totalPayments).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  // ========================================================================
  // getUserPayments
  // ========================================================================

  describe('getUserPayments', () => {
    it('should call getPayments with userId filter', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      paymentRepo.createQueryBuilder!.mockReturnValue(qb as any);

      await service.getUserPayments(userId, { page: 1, limit: 10 } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('p.userId = :userId', { userId });
    });
  });
});
