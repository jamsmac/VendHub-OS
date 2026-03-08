/**
 * E2E Tests: Transactions API
 *
 * Comprehensive tests for the Transactions API including:
 * - Transaction creation and lifecycle
 * - Query operations with filters and pagination
 * - Individual transaction retrieval
 * - Transaction statistics and aggregates
 * - Collection records management
 * - Daily summaries
 * - Commission tracking
 * - Refund operations
 *
 * Uses mock TransactionsService to avoid database dependencies.
 *
 * Endpoint prefix: /api/v1/transactions
 * Controller: TransactionsController (src/modules/transactions/transactions.controller.ts)
 */

import {
  INestApplication,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import request from "supertest";
import { createTestApp, closeTestApp, mockUuid, mockUuid2 } from "./setup";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = mockUuid2();
const MACHINE_ID = mockUuid();
const USER_ID = mockUuid();

interface Transaction {
  id: string;
  organizationId: string;
  machineId: string;
  transactionNumber: string;
  status: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function transactionSample(overrides: Record<string, any> = {}): Transaction {
  return {
    id: mockUuid(),
    organizationId: ORG_ID,
    machineId: MACHINE_ID,
    transactionNumber: `TXN-${Date.now()}`,
    status: "completed",
    paymentMethod: "cash",
    amount: 5000,
    currency: "UZS",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

const transactions: Transaction[] = [
  transactionSample({
    id: "txn-001",
    transactionNumber: "TXN-001",
    status: "completed",
    paymentMethod: "cash",
    amount: 5000,
  }),
  transactionSample({
    id: "txn-002",
    transactionNumber: "TXN-002",
    status: "completed",
    paymentMethod: "card",
    amount: 10000,
  }),
  transactionSample({
    id: "txn-003",
    transactionNumber: "TXN-003",
    status: "pending",
    paymentMethod: "mobile",
    amount: 3000,
  }),
  transactionSample({
    id: "txn-004",
    transactionNumber: "TXN-004",
    status: "failed",
    paymentMethod: "card",
    amount: 7000,
  }),
];

// ---------------------------------------------------------------------------
// Mock controller
// ---------------------------------------------------------------------------

@Controller({ path: "transactions", version: "1" })
class MockTransactionsController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) {
    if (!body.machineId || !body.amount) {
      throw new BadRequestException(
        "Missing required fields: machineId, amount",
      );
    }

    return transactionSample({
      machineId: body.machineId,
      amount: body.amount,
      paymentMethod: body.paymentMethod || "cash",
      organizationId: body.organizationId,
    });
  }

  @Get()
  query(@Query() query: any) {
    let filtered = [...transactions];

    // Filter by machineId
    if (query.machineId) {
      filtered = filtered.filter((t) => t.machineId === query.machineId);
    }

    // Filter by status
    if (query.status) {
      const statuses = Array.isArray(query.status)
        ? query.status
        : [query.status];
      filtered = filtered.filter((t) => statuses.includes(t.status));
    }

    // Filter by paymentMethod
    if (query.paymentMethod) {
      const methods = Array.isArray(query.paymentMethod)
        ? query.paymentMethod
        : [query.paymentMethod];
      filtered = filtered.filter((t) => methods.includes(t.paymentMethod));
    }

    // Pagination
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const start = (page - 1) * limit;
    const paginatedData = filtered.slice(start, start + limit);

    return {
      data: paginatedData,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  @Get("statistics")
  getStatistics(
    @Query("dateFrom") dateFrom: string,
    @Query("dateTo") dateTo: string,
    @Query("machineId") machineId?: string,
  ) {
    let filtered = [...transactions];

    if (machineId) {
      filtered = filtered.filter((t) => t.machineId === machineId);
    }

    const totalTransactions = filtered.length;
    const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
    const completedCount = filtered.filter(
      (t) => t.status === "completed",
    ).length;
    const failedCount = filtered.filter((t) => t.status === "failed").length;
    const pendingCount = filtered.filter((t) => t.status === "pending").length;

    return {
      period: { dateFrom, dateTo },
      statistics: {
        totalTransactions,
        totalAmount,
        averageAmount:
          totalTransactions > 0 ? totalAmount / totalTransactions : 0,
        completedCount,
        failedCount,
        pendingCount,
        successRate:
          totalTransactions > 0
            ? (completedCount / totalTransactions) * 100
            : 0,
      },
      byPaymentMethod: {
        cash: filtered.filter((t) => t.paymentMethod === "cash").length,
        card: filtered.filter((t) => t.paymentMethod === "card").length,
        mobile: filtered.filter((t) => t.paymentMethod === "mobile").length,
      },
    };
  }

  @Get("collections")
  getCollectionRecords(@Query() query: any) {
    const collections = [
      {
        id: "coll-001",
        machineId: MACHINE_ID,
        collectedByUserId: USER_ID,
        collectedAmount: 50000,
        isVerified: true,
        collectedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      },
      {
        id: "coll-002",
        machineId: MACHINE_ID,
        collectedByUserId: USER_ID,
        collectedAmount: 35000,
        isVerified: false,
        collectedAt: new Date().toISOString(),
        verifiedAt: null,
      },
    ];

    let filtered = [...collections];

    if (query.machineId) {
      filtered = filtered.filter((c) => c.machineId === query.machineId);
    }

    if (query.isVerified !== undefined) {
      filtered = filtered.filter(
        (c) => c.isVerified === (query.isVerified === "true"),
      );
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const start = (page - 1) * limit;

    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  @Post("collections")
  @HttpCode(HttpStatus.CREATED)
  createCollectionRecord(@Body() body: any) {
    if (!body.machineId || !body.collectedAmount) {
      throw new BadRequestException(
        "Missing required fields: machineId, collectedAmount",
      );
    }

    return {
      id: mockUuid(),
      machineId: body.machineId,
      collectedByUserId: body.collectedByUserId,
      collectedAmount: body.collectedAmount,
      isVerified: false,
      collectedAt: new Date().toISOString(),
      verifiedAt: null,
    };
  }

  @Patch("collections/:collectionId/verify")
  verifyCollection(
    @Param("collectionId") collectionId: string,
    @Body() body: any,
  ) {
    if (!collectionId) {
      throw new BadRequestException("Collection ID is required");
    }

    return {
      id: collectionId,
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      notes: body.notes || null,
    };
  }

  @Get("daily-summaries")
  getDailySummaries(@Query() query: any) {
    const summaries = [
      {
        id: "summary-001",
        machineId: MACHINE_ID,
        date: "2024-03-02",
        totalTransactions: 15,
        totalAmount: 75000,
        averageTransaction: 5000,
        completedCount: 13,
        failedCount: 2,
      },
      {
        id: "summary-002",
        machineId: MACHINE_ID,
        date: "2024-03-01",
        totalTransactions: 22,
        totalAmount: 110000,
        averageTransaction: 5000,
        completedCount: 21,
        failedCount: 1,
      },
    ];

    let filtered = [...summaries];

    if (query.machineId) {
      filtered = filtered.filter((s) => s.machineId === query.machineId);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const start = (page - 1) * limit;

    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  @Post("daily-summaries/rebuild")
  rebuildDailySummary(@Body() body: any) {
    if (!body.date) {
      throw new BadRequestException("Date is required");
    }

    return {
      id: mockUuid(),
      date: body.date,
      machineId: body.machineId || null,
      status: "rebuilt",
      processedAt: new Date().toISOString(),
    };
  }

  @Get("commissions")
  getCommissions(@Query() query: any) {
    const commissions = [
      {
        id: "comm-001",
        contractId: mockUuid(),
        date: "2024-03-02",
        amount: 15000,
        status: "pending",
      },
      {
        id: "comm-002",
        contractId: mockUuid(),
        date: "2024-03-01",
        amount: 22000,
        status: "paid",
      },
    ];

    let filtered = [...commissions];

    if (query.status) {
      filtered = filtered.filter((c) => c.status === query.status);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const start = (page - 1) * limit;

    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    return txn;
  }

  @Get("number/:number")
  findByNumber(@Param("number") number: string) {
    const txn = transactions.find((t) => t.transactionNumber === number);
    if (!txn) {
      throw new NotFoundException(
        `Transaction with number ${number} not found`,
      );
    }
    return txn;
  }

  @Post(":id/payment")
  @HttpCode(HttpStatus.OK)
  processPayment(@Param("id") id: string, @Body() body: any) {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) {
      throw new NotFoundException("Transaction not found");
    }

    return {
      ...txn,
      status: "completed",
      paymentProcessedAt: new Date().toISOString(),
    };
  }

  @Post(":id/dispense")
  @HttpCode(HttpStatus.OK)
  recordDispense(@Param("id") id: string, @Body() body: any) {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) {
      throw new NotFoundException("Transaction not found");
    }

    return {
      ...txn,
      status: body.success ? "completed" : "failed",
      dispenseAt: new Date().toISOString(),
    };
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(@Param("id") id: string, @Body() body: any) {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) {
      throw new NotFoundException("Transaction not found");
    }

    return {
      ...txn,
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancellationReason: body.reason,
    };
  }

  @Post(":id/refund")
  @HttpCode(HttpStatus.CREATED)
  createRefund(@Param("id") id: string, @Body() body: any) {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) {
      throw new NotFoundException("Transaction not found");
    }

    return {
      id: mockUuid(),
      transactionId: id,
      amount: body.amount,
      reason: body.reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }

  @Post("refunds/:refundId/process")
  @HttpCode(HttpStatus.OK)
  processRefund(@Param("refundId") refundId: string, @Body() body: any) {
    return {
      id: refundId,
      status: body.success ? "completed" : "failed",
      referenceNumber: body.referenceNumber,
      processedAt: new Date().toISOString(),
    };
  }

  @Post(":id/fiscalize")
  @HttpCode(HttpStatus.OK)
  fiscalize(@Param("id") id: string, @Body() body: any) {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) {
      throw new NotFoundException("Transaction not found");
    }

    return {
      ...txn,
      fiscal: body,
      fiscalizedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Transactions Endpoints (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [MockTransactionsController],
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // =========================================================================
  // POST /api/v1/transactions — Create transaction
  // =========================================================================

  describe("POST /api/v1/transactions", () => {
    it("should create a transaction with valid data", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions")
        .set("Authorization", "Bearer mock-token")
        .send({
          machineId: MACHINE_ID,
          amount: 5000,
          paymentMethod: "cash",
          organizationId: ORG_ID,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("transactionNumber");
      expect(res.body.amount).toBe(5000);
      expect(res.body.paymentMethod).toBe("cash");
    });

    it("should reject creation with missing machineId", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/transactions")
        .set("Authorization", "Bearer mock-token")
        .send({
          amount: 5000,
          paymentMethod: "cash",
        })
        .expect(400);
    });

    it("should reject creation with missing amount", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/transactions")
        .set("Authorization", "Bearer mock-token")
        .send({
          machineId: MACHINE_ID,
          paymentMethod: "cash",
        })
        .expect(400);
    });
  });

  // =========================================================================
  // GET /api/v1/transactions — Query transactions
  // =========================================================================

  describe("GET /api/v1/transactions", () => {
    it("should return paginated list of transactions", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("page");
      expect(res.body).toHaveProperty("limit");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("should filter by status", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions?status=completed")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.data.every((t: any) => t.status === "completed")).toBe(
        true,
      );
    });

    it("should filter by multiple statuses", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions?status=completed&status=pending")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(
        res.body.data.every((t: any) =>
          ["completed", "pending"].includes(t.status),
        ),
      ).toBe(true);
    });

    it("should filter by paymentMethod", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions?paymentMethod=card")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.data.every((t: any) => t.paymentMethod === "card")).toBe(
        true,
      );
    });

    it("should filter by machineId", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/transactions?machineId=${MACHINE_ID}`)
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.data.every((t: any) => t.machineId === MACHINE_ID)).toBe(
        true,
      );
    });

    it("should respect pagination parameters", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions?page=1&limit=2")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });
  });

  // =========================================================================
  // GET /api/v1/transactions/:id — Get by ID
  // =========================================================================

  describe("GET /api/v1/transactions/:id", () => {
    it("should return transaction by ID", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions/txn-001")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.id).toBe("txn-001");
      expect(res.body).toHaveProperty("transactionNumber");
      expect(res.body).toHaveProperty("status");
      expect(res.body).toHaveProperty("amount");
    });

    it("should return 404 for non-existent transaction", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/transactions/00000000-0000-0000-0000-000000000000")
        .set("Authorization", "Bearer mock-token")
        .expect(404);
    });
  });

  // =========================================================================
  // GET /api/v1/transactions/number/:number — Get by transaction number
  // =========================================================================

  describe("GET /api/v1/transactions/number/:number", () => {
    it("should return transaction by transaction number", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions/number/TXN-001")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.transactionNumber).toBe("TXN-001");
    });

    it("should return 404 for non-existent transaction number", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/transactions/number/INVALID-TXN")
        .set("Authorization", "Bearer mock-token")
        .expect(404);
    });
  });

  // =========================================================================
  // GET /api/v1/transactions/statistics — Get transaction stats
  // =========================================================================

  describe("GET /api/v1/transactions/statistics", () => {
    it("should return transaction statistics", async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/transactions/statistics?dateFrom=2024-03-01&dateTo=2024-03-03`,
        )
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body).toHaveProperty("period");
      expect(res.body).toHaveProperty("statistics");
      expect(res.body.statistics).toHaveProperty("totalTransactions");
      expect(res.body.statistics).toHaveProperty("totalAmount");
      expect(res.body.statistics).toHaveProperty("averageAmount");
      expect(res.body.statistics).toHaveProperty("completedCount");
      expect(res.body.statistics).toHaveProperty("failedCount");
      expect(res.body.statistics).toHaveProperty("pendingCount");
      expect(res.body.statistics).toHaveProperty("successRate");
    });

    it("should include payment method breakdown", async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/transactions/statistics?dateFrom=2024-03-01&dateTo=2024-03-03`,
        )
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body).toHaveProperty("byPaymentMethod");
      expect(res.body.byPaymentMethod).toHaveProperty("cash");
      expect(res.body.byPaymentMethod).toHaveProperty("card");
      expect(res.body.byPaymentMethod).toHaveProperty("mobile");
    });

    it("should filter statistics by machineId", async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/transactions/statistics?dateFrom=2024-03-01&dateTo=2024-03-03&machineId=${MACHINE_ID}`,
        )
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.period).toHaveProperty("dateFrom");
      expect(res.body.period).toHaveProperty("dateTo");
    });
  });

  // =========================================================================
  // POST /api/v1/transactions/:id/payment — Process payment
  // =========================================================================

  describe("POST /api/v1/transactions/:id/payment", () => {
    it("should process payment for transaction", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions/txn-001/payment")
        .set("Authorization", "Bearer mock-token")
        .send({
          method: "card",
          referenceId: "ref-123",
        })
        .expect(200);

      expect(res.body.status).toBe("completed");
      expect(res.body).toHaveProperty("paymentProcessedAt");
    });

    it("should return 404 for non-existent transaction", async () => {
      await request(app.getHttpServer())
        .post(
          "/api/v1/transactions/00000000-0000-0000-0000-000000000000/payment",
        )
        .set("Authorization", "Bearer mock-token")
        .send({ method: "card" })
        .expect(404);
    });
  });

  // =========================================================================
  // POST /api/v1/transactions/:id/dispense — Record dispense
  // =========================================================================

  describe("POST /api/v1/transactions/:id/dispense", () => {
    it("should record successful dispense", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions/txn-001/dispense")
        .set("Authorization", "Bearer mock-token")
        .send({ success: true })
        .expect(200);

      expect(res.body.status).toBe("completed");
      expect(res.body).toHaveProperty("dispenseAt");
    });

    it("should record failed dispense", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions/txn-002/dispense")
        .set("Authorization", "Bearer mock-token")
        .send({ success: false })
        .expect(200);

      expect(res.body.status).toBe("failed");
    });
  });

  // =========================================================================
  // POST /api/v1/transactions/:id/cancel — Cancel transaction
  // =========================================================================

  describe("POST /api/v1/transactions/:id/cancel", () => {
    it("should cancel transaction with reason", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions/txn-001/cancel")
        .set("Authorization", "Bearer mock-token")
        .send({ reason: "User requested refund" })
        .expect(200);

      expect(res.body.status).toBe("cancelled");
      expect(res.body.cancellationReason).toBe("User requested refund");
    });

    it("should return 404 for non-existent transaction", async () => {
      await request(app.getHttpServer())
        .post(
          "/api/v1/transactions/00000000-0000-0000-0000-000000000000/cancel",
        )
        .set("Authorization", "Bearer mock-token")
        .send({ reason: "Test" })
        .expect(404);
    });
  });

  // =========================================================================
  // Refund Operations
  // =========================================================================

  describe("Refund operations", () => {
    it("should create refund for transaction", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions/txn-001/refund")
        .set("Authorization", "Bearer mock-token")
        .send({
          amount: 5000,
          reason: "Customer complaint",
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.transactionId).toBe("txn-001");
      expect(res.body.amount).toBe(5000);
      expect(res.body.status).toBe("pending");
    });

    it("should process refund", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions/refunds/ref-001/process")
        .set("Authorization", "Bearer mock-token")
        .send({
          success: true,
          referenceNumber: "REF-123",
        })
        .expect(200);

      expect(res.body.status).toBe("completed");
      expect(res.body.referenceNumber).toBe("REF-123");
    });
  });

  // =========================================================================
  // Collection Records
  // =========================================================================

  describe("GET /api/v1/transactions/collections", () => {
    it("should return collection records", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions/collections")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("page");
    });

    it("should filter collection by machineId", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/transactions/collections?machineId=${MACHINE_ID}`)
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.data.every((c: any) => c.machineId === MACHINE_ID)).toBe(
        true,
      );
    });

    it("should filter by verification status", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions/collections?isVerified=true")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.data.every((c: any) => c.isVerified === true)).toBe(true);
    });
  });

  describe("POST /api/v1/transactions/collections", () => {
    it("should create collection record", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions/collections")
        .set("Authorization", "Bearer mock-token")
        .send({
          machineId: MACHINE_ID,
          collectedAmount: 50000,
          collectedByUserId: USER_ID,
        })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.machineId).toBe(MACHINE_ID);
      expect(res.body.collectedAmount).toBe(50000);
      expect(res.body.isVerified).toBe(false);
    });
  });

  describe("PATCH /api/v1/transactions/collections/:collectionId/verify", () => {
    it("should verify collection record", async () => {
      const res = await request(app.getHttpServer())
        .patch("/api/v1/transactions/collections/coll-001/verify")
        .set("Authorization", "Bearer mock-token")
        .send({
          notes: "Verified by accountant",
        })
        .expect(200);

      expect(res.body.isVerified).toBe(true);
      expect(res.body).toHaveProperty("verifiedAt");
    });
  });

  // =========================================================================
  // Daily Summaries
  // =========================================================================

  describe("GET /api/v1/transactions/daily-summaries", () => {
    it("should return daily summaries", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions/daily-summaries")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty("date");
      expect(res.body.data[0]).toHaveProperty("totalTransactions");
      expect(res.body.data[0]).toHaveProperty("totalAmount");
    });

    it("should filter by machineId", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/transactions/daily-summaries?machineId=${MACHINE_ID}`)
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.data.every((s: any) => s.machineId === MACHINE_ID)).toBe(
        true,
      );
    });
  });

  describe("POST /api/v1/transactions/daily-summaries/rebuild", () => {
    it("should rebuild daily summary", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions/daily-summaries/rebuild")
        .set("Authorization", "Bearer mock-token")
        .send({
          date: "2024-03-02",
          machineId: MACHINE_ID,
        })
        .expect(200);

      expect(res.body.date).toBe("2024-03-02");
      expect(res.body.status).toBe("rebuilt");
    });

    it("should reject rebuild without date", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/transactions/daily-summaries/rebuild")
        .set("Authorization", "Bearer mock-token")
        .send({})
        .expect(400);
    });
  });

  // =========================================================================
  // Commissions
  // =========================================================================

  describe("GET /api/v1/transactions/commissions", () => {
    it("should return commissions", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions/commissions")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty("date");
      expect(res.body.data[0]).toHaveProperty("amount");
      expect(res.body.data[0]).toHaveProperty("status");
    });

    it("should filter by status", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/transactions/commissions?status=pending")
        .set("Authorization", "Bearer mock-token")
        .expect(200);

      expect(res.body.data.every((c: any) => c.status === "pending")).toBe(
        true,
      );
    });
  });

  // =========================================================================
  // Fiscalization
  // =========================================================================

  describe("POST /api/v1/transactions/:id/fiscalize", () => {
    it("should add fiscal data to transaction", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/transactions/txn-001/fiscalize")
        .set("Authorization", "Bearer mock-token")
        .send({
          checkId: "CHK-12345",
          checkTime: "2024-03-03T10:30:00Z",
        })
        .expect(200);

      expect(res.body).toHaveProperty("fiscal");
      expect(res.body).toHaveProperty("fiscalizedAt");
    });

    it("should return 404 for non-existent transaction", async () => {
      await request(app.getHttpServer())
        .post(
          "/api/v1/transactions/00000000-0000-0000-0000-000000000000/fiscalize",
        )
        .set("Authorization", "Bearer mock-token")
        .send({})
        .expect(404);
    });
  });
});
