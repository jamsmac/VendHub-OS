import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { TransactionCreateService } from "./transaction-create.service";
import { TransactionQueryService } from "./transaction-query.service";
import {
  Transaction,
  TransactionItem,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from "./entities/transaction.entity";
import {
  Recipe,
  RecipeIngredient,
  IngredientBatch,
} from "../products/entities/product.entity";
import { SaleIngredient } from "./entities/sale-ingredient.entity";

describe("TransactionCreateService", () => {
  let service: TransactionCreateService;
  let transactionRepo: jest.Mocked<Repository<Transaction>>;
  let itemRepo: jest.Mocked<Repository<TransactionItem>>;
  let recipeRepo: jest.Mocked<Repository<Recipe>>;
  let _recipeIngredientRepo: jest.Mocked<Repository<RecipeIngredient>>;
  let _ingredientBatchRepo: jest.Mocked<Repository<IngredientBatch>>;
  let queryService: jest.Mocked<TransactionQueryService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = "org-uuid-1";
  const machineId = "machine-uuid-1";

  const mockTransaction = {
    id: "txn-uuid-1",
    organizationId: orgId,
    machineId,
    type: TransactionType.SALE,
    status: TransactionStatus.COMPLETED,
    amount: 12000,
    totalAmount: 12000,
    quantity: 1,
    currency: "UZS",
    paymentMethod: PaymentMethod.CASH,
    paymentId: null,
    transactionDate: new Date(),
    transactionNumber: "S-ABC123",
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
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Transaction;

  const mockItem = {
    id: "item-uuid-1",
    transactionId: "txn-uuid-1",
    productId: "product-uuid-1",
    productName: "Americano",
    quantity: 1,
    unitPrice: 12000,
    totalAmount: 12000,
    slotNumber: "1",
    metadata: { dispenseStatus: "pending" },
  } as unknown as TransactionItem;

  beforeEach(async () => {
    const mockQueryService = {
      findById: jest.fn().mockResolvedValue(mockTransaction),
    };

    const mockTransactionRepoValue = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionCreateService,
        {
          provide: TransactionQueryService,
          useValue: mockQueryService,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepoValue,
        },
        {
          provide: getRepositoryToken(TransactionItem),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Recipe),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RecipeIngredient),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(IngredientBatch),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SaleIngredient),
          useValue: {
            create: jest.fn((data: Record<string, unknown>) => data),
            save: jest.fn((entities: unknown) => Promise.resolve(entities)),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((cb) => {
              // Return the same transactionRepo mock so tests can set up
              // expectations on transactionRepo and have them work inside transactions
              const mockManager = {
                getRepository: jest
                  .fn()
                  .mockReturnValue(mockTransactionRepoValue),
              };
              return cb(mockManager);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionCreateService>(TransactionCreateService);
    transactionRepo = module.get(getRepositoryToken(Transaction));
    itemRepo = module.get(getRepositoryToken(TransactionItem));
    recipeRepo = module.get(getRepositoryToken(Recipe));
    _recipeIngredientRepo = module.get(getRepositoryToken(RecipeIngredient));
    _ingredientBatchRepo = module.get(getRepositoryToken(IngredientBatch));
    queryService = module.get(TransactionQueryService);
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // CREATE
  // ==========================================================================

  describe("create", () => {
    it("should create a sale transaction with correct totals", async () => {
      const savedTxn = { ...mockTransaction, id: "new-txn-uuid" } as any;
      transactionRepo.create.mockReturnValue(savedTxn);
      transactionRepo.save.mockResolvedValue(savedTxn);
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);
      queryService.findById.mockResolvedValue({
        ...savedTxn,
        items: [mockItem],
      });

      const result = await service.create({
        organizationId: orgId,
        machineId,
        items: [
          {
            productId: "product-uuid-1",
            slotNumber: 1,
            quantity: 1,
            unitPrice: 12000,
            productName: "Americano",
          },
        ],
      });

      expect(result).toHaveProperty("id");
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          machineId,
          type: TransactionType.SALE,
          status: TransactionStatus.PENDING,
          amount: 12000,
          totalAmount: 12000,
          quantity: 1,
          currency: "UZS",
        }),
      );
    });

    it("should calculate subtotal and item count for multiple items", async () => {
      transactionRepo.create.mockImplementation((data) => data as any);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve({ id: "new-txn-uuid", ...data } as any),
      );
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);

      await service.create({
        organizationId: orgId,
        machineId,
        items: [
          {
            productId: "p1",
            slotNumber: 1,
            quantity: 2,
            unitPrice: 5000,
            productName: "Water",
          },
          {
            productId: "p2",
            slotNumber: 2,
            quantity: 3,
            unitPrice: 8000,
            productName: "Juice",
          },
        ],
      });

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 34000, // 2*5000 + 3*8000
          totalAmount: 34000,
          quantity: 5, // 2 + 3
        }),
      );
    });

    it("should use custom currency when provided", async () => {
      transactionRepo.create.mockImplementation((data) => data as any);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve({ id: "new-txn-uuid", ...data } as any),
      );
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);

      await service.create({
        organizationId: orgId,
        machineId,
        currency: "USD",
        items: [
          {
            productId: "p1",
            slotNumber: 1,
            quantity: 1,
            unitPrice: 100,
            productName: "Item",
          },
        ],
      });

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "USD" }),
      );
    });

    it("should create transaction items with dispenseStatus pending", async () => {
      const savedTxn = { ...mockTransaction, id: "new-txn-uuid" } as any;
      transactionRepo.create.mockReturnValue(savedTxn);
      transactionRepo.save.mockResolvedValue(savedTxn);
      itemRepo.create.mockImplementation((data) => data as any);
      itemRepo.save.mockImplementation((data) => Promise.resolve(data as any));

      await service.create({
        organizationId: orgId,
        machineId,
        items: [
          {
            productId: "product-uuid-1",
            slotNumber: 3,
            quantity: 1,
            unitPrice: 12000,
            productName: "Americano",
            productSku: "AMR-001",
          },
        ],
      });

      expect(itemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: savedTxn.id,
          productId: "product-uuid-1",
          productName: "Americano",
          sku: "AMR-001",
          slotNumber: "3",
          metadata: { dispenseStatus: "pending" },
        }),
      );
    });

    it("should emit transaction.created event", async () => {
      const savedTxn = { ...mockTransaction, id: "new-txn-uuid" } as any;
      transactionRepo.create.mockReturnValue(savedTxn);
      transactionRepo.save.mockResolvedValue(savedTxn);
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);

      await service.create({
        organizationId: orgId,
        machineId,
        items: [
          {
            productId: "p1",
            slotNumber: 1,
            quantity: 1,
            unitPrice: 12000,
            productName: "Americano",
          },
        ],
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "transaction.created",
        savedTxn,
      );
    });

    it("should store customer metadata (phone, telegram, session, location)", async () => {
      transactionRepo.create.mockImplementation((data) => data as any);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve({ id: "new-txn-uuid", ...data } as any),
      );
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);

      await service.create({
        organizationId: orgId,
        machineId,
        customerPhone: "+998901234567",
        customerTelegramId: "tg-12345",
        sessionId: "session-uuid",
        locationId: "location-uuid",
        items: [
          {
            productId: "p1",
            slotNumber: 1,
            quantity: 1,
            unitPrice: 10000,
            productName: "Tea",
          },
        ],
      });

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            customerPhone: "+998901234567",
            customerTelegramId: "tg-12345",
            sessionId: "session-uuid",
            locationId: "location-uuid",
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // PROCESS PAYMENT
  // ==========================================================================

  describe("processPayment", () => {
    it("should mark cash payment as COMPLETED immediately", async () => {
      const pendingTxn = {
        ...mockTransaction,
        status: TransactionStatus.PENDING,
        metadata: {},
      } as any;
      queryService.findById.mockResolvedValueOnce(pendingTxn);
      transactionRepo.save.mockResolvedValue({
        ...pendingTxn,
        status: TransactionStatus.COMPLETED,
      });

      await service.processPayment({
        transactionId: "txn-uuid-1",
        method: PaymentMethod.CASH,
        amount: 12000,
      });

      expect(transactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CASH,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "transaction.paid",
        expect.anything(),
      );
    });

    it("should mark non-cash payment as PROCESSING", async () => {
      const pendingTxn = {
        ...mockTransaction,
        status: TransactionStatus.PENDING,
        metadata: {},
      } as any;
      queryService.findById.mockResolvedValueOnce(pendingTxn);
      transactionRepo.save.mockResolvedValue({
        ...pendingTxn,
        status: TransactionStatus.PROCESSING,
      });

      await service.processPayment({
        transactionId: "txn-uuid-1",
        method: PaymentMethod.PAYME,
        amount: 12000,
        providerTransactionId: "payme-txn-123",
        providerData: { orderId: "order-1" },
      });

      expect(transactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.PROCESSING,
          paymentMethod: PaymentMethod.PAYME,
          paymentId: "payme-txn-123",
        }),
      );
    });

    it("should throw BadRequestException for already processed transaction", async () => {
      queryService.findById.mockResolvedValueOnce({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      } as any);

      await expect(
        service.processPayment({
          transactionId: "txn-uuid-1",
          method: PaymentMethod.PAYME,
          amount: 12000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // CONFIRM PAYMENT
  // ==========================================================================

  describe("confirmPayment", () => {
    it("should confirm successful payment and emit transaction.paid", async () => {
      const processingTxn = {
        ...mockTransaction,
        status: TransactionStatus.PROCESSING,
        paymentId: "payme-txn-123",
        metadata: {},
      } as any;
      transactionRepo.findOne.mockResolvedValue(processingTxn);
      transactionRepo.save.mockResolvedValue({
        ...processingTxn,
        status: TransactionStatus.COMPLETED,
      });

      await service.confirmPayment("payme-txn-123", "payme", true, {
        receiptId: "rcpt-1",
      });

      expect(transactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.COMPLETED,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "transaction.paid",
        expect.anything(),
      );
    });

    it("should mark failed payment and emit transaction.failed", async () => {
      const processingTxn = {
        ...mockTransaction,
        status: TransactionStatus.PROCESSING,
        paymentId: "click-txn-456",
        metadata: {},
      } as any;
      transactionRepo.findOne.mockResolvedValue(processingTxn);
      transactionRepo.save.mockResolvedValue({
        ...processingTxn,
        status: TransactionStatus.FAILED,
      });

      await service.confirmPayment("click-txn-456", "click", false);

      expect(transactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.FAILED,
          metadata: expect.objectContaining({
            failureReason: "Платёж отклонён",
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "transaction.failed",
        expect.anything(),
      );
    });

    it("should throw NotFoundException when provider transaction not found", async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.confirmPayment("unknown-txn", "payme", true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // CANCEL
  // ==========================================================================

  describe("cancel", () => {
    it("should cancel a pending transaction with reason", async () => {
      const pendingTxn = {
        ...mockTransaction,
        status: TransactionStatus.PENDING,
        metadata: {},
      } as any;
      transactionRepo.findOne.mockResolvedValueOnce(pendingTxn);
      queryService.findById.mockResolvedValueOnce({
        ...pendingTxn,
        status: TransactionStatus.CANCELLED,
      });
      transactionRepo.save.mockResolvedValue({
        ...pendingTxn,
        status: TransactionStatus.CANCELLED,
      });

      await service.cancel("txn-uuid-1", "Customer changed mind");

      expect(transactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.CANCELLED,
          metadata: expect.objectContaining({
            cancellationReason: "Customer changed mind",
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "transaction.cancelled",
        expect.anything(),
      );
    });

    it("should throw BadRequestException when cancelling completed transaction", async () => {
      transactionRepo.findOne.mockResolvedValueOnce({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      } as any);

      await expect(service.cancel("txn-uuid-1", "Too late")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when cancelling refunded transaction", async () => {
      transactionRepo.findOne.mockResolvedValueOnce({
        ...mockTransaction,
        status: TransactionStatus.REFUNDED,
      } as any);

      await expect(
        service.cancel("txn-uuid-1", "Already refunded"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // CREATE REFUND
  // ==========================================================================

  describe("createRefund", () => {
    it("should create a refund transaction for the full amount", async () => {
      const completedTxn = {
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
        totalAmount: 12000,
        refundedAmount: 0,
        currency: "UZS",
      } as any;
      transactionRepo.findOne.mockResolvedValueOnce(completedTxn);
      transactionRepo.create.mockImplementation((data) => data as any);
      transactionRepo.save
        .mockResolvedValueOnce({
          id: "refund-uuid",
          ...completedTxn,
          type: TransactionType.REFUND,
        } as any)
        .mockResolvedValueOnce(completedTxn);

      await service.createRefund("txn-uuid-1", 12000, "Defective product");

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.REFUND,
          status: TransactionStatus.PENDING,
          amount: 12000,
          totalAmount: 12000,
          originalTransactionId: "txn-uuid-1",
          refundReason: "Defective product",
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "transaction.refund.requested",
        expect.objectContaining({
          transaction: expect.anything(),
          refund: expect.anything(),
        }),
      );
    });

    it("should mark original transaction as REFUNDED when full amount refunded", async () => {
      const completedTxn = {
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
        totalAmount: 12000,
        refundedAmount: 0,
      } as any;
      transactionRepo.findOne.mockResolvedValueOnce(completedTxn);
      transactionRepo.create.mockImplementation((data) => data as any);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      await service.createRefund("txn-uuid-1", 12000, "Full refund");

      expect(transactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.REFUNDED,
          refundedAmount: 12000,
        }),
      );
    });

    it("should mark original transaction as PARTIALLY_REFUNDED for partial refund", async () => {
      const completedTxn = {
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
        totalAmount: 12000,
        refundedAmount: 0,
      } as any;
      transactionRepo.findOne.mockResolvedValueOnce(completedTxn);
      transactionRepo.create.mockImplementation((data) => data as any);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      await service.createRefund("txn-uuid-1", 5000, "Partial refund");

      expect(transactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.PARTIALLY_REFUNDED,
          refundedAmount: 5000,
        }),
      );
    });
  });

  // ==========================================================================
  // PROCESS REFUND
  // ==========================================================================

  describe("processRefund", () => {
    it("should mark refund as COMPLETED on success", async () => {
      const refundTxn = {
        ...mockTransaction,
        id: "refund-uuid",
        type: TransactionType.REFUND,
        status: TransactionStatus.PENDING,
        metadata: {},
      } as any;
      transactionRepo.findOne.mockResolvedValue(refundTxn);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      const result = await service.processRefund(
        "refund-uuid",
        true,
        "REF-12345",
      );

      expect(result.status).toBe(TransactionStatus.COMPLETED);
      expect(result.metadata).toEqual(
        expect.objectContaining({ referenceNumber: "REF-12345" }),
      );
    });

    it("should mark refund as FAILED on failure", async () => {
      const refundTxn = {
        ...mockTransaction,
        id: "refund-uuid",
        type: TransactionType.REFUND,
        status: TransactionStatus.PENDING,
        metadata: {},
      } as any;
      transactionRepo.findOne.mockResolvedValue(refundTxn);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      const result = await service.processRefund("refund-uuid", false);

      expect(result.status).toBe(TransactionStatus.FAILED);
    });

    it("should throw NotFoundException when refund not found", async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(service.processRefund("non-existent", true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // FISCALIZE
  // ==========================================================================

  describe("fiscalize", () => {
    it("should record fiscal data on a transaction", async () => {
      const txn = { ...mockTransaction, fiscalData: {}, metadata: {} } as any;
      queryService.findById.mockResolvedValueOnce(txn);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      const result = await service.fiscalize("txn-uuid-1", {
        receiptNumber: "FRC-001",
        fiscalSign: "ABC123DEF",
        qrCode: "https://ofd.uz/check/ABC123DEF",
        ofdName: "Soliq",
      });

      expect(result.isFiscalized).toBe(true);
      expect(result.fiscalReceiptNumber).toBe("FRC-001");
      expect(result.fiscalSign).toBe("ABC123DEF");
      expect(result.fiscalQrCode).toBe("https://ofd.uz/check/ABC123DEF");
      expect(result.fiscalData).toEqual(
        expect.objectContaining({ ofdName: "Soliq" }),
      );
      expect(result.fiscalizedAt).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // REMOVE
  // ==========================================================================

  describe("remove", () => {
    it("should soft delete a cancelled transaction", async () => {
      transactionRepo.findOne.mockResolvedValueOnce({
        ...mockTransaction,
        status: TransactionStatus.CANCELLED,
      } as any);
      transactionRepo.softDelete.mockResolvedValue(undefined as any);

      await service.remove("txn-uuid-1", "org-uuid-1");

      expect(transactionRepo.softDelete).toHaveBeenCalledWith("txn-uuid-1");
    });

    it("should soft delete a failed transaction", async () => {
      transactionRepo.findOne.mockResolvedValueOnce({
        ...mockTransaction,
        status: TransactionStatus.FAILED,
      } as any);
      transactionRepo.softDelete.mockResolvedValue(undefined as any);

      await service.remove("txn-uuid-1", "org-uuid-1");

      expect(transactionRepo.softDelete).toHaveBeenCalledWith("txn-uuid-1");
    });

    it("should throw BadRequestException when deleting completed transaction", async () => {
      transactionRepo.findOne.mockResolvedValueOnce({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      } as any);

      await expect(service.remove("txn-uuid-1", "org-uuid-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // RECORD DISPENSE
  // ==========================================================================

  describe("recordDispense", () => {
    it("should throw BadRequestException when transaction is not paid", async () => {
      queryService.findById.mockResolvedValueOnce({
        ...mockTransaction,
        status: TransactionStatus.PENDING,
      } as any);

      await expect(
        service.recordDispense({
          transactionId: "txn-uuid-1",
          itemId: "item-uuid-1",
          status: "dispensed",
          dispensedQuantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when item not found", async () => {
      queryService.findById.mockResolvedValueOnce({
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
      } as any);
      itemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recordDispense({
          transactionId: "txn-uuid-1",
          itemId: "non-existent",
          status: "dispensed",
          dispensedQuantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update item metadata with dispense result", async () => {
      const completedTxn = {
        ...mockTransaction,
        status: TransactionStatus.COMPLETED,
        metadata: {},
      } as any;
      queryService.findById.mockResolvedValue(completedTxn);

      const item = {
        ...mockItem,
        metadata: { dispenseStatus: "pending" },
      } as any;
      itemRepo.findOne.mockResolvedValue(item);
      itemRepo.find.mockResolvedValue([
        { ...item, metadata: { dispenseStatus: "dispensed" } },
      ]);
      itemRepo.save.mockImplementation((data) => Promise.resolve(data as any));
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );
      recipeRepo.findOne.mockResolvedValue(null);

      await service.recordDispense({
        transactionId: "txn-uuid-1",
        itemId: "item-uuid-1",
        status: "dispensed",
        dispensedQuantity: 1,
      });

      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            dispenseStatus: "dispensed",
            dispensedQuantity: 1,
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  describe("update", () => {
    it("should merge metadata into existing transaction", async () => {
      const txn = {
        ...mockTransaction,
        metadata: { existing: "value" },
        notes: null,
      } as any;
      queryService.findById.mockResolvedValue(txn);
      transactionRepo.save.mockImplementation((data) =>
        Promise.resolve(data as any),
      );

      await service.update("txn-uuid-1", {
        metadata: { newKey: "newValue" },
        notes: "Updated note",
        operatorId: "operator-uuid",
      });

      expect(transactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { existing: "value", newKey: "newValue" },
          notes: "Updated note",
          userId: "operator-uuid",
        }),
      );
    });
  });
});
