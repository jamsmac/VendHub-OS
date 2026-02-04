/**
 * E2E Tests: Reconciliation Flow
 *
 * Tests the complete reconciliation lifecycle: creating runs, listing with filters,
 * fetching run details with summaries, retrieving mismatches, resolving mismatches,
 * HW sales import, and soft deletion. Uses mock controllers to avoid database
 * and Redis dependencies.
 *
 * Endpoint prefix: /api/v1/reconciliation
 * Controller: ReconciliationController (src/modules/reconciliation/reconciliation.controller.ts)
 */

import {
  INestApplication,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, mockUuid, mockUuid2, otherOrgId } from './setup';

// ---------------------------------------------------------------------------
// Constants & Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = mockUuid2();
const RUN_ID_PENDING = 'aaaaaaaa-1111-2222-3333-444444444444';
const RUN_ID_COMPLETED = 'bbbbbbbb-1111-2222-3333-444444444444';
const RUN_ID_FAILED = 'cccccccc-1111-2222-3333-444444444444';
const MISMATCH_ID_UNRESOLVED = 'dddddddd-1111-2222-3333-444444444444';
const MISMATCH_ID_RESOLVED = 'eeeeeeee-1111-2222-3333-444444444444';
const MISMATCH_ID_AMOUNT = 'ffffffff-1111-2222-3333-444444444444';
const MACHINE_ID = 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa';

function runSample(overrides: Record<string, any> = {}) {
  return {
    id: RUN_ID_PENDING,
    organizationId: ORG_ID,
    status: 'pending',
    dateFrom: '2025-01-01',
    dateTo: '2025-01-31',
    sources: ['hw', 'payme'],
    machineIds: [],
    timeTolerance: 300,
    amountTolerance: 0.01,
    startedAt: null,
    completedAt: null,
    processingTimeMs: null,
    summary: null,
    errorMessage: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

const runs = [
  runSample(),
  runSample({
    id: RUN_ID_COMPLETED,
    status: 'completed',
    dateFrom: '2025-02-01',
    dateTo: '2025-02-28',
    sources: ['hw', 'click'],
    startedAt: new Date(Date.now() - 120000).toISOString(),
    completedAt: new Date().toISOString(),
    processingTimeMs: 4500,
    summary: {
      totalRecords: 150,
      matched: 142,
      mismatched: 5,
      missing: 3,
      matchRate: 94.67,
    },
  }),
  runSample({
    id: RUN_ID_FAILED,
    status: 'failed',
    dateFrom: '2025-03-01',
    dateTo: '2025-03-31',
    sources: ['hw', 'uzum'],
    errorMessage: 'Timeout: processing exceeded 5 minutes',
  }),
];

function mismatchSample(overrides: Record<string, any> = {}) {
  return {
    id: MISMATCH_ID_UNRESOLVED,
    runId: RUN_ID_COMPLETED,
    organizationId: ORG_ID,
    orderNumber: 'ORD-2025-00142',
    machineCode: 'VH-001',
    orderTime: new Date('2025-02-15T14:30:00Z').toISOString(),
    amount: 50000,
    paymentMethod: 'payme',
    mismatchType: 'payment_not_found',
    matchScore: null,
    discrepancyAmount: 50000,
    sourcesData: {
      hw: {
        saleDate: '2025-02-15T14:30:00Z',
        amount: 50000,
        machineCode: 'VH-001',
      },
      payment: null,
    },
    description: 'HW sale has no matching payment transaction',
    isResolved: false,
    resolutionNotes: null,
    resolvedAt: null,
    resolvedByUserId: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const mismatches = [
  mismatchSample(),
  mismatchSample({
    id: MISMATCH_ID_RESOLVED,
    orderNumber: 'ORD-2025-00098',
    mismatchType: 'order_not_found',
    amount: 30000,
    discrepancyAmount: 30000,
    isResolved: true,
    resolutionNotes: 'Manual verification: order was processed offline',
    resolvedAt: new Date().toISOString(),
    resolvedByUserId: mockUuid(),
  }),
  mismatchSample({
    id: MISMATCH_ID_AMOUNT,
    orderNumber: 'ORD-2025-00175',
    mismatchType: 'amount_mismatch',
    amount: 100000,
    matchScore: 0.85,
    discrepancyAmount: 5000,
    sourcesData: {
      hw: {
        saleDate: '2025-02-20T10:15:00Z',
        amount: 100000,
        machineCode: 'VH-002',
      },
      payment: {
        provider: 'click',
        amount: 95000,
        transactionId: 'click_tx_999',
      },
    },
    description: 'Amount mismatch: HW=100000, Payment=95000 (diff=5000 UZS)',
  }),
];

// ---------------------------------------------------------------------------
// Mock controller that mirrors ReconciliationController endpoint shapes
// ---------------------------------------------------------------------------

@Controller({ path: 'reconciliation', version: '1' })
class MockReconciliationController {
  // ============================================
  // RECONCILIATION RUNS
  // ============================================

  @Post('runs')
  createRun(@Body() body: any) {
    if (!body.dateFrom || !body.dateTo) {
      throw new BadRequestException('dateFrom and dateTo are required');
    }
    if (!body.sources || !Array.isArray(body.sources) || body.sources.length === 0) {
      throw new BadRequestException('At least one source is required');
    }

    // Validate date range
    if (new Date(body.dateTo) < new Date(body.dateFrom)) {
      throw new BadRequestException('dateTo must be after dateFrom');
    }

    return runSample({
      id: mockUuid(),
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      sources: body.sources,
      machineIds: body.machineIds || [],
      timeTolerance: body.timeTolerance || 300,
      amountTolerance: body.amountTolerance || 0.01,
    });
  }

  @Get('runs')
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    let filtered = [...runs];

    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (dateFrom) {
      filtered = filtered.filter((r) => r.dateFrom >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((r) => r.dateTo <= dateTo);
    }

    return {
      data: filtered,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filtered.length / Number(limit)),
    };
  }

  @Get('runs/:id')
  findOne(@Param('id') id: string) {
    const run = runs.find((r) => r.id === id);
    if (!run) throw new NotFoundException('Reconciliation run not found');
    return run;
  }

  @Get('runs/:id/mismatches')
  getMismatches(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('mismatchType') mismatchType?: string,
    @Query('isResolved') isResolved?: string,
  ) {
    const run = runs.find((r) => r.id === id);
    if (!run) throw new NotFoundException('Reconciliation run not found');

    let filtered = mismatches.filter((m) => m.runId === id);

    if (mismatchType) {
      filtered = filtered.filter((m) => m.mismatchType === mismatchType);
    }
    if (isResolved !== undefined) {
      const resolved = isResolved === 'true';
      filtered = filtered.filter((m) => m.isResolved === resolved);
    }

    return {
      data: filtered,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filtered.length / Number(limit)),
    };
  }

  @Delete('runs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRun(@Param('id') id: string) {
    const run = runs.find((r) => r.id === id);
    if (!run) throw new NotFoundException('Reconciliation run not found');

    // Cannot delete a processing run
    if (run.status === 'processing') {
      throw new BadRequestException('Cannot delete a run that is currently processing');
    }

    return;
  }

  // ============================================
  // MISMATCHES
  // ============================================

  @Patch('mismatches/:id/resolve')
  resolveMismatch(@Param('id') id: string, @Body() body: any) {
    const mismatch = mismatches.find((m) => m.id === id);
    if (!mismatch) throw new NotFoundException('Mismatch not found');

    if (mismatch.isResolved) {
      throw new BadRequestException('Mismatch is already resolved');
    }

    if (!body.resolutionNotes) {
      throw new BadRequestException('resolutionNotes is required');
    }

    return {
      ...mismatch,
      isResolved: true,
      resolutionNotes: body.resolutionNotes,
      resolvedAt: new Date().toISOString(),
      resolvedByUserId: mockUuid(),
    };
  }

  // ============================================
  // IMPORT
  // ============================================

  @Post('import')
  importHwSales(@Body() body: any) {
    if (!body.sales || !Array.isArray(body.sales) || body.sales.length === 0) {
      throw new BadRequestException('At least one sale item is required');
    }
    if (!body.importSource) {
      throw new BadRequestException('importSource is required');
    }

    const validSources = ['excel', 'csv', 'api'];
    if (!validSources.includes(body.importSource)) {
      throw new BadRequestException(`importSource must be one of: ${validSources.join(', ')}`);
    }

    return {
      importBatchId: mockUuid(),
      importedCount: body.sales.length,
      skippedCount: 0,
      errors: [],
      importSource: body.importSource,
      importFilename: body.importFilename || null,
      created_at: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Reconciliation Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [MockReconciliationController],
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // =========================================================================
  // POST /api/v1/reconciliation/runs — Create reconciliation run
  // =========================================================================

  describe('POST /api/v1/reconciliation/runs', () => {
    const validPayload = {
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
      sources: ['hw', 'payme'],
      machineIds: [MACHINE_ID],
      timeTolerance: 600,
      amountTolerance: 0.05,
    };

    it('should create a reconciliation run with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reconciliation/runs')
        .set('Authorization', 'Bearer mock-token')
        .send(validPayload)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
      expect(res.body.dateFrom).toBe('2025-01-01');
      expect(res.body.dateTo).toBe('2025-01-31');
      expect(res.body.sources).toEqual(['hw', 'payme']);
      expect(res.body.machineIds).toEqual([MACHINE_ID]);
      expect(res.body.timeTolerance).toBe(600);
      expect(res.body.amountTolerance).toBe(0.05);
    });

    it('should create a run with minimal required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reconciliation/runs')
        .set('Authorization', 'Bearer mock-token')
        .send({
          dateFrom: '2025-02-01',
          dateTo: '2025-02-28',
          sources: ['hw', 'click'],
        })
        .expect(201);

      expect(res.body.machineIds).toEqual([]);
      expect(res.body.timeTolerance).toBe(300); // default
      expect(res.body.amountTolerance).toBe(0.01); // default
    });

    it('should reject run with missing dateFrom', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reconciliation/runs')
        .set('Authorization', 'Bearer mock-token')
        .send({ dateTo: '2025-01-31', sources: ['hw'] })
        .expect(400);
    });

    it('should reject run with missing dateTo', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reconciliation/runs')
        .set('Authorization', 'Bearer mock-token')
        .send({ dateFrom: '2025-01-01', sources: ['hw'] })
        .expect(400);
    });

    it('should reject run with empty sources array', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reconciliation/runs')
        .set('Authorization', 'Bearer mock-token')
        .send({ dateFrom: '2025-01-01', dateTo: '2025-01-31', sources: [] })
        .expect(400);
    });

    it('should reject run where dateTo is before dateFrom', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reconciliation/runs')
        .set('Authorization', 'Bearer mock-token')
        .send({
          dateFrom: '2025-03-01',
          dateTo: '2025-01-01',
          sources: ['hw', 'payme'],
        })
        .expect(400);
    });
  });

  // =========================================================================
  // GET /api/v1/reconciliation/runs — List with filters
  // =========================================================================

  describe('GET /api/v1/reconciliation/runs', () => {
    it('should return paginated list of reconciliation runs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reconciliation/runs')
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
        .get('/api/v1/reconciliation/runs?page=1&limit=10')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('should filter runs by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reconciliation/runs?status=completed')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      for (const run of res.body.data) {
        expect(run.status).toBe('completed');
      }
    });

    it('should filter runs by date range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/reconciliation/runs?dateFrom=2025-02-01&dateTo=2025-02-28')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      for (const run of res.body.data) {
        expect(run.dateFrom >= '2025-02-01').toBe(true);
        expect(run.dateTo <= '2025-02-28').toBe(true);
      }
    });
  });

  // =========================================================================
  // GET /api/v1/reconciliation/runs/:id — Get run details
  // =========================================================================

  describe('GET /api/v1/reconciliation/runs/:id', () => {
    it('should return a pending run by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_PENDING}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.id).toBe(RUN_ID_PENDING);
      expect(res.body.status).toBe('pending');
      expect(res.body.summary).toBeNull();
      expect(res.body.startedAt).toBeNull();
    });

    it('should return a completed run with summary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_COMPLETED}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.id).toBe(RUN_ID_COMPLETED);
      expect(res.body.status).toBe('completed');
      expect(res.body.summary).not.toBeNull();
      expect(res.body.summary.totalRecords).toBe(150);
      expect(res.body.summary.matched).toBe(142);
      expect(res.body.summary.mismatched).toBe(5);
      expect(res.body.summary.missing).toBe(3);
      expect(res.body.summary.matchRate).toBe(94.67);
      expect(res.body.startedAt).not.toBeNull();
      expect(res.body.completedAt).not.toBeNull();
      expect(res.body.processingTimeMs).toBe(4500);
    });

    it('should return a failed run with error message', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_FAILED}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.id).toBe(RUN_ID_FAILED);
      expect(res.body.status).toBe('failed');
      expect(res.body.errorMessage).toContain('Timeout');
    });

    it('should return 404 for non-existent run', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reconciliation/runs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });

  // =========================================================================
  // GET /api/v1/reconciliation/runs/:id/mismatches — Get mismatches
  // =========================================================================

  describe('GET /api/v1/reconciliation/runs/:id/mismatches', () => {
    it('should return paginated mismatches for a completed run', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_COMPLETED}/mismatches`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should include mismatch details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_COMPLETED}/mismatches`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      const mismatch = res.body.data[0];
      expect(mismatch).toHaveProperty('id');
      expect(mismatch).toHaveProperty('runId');
      expect(mismatch).toHaveProperty('orderNumber');
      expect(mismatch).toHaveProperty('machineCode');
      expect(mismatch).toHaveProperty('amount');
      expect(mismatch).toHaveProperty('mismatchType');
      expect(mismatch).toHaveProperty('discrepancyAmount');
      expect(mismatch).toHaveProperty('sourcesData');
      expect(mismatch).toHaveProperty('isResolved');
    });

    it('should filter mismatches by type', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_COMPLETED}/mismatches?mismatchType=amount_mismatch`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      for (const mismatch of res.body.data) {
        expect(mismatch.mismatchType).toBe('amount_mismatch');
      }
    });

    it('should filter mismatches by resolution status', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_COMPLETED}/mismatches?isResolved=false`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      for (const mismatch of res.body.data) {
        expect(mismatch.isResolved).toBe(false);
      }
    });

    it('should return 404 for mismatches of non-existent run', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/reconciliation/runs/00000000-0000-0000-0000-000000000000/mismatches')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });

  // =========================================================================
  // DELETE /api/v1/reconciliation/runs/:id — Soft delete run
  // =========================================================================

  describe('DELETE /api/v1/reconciliation/runs/:id', () => {
    it('should soft delete a completed run', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/reconciliation/runs/${RUN_ID_COMPLETED}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(204);
    });

    it('should soft delete a failed run', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/reconciliation/runs/${RUN_ID_FAILED}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(204);
    });

    it('should return 404 for non-existent run', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/reconciliation/runs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });

  // =========================================================================
  // PATCH /api/v1/reconciliation/mismatches/:id/resolve — Resolve mismatch
  // =========================================================================

  describe('PATCH /api/v1/reconciliation/mismatches/:id/resolve', () => {
    it('should resolve an unresolved mismatch', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/reconciliation/mismatches/${MISMATCH_ID_UNRESOLVED}/resolve`)
        .set('Authorization', 'Bearer mock-token')
        .send({
          resolutionNotes: 'Verified: hardware counter was off by one due to jam event',
        })
        .expect(200);

      expect(res.body.isResolved).toBe(true);
      expect(res.body.resolutionNotes).toContain('hardware counter');
      expect(res.body.resolvedAt).not.toBeNull();
      expect(res.body.resolvedByUserId).not.toBeNull();
    });

    it('should reject resolving an already-resolved mismatch (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/reconciliation/mismatches/${MISMATCH_ID_RESOLVED}/resolve`)
        .set('Authorization', 'Bearer mock-token')
        .send({ resolutionNotes: 'Trying to re-resolve' })
        .expect(400);
    });

    it('should reject resolve without resolutionNotes', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/reconciliation/mismatches/${MISMATCH_ID_AMOUNT}/resolve`)
        .set('Authorization', 'Bearer mock-token')
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent mismatch', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/reconciliation/mismatches/00000000-0000-0000-0000-000000000000/resolve')
        .set('Authorization', 'Bearer mock-token')
        .send({ resolutionNotes: 'Does not exist' })
        .expect(404);
    });
  });

  // =========================================================================
  // POST /api/v1/reconciliation/import — Import HW sales
  // =========================================================================

  describe('POST /api/v1/reconciliation/import', () => {
    const validImportPayload = {
      sales: [
        {
          saleDate: '2025-02-15T14:30:00Z',
          machineCode: 'VH-001',
          amount: 50000,
          paymentMethod: 'payme',
          orderNumber: 'ORD-2025-00142',
          productName: 'Coffee Latte',
          quantity: 1,
        },
        {
          saleDate: '2025-02-15T15:00:00Z',
          machineCode: 'VH-001',
          amount: 30000,
          paymentMethod: 'click',
          orderNumber: 'ORD-2025-00143',
          productName: 'Hot Chocolate',
          quantity: 1,
        },
        {
          saleDate: '2025-02-15T16:45:00Z',
          machineCode: 'VH-002',
          amount: 100000,
          paymentMethod: 'cash',
          productName: 'Energy Bar',
          productCode: 'SNACK-005',
          quantity: 2,
        },
      ],
      importSource: 'excel',
      importFilename: 'february_sales_VH001_VH002.xlsx',
    };

    it('should import HW sales data successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reconciliation/import')
        .set('Authorization', 'Bearer mock-token')
        .send(validImportPayload)
        .expect(201);

      expect(res.body).toHaveProperty('importBatchId');
      expect(res.body.importedCount).toBe(3);
      expect(res.body.skippedCount).toBe(0);
      expect(res.body.errors).toEqual([]);
      expect(res.body.importSource).toBe('excel');
      expect(res.body.importFilename).toBe('february_sales_VH001_VH002.xlsx');
    });

    it('should import CSV data with minimal sale fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reconciliation/import')
        .set('Authorization', 'Bearer mock-token')
        .send({
          sales: [
            {
              saleDate: '2025-03-01T10:00:00Z',
              machineCode: 'VH-003',
              amount: 15000,
            },
          ],
          importSource: 'csv',
        })
        .expect(201);

      expect(res.body.importedCount).toBe(1);
      expect(res.body.importSource).toBe('csv');
      expect(res.body.importFilename).toBeNull();
    });

    it('should reject import with empty sales array', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reconciliation/import')
        .set('Authorization', 'Bearer mock-token')
        .send({ sales: [], importSource: 'excel' })
        .expect(400);
    });

    it('should reject import without importSource', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reconciliation/import')
        .set('Authorization', 'Bearer mock-token')
        .send({
          sales: [{ saleDate: '2025-01-01T10:00:00Z', machineCode: 'VH-001', amount: 10000 }],
        })
        .expect(400);
    });

    it('should reject import with invalid importSource', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/reconciliation/import')
        .set('Authorization', 'Bearer mock-token')
        .send({
          sales: [{ saleDate: '2025-01-01T10:00:00Z', machineCode: 'VH-001', amount: 10000 }],
          importSource: 'ftp',
        })
        .expect(400);
    });
  });

  // =========================================================================
  // Full reconciliation lifecycle (integration scenario)
  // =========================================================================

  describe('Reconciliation lifecycle', () => {
    it('should verify a completed run has summary with match statistics', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_COMPLETED}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.totalRecords).toBeGreaterThan(0);
      expect(res.body.summary.matchRate).toBeLessThanOrEqual(100);
      expect(res.body.summary.matched + res.body.summary.mismatched + res.body.summary.missing)
        .toBe(res.body.summary.totalRecords);
    });

    it('should verify mismatches include discrepancy amounts in UZS', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_COMPLETED}/mismatches`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      const amountMismatch = res.body.data.find(
        (m: any) => m.mismatchType === 'amount_mismatch',
      );
      if (amountMismatch) {
        expect(amountMismatch.discrepancyAmount).toBeDefined();
        expect(typeof amountMismatch.discrepancyAmount).toBe('number');
        expect(amountMismatch.sourcesData.hw).toBeDefined();
        expect(amountMismatch.sourcesData.payment).toBeDefined();
      }
    });

    it('should verify resolved mismatches have resolver information', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/reconciliation/runs/${RUN_ID_COMPLETED}/mismatches?isResolved=true`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      for (const mismatch of res.body.data) {
        expect(mismatch.isResolved).toBe(true);
        expect(mismatch.resolutionNotes).not.toBeNull();
        expect(mismatch.resolvedAt).not.toBeNull();
        expect(mismatch.resolvedByUserId).not.toBeNull();
      }
    });
  });
});
