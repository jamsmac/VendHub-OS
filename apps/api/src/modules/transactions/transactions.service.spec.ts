import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { TransactionsService } from './transactions.service';
import {
  Transaction,
  TransactionItem,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  CollectionRecord,
  TransactionDailySummary,
  Commission,
} from './entities/transaction.entity';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepo: jest.Mocked<Repository<Transaction>>;
  let itemRepo: jest.Mocked<Repository<TransactionItem>>;
  let collectionRecordRepo: jest.Mocked<Repository<CollectionRecord>>;
  let dailySummaryRepo: jest.Mocked<Repository<TransactionDailySummary>>;
  let commissionRepo: jest.Mocked<Repository<Commission>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = 'org-uuid-1';

  const mockTransaction = {
    id: 'txn-uuid-1',
    organizationId: orgId,
    machineId: 'machine-uuid-1',
    type: TransactionType.SALE,
    status: TransactionStatus.COMPLETED,
    amount: 12000,
    totalAmount: 12000,
    quantity: 1,
    currency: 'UZS',
    paymentMethod: PaymentMethod.CASH,
    paymentId: null,
    transactionDate: new Date(),
    transactionNumber: 'TRX20250601-000001',
    isFiscalized: false,
    fiscalReceiptNumber: null,
    fiscalSign: null,
    fiscalQrCode: null,
    fiscalizedAt: null,
    fiscalData: null,
    refundedAmount: 0,
    refundedAt: null,
    refundReason: null,
    originalTransactionId: null,
    notes: null,
    userId: null,
    metadata: {},
    items: [],
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Transaction;

  const mockItem = {
    id: 'item-uuid-1',
    transactionId: 'txn-uuid-1',
    productId: 'product-uuid-1',
    productName: 'Americano',
    quantity: 1,
    unitPrice: 12000,
    totalAmount: 12000,
    slotNumber: '1',
    metadata: { dispenseStatus: 'dispensed' },
  } as unknown as TransactionItem;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockTransaction]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTransaction], 1]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(TransactionItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(CollectionRecord),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(TransactionDailySummary),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Commission),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionRepo = module.get(getRepositoryToken(Transaction));
    itemRepo = module.get(getRepositoryToken(TransactionItem));
    collectionRecordRepo = module.get(getRepositoryToken(CollectionRecord));
    dailySummaryRepo = module.get(getRepositoryToken(TransactionDailySummary));
    commissionRepo = module.get(getRepositoryToken(Commission));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE
  // ============================================================================

  describe('create', () => {
    it('should create a new transaction with items', async () => {
      const createdTxn = { ...mockTransaction, id: 'new-txn-uuid' } as any;
      transactionRepo.create.mockReturnValue(createdTxn);
      transactionRepo.save.mockResolvedValue(createdTxn);
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);
      transactionRepo.findOne.mockResolvedValue({
        ...createdTxn,
        items: [mockItem],
      });

      const result = await service.create({
        organizationId: orgId,
        machineId: 'machine-uuid-1',
        items: [
          {
            productId: 'product-uuid-1',
            slotNumber: 1,
            quantity: 1,
            unitPrice: 12000,
            productName: 'Americano',
          },
        ],
      });

      expect(result).toHaveProperty('id');
      expect(transactionRepo.create).toHaveBeenCalled();
      expect(itemRepo.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'transaction.created',
        createdTxn,
      );
    });

    it('should calculate correct subtotal from multiple items', async () => {
      transactionRepo.create.mockImplementation((data) => data as any);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve({ id: 'new-txn-uuid', ...data } as any),
      );
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);
      transactionRepo.findOne.mockResolvedValue(mockTransaction);

      await service.create({
        organizationId: orgId,
        machineId: 'machine-uuid-1',
        items: [
          {
            productId: 'p1',
            slotNumber: 1,
            quantity: 2,
            unitPrice: 5000,
            productName: 'Water',
          },
          {
            productId: 'p2',
            slotNumber: 2,
            quantity: 1,
            unitPrice: 12000,
            productName: 'Coffee',
          },
        ],
      });

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 22000,
          totalAmount: 22000,
          quantity: 3,
        }),
      );
    });
  });

  // ============================================================================
  // FIND
  // ============================================================================

  describe('findById', () => {
    it('should return transaction when found', async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findById('txn-uuid-1');

      expect(result).toEqual(mockTransaction);
      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'txn-uuid-1' },
        relations: ['items'],
      });
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions for organization', async () => {
      const result = await service.findAll(orgId, { page: 1, limit: 50 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('totalPages');
    });
  });

  // ============================================================================
  // PROCESS PAYMENT
  // ============================================================================

  describe('processPayment', () => {
    it('should process cash payment and mark as completed', async () => {
      const pendingTxn = {
        ...mockTransaction,
        status: TransactionStatus.PENDING,
        metadata: {},
      } as any;
      transactionRepo.findOne
        .mockResolvedValueOnce(pendingTxn)
        .mockResolvedValueOnce({ ...pendingTxn, status: TransactionStatus.COMPLETED });
      transactionRepo.save.mockResolvedValue({
        ...pendingTxn,
        status: TransactionStatus.COMPLETED,
      });

      const result = await service.processPayment({
        transactionId: 'txn-uuid-1',
        method: PaymentMethod.CASH,
        amount: 12000,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'transaction.paid',
        expect.anything(),
      );
    });

    it('should throw BadRequestException when transaction already processed', async () => {
      transactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      } as any);

      await expect(
        service.processPayment({
          transactionId: 'txn-uuid-1',
          method: PaymentMethod.PAYME,
          amount: 12000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // CANCEL
  // ============================================================================

  describe('cancel', () => {
    it('should cancel a pending transaction', async () => {
      const pendingTxn = {
        ...mockTransaction,
        status: TransactionStatus.PENDING,
        metadata: {},
      } as any;
      transactionRepo.findOne
        .mockResolvedValueOnce(pendingTxn)
        .mockResolvedValueOnce({ ...pendingTxn, status: TransactionStatus.CANCELLED });
      transactionRepo.save.mockResolvedValue({
        ...pendingTxn,
        status: TransactionStatus.CANCELLED,
      });

      const result = await service.cancel('txn-uuid-1', 'Customer changed mind');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'transaction.cancelled',
        expect.anything(),
      );
    });

    it('should throw BadRequestException when cancelling completed transaction', async () => {
      transactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      } as any);

      await expect(
        service.cancel('txn-uuid-1', 'Too late'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // REVENUE SUMMARY (SQL aggregation)
  // ============================================================================

  describe('getRevenueSummary', () => {
    it('should return revenue summary with breakdown by payment type', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({
        total: '500000',
        cash: '200000',
        card: '200000',
        mobile: '100000',
        count: '42',
      });

      const result = await service.getRevenueSummary(
        orgId,
        new Date('2025-06-01'),
        new Date('2025-06-30'),
      );

      expect(result.total).toBe(500000);
      expect(result.cash).toBe(200000);
      expect(result.card).toBe(200000);
      expect(result.mobile).toBe(100000);
      expect(result.count).toBe(42);
    });

    it('should return zeros when no transactions found', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      const result = await service.getRevenueSummary(
        orgId,
        new Date('2025-06-01'),
        new Date('2025-06-30'),
      );

      expect(result.total).toBe(0);
      expect(result.cash).toBe(0);
      expect(result.card).toBe(0);
      expect(result.mobile).toBe(0);
      expect(result.count).toBe(0);
    });
  });

  // ============================================================================
  // TODAY TRANSACTIONS
  // ============================================================================

  describe('getTodayTransactions', () => {
    it('should return paginated transactions for today', async () => {
      transactionRepo.findAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getTodayTransactions('machine-uuid-1');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(transactionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            machineId: 'machine-uuid-1',
          }),
        }),
      );
    });

    it('should cap limit at 100', async () => {
      transactionRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getTodayTransactions('machine-uuid-1', 1, 200);

      expect(transactionRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  // ============================================================================
  // DAILY SUMMARIES
  // ============================================================================

  describe('getDailySummaries', () => {
    it('should return paginated daily summaries for organization', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.getDailySummaries(orgId, {
        page: 1,
        limit: 20,
      } as any);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('totalPages');
    });
  });

  // ============================================================================
  // REMOVE
  // ============================================================================

  describe('remove', () => {
    it('should soft delete cancelled transaction', async () => {
      transactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.CANCELLED,
      } as any);
      transactionRepo.softDelete.mockResolvedValue(undefined as any);

      await service.remove('txn-uuid-1');

      expect(transactionRepo.softDelete).toHaveBeenCalledWith('txn-uuid-1');
    });

    it('should throw BadRequestException when deleting completed transaction', async () => {
      transactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      } as any);

      await expect(service.remove('txn-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // COLLECTION RECORDS
  // ============================================================================

  describe('verifyCollection', () => {
    it('should throw NotFoundException for non-existent collection', async () => {
      collectionRecordRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyCollection('non-existent', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already verified collection', async () => {
      collectionRecordRepo.findOne.mockResolvedValue({
        id: 'col-uuid-1',
        isVerified: true,
      } as any);

      await expect(
        service.verifyCollection('col-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
