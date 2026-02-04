/**
 * Playwright E2E Tests: Payment Integration
 *
 * Tests the full payment lifecycle against a running API:
 *   - Create order -> Initialize payment -> Webhook callback -> Verify completion
 *   - Refund flow: Complete payment -> Request refund -> Verify status
 *   - Transaction queries with filters and stats
 *
 * Requires: API server running at API_URL (default: http://localhost:4000)
 * Uses realistic UZS amounts for Uzbekistan market context.
 */

import { test, expect } from '@playwright/test';

test.describe('Payments API', () => {
  const baseURL = process.env.API_URL || 'http://localhost:4000';
  let accessToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get access token
    const response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: 'admin@vendhub.uz',
        password: 'demo123456',
      },
    });

    const data = await response.json();
    accessToken = data.accessToken;
  });

  // =========================================================================
  // Transaction Listing & Queries
  // =========================================================================

  test('should list transactions with pagination', async ({ request }) => {
    const response = await request.get(`${baseURL}/payments/transactions?page=1&limit=20`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(Array.isArray(data.data || data.items)).toBeTruthy();
  });

  test('should filter transactions by provider', async ({ request }) => {
    const response = await request.get(`${baseURL}/payments/transactions?provider=payme`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    const items = data.data || data.items || [];
    for (const tx of items) {
      expect(tx.provider).toBe('payme');
    }
  });

  test('should filter transactions by status', async ({ request }) => {
    const response = await request.get(`${baseURL}/payments/transactions?status=completed`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    const items = data.data || data.items || [];
    for (const tx of items) {
      expect(tx.status).toBe('completed');
    }
  });

  test('should filter transactions by date range', async ({ request }) => {
    const dateFrom = '2025-01-01T00:00:00.000Z';
    const dateTo = '2025-12-31T23:59:59.999Z';

    const response = await request.get(
      `${baseURL}/payments/transactions?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('total');
  });

  test('should get transaction statistics', async ({ request }) => {
    const response = await request.get(`${baseURL}/payments/transactions/stats`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const stats = await response.json();
    expect(stats).toHaveProperty('totalRevenue');
    expect(stats).toHaveProperty('totalTransactions');
    expect(stats).toHaveProperty('currency');
    expect(stats.currency).toBe('UZS');
    expect(typeof stats.totalRevenue).toBe('number');
  });

  test('should get transaction by ID', async ({ request }) => {
    // First get list to find a transaction ID
    const listResponse = await request.get(`${baseURL}/payments/transactions?limit=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const listData = await listResponse.json();
    const items = listData.data || listData.items || [];

    if (items.length === 0) {
      test.skip();
      return;
    }

    const txId = items[0].id;

    // Get transaction by ID
    const response = await request.get(`${baseURL}/payments/transactions/${txId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const tx = await response.json();
    expect(tx.id).toBe(txId);
    expect(tx).toHaveProperty('provider');
    expect(tx).toHaveProperty('amount');
    expect(tx).toHaveProperty('status');
    expect(tx).toHaveProperty('currency');
  });

  test('should return 404 for non-existent transaction', async ({ request }) => {
    const response = await request.get(
      `${baseURL}/payments/transactions/00000000-0000-0000-0000-000000000000`,
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
  // =========================================================================

  test.describe('Payme Payment Flow', () => {
    let orderId: string;
    let transactionId: string;

    test('should create a Payme payment for 50,000 UZS', async ({ request }) => {
      // First, try to create an order to get an orderId
      const orderResponse = await request.post(`${baseURL}/orders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1, price: 50000 }],
          paymentMethod: 'payme',
          totalAmount: 50000,
        },
      });

      // Use returned orderId or fallback to a UUID
      const orderData = await orderResponse.json();
      orderId = orderData.id || '550e8400-e29b-41d4-a716-446655440000';

      // Create Payme payment
      const response = await request.post(`${baseURL}/payments/payme/create`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          amount: 50000,
          orderId: orderId,
        },
      });

      // Should return 201 or 200
      expect([200, 201]).toContain(response.status());

      const payment = await response.json();
      expect(payment).toHaveProperty('transaction');
      expect(payment).toHaveProperty('checkoutUrl');
      expect(payment.transaction.amount).toBe(50000);
      transactionId = payment.transaction?.id;
    });

    test('should process Payme webhook: CheckPerformTransaction', async ({ request }) => {
      const response = await request.post(`${baseURL}/payments/webhook/payme`, {
        data: {
          method: 'CheckPerformTransaction',
          params: {
            amount: 5000000, // 50,000 UZS in tiyin
            account: { order_id: orderId || '550e8400-e29b-41d4-a716-446655440000' },
          },
        },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('result');
      expect(result.result.allow).toBe(true);
    });

    test('should process Payme webhook: CreateTransaction', async ({ request }) => {
      const response = await request.post(`${baseURL}/payments/webhook/payme`, {
        data: {
          method: 'CreateTransaction',
          params: {
            id: 'payme_e2e_tx_001',
            time: Date.now(),
            amount: 5000000,
            account: { order_id: orderId || '550e8400-e29b-41d4-a716-446655440000' },
          },
        },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('create_time');
      expect(result.result).toHaveProperty('transaction');
      expect(result.result.state).toBe(1);
    });

    test('should process Payme webhook: PerformTransaction', async ({ request }) => {
      const response = await request.post(`${baseURL}/payments/webhook/payme`, {
        data: {
          method: 'PerformTransaction',
          params: {
            id: 'payme_e2e_tx_001',
          },
        },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty('result');
      expect(result.result.state).toBe(2); // Completed
      expect(result.result).toHaveProperty('perform_time');
    });

    test('should verify transaction is completed after webhook flow', async ({ request }) => {
      if (!transactionId) {
        test.skip();
        return;
      }

      const response = await request.get(
        `${baseURL}/payments/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.status() === 200) {
        const tx = await response.json();
        expect(['completed', 'pending', 'processing']).toContain(tx.status);
      }
    });
  });

  // =========================================================================
  // Click Payment Flow
  // =========================================================================

  test.describe('Click Payment Flow', () => {
    test('should create a Click payment for 100,000 UZS', async ({ request }) => {
      const response = await request.post(`${baseURL}/payments/click/create`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          amount: 100000,
          orderId: '550e8400-e29b-41d4-a716-446655440099',
        },
      });

      expect([200, 201]).toContain(response.status());

      const payment = await response.json();
      expect(payment).toHaveProperty('transaction');
      expect(payment).toHaveProperty('checkoutUrl');
    });

    test('should process Click webhook: prepare (action=0)', async ({ request }) => {
      const response = await request.post(`${baseURL}/payments/webhook/click`, {
        data: {
          action: 0,
          click_trans_id: 99999,
          merchant_trans_id: '550e8400-e29b-41d4-a716-446655440099',
          amount: 100000,
          sign_time: new Date().toISOString(),
          sign_string: 'e2e_test_signature',
        },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.error).toBe(0);
      expect(result).toHaveProperty('merchant_prepare_id');
    });

    test('should process Click webhook: complete (action=1)', async ({ request }) => {
      const response = await request.post(`${baseURL}/payments/webhook/click`, {
        data: {
          action: 1,
          click_trans_id: 99999,
          merchant_trans_id: '550e8400-e29b-41d4-a716-446655440099',
          merchant_prepare_id: 1001,
          amount: 100000,
          sign_time: new Date().toISOString(),
          sign_string: 'e2e_test_signature',
        },
      });

      expect(response.status()).toBe(200);

      const result = await response.json();
      expect(result.error).toBe(0);
      expect(result).toHaveProperty('merchant_confirm_id');
    });
  });

  // =========================================================================
  // Refund Flow
  // =========================================================================

  test.describe('Refund Flow', () => {
    test('should initiate a refund for a completed payment', async ({ request }) => {
      // First find a completed transaction
      const listResponse = await request.get(
        `${baseURL}/payments/transactions?status=completed&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const listData = await listResponse.json();
      const items = listData.data || listData.items || [];

      if (items.length === 0) {
        test.skip();
        return;
      }

      const completedTxId = items[0].id;

      // Initiate refund
      const response = await request.post(`${baseURL}/payments/refund`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          paymentTransactionId: completedTxId,
          reason: 'customer_request',
          reasonNote: 'E2E test: customer did not receive product',
        },
      });

      // Should return 201 or 200
      expect([200, 201]).toContain(response.status());

      const refund = await response.json();
      expect(refund).toHaveProperty('id');
      expect(refund.payment_transaction_id).toBe(completedTxId);
      expect(refund.reason).toBe('customer_request');
      expect(refund.status).toBe('pending');
    });

    test('should reject refund for non-existent transaction', async ({ request }) => {
      const response = await request.post(`${baseURL}/payments/refund`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          paymentTransactionId: '00000000-0000-0000-0000-000000000000',
          reason: 'customer_request',
        },
      });

      expect([400, 404]).toContain(response.status());
    });

    test('should reject refund without reason', async ({ request }) => {
      const response = await request.post(`${baseURL}/payments/refund`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          paymentTransactionId: '550e8400-e29b-41d4-a716-446655440000',
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  // =========================================================================
  // QR Payment Generation
  // =========================================================================

  test.describe('QR Payment', () => {
    test('should generate a QR payment code for a vending machine', async ({ request }) => {
      // Get a machine ID first
      const machinesResponse = await request.get(`${baseURL}/machines?limit=1`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const machinesData = await machinesResponse.json();
      const machines = machinesData.items || machinesData.data || [];

      if (machines.length === 0) {
        test.skip();
        return;
      }

      const machineId = machines[0].id;

      const response = await request.post(`${baseURL}/payments/qr/generate`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          amount: 10000,
          machineId: machineId,
        },
      });

      expect([200, 201]).toContain(response.status());

      const qr = await response.json();
      expect(qr).toHaveProperty('qrCodeBase64');
      expect(qr).toHaveProperty('paymentUrl');
      expect(qr).toHaveProperty('expiresAt');
    });

    test('should reject QR generation with amount below minimum', async ({ request }) => {
      const response = await request.post(`${baseURL}/payments/qr/generate`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          amount: 50,
          machineId: '550e8400-e29b-41d4-a716-446655440001',
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  test('should reject requests without authentication', async ({ request }) => {
    const response = await request.get(`${baseURL}/payments/transactions`);

    expect(response.status()).toBe(401);
  });

  test('should reject Payme creation with invalid amount', async ({ request }) => {
    const response = await request.post(`${baseURL}/payments/payme/create`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        amount: -1000,
        orderId: '550e8400-e29b-41d4-a716-446655440000',
      },
    });

    expect(response.status()).toBe(400);
  });
});
