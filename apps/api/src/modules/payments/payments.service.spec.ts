import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository, DataSource } from "typeorm";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { PaymentsService, PaymeWebhookData } from "./payments.service";
import { PaymeHandler } from "./payme.handler";
import { ClickHandler } from "./click.handler";
import { UzumHandler } from "./uzum.handler";
import {
  PaymentTransaction,
  PaymentProvider,
  PaymentTransactionStatus,
} from "./entities/payment-transaction.entity";
import {
  PaymentRefund,
  PaymentRefundStatus,
} from "./entities/payment-refund.entity";
import { InitiateRefundDto } from "./dto/refund.dto";
import { QueryTransactionsDto } from "./dto/refund.dto";
import { Machine } from "../machines/entities/machine.entity";

const ORG_ID = "org-uuid-00000000-0000-0000-0000-000000000001";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let transactionRepo: jest.Mocked<Repository<PaymentTransaction>>;
  let refundRepo: jest.Mocked<Repository<PaymentRefund>>;
  let machineRepo: jest.Mocked<Repository<Machine>>;
  let configService: jest.Mocked<ConfigService>;

  const mockTransaction = {
    id: "tx-uuid-1",
    organizationId: ORG_ID,
    provider: PaymentProvider.PAYME,
    providerTxId: "payme-tx-123",
    amount: 50000,
    currency: "UZS",
    status: PaymentTransactionStatus.COMPLETED,
    orderId: "order-001",
    machineId: null,
    clientUserId: null,
    processedAt: new Date(),
    rawRequest: {},
    rawResponse: {},
    errorMessage: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as PaymentTransaction;

  const mockPendingTransaction = {
    ...mockTransaction,
    id: "tx-uuid-2",
    status: PaymentTransactionStatus.PENDING,
    providerTxId: null,
  } as unknown as PaymentTransaction;

  const mockRefund = {
    id: "refund-uuid-1",
    organizationId: ORG_ID,
    paymentTransactionId: "tx-uuid-1",
    amount: 50000,
    reason: "customer_request",
    status: PaymentRefundStatus.PENDING,
    processedByUserId: "user-uuid-1",
    createdAt: new Date(),
    updatedAt: new Date(),
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
    getRawOne: jest
      .fn()
      .mockResolvedValue({ total_revenue: "50000", total_count: "1" }),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymeHandler,
        ClickHandler,
        UzumHandler,
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
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation((cb: any) =>
              cb({
                getRepository: jest.fn().mockReturnValue({
                  findOne: jest.fn(),
                  find: jest.fn(),
                  create: jest.fn(),
                  save: jest.fn(),
                  update: jest.fn(),
                }),
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    transactionRepo = module.get(getRepositoryToken(PaymentTransaction));
    refundRepo = module.get(getRepositoryToken(PaymentRefund));
    machineRepo = module.get(getRepositoryToken(Machine));
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE PAYME TRANSACTION
  // ============================================================================

  describe("createPaymeTransaction", () => {
    it("should create a Payme transaction with checkout URL", async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === "PAYME_MERCHANT_ID") return "merchant-123";
        if (key === "PAYME_CHECKOUT_URL") return "https://checkout.paycom.uz";
        return undefined;
      });
      transactionRepo.create.mockReturnValue({
        ...mockPendingTransaction,
      } as PaymentTransaction);
      transactionRepo.save.mockResolvedValue({
        ...mockPendingTransaction,
      } as PaymentTransaction);

      const result = await service.createPaymeTransaction(
        50000,
        "order-001",
        ORG_ID,
      );

      expect(result.provider).toBe("payme");
      expect(result.status).toBe("pending");
      expect(result.amount).toBe(50000);
      expect(result.checkoutUrl).toBeDefined();
    });

    it("should throw BadRequestException when PAYME_MERCHANT_ID is not configured", async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        service.createPaymeTransaction(50000, "order-001", ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it("should save transaction record when organizationId is provided", async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === "PAYME_MERCHANT_ID") return "merchant-123";
        return "https://checkout.paycom.uz";
      });
      transactionRepo.create.mockReturnValue(mockPendingTransaction);
      transactionRepo.save.mockResolvedValue(mockPendingTransaction);

      await service.createPaymeTransaction(50000, "order-001", ORG_ID);

      expect(transactionRepo.create).toHaveBeenCalled();
      expect(transactionRepo.save).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // HANDLE PAYME WEBHOOK
  // ============================================================================

  describe("handlePaymeWebhook", () => {
    it("should throw UnauthorizedException for invalid signature", async () => {
      configService.get.mockReturnValue(undefined);

      const data: PaymeWebhookData = {
        method: "CheckPerformTransaction",
        params: { account: { order_id: "order-001" }, amount: 5000000 },
        id: 1,
      };

      await expect(service.handlePaymeWebhook(data, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should return error for unknown method", async () => {
      // Mock valid auth
      configService.get.mockImplementation((key: string) => {
        if (key === "PAYME_SECRET_KEY") return "test-key";
        if (key === "PAYME_MERCHANT_ID") return "test-merchant";
        return undefined;
      });

      const validAuth =
        "Basic " + Buffer.from("test-merchant:test-key").toString("base64");
      const data: PaymeWebhookData = {
        method: "UnknownMethod",
        params: {},
        id: 1,
      };

      const result = await service.handlePaymeWebhook(data, validAuth);

      expect(result).toHaveProperty("error");
      expect((result.error as Record<string, unknown>).code).toBe(-32601);
    });
  });

  // ============================================================================
  // CREATE CLICK TRANSACTION
  // ============================================================================

  describe("createClickTransaction", () => {
    it("should create a Click transaction with checkout URL", async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === "CLICK_MERCHANT_ID") return "click-merchant-123";
        if (key === "CLICK_SERVICE_ID") return "service-456";
        if (key === "CLICK_CHECKOUT_URL")
          return "https://my.click.uz/services/pay";
        if (key === "CLICK_RETURN_URL") return "";
        return undefined;
      });
      transactionRepo.create.mockReturnValue(mockPendingTransaction);
      transactionRepo.save.mockResolvedValue(mockPendingTransaction);

      const result = await service.createClickTransaction(
        30000,
        "order-002",
        ORG_ID,
      );

      expect(result.provider).toBe("click");
      expect(result.status).toBe("pending");
      expect(result.checkoutUrl).toContain("click.uz");
    });

    it("should throw BadRequestException when Click is not configured", async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        service.createClickTransaction(30000, "order-002", ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // GENERATE QR PAYMENT
  // ============================================================================

  describe("generateQRPayment", () => {
    it("should throw NotFoundException when machine does not belong to organization", async () => {
      machineRepo.findOne.mockResolvedValue(null);

      await expect(
        service.generateQRPayment(5000, "machine-001", ORG_ID),
      ).rejects.toThrow(NotFoundException);

      expect(machineRepo.findOne).toHaveBeenCalledWith({
        where: { id: "machine-001", organizationId: ORG_ID },
      });
      expect(transactionRepo.create).not.toHaveBeenCalled();
    });

    it("should save a QR transaction when machine belongs to organization", async () => {
      machineRepo.findOne.mockResolvedValue({
        id: "machine-001",
        organizationId: ORG_ID,
      } as Machine);
      transactionRepo.create.mockReturnValue(mockPendingTransaction);
      transactionRepo.save.mockResolvedValue(mockPendingTransaction);
      configService.get.mockReturnValue(undefined);

      const result = await service.generateQRPayment(
        5000,
        "machine-001",
        ORG_ID,
      );

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ORG_ID,
          provider: PaymentProvider.CASH,
          amount: 5000,
          status: PaymentTransactionStatus.PENDING,
          machineId: "machine-001",
          metadata: expect.objectContaining({ type: "qr_payment" }),
        }),
      );
      expect(transactionRepo.save).toHaveBeenCalledWith(mockPendingTransaction);
      expect(result).toEqual(
        expect.objectContaining({
          amount: 5000,
          machineId: "machine-001",
          paymentId: expect.any(String),
          qrCode: expect.any(String),
        }),
      );
    });
  });

  // ============================================================================
  // INITIATE REFUND
  // ============================================================================

  describe("initiateRefund", () => {
    it("should create a refund for a completed transaction", async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);
      refundRepo.find.mockResolvedValue([]);
      refundRepo.create.mockReturnValue(mockRefund);
      refundRepo.save.mockResolvedValue(mockRefund);

      const dto = {
        paymentTransactionId: "tx-uuid-1",
        amount: 50000,
        reason: "customer_request",
      };

      const result = await service.initiateRefund(
        dto as InitiateRefundDto,
        ORG_ID,
        "user-uuid-1",
      );

      expect(result).toEqual(mockRefund);
      expect(refundRepo.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException when transaction not found", async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.initiateRefund(
          { paymentTransactionId: "non-existent" } as InitiateRefundDto,
          ORG_ID,
          "user-uuid-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when transaction is not completed", async () => {
      transactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: PaymentTransactionStatus.PENDING,
      } as unknown as PaymentTransaction);

      await expect(
        service.initiateRefund(
          { paymentTransactionId: "tx-uuid-1" } as InitiateRefundDto,
          ORG_ID,
          "user-uuid-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when refund exceeds remaining amount", async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);
      refundRepo.find.mockResolvedValue([
        {
          ...mockRefund,
          amount: 50000,
          status: PaymentRefundStatus.COMPLETED,
        } as unknown as PaymentRefund,
      ]);

      await expect(
        service.initiateRefund(
          {
            paymentTransactionId: "tx-uuid-1",
            amount: 10000,
          } as InitiateRefundDto,
          ORG_ID,
          "user-uuid-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // GET TRANSACTIONS
  // ============================================================================

  describe("getTransactions", () => {
    it("should return paginated transactions for organization", async () => {
      const result = await service.getTransactions(
        { page: 1, limit: 20 } as QueryTransactionsDto,
        ORG_ID,
      );

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total", 1);
      expect(result).toHaveProperty("page", 1);
    });
  });

  // ============================================================================
  // GET TRANSACTION
  // ============================================================================

  describe("getTransaction", () => {
    it("should return single transaction with refunds", async () => {
      transactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getTransaction("tx-uuid-1", ORG_ID);

      expect(result).toEqual(mockTransaction);
      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        where: { id: "tx-uuid-1", organizationId: ORG_ID },
        relations: ["refunds"],
      });
    });

    it("should throw NotFoundException when transaction not found", async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getTransaction("non-existent", ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // VERIFY PAYME SIGNATURE
  // ============================================================================

  describe("verifyPaymeSignature", () => {
    it("should return false when auth header is missing", () => {
      const result = service.verifyPaymeSignature(undefined);

      expect(result).toBe(false);
    });

    it("should return false when PAYME_SECRET_KEY is not configured", () => {
      configService.get.mockReturnValue(undefined);

      const result = service.verifyPaymeSignature("Basic dGVzdA==");

      expect(result).toBe(false);
    });

    it("should return false when auth header does not start with Basic", () => {
      configService.get.mockImplementation((key: string) => {
        if (key === "PAYME_SECRET_KEY") return "key";
        if (key === "PAYME_MERCHANT_ID") return "id";
        return undefined;
      });

      const result = service.verifyPaymeSignature("Bearer token");

      expect(result).toBe(false);
    });
  });
});
