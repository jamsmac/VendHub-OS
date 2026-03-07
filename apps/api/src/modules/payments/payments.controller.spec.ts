/**
 * Payments Controller — Unit Tests
 *
 * Pattern: direct method invocation (no supertest / HTTP stack).
 * Guards, pipes, and throttling are tested at integration level.
 * Here we verify delegation to PaymentsService and correct propagation
 * of service results and NestJS exceptions.
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { PaymentsController } from "./payments.controller";
import {
  PaymentsService,
  PaymeWebhookData,
  ClickWebhookData,
  UzumWebhookData,
} from "./payments.service";
import { RefundReason } from "./entities/payment-refund.entity";
import {
  PaymentProvider,
  PaymentTransactionStatus,
} from "./entities/payment-transaction.entity";
import {
  CreatePaymentDto,
  UzumCreateDto,
  GenerateQRDto,
} from "./dto/create-payment.dto";
import { InitiateRefundDto, QueryTransactionsDto } from "./dto/refund.dto";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ORG_ID = "org-00000000-0000-0000-0000-000000000001";
const USER_ID = "usr-00000000-0000-0000-0000-000000000002";
const TX_ID = "11111111-1111-1111-1111-111111111111";
const MACHINE_ID = "22222222-2222-2222-2222-222222222222";
const ORDER_ID = "33333333-3333-3333-3333-333333333333";

const mockPaymentResult = {
  provider: "payme",
  status: "pending" as const,
  amount: 50000,
  orderId: ORDER_ID,
  transactionId: TX_ID,
  checkoutUrl: "https://checkout.paycom.uz/abc",
};

const mockTransaction = {
  id: TX_ID,
  organizationId: ORG_ID,
  provider: PaymentProvider.PAYME,
  amount: 50000,
  currency: "UZS",
  status: PaymentTransactionStatus.COMPLETED,
  orderId: ORDER_ID,
  machineId: MACHINE_ID,
  createdAt: new Date("2025-01-15T10:00:00Z"),
  updatedAt: new Date("2025-01-15T10:05:00Z"),
  refunds: [],
};

const mockRefund = {
  id: "44444444-4444-4444-4444-444444444444",
  organizationId: ORG_ID,
  paymentTransactionId: TX_ID,
  amount: 50000,
  reason: RefundReason.CUSTOMER_REQUEST,
  status: "pending",
  createdAt: new Date("2025-01-15T11:00:00Z"),
};

const mockQrResult = {
  qrCode: "base64encodedQRdata",
  paymentId: "pay-99999999",
  amount: 50000,
  machineId: MACHINE_ID,
  expiresAt: new Date("2025-01-15T10:10:00Z"),
  checkoutUrls: {
    payme: "https://checkout.paycom.uz/xyz",
    click: "https://my.click.uz/services/pay?service_id=123",
  },
};

const mockStats = {
  totalRevenue: 1500000,
  totalTransactions: 30,
  byProvider: {
    payme: { count: 15, amount: 750000 },
    click: { count: 10, amount: 500000 },
    uzum: { count: 5, amount: 250000 },
  },
  byStatus: {
    completed: 28,
    failed: 2,
  },
};

// ─── Mock Service ─────────────────────────────────────────────────────────────

const mockPaymentsService = {
  createPaymeTransaction: jest.fn(),
  createClickTransaction: jest.fn(),
  createUzumTransaction: jest.fn(),
  generateQRPayment: jest.fn(),
  handlePaymeWebhook: jest.fn(),
  verifyPaymeSignature: jest.fn(),
  handleClickWebhook: jest.fn(),
  verifyClickSignature: jest.fn(),
  handleUzumWebhook: jest.fn(),
  verifyUzumSignature: jest.fn(),
  initiateRefund: jest.fn(),
  getTransactions: jest.fn(),
  getTransaction: jest.fn(),
  getTransactionStats: jest.fn(),
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("PaymentsController (unit)", () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  // ─── createPayme ────────────────────────────────────────────────────────────

  describe("createPayme", () => {
    const dto = { amount: 50000, orderId: ORDER_ID };

    it("delegates to service and returns payment result", async () => {
      mockPaymentsService.createPaymeTransaction.mockResolvedValue(
        mockPaymentResult,
      );

      const result = await controller.createPayme(
        dto as CreatePaymentDto,
        ORG_ID,
      );

      expect(mockPaymentsService.createPaymeTransaction).toHaveBeenCalledWith(
        dto.amount,
        dto.orderId,
        ORG_ID,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockPaymentResult);
    });

    it("passes optional machineId and clientUserId to service", async () => {
      const fullDto = { ...dto, machineId: MACHINE_ID, clientUserId: USER_ID };
      mockPaymentsService.createPaymeTransaction.mockResolvedValue(
        mockPaymentResult,
      );

      await controller.createPayme(fullDto as CreatePaymentDto, ORG_ID);

      expect(mockPaymentsService.createPaymeTransaction).toHaveBeenCalledWith(
        fullDto.amount,
        fullDto.orderId,
        ORG_ID,
        MACHINE_ID,
        USER_ID,
      );
    });

    it("propagates service exceptions", async () => {
      mockPaymentsService.createPaymeTransaction.mockRejectedValue(
        new BadRequestException("Invalid order"),
      );

      await expect(
        controller.createPayme(dto as CreatePaymentDto, ORG_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── createClick ────────────────────────────────────────────────────────────

  describe("createClick", () => {
    const dto = { amount: 30000, orderId: ORDER_ID };

    it("delegates to service and returns payment result", async () => {
      const clickResult = { ...mockPaymentResult, provider: "click" };
      mockPaymentsService.createClickTransaction.mockResolvedValue(clickResult);

      const result = await controller.createClick(
        dto as CreatePaymentDto,
        ORG_ID,
      );

      expect(mockPaymentsService.createClickTransaction).toHaveBeenCalledWith(
        dto.amount,
        dto.orderId,
        ORG_ID,
        undefined,
        undefined,
      );
      expect(result).toEqual(clickResult);
    });

    it("propagates BadRequestException from service", async () => {
      mockPaymentsService.createClickTransaction.mockRejectedValue(
        new BadRequestException("Click service unavailable"),
      );

      await expect(
        controller.createClick(dto as CreatePaymentDto, ORG_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── createUzum ─────────────────────────────────────────────────────────────

  describe("createUzum", () => {
    const dto = {
      amount: 100000,
      orderId: ORDER_ID,
      returnUrl: "https://app.example.com/return",
    };

    it("delegates to service and returns payment result", async () => {
      const uzumResult = { ...mockPaymentResult, provider: "uzum" };
      mockPaymentsService.createUzumTransaction.mockResolvedValue(uzumResult);

      const result = await controller.createUzum(dto as UzumCreateDto, ORG_ID);

      expect(mockPaymentsService.createUzumTransaction).toHaveBeenCalledWith(
        dto,
        ORG_ID,
      );
      expect(result).toEqual(uzumResult);
    });

    it("propagates service error", async () => {
      mockPaymentsService.createUzumTransaction.mockRejectedValue(
        new BadRequestException("Uzum API error"),
      );

      await expect(
        controller.createUzum(dto as UzumCreateDto, ORG_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── generateQR ─────────────────────────────────────────────────────────────

  describe("generateQR", () => {
    const dto = { amount: 50000, machineId: MACHINE_ID };

    it("returns QR payment data", async () => {
      mockPaymentsService.generateQRPayment.mockResolvedValue(mockQrResult);

      const result = await controller.generateQR(dto as GenerateQRDto, ORG_ID);

      expect(mockPaymentsService.generateQRPayment).toHaveBeenCalledWith(
        dto.amount,
        dto.machineId,
        ORG_ID,
      );
      expect(result).toEqual(mockQrResult);
      expect(result.qrCode).toBe("base64encodedQRdata");
      expect(result.checkoutUrls).toHaveProperty("payme");
    });

    it("propagates service error", async () => {
      mockPaymentsService.generateQRPayment.mockRejectedValue(
        new BadRequestException("Machine not found"),
      );

      await expect(
        controller.generateQR(dto as GenerateQRDto, ORG_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── paymeWebhook ────────────────────────────────────────────────────────────

  describe("paymeWebhook", () => {
    const webhookData = {
      method: "CheckPerformTransaction",
      params: { amount: 5000000, account: { order_id: ORDER_ID } },
      id: 1,
    };

    it("returns webhook handler result on valid signature", async () => {
      const handlerResult = { result: { allow: true } };
      mockPaymentsService.handlePaymeWebhook.mockResolvedValue(handlerResult);

      const authHeader = "Basic dGVzdDpwYXNz";
      const result = await controller.paymeWebhook(
        webhookData as PaymeWebhookData,
        authHeader,
      );

      expect(mockPaymentsService.handlePaymeWebhook).toHaveBeenCalledWith(
        webhookData,
        authHeader,
      );
      expect(result).toEqual(handlerResult);
    });

    it("propagates UnauthorizedException for invalid signature", async () => {
      mockPaymentsService.handlePaymeWebhook.mockRejectedValue(
        new UnauthorizedException("Invalid Payme signature"),
      );

      await expect(
        controller.paymeWebhook(
          webhookData as PaymeWebhookData,
          "Basic invalid",
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("works without auth header (public endpoint)", async () => {
      const handlerResult = { result: { allow: true } };
      mockPaymentsService.handlePaymeWebhook.mockResolvedValue(handlerResult);

      const result = await controller.paymeWebhook(
        webhookData as PaymeWebhookData,
        undefined as unknown as string,
      );

      expect(mockPaymentsService.handlePaymeWebhook).toHaveBeenCalledWith(
        webhookData,
        undefined,
      );
      expect(result).toEqual(handlerResult);
    });
  });

  // ─── clickWebhook ────────────────────────────────────────────────────────────

  describe("clickWebhook", () => {
    const clickData = {
      click_trans_id: "click-111",
      service_id: "12345",
      click_paydoc_id: "paydoc-222",
      merchant_trans_id: ORDER_ID,
      amount: 50000,
      action: 0,
      error: 0,
      error_note: "Success",
      sign_time: "2025-01-15 10:00:00",
      sign_string: "abc123def456",
    };

    it("returns webhook handler result", async () => {
      const handlerResult = { error: 0, error_note: "Success" };
      mockPaymentsService.handleClickWebhook.mockResolvedValue(handlerResult);

      const result = await controller.clickWebhook(
        clickData as ClickWebhookData,
      );

      expect(mockPaymentsService.handleClickWebhook).toHaveBeenCalledWith(
        clickData,
      );
      expect(result).toEqual(handlerResult);
    });

    it("propagates UnauthorizedException for invalid sign", async () => {
      mockPaymentsService.handleClickWebhook.mockRejectedValue(
        new UnauthorizedException("Invalid Click signature"),
      );

      await expect(
        controller.clickWebhook(clickData as ClickWebhookData),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── uzumWebhook ─────────────────────────────────────────────────────────────

  describe("uzumWebhook", () => {
    const uzumData = {
      transactionId: "uzum-tx-999",
      orderId: ORDER_ID,
      amount: 100000,
      status: "PAID",
      signature: "hmac_sha256_signature",
    };

    it("returns webhook handler result", async () => {
      const handlerResult = { success: true };
      mockPaymentsService.handleUzumWebhook.mockResolvedValue(handlerResult);

      const result = await controller.uzumWebhook(uzumData as UzumWebhookData);

      expect(mockPaymentsService.handleUzumWebhook).toHaveBeenCalledWith(
        uzumData,
      );
      expect(result).toEqual(handlerResult);
    });

    it("propagates UnauthorizedException for invalid signature", async () => {
      mockPaymentsService.handleUzumWebhook.mockRejectedValue(
        new UnauthorizedException("Invalid Uzum signature"),
      );

      await expect(
        controller.uzumWebhook(uzumData as UzumWebhookData),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ─── initiateRefund ──────────────────────────────────────────────────────────

  describe("initiateRefund", () => {
    const dto = {
      paymentTransactionId: TX_ID,
      amount: 50000,
      reason: RefundReason.CUSTOMER_REQUEST,
      reasonNote: "Customer changed their mind",
    };

    it("creates refund and returns refund record", async () => {
      mockPaymentsService.initiateRefund.mockResolvedValue(mockRefund);

      const result = await controller.initiateRefund(
        dto as InitiateRefundDto,
        ORG_ID,
        USER_ID,
      );

      expect(mockPaymentsService.initiateRefund).toHaveBeenCalledWith(
        dto,
        ORG_ID,
        USER_ID,
      );
      expect(result).toEqual(mockRefund);
      expect(result.reason).toBe(RefundReason.CUSTOMER_REQUEST);
    });

    it("propagates NotFoundException when transaction not found", async () => {
      mockPaymentsService.initiateRefund.mockRejectedValue(
        new NotFoundException("Payment transaction not found"),
      );

      await expect(
        controller.initiateRefund(dto as InitiateRefundDto, ORG_ID, USER_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("propagates BadRequestException for non-completed transaction", async () => {
      mockPaymentsService.initiateRefund.mockRejectedValue(
        new BadRequestException("Only completed transactions can be refunded"),
      );

      await expect(
        controller.initiateRefund(dto as InitiateRefundDto, ORG_ID, USER_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("propagates BadRequestException when refund exceeds original amount", async () => {
      mockPaymentsService.initiateRefund.mockRejectedValue(
        new BadRequestException(
          "Refund amount (60000) exceeds remaining refundable amount (50000)",
        ),
      );

      await expect(
        controller.initiateRefund(
          { ...dto, amount: 60000 } as InitiateRefundDto,
          ORG_ID,
          USER_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("works without optional amount (full refund)", async () => {
      const partialDto = {
        paymentTransactionId: TX_ID,
        reason: RefundReason.MACHINE_ERROR,
      };
      mockPaymentsService.initiateRefund.mockResolvedValue(mockRefund);

      const result = await controller.initiateRefund(
        partialDto as InitiateRefundDto,
        ORG_ID,
        USER_ID,
      );

      expect(mockPaymentsService.initiateRefund).toHaveBeenCalledWith(
        partialDto,
        ORG_ID,
        USER_ID,
      );
      expect(result).toBeDefined();
    });
  });

  // ─── getTransactions ─────────────────────────────────────────────────────────

  describe("getTransactions", () => {
    const paginatedResult = {
      data: [mockTransaction],
      total: 1,
      page: 1,
      limit: 20,
    };

    it("returns paginated transaction list", async () => {
      mockPaymentsService.getTransactions.mockResolvedValue(paginatedResult);

      const query = { page: 1, limit: 20 };
      const result = await controller.getTransactions(
        query as QueryTransactionsDto,
        ORG_ID,
      );

      expect(mockPaymentsService.getTransactions).toHaveBeenCalledWith(
        query,
        ORG_ID,
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("passes provider filter to service", async () => {
      mockPaymentsService.getTransactions.mockResolvedValue(paginatedResult);

      const query = { provider: PaymentProvider.PAYME, page: 1, limit: 10 };
      await controller.getTransactions(query as QueryTransactionsDto, ORG_ID);

      expect(mockPaymentsService.getTransactions).toHaveBeenCalledWith(
        query,
        ORG_ID,
      );
    });

    it("passes date range filter to service", async () => {
      mockPaymentsService.getTransactions.mockResolvedValue(paginatedResult);

      const query = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        page: 1,
        limit: 20,
      };
      await controller.getTransactions(query as QueryTransactionsDto, ORG_ID);

      expect(mockPaymentsService.getTransactions).toHaveBeenCalledWith(
        query,
        ORG_ID,
      );
    });

    it("returns empty list when no transactions", async () => {
      mockPaymentsService.getTransactions.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const result = await controller.getTransactions(
        {} as QueryTransactionsDto,
        ORG_ID,
      );

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ─── getTransactionStats ──────────────────────────────────────────────────────

  describe("getTransactionStats", () => {
    it("returns aggregated payment statistics", async () => {
      mockPaymentsService.getTransactionStats.mockResolvedValue(mockStats);

      const result = await controller.getTransactionStats(ORG_ID);

      expect(mockPaymentsService.getTransactionStats).toHaveBeenCalledWith(
        ORG_ID,
      );
      expect(result.totalRevenue).toBe(1500000);
      expect(result.totalTransactions).toBe(30);
      expect(result.byProvider).toHaveProperty("payme");
      expect(result.byStatus).toHaveProperty("completed");
    });

    it("propagates service exception", async () => {
      mockPaymentsService.getTransactionStats.mockRejectedValue(
        new BadRequestException("Stats unavailable"),
      );

      await expect(
        controller.getTransactionStats(ORG_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── getTransaction ───────────────────────────────────────────────────────────

  describe("getTransaction", () => {
    it("returns a single transaction by ID", async () => {
      mockPaymentsService.getTransaction.mockResolvedValue(mockTransaction);

      const result = await controller.getTransaction(TX_ID, ORG_ID);

      expect(mockPaymentsService.getTransaction).toHaveBeenCalledWith(
        TX_ID,
        ORG_ID,
      );
      expect(result).toEqual(mockTransaction);
      expect(result.id).toBe(TX_ID);
    });

    it("propagates NotFoundException when transaction not found", async () => {
      mockPaymentsService.getTransaction.mockRejectedValue(
        new NotFoundException("Payment transaction not found"),
      );

      await expect(
        controller.getTransaction("nonexistent-id", ORG_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("enforces organization isolation via organizationId", async () => {
      const otherOrgId = "other-org-00000000-0000-0000-0000-000000000099";
      mockPaymentsService.getTransaction.mockRejectedValue(
        new NotFoundException("Payment transaction not found"),
      );

      await expect(
        controller.getTransaction(TX_ID, otherOrgId),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(mockPaymentsService.getTransaction).toHaveBeenCalledWith(
        TX_ID,
        otherOrgId,
      );
    });
  });
});
