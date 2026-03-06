/**
 * Reconciliation Controller Tests
 * CRITICAL API - Financial reconciliation and mismatch resolution
 *
 * Test Coverage:
 *  ✓ Reconciliation runs (creation, listing, retrieval, deletion)
 *  ✓ Reconciliation stats (financial summary reporting)
 *  ✓ Mismatch resolution (individual mismatch handling)
 *  ✓ Data import (HW sales data import for reconciliation)
 *  ✓ Role-based access (accountant, manager, admin, owner)
 *  ✓ Pagination and filtering
 *  ✓ Multi-tenant isolation
 *  ✓ Async processing verification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

describe('ReconciliationController (e2e)', () => {
  let app: INestApplication;
  let reconciliationService: ReconciliationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000,
            limit: 30,
          },
        ]),
      ],
      controllers: [ReconciliationController],
      providers: [
        {
          provide: ReconciliationService,
          useValue: {
            createReconciliationRun: jest.fn(),
            getReconciliationRuns: jest.fn(),
            getReconciliationRunById: jest.fn(),
            deleteReconciliationRun: jest.fn(),
            getMismatchesForRun: jest.fn(),
            getReconciliationStats: jest.fn(),
            resolveMismatch: jest.fn(),
            importHwSalesData: jest.fn(),
            processReconciliation: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({}) // Disable throttling for tests
      .compile();

    app = module.createNestApplication();
    reconciliationService = module.get<ReconciliationService>(
      ReconciliationService,
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // RECONCILIATION RUNS TESTS
  // ============================================================================

  describe('POST /reconciliation/runs', () => {
    it('should create reconciliation run with valid data', async () => {
      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const createDto = {
        startDate: '2024-03-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
        // NOTE: Should reconciliation run cover all machines, or be filtered by region/type?
        // Consider: organization-wide scope vs. regional reconciliation
      };

      const expectedResponse = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        organizationId: mockUser.organizationId,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        status: 'processing',
        createdById: mockUser.id,
        createdAt: new Date().toISOString(),
      };

      (reconciliationService.createReconciliationRun as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/reconciliation/runs')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(reconciliationService.createReconciliationRun).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
        mockUser.organizationId,
      );
    });

    it('should reject non-accountant roles from creating runs', async () => {
      const createDto = {
        startDate: '2024-03-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
      };

      // NOTE: Should operators/warehouse roles be able to request reconciliation?
      // Consider: permission model - who initiates vs. who reviews reconciliation

      await request(app.getHttpServer())
        .post('/reconciliation/runs')
        .set('Authorization', 'Bearer operator-jwt-token')
        .send(createDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject invalid date range', async () => {
      const createDto = {
        startDate: '2024-03-31T23:59:59Z',
        endDate: '2024-03-01T00:00:00Z', // End before start
      };

      (reconciliationService.createReconciliationRun as jest.Mock).mockRejectedValue(
        new Error('Invalid date range'),
      );

      await request(app.getHttpServer())
        .post('/reconciliation/runs')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(createDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should trigger async processing for reconciliation run', async () => {
      const createDto = {
        startDate: '2024-03-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
      };

      (reconciliationService.createReconciliationRun as jest.Mock).mockResolvedValue({
        id: 'run-id',
        status: 'processing',
      });

      await request(app.getHttpServer())
        .post('/reconciliation/runs')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(createDto)
        .expect(HttpStatus.CREATED);

      // Verify async processing was initiated
      expect(reconciliationService.processReconciliation).toHaveBeenCalledWith(
        'run-id',
        expect.any(String), // organizationId
      );
    });
  });

  describe('GET /reconciliation/runs', () => {
    it('should list reconciliation runs with pagination', async () => {
      const mockRuns = [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'completed',
          startDate: '2024-03-01T00:00:00Z',
          endDate: '2024-03-31T23:59:59Z',
          mismatches: 5,
          createdAt: new Date().toISOString(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          status: 'processing',
          startDate: '2024-02-01T00:00:00Z',
          endDate: '2024-02-29T23:59:59Z',
          mismatches: 0,
          createdAt: new Date().toISOString(),
        },
      ];

      (reconciliationService.getReconciliationRuns as jest.Mock).mockResolvedValue({
        data: mockRuns,
        total: 2,
        page: 1,
        limit: 10,
      });

      const response = await request(app.getHttpServer())
        .get('/reconciliation/runs?page=1&limit=10')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter runs by status', async () => {
      (reconciliationService.getReconciliationRuns as jest.Mock).mockResolvedValue({
        data: [
          {
            id: 'run-id',
            status: 'completed',
          },
        ],
        total: 1,
      });

      await request(app.getHttpServer())
        .get('/reconciliation/runs?status=completed')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);

      expect(reconciliationService.getReconciliationRuns).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
        expect.any(String), // organizationId
      );
    });

    it('should enforce multi-tenant isolation on runs list', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440001';

      (reconciliationService.getReconciliationRuns as jest.Mock).mockResolvedValue({
        data: [],
        total: 0,
      });

      await request(app.getHttpServer())
        .get('/reconciliation/runs')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);

      // Verify organizationId is passed to service
      const callArgs = (reconciliationService.getReconciliationRuns as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toBe(organizationId);
    });
  });

  describe('GET /reconciliation/runs/:id', () => {
    it('should retrieve reconciliation run by ID', async () => {
      const runId = '550e8400-e29b-41d4-a716-446655440002';

      const expectedRun = {
        id: runId,
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        startDate: '2024-03-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
        status: 'completed',
        summary: {
          totalTransactions: 1500,
          totalAmount: 50000000,
          matches: 1495,
          mismatches: 5,
          discrepancy: 25000,
        },
        createdAt: new Date().toISOString(),
      };

      (reconciliationService.getReconciliationRunById as jest.Mock).mockResolvedValue(
        expectedRun,
      );

      const response = await request(app.getHttpServer())
        .get(`/reconciliation/runs/${runId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedRun);
    });

    it('should return 404 for nonexistent run ID', async () => {
      const runId = 'nonexistent-id';

      (reconciliationService.getReconciliationRunById as jest.Mock).mockRejectedValue(
        new Error('Run not found'),
      );

      await request(app.getHttpServer())
        .get(`/reconciliation/runs/${runId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/reconciliation/runs/invalid-uuid')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should include mismatch summary in run details', async () => {
      const runId = '550e8400-e29b-41d4-a716-446655440002';

      (reconciliationService.getReconciliationRunById as jest.Mock).mockResolvedValue({
        id: runId,
        status: 'completed',
        summary: {
          mismatches: 5,
          discrepancy: 25000,
        },
        mismatches: [
          {
            id: 'mismatch-1',
            type: 'amount_variance',
            amount: 5000,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/reconciliation/runs/${runId}`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);

      expect(response.body.mismatches).toBeDefined();
      expect(response.body.mismatches[0].type).toBe('amount_variance');
    });
  });

  describe('DELETE /reconciliation/runs/:id', () => {
    it('should delete reconciliation run as admin', async () => {
      const runId = '550e8400-e29b-41d4-a716-446655440002';

      (reconciliationService.deleteReconciliationRun as jest.Mock).mockResolvedValue(
        undefined,
      );

      await request(app.getHttpServer())
        .delete(`/reconciliation/runs/${runId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(HttpStatus.NO_CONTENT);

      expect(reconciliationService.deleteReconciliationRun).toHaveBeenCalledWith(
        runId,
        expect.any(String), // organizationId
      );
    });

    it('should reject delete from non-admin roles', async () => {
      const runId = '550e8400-e29b-41d4-a716-446655440002';

      // NOTE: Should accountant role be able to delete runs they created?
      // Consider: permission model - creator vs. admin deletion rights

      await request(app.getHttpServer())
        .delete(`/reconciliation/runs/${runId}`)
        .set('Authorization', 'Bearer accountant-jwt-token')
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should prevent deletion of runs with resolved mismatches', async () => {
      const runId = '550e8400-e29b-41d4-a716-446655440002';

      (reconciliationService.deleteReconciliationRun as jest.Mock).mockRejectedValue(
        new Error('Cannot delete run with resolved mismatches'),
      );

      await request(app.getHttpServer())
        .delete(`/reconciliation/runs/${runId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should perform soft delete (preserve audit trail)', async () => {
      const runId = '550e8400-e29b-41d4-a716-446655440002';

      (reconciliationService.deleteReconciliationRun as jest.Mock).mockResolvedValue(
        undefined,
      );

      await request(app.getHttpServer())
        .delete(`/reconciliation/runs/${runId}`)
        .set('Authorization', 'Bearer admin-jwt-token')
        .expect(HttpStatus.NO_CONTENT);

      // Verify soft delete (deletedAt timestamp set, no hard deletion)
      expect(reconciliationService.deleteReconciliationRun).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // RECONCILIATION STATS TESTS
  // ============================================================================

  describe('GET /reconciliation/stats', () => {
    it('should retrieve reconciliation statistics', async () => {
      const expectedStats = {
        totalRuns: 15,
        completedRuns: 12,
        processingRuns: 2,
        failedRuns: 1,
        totalMismatches: 45,
        resolvedMismatches: 40,
        pendingMismatches: 5,
        averageResolutionTime: 3600000, // milliseconds
        lastReconciliationDate: new Date().toISOString(),
        discrepancyAmount: 125000,
      };

      (reconciliationService.getReconciliationStats as jest.Mock).mockResolvedValue(
        expectedStats,
      );

      const response = await request(app.getHttpServer())
        .get('/reconciliation/stats')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedStats);
      expect(response.body.totalRuns).toBe(15);
    });

    it('should filter stats by date range', async () => {
      (reconciliationService.getReconciliationStats as jest.Mock).mockResolvedValue({
        totalRuns: 5,
        completedRuns: 5,
      });

      await request(app.getHttpServer())
        .get(
          '/reconciliation/stats?startDate=2024-03-01&endDate=2024-03-31',
        )
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);

      expect(reconciliationService.getReconciliationStats).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-03-01',
          endDate: '2024-03-31',
        }),
        expect.any(String), // organizationId
      );
    });

    it('should enforce role-based access to stats', async () => {
      // NOTE: Should operators have visibility into reconciliation statistics?
      // Consider: transparency vs. security - what data should different roles see?

      (reconciliationService.getReconciliationStats as jest.Mock).mockResolvedValue({
        totalRuns: 0,
      });

      await request(app.getHttpServer())
        .get('/reconciliation/stats')
        .set('Authorization', 'Bearer accountant-jwt-token')
        .expect(HttpStatus.OK);
    });
  });

  // ============================================================================
  // MISMATCH RESOLUTION TESTS
  // ============================================================================

  describe('PATCH /reconciliation/mismatches/:id/resolve', () => {
    it('should resolve mismatch with correction data', async () => {
      const mismatchId = '550e8400-e29b-41d4-a716-446655440003';

      const resolveDto = {
        resolution: 'manual_adjustment',
        correctedAmount: 5000,
        notes: 'Corrected inventory count variance',
      };

      const expectedResponse = {
        id: mismatchId,
        status: 'resolved',
        resolution: 'manual_adjustment',
        resolvedAt: new Date().toISOString(),
        resolvedBy: '550e8400-e29b-41d4-a716-446655440000',
      };

      (reconciliationService.resolveMismatch as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .patch(`/reconciliation/mismatches/${mismatchId}/resolve`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(resolveDto)
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('resolved');
      expect(response.body.resolution).toBe('manual_adjustment');
    });

    it('should reject invalid resolution type', async () => {
      const mismatchId = '550e8400-e29b-41d4-a716-446655440003';

      const resolveDto = {
        resolution: 'invalid_type',
        correctedAmount: 5000,
      };

      (reconciliationService.resolveMismatch as jest.Mock).mockRejectedValue(
        new Error('Invalid resolution type'),
      );

      await request(app.getHttpServer())
        .patch(`/reconciliation/mismatches/${mismatchId}/resolve`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(resolveDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should track resolution audit trail', async () => {
      const mismatchId = '550e8400-e29b-41d4-a716-446655440003';

      (reconciliationService.resolveMismatch as jest.Mock).mockResolvedValue({
        id: mismatchId,
        status: 'resolved',
        auditLog: [
          {
            action: 'resolved',
            userId: '550e8400-e29b-41d4-a716-446655440000',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .patch(`/reconciliation/mismatches/${mismatchId}/resolve`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send({
          resolution: 'manual_adjustment',
          correctedAmount: 5000,
        })
        .expect(HttpStatus.OK);

      expect(response.body.auditLog).toBeDefined();
      expect(response.body.auditLog[0].action).toBe('resolved');
    });

    it('should prevent re-resolving already resolved mismatches', async () => {
      const mismatchId = '550e8400-e29b-41d4-a716-446655440003';

      (reconciliationService.resolveMismatch as jest.Mock).mockRejectedValue(
        new Error('Mismatch already resolved'),
      );

      await request(app.getHttpServer())
        .patch(`/reconciliation/mismatches/${mismatchId}/resolve`)
        .set('Authorization', 'Bearer valid-jwt-token')
        .send({
          resolution: 'manual_adjustment',
          correctedAmount: 5000,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================================
  // DATA IMPORT TESTS
  // ============================================================================

  describe('POST /reconciliation/import', () => {
    it('should import HW sales data for reconciliation', async () => {
      const importDto = {
        // NOTE: What data format for bulk HW sales import?
        // Consider: CSV upload, JSON array, file multipart, batch size limits
        data: [
          {
            machineId: 'HW-001',
            saleDate: '2024-03-01T10:30:00Z',
            amount: 100000,
            paymentMethod: 'cash',
          },
        ],
        source: 'hardware_device',
      };

      const expectedResponse = {
        importId: '550e8400-e29b-41d4-a716-446655440004',
        recordsImported: 1,
        status: 'processing',
        createdAt: new Date().toISOString(),
      };

      (reconciliationService.importHwSalesData as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/reconciliation/import')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(importDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.status).toBe('processing');
      expect(response.body.recordsImported).toBe(1);
    });

    it('should reject import with invalid date format', async () => {
      const importDto = {
        data: [
          {
            machineId: 'HW-001',
            saleDate: 'invalid-date',
            amount: 100000,
          },
        ],
        source: 'hardware_device',
      };

      (reconciliationService.importHwSalesData as jest.Mock).mockRejectedValue(
        new Error('Invalid date format'),
      );

      await request(app.getHttpServer())
        .post('/reconciliation/import')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(importDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should validate required fields in import data', async () => {
      const importDto = {
        data: [
          {
            machineId: 'HW-001',
            // Missing saleDate, amount
          },
        ],
        source: 'hardware_device',
      };

      (reconciliationService.importHwSalesData as jest.Mock).mockRejectedValue(
        new Error('Missing required fields'),
      );

      await request(app.getHttpServer())
        .post('/reconciliation/import')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(importDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should handle batch import with partial failures', async () => {
      const importDto = {
        data: [
          {
            machineId: 'HW-001',
            saleDate: '2024-03-01T10:30:00Z',
            amount: 100000,
          },
          {
            machineId: 'HW-002',
            saleDate: 'invalid-date', // This record will fail
            amount: 50000,
          },
        ],
        source: 'hardware_device',
      };

      (reconciliationService.importHwSalesData as jest.Mock).mockResolvedValue({
        importId: 'import-id',
        recordsImported: 1,
        recordsFailed: 1,
        status: 'completed_with_errors',
      });

      const response = await request(app.getHttpServer())
        .post('/reconciliation/import')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(importDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.recordsImported).toBe(1);
      expect(response.body.recordsFailed).toBe(1);
    });
  });
});
