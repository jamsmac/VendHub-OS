/**
 * E2E Tests: Payment Flow
 *
 * Tests the complete payment lifecycle: transaction creation (Payme, Click, Uzum),
 * webhook processing, transaction queries, refund initiation, and state transitions.
 * Uses mock controllers to avoid database, Redis, and external payment provider
 * dependencies.
 *
 * Endpoint prefix: /api/v1/payments
 * Controller: PaymentsController (src/modules/payments/payments.controller.ts)
 */

import {
  INestApplication,
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, mockUuid, mockUuid2, otherOrgId } from './setup';

// ---------------------------------------------------------------------------
// Constants & Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = mockUuid2();
const ORDER_ID = 'aabbccdd-1111-2222-3333-444444444444';
const MACHINE_ID = 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa';
const CLIENT_USER_ID = 'dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb';
const TX_ID_PENDING = 'eeeeeeee-1111-2222-3333-444444444444';
const TX_ID_COMPLETED = 'ffffffff-1111-2222-3333-444444444444';
const TX_ID_CANCELLED = '11111111-aaaa-bbbb-cccc-dddddddddddd';
const REFUND_ID = '22222222-aaaa-bbbb-cccc-dddddddddddd';

function transactionSample(overrides: Record<string, any> = {}) {
  return {
    id: TX_ID_PENDING,
    organization_id: ORG_ID,
    provider: 'payme',
    provider_tx_id: null,
    amount: 50000,
    currency: 'UZS',
    status: 'pending',
    order_id: ORDER_ID,
    machine_id: MACHINE_ID,
    client_user_id: CLIENT_USER_ID,
    raw_request: null,
    raw_response: null,
    error_message: null,
    processed_at: null,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

const transactions = [
  transactionSample(),
  transactionSample({
    id: TX_ID_COMPLETED,
    provider: 'click',
    amount: 100000,
    status: 'completed',
    provider_tx_id: 'click_tx_123456',
    processed_at: new Date().toISOString(),
  }),
  transactionSample({
    id: TX_ID_CANCELLED,
    provider: 'payme',
    amount: 10000,
    status: 'cancelled',
    error_message: 'User cancelled payment',
  }),
];

// ---------------------------------------------------------------------------
// Mock controller that mirrors PaymentsController endpoint shapes
// ---------------------------------------------------------------------------

@Controller({ path: 'payments', version: '1' })
class MockPaymentsController {
  // ============================================
  // PAYMENT CREATION ENDPOINTS
  // ============================================

  @Post('payme/create')
  createPayme(@Body() body: any) {
    if (!body.amount || body.amount < 100) {
      throw new BadRequestException('Amount must be at least 100 UZS');
    }
    if (!body.orderId) {
      throw new BadRequestException('orderId is required');
    }

    return {
      transaction: transactionSample({
        provider: 'payme',
        amount: body.amount,
        order_id: body.orderId,
        machine_id: body.machineId || null,
        client_user_id: body.clientUserId || null,
      }),
      checkoutUrl: `https://checkout.paycom.uz/${Buffer.from(JSON.stringify({
        merchant: 'vendhub_merchant_id',
        amount: body.amount * 100,
        account: { order_id: body.orderId },
      })).toString('base64')}`,
    };
  }

  @Post('click/create')
  createClick(@Body() body: any) {
    if (!body.amount || body.amount < 100) {
      throw new BadRequestException('Amount must be at least 100 UZS');
    }
    if (!body.orderId) {
      throw new BadRequestException('orderId is required');
    }

    return {
      transaction: transactionSample({
        provider: 'click',
        amount: body.amount,
        order_id: body.orderId,
        machine_id: body.machineId || null,
        client_user_id: body.clientUserId || null,
      }),
      checkoutUrl: `https://my.click.uz/services/pay?service_id=12345&merchant_id=67890&amount=${body.amount}&transaction_param=${body.orderId}`,
    };
  }

  @Post('uzum/create')
  createUzum(@Body() body: any) {
    if (!body.amount || body.amount < 100) {
      throw new BadRequestException('Amount must be at least 100 UZS');
    }
    if (!body.orderId) {
      throw new BadRequestException('orderId is required');
    }

    return {
      transaction: transactionSample({
        provider: 'uzum',
        amount: body.amount,
        order_id: body.orderId,
      }),
      checkoutUrl: `https://www.uzumbank.uz/pay?sessionId=uzum_session_${Date.now()}`,
    };
  }

  @Post('qr/generate')
  generateQR(@Body() body: any) {
    if (!body.amount || body.amount < 100) {
      throw new BadRequestException('Amount must be at least 100 UZS');
    }
    if (!body.machineId) {
      throw new BadRequestException('machineId is required');
    }

    return {
      qrCodeBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAA...',
      paymentUrl: `https://vendhub.uz/pay?m=${body.machineId}&a=${body.amount}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }

  // ============================================
  // WEBHOOK ENDPOINTS
  // ============================================

  @Post('webhook/payme')
  @HttpCode(HttpStatus.OK)
  paymeWebhook(@Body() data: any, @Headers('authorization') authHeader: string) {
    // Payme uses JSON-RPC format
    const method = data.method;
    const params = data.params || {};

    if (method === 'CheckPerformTransaction') {
      return {
        result: {
          allow: true,
        },
      };
    }

    if (method === 'CreateTransaction') {
      return {
        result: {
          create_time: Date.now(),
          transaction: params.id || 'payme_tx_001',
          state: 1, // Created
        },
      };
    }

    if (method === 'PerformTransaction') {
      return {
        result: {
          transaction: params.id || 'payme_tx_001',
          perform_time: Date.now(),
          state: 2, // Completed
        },
      };
    }

    if (method === 'CancelTransaction') {
      return {
        result: {
          transaction: params.id || 'payme_tx_001',
          cancel_time: Date.now(),
          state: -1, // Cancelled
        },
      };
    }

    if (method === 'CheckTransaction') {
      return {
        result: {
          create_time: Date.now() - 60000,
          perform_time: Date.now(),
          cancel_time: 0,
          transaction: params.id || 'payme_tx_001',
          state: 2,
          reason: null,
        },
      };
    }

    return { error: { code: -32601, message: 'Method not found' } };
  }

  @Post('webhook/click')
  @HttpCode(HttpStatus.OK)
  clickWebhook(@Body() data: any) {
    // Click uses action-based format
    if (data.action === 0) {
      // Prepare
      return {
        click_trans_id: data.click_trans_id || 12345,
        merchant_trans_id: data.merchant_trans_id || ORDER_ID,
        merchant_prepare_id: 1001,
        error: 0,
        error_note: 'Success',
      };
    }

    if (data.action === 1) {
      // Complete
      return {
        click_trans_id: data.click_trans_id || 12345,
        merchant_trans_id: data.merchant_trans_id || ORDER_ID,
        merchant_confirm_id: 2001,
        error: 0,
        error_note: 'Success',
      };
    }

    return { error: -1, error_note: 'Unknown action' };
  }

  @Post('webhook/uzum')
  @HttpCode(HttpStatus.OK)
  uzumWebhook(@Body() data: any) {
    return {
      status: 'success',
      transactionId: data.transactionId || 'uzum_tx_001',
      serviceId: data.serviceId || 'vendhub_service',
    };
  }

  // ============================================
  // REFUND ENDPOINT
  // ============================================

  @Post('refund')
  initiateRefund(@Body() body: any) {
    if (!body.paymentTransactionId) {
      throw new BadRequestException('paymentTransactionId is required');
    }
    if (!body.reason) {
      throw new BadRequestException('reason is required');
    }

    // Simulate: cannot refund a pending transaction
    if (body.paymentTransactionId === TX_ID_PENDING) {
      throw new BadRequestException('Cannot refund a transaction with status: pending');
    }

    // Simulate: cannot find transaction
    if (body.paymentTransactionId === '00000000-0000-0000-0000-000000000000') {
      throw new NotFoundException('Payment transaction not found');
    }

    // Simulate: already refunded
    if (body.paymentTransactionId === TX_ID_CANCELLED) {
      throw new ConflictException('Transaction has already been refunded or cancelled');
    }

    return {
      id: REFUND_ID,
      organization_id: ORG_ID,
      payment_transaction_id: body.paymentTransactionId,
      amount: body.amount || 100000,
      reason: body.reason,
      reason_note: body.reasonNote || null,
      status: 'pending',
      provider_refund_id: null,
      processed_at: null,
      processed_by_user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // ============================================
  // TRANSACTION QUERY ENDPOINTS
  // ============================================

  @Get('transactions')
  getTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('orderId') orderId?: string,
    @Query('machineId') machineId?: string,
  ) {
    let filtered = [...transactions];

    if (provider) {
      filtered = filtered.filter((tx) => tx.provider === provider);
    }
    if (status) {
      filtered = filtered.filter((tx) => tx.status === status);
    }
    if (orderId) {
      filtered = filtered.filter((tx) => tx.order_id === orderId);
    }
    if (machineId) {
      filtered = filtered.filter((tx) => tx.machine_id === machineId);
    }

    return {
      data: filtered,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filtered.length / Number(limit)),
    };
  }

  @Get('transactions/stats')
  getTransactionStats() {
    return {
      totalRevenue: 160000,
      totalTransactions: 3,
      completedCount: 1,
      pendingCount: 1,
      cancelledCount: 1,
      byProvider: {
        payme: { count: 2, revenue: 60000 },
        click: { count: 1, revenue: 100000 },
      },
      averageAmount: 53333,
      currency: 'UZS',
    };
  }

  @Get('transactions/:id')
  getTransaction(@Param('id') id: string) {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) throw new NotFoundException('Transaction not found');

    return {
      ...tx,
      refunds: tx.status === 'completed'
        ? []
        : [],
    };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Payment Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [MockPaymentsController],
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // =========================================================================
  // POST /api/v1/payments/payme/create — Create Payme payment
  // =========================================================================

  describe('POST /api/v1/payments/payme/create', () => {
    const validPayload = {
      amount: 50000,
      orderId: ORDER_ID,
      machineId: MACHINE_ID,
      clientUserId: CLIENT_USER_ID,
    };

    it('should create a Payme payment with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/payme/create')
        .set('Authorization', 'Bearer mock-token')
        .send(validPayload)
        .expect(201);

      expect(res.body).toHaveProperty('transaction');
      expect(res.body).toHaveProperty('checkoutUrl');
      expect(res.body.transaction.provider).toBe('payme');
      expect(res.body.transaction.amount).toBe(50000);
      expect(res.body.transaction.order_id).toBe(ORDER_ID);
      expect(res.body.transaction.status).toBe('pending');
      expect(res.body.checkoutUrl).toContain('paycom.uz');
    });

    it('should create a Payme payment without optional fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/payme/create')
        .set('Authorization', 'Bearer mock-token')
        .send({ amount: 10000, orderId: ORDER_ID })
        .expect(201);

      expect(res.body.transaction.machine_id).toBeNull();
      expect(res.body.transaction.client_user_id).toBeNull();
    });

    it('should reject payment with amount below 100 UZS', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/payme/create')
        .set('Authorization', 'Bearer mock-token')
        .send({ amount: 50, orderId: ORDER_ID })
        .expect(400);
    });

    it('should reject payment without orderId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/payme/create')
        .set('Authorization', 'Bearer mock-token')
        .send({ amount: 50000 })
        .expect(400);
    });
  });

  // =========================================================================
  // POST /api/v1/payments/click/create — Create Click payment
  // =========================================================================

  describe('POST /api/v1/payments/click/create', () => {
    it('should create a Click payment with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/click/create')
        .set('Authorization', 'Bearer mock-token')
        .send({ amount: 100000, orderId: ORDER_ID, machineId: MACHINE_ID })
        .expect(201);

      expect(res.body).toHaveProperty('transaction');
      expect(res.body).toHaveProperty('checkoutUrl');
      expect(res.body.transaction.provider).toBe('click');
      expect(res.body.transaction.amount).toBe(100000);
      expect(res.body.checkoutUrl).toContain('click.uz');
    });

    it('should reject Click payment with missing amount', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/click/create')
        .set('Authorization', 'Bearer mock-token')
        .send({ orderId: ORDER_ID })
        .expect(400);
    });
  });

  // =========================================================================
  // POST /api/v1/payments/uzum/create — Create Uzum payment
  // =========================================================================

  describe('POST /api/v1/payments/uzum/create', () => {
    it('should create an Uzum payment with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/uzum/create')
        .set('Authorization', 'Bearer mock-token')
        .send({ amount: 15000, orderId: ORDER_ID })
        .expect(201);

      expect(res.body).toHaveProperty('transaction');
      expect(res.body).toHaveProperty('checkoutUrl');
      expect(res.body.transaction.provider).toBe('uzum');
      expect(res.body.transaction.amount).toBe(15000);
      expect(res.body.checkoutUrl).toContain('uzumbank.uz');
    });

    it('should reject Uzum payment with amount below minimum', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/uzum/create')
        .set('Authorization', 'Bearer mock-token')
        .send({ amount: 10, orderId: ORDER_ID })
        .expect(400);
    });
  });

  // =========================================================================
  // POST /api/v1/payments/qr/generate — Generate QR payment
  // =========================================================================

  describe('POST /api/v1/payments/qr/generate', () => {
    it('should generate a QR payment code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/qr/generate')
        .set('Authorization', 'Bearer mock-token')
        .send({ amount: 3000, machineId: MACHINE_ID })
        .expect(201);

      expect(res.body).toHaveProperty('qrCodeBase64');
      expect(res.body).toHaveProperty('paymentUrl');
      expect(res.body).toHaveProperty('expiresAt');
      expect(res.body.qrCodeBase64).toContain('data:image/png;base64');
    });

    it('should reject QR generation without machineId', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/qr/generate')
        .set('Authorization', 'Bearer mock-token')
        .send({ amount: 3000 })
        .expect(400);
    });
  });

  // =========================================================================
  // POST /api/v1/payments/webhook/payme — Payme webhook (JSON-RPC)
  // =========================================================================

  describe('POST /api/v1/payments/webhook/payme', () => {
    it('should handle CheckPerformTransaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/payme')
        .set('Authorization', 'Basic dGVzdDp0ZXN0')
        .send({
          method: 'CheckPerformTransaction',
          params: {
            amount: 5000000, // in tiyin (50000 UZS)
            account: { order_id: ORDER_ID },
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('result');
      expect(res.body.result.allow).toBe(true);
    });

    it('should handle CreateTransaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/payme')
        .set('Authorization', 'Basic dGVzdDp0ZXN0')
        .send({
          method: 'CreateTransaction',
          params: {
            id: 'payme_tx_001',
            time: Date.now(),
            amount: 5000000,
            account: { order_id: ORDER_ID },
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty('result');
      expect(res.body.result).toHaveProperty('create_time');
      expect(res.body.result).toHaveProperty('transaction');
      expect(res.body.result.state).toBe(1); // Created
    });

    it('should handle PerformTransaction (state transition: PENDING -> COMPLETED)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/payme')
        .set('Authorization', 'Basic dGVzdDp0ZXN0')
        .send({
          method: 'PerformTransaction',
          params: { id: 'payme_tx_001' },
        })
        .expect(200);

      expect(res.body.result.state).toBe(2); // Completed
      expect(res.body.result).toHaveProperty('perform_time');
    });

    it('should handle CancelTransaction (state transition: PENDING -> CANCELLED)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/payme')
        .set('Authorization', 'Basic dGVzdDp0ZXN0')
        .send({
          method: 'CancelTransaction',
          params: { id: 'payme_tx_001', reason: 5 },
        })
        .expect(200);

      expect(res.body.result.state).toBe(-1); // Cancelled
      expect(res.body.result).toHaveProperty('cancel_time');
    });

    it('should handle CheckTransaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/payme')
        .set('Authorization', 'Basic dGVzdDp0ZXN0')
        .send({
          method: 'CheckTransaction',
          params: { id: 'payme_tx_001' },
        })
        .expect(200);

      expect(res.body.result).toHaveProperty('state');
      expect(res.body.result).toHaveProperty('create_time');
      expect(res.body.result).toHaveProperty('perform_time');
    });

    it('should return error for unknown JSON-RPC method', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/payme')
        .set('Authorization', 'Basic dGVzdDp0ZXN0')
        .send({
          method: 'UnknownMethod',
          params: {},
        })
        .expect(200);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe(-32601);
    });
  });

  // =========================================================================
  // POST /api/v1/payments/webhook/click — Click webhook
  // =========================================================================

  describe('POST /api/v1/payments/webhook/click', () => {
    it('should handle prepare action (action=0)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/click')
        .send({
          action: 0,
          click_trans_id: 12345,
          merchant_trans_id: ORDER_ID,
          amount: 100000,
          sign_time: new Date().toISOString(),
          sign_string: 'mock_md5_signature',
        })
        .expect(200);

      expect(res.body.error).toBe(0);
      expect(res.body.error_note).toBe('Success');
      expect(res.body).toHaveProperty('click_trans_id');
      expect(res.body).toHaveProperty('merchant_trans_id');
      expect(res.body).toHaveProperty('merchant_prepare_id');
    });

    it('should handle complete action (action=1)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/click')
        .send({
          action: 1,
          click_trans_id: 12345,
          merchant_trans_id: ORDER_ID,
          merchant_prepare_id: 1001,
          amount: 100000,
          sign_time: new Date().toISOString(),
          sign_string: 'mock_md5_signature',
        })
        .expect(200);

      expect(res.body.error).toBe(0);
      expect(res.body.error_note).toBe('Success');
      expect(res.body).toHaveProperty('merchant_confirm_id');
    });

    it('should return error for unknown action', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/click')
        .send({
          action: 99,
          click_trans_id: 12345,
          merchant_trans_id: ORDER_ID,
        })
        .expect(200);

      expect(res.body.error).toBe(-1);
      expect(res.body.error_note).toBe('Unknown action');
    });
  });

  // =========================================================================
  // POST /api/v1/payments/webhook/uzum — Uzum webhook
  // =========================================================================

  describe('POST /api/v1/payments/webhook/uzum', () => {
    it('should handle Uzum webhook callback', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook/uzum')
        .send({
          transactionId: 'uzum_tx_001',
          serviceId: 'vendhub_service',
          amount: 15000,
          status: 'success',
        })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('transactionId');
    });
  });

  // =========================================================================
  // POST /api/v1/payments/refund — Initiate refund
  // =========================================================================

  describe('POST /api/v1/payments/refund', () => {
    it('should initiate a full refund for a completed transaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', 'Bearer mock-token')
        .send({
          paymentTransactionId: TX_ID_COMPLETED,
          reason: 'customer_request',
          reasonNote: 'Customer did not receive product from machine',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id', REFUND_ID);
      expect(res.body.payment_transaction_id).toBe(TX_ID_COMPLETED);
      expect(res.body.reason).toBe('customer_request');
      expect(res.body.status).toBe('pending');
      expect(res.body.reason_note).toBe('Customer did not receive product from machine');
    });

    it('should initiate a partial refund with specified amount', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', 'Bearer mock-token')
        .send({
          paymentTransactionId: TX_ID_COMPLETED,
          amount: 50000,
          reason: 'machine_error',
        })
        .expect(201);

      expect(res.body.amount).toBe(50000);
      expect(res.body.reason).toBe('machine_error');
    });

    it('should reject refund for a pending transaction (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', 'Bearer mock-token')
        .send({
          paymentTransactionId: TX_ID_PENDING,
          reason: 'customer_request',
        })
        .expect(400);
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', 'Bearer mock-token')
        .send({
          paymentTransactionId: '00000000-0000-0000-0000-000000000000',
          reason: 'customer_request',
        })
        .expect(404);
    });

    it('should return 409 for already cancelled/refunded transaction', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', 'Bearer mock-token')
        .send({
          paymentTransactionId: TX_ID_CANCELLED,
          reason: 'customer_request',
        })
        .expect(409);
    });

    it('should reject refund without required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/refund')
        .set('Authorization', 'Bearer mock-token')
        .send({})
        .expect(400);
    });
  });

  // =========================================================================
  // GET /api/v1/payments/transactions — List with pagination
  // =========================================================================

  describe('GET /api/v1/payments/transactions', () => {
    it('should return paginated list of transactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/transactions')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('should accept page and limit query parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/transactions?page=1&limit=10')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('should filter transactions by provider', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/transactions?provider=click')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].provider).toBe('click');
    });

    it('should filter transactions by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/transactions?status=completed')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      for (const tx of res.body.data) {
        expect(tx.status).toBe('completed');
      }
    });

    it('should filter transactions by orderId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/transactions?orderId=${ORDER_ID}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      for (const tx of res.body.data) {
        expect(tx.order_id).toBe(ORDER_ID);
      }
    });

    it('should filter transactions by machineId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/transactions?machineId=${MACHINE_ID}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      for (const tx of res.body.data) {
        expect(tx.machine_id).toBe(MACHINE_ID);
      }
    });
  });

  // =========================================================================
  // GET /api/v1/payments/transactions/stats — Transaction stats
  // =========================================================================

  describe('GET /api/v1/payments/transactions/stats', () => {
    it('should return aggregated transaction statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/transactions/stats')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('totalTransactions');
      expect(res.body).toHaveProperty('completedCount');
      expect(res.body).toHaveProperty('pendingCount');
      expect(res.body).toHaveProperty('cancelledCount');
      expect(res.body).toHaveProperty('byProvider');
      expect(res.body).toHaveProperty('averageAmount');
      expect(res.body.currency).toBe('UZS');
      expect(typeof res.body.totalRevenue).toBe('number');
    });
  });

  // =========================================================================
  // GET /api/v1/payments/transactions/:id — Get single transaction
  // =========================================================================

  describe('GET /api/v1/payments/transactions/:id', () => {
    it('should return a transaction by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/transactions/${TX_ID_COMPLETED}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('id', TX_ID_COMPLETED);
      expect(res.body).toHaveProperty('provider', 'click');
      expect(res.body).toHaveProperty('amount', 100000);
      expect(res.body).toHaveProperty('status', 'completed');
      expect(res.body).toHaveProperty('provider_tx_id', 'click_tx_123456');
      expect(res.body).toHaveProperty('refunds');
    });

    it('should return 404 for non-existent transaction', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/payments/transactions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });

  // =========================================================================
  // State transition verification
  // =========================================================================

  describe('Payment state transitions', () => {
    it('should verify PENDING transaction exists', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/transactions/${TX_ID_PENDING}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.status).toBe('pending');
      expect(res.body.processed_at).toBeNull();
    });

    it('should verify COMPLETED transaction has processed_at timestamp', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/transactions/${TX_ID_COMPLETED}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.status).toBe('completed');
      expect(res.body.processed_at).not.toBeNull();
    });

    it('should verify CANCELLED transaction has error_message', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/transactions/${TX_ID_CANCELLED}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.status).toBe('cancelled');
      expect(res.body.error_message).toBe('User cancelled payment');
    });
  });
});
