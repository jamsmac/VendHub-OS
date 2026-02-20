import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PaymentsService, PaymeWebhookData, ClickWebhookData } from './payments.service';
import {
  PaymentTransaction,
  PaymentProvider,
  PaymentTransactionStatus,
} from './entities/payment-transaction.entity';
import { PaymentRefund, RefundStatus } from './entities/payment-refund.entity';

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let transactionRepo: jest.Mocked<Repository<PaymentTransaction>>;
  let refundRepo: jest.Mocked<Repository<PaymentRefund>>;
  let configService: jest.Mocked<ConfigService>;

  const mockTransaction = {
    id: 'tx-uuid-1',
    organization_id: ORG_ID,
    provider: PaymentProvider.PAYME,
    provider_tx_id: 'payme-tx-123',
    amount: 50000,
    currency: 'UZS',
    status: PaymentTransactionStatus.COMPLETED,
    order_id: 'order-001',
    machine_id: null,
    client_user_id: null,
    processed_at: new Date(),
    raw_request: {},
    raw_response: {},
    error_message: null,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as PaymentTransaction;

  const mockPendingTransaction = {
    ...mockTransaction,
    id: 'tx-uuid-2',
    status: PaymentTransactionStatus.PENDING,
    provider_tx_id: null,
  } as unknown as PaymentTransaction;

  const mockRefund = {
    id: 'refund-uuid-1',
    organization_id: ORG_ID,
    payment_transaction_id: 'tx-uuid-1',
    amount: 50000,
    reason: 'customer_request',
    status: RefundStatus.PENDING,
    processed_by_user_id: 'user-uuid-1',
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as PaymentRefund;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockTransaction]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTransaction], 1]),
    getRawOne: jest.fn().mockResolvedValue({ total_revenue: '50000', total_count: '1' }),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(PaymentRefund),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    transactionRepo = module.get(getRepositoryToken(PaymentTransaction));
    refundRepo = module.get(getRepositoryToken(PaymentRefund));
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE PAYME TRANSACTION
  // ============================================================================

  describe('createPaymeTransaction', () => {
    it('should create a Payme transaction with checkout URL', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'PAYME_MERCHANT_ID') return 'merchant-123';
        if (key === 'PAYME_CHECKOUT_URL') return 'https://checkout.paycom.uz';
        return undefined;
      });
      transactionRepo.create.mockReturnValue({ ...mockPendingTransaction } as any);
      transactionRepo.save.mockResolvedValue({ ...mockPendingTransaction } as any);

      const result = await service.createPaymeTransaction(50000, 'order-001', ORG_ID);

      expect(result.provider).toBe('payme');
      expect(result.status).toBe('pending');
      expect(result.amount).toBe(50000);
      expect(result.checkoutUrl).toBeDefined();
    });

    it('should throw BadRequestException when PAYME_MERCHANT_ID is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        service.createPaymeTransaction(50000, 'order-001', ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save transaction record when organizationId is provided', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'PAYME_MERCHANT_ID') return 'merchant-123';
        return 'https://checkout.paycom.uz';
      });
      transactionRepo.create.mockReturnValue(mockPendingTransaction as any);
      transactionRepo.save.mockResolvedValue(mockPendingTransaction as any);

      await service.createPaymeTransaction(50000, 'order-001', ORG_ID);

      expect(transactionRepo.create).toHaveBeenCalled();
      expect(transactionRepo.save).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // HANDLE PAYME WEBHOOK
  // ============================================================================

  describe('handlePaymeWebhook', () => {
    it('should throw UnauthorizedException for invalid signature', async () => {
      configService.get.mockReturnValue(undefined);

      const data: PaymeWebhookData = {
        method: 'CheckPerformTransaction',
        params: { account: { order_id: 'order-001' }, amount: 5000000 },
        id: 1,
      };

      await expect(
        service.handlePaymeWebhook(data, undefined),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return error for unknown method', async () => {
      // Mock valid auth
      configService.get.mockImplementation((key: string) => {
        if (key === 'PAYME_MERCHANT_KEY') return 'test-key';
        if (key === 'PAYME_MERCHANT_ID') return 'test-merchant';
        return undefined;
      });

      const validAuth = 'Basic ' + Buffer.from('test-merchant:test-key').toString('base64');
      const data: PaymeWebhookData = {
        method: 'UnknownMethod',
        params: {},
        id: 1,
      };

      const result = await service.handlePaymeWebhook(data, validAuth);

      expect(result).toHaveProperty('error');
      expect((result.error as any).code).toBe(-32601);
    });
  });

  // ============================================================================
  // CREATE CLICK TRANSACTION
  // ============================================================================

  describe('createClickTransaction', () => {
    it('should create a Click transaction with checkout URL', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'CLICK_MERCHANT_ID') return 'click-merchant-123';
        if (key === 'CLICK_SERVICE_ID') return 'service-456';
        if (key === 'CLICK_CHECKOUT_URL') return 'https://my.click.uz/services/pay';
        if (key === 'CLICK_RETURN_URL') return '';
        return undefined;
      });
      transactionRepo.create.mockReturnValue(mockPendingTransaction as any);
      transactionRepo.save.mockResolvedValue(mockPendingTransaction as any);

      const result = await service.createClickTransaction(30000, 'order-002', ORG_ID);

      expect(result.provider).toBe('click');
      expect(result.status).toBe('pending');
      expect(result.checkoutUrl).toContain('click.uz');
    });

    it('should throw BadRequestException when Click is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        service.createClickTransaction(30000, 'order-002', ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // INITIATE REFUND
  // ============================================================================

  describe('initiateRefund', () => {
    it('should create a refund for a completed transaction', async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);
      refundRepo.find.mockResolvedValue([]);
      refundRepo.create.mockReturnValue(mockRefund as any);
      refundRepo.save.mockResolvedValue(mockRefund as any);

      const dto = {
        paymentTransactionId: 'tx-uuid-1',
        amount: 50000,
        reason: 'customer_request',
      };

      const result = await service.initiateRefund(dto as any, ORG_ID, 'user-uuid-1');

      expect(result).toEqual(mockRefund);
      expect(refundRepo.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.initiateRefund({ paymentTransactionId: 'non-existent' } as any, ORG_ID, 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction is not completed', async () => {
      transactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: PaymentTransactionStatus.PENDING,
      } as any);

      await expect(
        service.initiateRefund({ paymentTransactionId: 'tx-uuid-1' } as any, ORG_ID, 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when refund exceeds remaining amount', async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);
      refundRepo.find.mockResolvedValue([{ ...mockRefund, amount: 50000, status: RefundStatus.COMPLETED } as any]);

      await expect(
        service.initiateRefund(
          { paymentTransactionId: 'tx-uuid-1', amount: 10000 } as any,
          ORG_ID,
          'user-uuid-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // GET TRANSACTIONS
  // ============================================================================

  describe('getTransactions', () => {
    it('should return paginated transactions for organization', async () => {
      const result = await service.getTransactions({ page: 1, limit: 20 } as any, ORG_ID);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
    });
  });

  // ============================================================================
  // GET TRANSACTION
  // ============================================================================

  describe('getTransaction', () => {
    it('should return single transaction with refunds', async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getTransaction('tx-uuid-1', ORG_ID);

      expect(result).toEqual(mockTransaction);
      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'tx-uuid-1', organization_id: ORG_ID },
        relations: ['refunds'],
      });
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getTransaction('non-existent', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // VERIFY PAYME SIGNATURE
  // ============================================================================

  describe('verifyPaymeSignature', () => {
    it('should return false when auth header is missing', () => {
      const result = service.verifyPaymeSignature(undefined);

      expect(result).toBe(false);
    });

    it('should return false when PAYME_MERCHANT_KEY is not configured', () => {
      configService.get.mockReturnValue(undefined);

      const result = service.verifyPaymeSignature('Basic dGVzdA==');

      expect(result).toBe(false);
    });

    it('should return false when auth header does not start with Basic', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'PAYME_MERCHANT_KEY') return 'key';
        if (key === 'PAYME_MERCHANT_ID') return 'id';
        return undefined;
      });

      const result = service.verifyPaymeSignature('Bearer token');

      expect(result).toBe(false);
    });
  });
});
