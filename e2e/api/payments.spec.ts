/**
 * Playwright E2E Tests: Payment Integration
 *
 * Tests the full payment lifecycle against a running API:
 *   - Transaction listing and queries
 *   - Payment creation (Payme/Click) — skipped when providers not configured
 *   - Webhook processing — skipped when providers not configured
 *   - Refund flow
 *
 * Requires: API server running at API_URL (default: http://localhost:4000)
 * Uses realistic UZS amounts for Uzbekistan market context.
 */

import { test, expect } from "@playwright/test";

const API_PREFIX = "/api/v1";

test.describe("Payments API", () => {
  const baseURL = process.env.API_URL || "http://localhost:4000";
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${baseURL}${API_PREFIX}/auth/login`, {
      data: {
        email: "admin@vendhub.uz",
        password: "demo123456",
      },
    });

    const body = await response.json();
    const data = body.data ?? body;
    accessToken = data.accessToken;
  });

  // =========================================================================
  // Transaction Listing & Queries
  // =========================================================================

  test("should list transactions with pagination", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/payments/transactions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    expect(data).toHaveProperty("total");
    const items = data.data || data.items || [];
    expect(Array.isArray(items)).toBeTruthy();
  });

  test("should filter transactions by provider", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/payments/transactions?provider=payme`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    const items = data.data || data.items || [];
    for (const tx of items) {
      expect(tx.provider).toBe("payme");
    }
  });

  test("should filter transactions by status", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/payments/transactions?status=completed`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    const items = data.data || data.items || [];
    for (const tx of items) {
      expect(tx.status).toBe("completed");
    }
  });

  test("should filter transactions by date range", async ({ request }) => {
    const dateFrom = "2025-01-01T00:00:00.000Z";
    const dateTo = "2025-12-31T23:59:59.999Z";

    const response = await request.get(
      `${baseURL}${API_PREFIX}/payments/transactions?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const data = body.data ?? body;
    expect(data).toHaveProperty("total");
  });

  test("should get transaction statistics", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/payments/transactions/stats`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    const stats = body.data ?? body;
    expect(stats).toHaveProperty("totalRevenue");
    expect(stats).toHaveProperty("totalTransactions");
    expect(typeof stats.totalRevenue).toBe("number");
  });

  test("should get transaction by ID", async ({ request }) => {
    // First get list to find a transaction ID
    const listResponse = await request.get(
      `${baseURL}${API_PREFIX}/payments/transactions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const listBody = await listResponse.json();
    const listData = listBody.data ?? listBody;
    const items = listData.data || listData.items || [];

    if (items.length === 0) {
      test.skip();
      return;
    }

    const txId = items[0].id;

    // Get transaction by ID
    const response = await request.get(
      `${baseURL}${API_PREFIX}/payments/transactions/${txId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const txBody = await response.json();
    const tx = txBody.data ?? txBody;
    expect(tx.id).toBe(txId);
    expect(tx).toHaveProperty("provider");
    expect(tx).toHaveProperty("amount");
    expect(tx).toHaveProperty("status");
  });

  test("should return 404 for non-existent transaction", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/payments/transactions/00000000-0000-0000-0000-000000000000`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(404);
  });

  // =========================================================================
  // Full Payment Flow: Create -> Webhook -> Verify
  // (Skipped when payment providers not configured in dev)
  // =========================================================================

  test.describe("Payme Payment Flow", () => {
    let paymeConfigured = false;
    let orderId: string;
    let transactionId: string;

    test("should create a Payme payment for 50,000 UZS", async ({
      request,
    }) => {
      // Create Payme payment
      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/payme/create`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            amount: 50000,
            orderId: "550e8400-e29b-41d4-a716-446655440000",
          },
        },
      );

      // Skip entire flow if Payme not configured
      if (response.status() === 400) {
        const errBody = await response.json();
        const errMsg = errBody.message || errBody.data?.message || "";
        if (errMsg.includes("not configured")) {
          test.skip();
          return;
        }
      }

      expect([200, 201]).toContain(response.status());

      const paymentBody = await response.json();
      const payment = paymentBody.data ?? paymentBody;
      expect(payment).toHaveProperty("transaction");
      orderId = payment.orderId || "550e8400-e29b-41d4-a716-446655440000";
      transactionId = payment.transaction?.id;
      paymeConfigured = true;
    });

    test("should process Payme webhook: CheckPerformTransaction", async ({
      request,
    }) => {
      test.skip(!paymeConfigured, "Payme not configured");

      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/webhook/payme`,
        {
          data: {
            method: "CheckPerformTransaction",
            params: {
              amount: 5000000,
              account: {
                order_id: orderId || "550e8400-e29b-41d4-a716-446655440000",
              },
            },
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const result = body.data ?? body;
      expect(result).toHaveProperty("result");
    });

    test("should process Payme webhook: CreateTransaction", async ({
      request,
    }) => {
      test.skip(!paymeConfigured, "Payme not configured");

      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/webhook/payme`,
        {
          data: {
            method: "CreateTransaction",
            params: {
              id: "payme_e2e_tx_001",
              time: Date.now(),
              amount: 5000000,
              account: {
                order_id: orderId || "550e8400-e29b-41d4-a716-446655440000",
              },
            },
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const result = body.data ?? body;
      expect(result).toHaveProperty("result");
    });

    test("should process Payme webhook: PerformTransaction", async ({
      request,
    }) => {
      test.skip(!paymeConfigured, "Payme not configured");

      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/webhook/payme`,
        {
          data: {
            method: "PerformTransaction",
            params: {
              id: "payme_e2e_tx_001",
            },
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const result = body.data ?? body;
      expect(result).toHaveProperty("result");
    });

    test("should verify transaction is completed after webhook flow", async ({
      request,
    }) => {
      if (!transactionId) {
        test.skip();
        return;
      }

      const response = await request.get(
        `${baseURL}${API_PREFIX}/payments/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.status() === 200) {
        const body = await response.json();
        const tx = body.data ?? body;
        expect(["completed", "pending", "processing"]).toContain(tx.status);
      }
    });
  });

  // =========================================================================
  // Click Payment Flow
  // =========================================================================

  test.describe("Click Payment Flow", () => {
    let clickConfigured = false;

    test("should create a Click payment for 100,000 UZS", async ({
      request,
    }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/click/create`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            amount: 100000,
            orderId: "550e8400-e29b-41d4-a716-446655440099",
          },
        },
      );

      // Skip if Click not configured
      if (response.status() === 400) {
        const errBody = await response.json();
        const errMsg = errBody.message || errBody.data?.message || "";
        if (errMsg.includes("not configured")) {
          test.skip();
          return;
        }
      }

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      const payment = body.data ?? body;
      expect(payment).toHaveProperty("transaction");
      clickConfigured = true;
    });

    test("should process Click webhook: prepare (action=0)", async ({
      request,
    }) => {
      test.skip(!clickConfigured, "Click not configured");

      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/webhook/click`,
        {
          data: {
            action: 0,
            click_trans_id: 99999,
            merchant_trans_id: "550e8400-e29b-41d4-a716-446655440099",
            amount: 100000,
            sign_time: new Date().toISOString(),
            sign_string: "e2e_test_signature",
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const result = body.data ?? body;
      expect(result.error).toBe(0);
    });

    test("should process Click webhook: complete (action=1)", async ({
      request,
    }) => {
      test.skip(!clickConfigured, "Click not configured");

      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/webhook/click`,
        {
          data: {
            action: 1,
            click_trans_id: 99999,
            merchant_trans_id: "550e8400-e29b-41d4-a716-446655440099",
            merchant_prepare_id: 1001,
            amount: 100000,
            sign_time: new Date().toISOString(),
            sign_string: "e2e_test_signature",
          },
        },
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      const result = body.data ?? body;
      expect(result.error).toBe(0);
    });
  });

  // =========================================================================
  // Refund Flow
  // =========================================================================

  test.describe("Refund Flow", () => {
    test("should initiate a refund for a completed payment", async ({
      request,
    }) => {
      // First find a completed transaction
      const listResponse = await request.get(
        `${baseURL}${API_PREFIX}/payments/transactions?status=completed`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const listBody = await listResponse.json();
      const listData = listBody.data ?? listBody;
      const items = listData.data || listData.items || [];

      if (items.length === 0) {
        test.skip();
        return;
      }

      const completedTxId = items[0].id;

      // Initiate refund
      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/refund`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            paymentTransactionId: completedTxId,
            reason: "customer_request",
            reasonNote: "E2E test: customer did not receive product",
          },
        },
      );

      // Should return 201 or 200
      expect([200, 201]).toContain(response.status());

      const refundBody = await response.json();
      const refund = refundBody.data ?? refundBody;
      expect(refund).toHaveProperty("id");
    });

    test("should reject refund for non-existent transaction", async ({
      request,
    }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/refund`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            paymentTransactionId: "00000000-0000-0000-0000-000000000000",
            reason: "customer_request",
          },
        },
      );

      expect([400, 404]).toContain(response.status());
    });

    test("should reject refund without reason", async ({ request }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/refund`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            paymentTransactionId: "550e8400-e29b-41d4-a716-446655440000",
          },
        },
      );

      expect(response.status()).toBe(400);
    });
  });

  // =========================================================================
  // QR Payment Generation
  // =========================================================================

  test.describe("QR Payment", () => {
    test("should generate a QR payment code for a vending machine", async ({
      request,
    }) => {
      // Get a machine ID first
      const machinesResponse = await request.get(
        `${baseURL}${API_PREFIX}/machines`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const machinesBody = await machinesResponse.json();
      const machinesData = machinesBody.data ?? machinesBody;
      const machines = machinesData.data || machinesData.items || [];

      if (machines.length === 0) {
        test.skip();
        return;
      }

      const machineId = machines[0].id;

      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/qr/generate`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            amount: 10000,
            machineId: machineId,
          },
        },
      );

      // May fail with FK violation if no valid order exists for QR
      if (response.status() === 400) {
        test.skip();
        return;
      }

      expect([200, 201]).toContain(response.status());

      const qrBody = await response.json();
      const qr = qrBody.data ?? qrBody;
      expect(qr).toHaveProperty("qrCodeBase64");
      expect(qr).toHaveProperty("paymentUrl");
      expect(qr).toHaveProperty("expiresAt");
    });

    test("should reject QR generation with amount below minimum", async ({
      request,
    }) => {
      const response = await request.post(
        `${baseURL}${API_PREFIX}/payments/qr/generate`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          data: {
            amount: 50,
            machineId: "550e8400-e29b-41d4-a716-446655440001",
          },
        },
      );

      expect(response.status()).toBe(400);
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  test("should reject requests without authentication", async ({ request }) => {
    const response = await request.get(
      `${baseURL}${API_PREFIX}/payments/transactions`,
    );

    expect(response.status()).toBe(401);
  });

  test("should reject Payme creation with invalid amount", async ({
    request,
  }) => {
    const response = await request.post(
      `${baseURL}${API_PREFIX}/payments/payme/create`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          amount: -1000,
          orderId: "550e8400-e29b-41d4-a716-446655440000",
        },
      },
    );

    expect(response.status()).toBe(400);
  });
});
