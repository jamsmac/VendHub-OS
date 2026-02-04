/**
 * E2E Tests: Directories Module
 *
 * Tests for directories REST endpoints including:
 * - Sources CRUD
 * - Sync logs
 * - Audit logs
 * - Hierarchy operations
 * - Inline entry creation
 *
 * Uses a mock controller pattern to avoid database dependencies.
 *
 * Endpoint prefix: /api/v1/directories
 * Controller: DirectoriesController (src/modules/directories/directories.controller.ts)
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
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, mockUuid, mockUuid2 } from './setup';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = mockUuid2();
const DIRECTORY_ID = 'dir-1111-2222-3333-444444444444';
const SOURCE_ID = 'src-aaaa-bbbb-cccc-dddddddddddd';
const ENTRY_ID = 'ent-5555-6666-7777-888888888888';

function sourceSample(overrides: Record<string, any> = {}) {
  return {
    id: SOURCE_ID,
    directoryId: DIRECTORY_ID,
    name: 'OKUD API',
    description: 'Official classification codes from OKUD',
    type: 'api',
    url: 'https://api.okud.uz/v1/units',
    isActive: true,
    syncInterval: 3600,
    columnMapping: {
      name: 'name',
      code: 'code',
    },
    lastSyncAt: new Date().toISOString(),
    lastSyncStatus: 'success',
    consecutiveFailures: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function syncLogSample(overrides: Record<string, any> = {}) {
  return {
    id: 'log-1111-2222-3333-444444444444',
    directoryId: DIRECTORY_ID,
    sourceId: SOURCE_ID,
    status: 'success',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    totalRecords: 150,
    createdCount: 5,
    updatedCount: 145,
    errorCount: 0,
    errors: null,
    triggeredBy: mockUuid(),
    ...overrides,
  };
}

function auditLogSample(overrides: Record<string, any> = {}) {
  return {
    id: 'audit-1111-2222-3333-444444444444',
    entryId: ENTRY_ID,
    action: 'update',
    changedBy: mockUuid(),
    changedAt: new Date().toISOString(),
    oldValues: { name: 'Old Name', status: 'active' },
    newValues: { name: 'New Name', status: 'active' },
    changeReason: null,
    ...overrides,
  };
}

function hierarchyNodeSample(overrides: Record<string, any> = {}) {
  return {
    id: ENTRY_ID,
    name: 'Root Category',
    code: 'ROOT-001',
    parentId: null,
    sortOrder: 0,
    data: {},
    children: [],
    ...overrides,
  };
}

function entrySample(overrides: Record<string, any> = {}) {
  return {
    id: ENTRY_ID,
    directoryId: DIRECTORY_ID,
    name: 'Kilogram',
    normalizedName: 'kilogram',
    code: 'KG',
    parentId: null,
    sortOrder: 0,
    data: {},
    status: 'active',
    origin: 'local',
    organizationId: ORG_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

const sources = [
  sourceSample(),
  sourceSample({
    id: 'src-bbbb-cccc-dddd-eeeeeeeeeeee',
    name: 'OKVED API',
    url: 'https://api.okved.uz/v1/activities',
    isActive: false,
  }),
];

const syncLogs = [
  syncLogSample(),
  syncLogSample({
    id: 'log-2222-3333-4444-555555555555',
    status: 'partial',
    createdCount: 3,
    updatedCount: 140,
    errorCount: 7,
    errors: [{ record: { id: 1 }, error: 'Validation failed' }],
  }),
  syncLogSample({
    id: 'log-3333-4444-5555-666666666666',
    status: 'failed',
    createdCount: 0,
    updatedCount: 0,
    errorCount: 150,
    errors: [{ error: 'Connection timeout' }],
  }),
];

const auditLogs = [
  auditLogSample(),
  auditLogSample({
    id: 'audit-2222-3333-4444-555555555555',
    action: 'create',
    oldValues: null,
    newValues: { name: 'New Entry', status: 'active' },
  }),
  auditLogSample({
    id: 'audit-3333-4444-5555-666666666666',
    action: 'sync',
    oldValues: { name: 'Old', version: 1 },
    newValues: { name: 'Synced', version: 2 },
  }),
];

const hierarchyTree = [
  hierarchyNodeSample({
    id: 'root-1',
    name: 'Beverages',
    code: 'BEV',
    children: [
      {
        id: 'child-1',
        name: 'Hot Drinks',
        code: 'BEV-HOT',
        parentId: 'root-1',
        sortOrder: 0,
        data: {},
        children: [],
      },
      {
        id: 'child-2',
        name: 'Cold Drinks',
        code: 'BEV-COLD',
        parentId: 'root-1',
        sortOrder: 1,
        data: {},
        children: [],
      },
    ],
  }),
  hierarchyNodeSample({
    id: 'root-2',
    name: 'Snacks',
    code: 'SNK',
    children: [],
  }),
];

// ---------------------------------------------------------------------------
// Mock controller
// ---------------------------------------------------------------------------

@Controller({ path: 'directories', version: '1' })
class MockDirectoriesController {
  // =========================================================================
  // SOURCES
  // =========================================================================

  @Get(':id/sources')
  findAllSources(
    @Param('id') directoryId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('isActive') isActive?: string,
  ) {
    let filtered = [...sources];

    if (isActive !== undefined) {
      const activeFlag = isActive === 'true';
      filtered = filtered.filter((s) => s.isActive === activeFlag);
    }

    return {
      data: filtered,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filtered.length / Number(limit)),
    };
  }

  @Post(':id/sources')
  createSource(@Param('id') directoryId: string, @Body() body: any) {
    if (!body.name) {
      throw new BadRequestException('name should not be empty');
    }
    if (!body.type) {
      throw new BadRequestException('type should not be empty');
    }

    return sourceSample({
      id: 'new-source-id',
      directoryId,
      name: body.name,
      type: body.type,
      url: body.url,
      isActive: body.isActive ?? true,
    });
  }

  @Get(':id/sources/:sourceId')
  findOneSource(
    @Param('id') directoryId: string,
    @Param('sourceId') sourceId: string,
  ) {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }

  @Patch(':id/sources/:sourceId')
  updateSource(
    @Param('id') directoryId: string,
    @Param('sourceId') sourceId: string,
    @Body() body: any,
  ) {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) throw new NotFoundException('Source not found');
    return {
      ...source,
      ...body,
      updated_at: new Date().toISOString(),
    };
  }

  @Delete(':id/sources/:sourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSource(
    @Param('id') directoryId: string,
    @Param('sourceId') sourceId: string,
  ) {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) throw new NotFoundException('Source not found');
    // No content response
  }

  @Post(':id/sources/:sourceId/sync')
  @HttpCode(HttpStatus.OK)
  triggerSync(
    @Param('id') directoryId: string,
    @Param('sourceId') sourceId: string,
  ) {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) throw new NotFoundException('Source not found');
    if (!source.isActive) {
      throw new BadRequestException('Cannot sync from an inactive source');
    }

    return syncLogSample({
      id: 'new-sync-log-id',
      directoryId,
      sourceId,
      status: 'success',
      totalRecords: 100,
      createdCount: 10,
      updatedCount: 90,
      errorCount: 0,
    });
  }

  // =========================================================================
  // SYNC LOGS
  // =========================================================================

  @Get(':id/sync-logs')
  findSyncLogs(
    @Param('id') directoryId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('sourceId') sourceId?: string,
  ) {
    let filtered = [...syncLogs];

    if (sourceId) {
      filtered = filtered.filter((log) => log.sourceId === sourceId);
    }

    return {
      data: filtered,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filtered.length / Number(limit)),
    };
  }

  // =========================================================================
  // AUDIT
  // =========================================================================

  @Get(':id/audit')
  findAuditLogs(
    @Param('id') directoryId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('entryId') entryId?: string,
    @Query('action') action?: string,
  ) {
    let filtered = [...auditLogs];

    if (entryId) {
      filtered = filtered.filter((log) => log.entryId === entryId);
    }

    if (action) {
      filtered = filtered.filter((log) => log.action === action);
    }

    return {
      data: filtered,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filtered.length / Number(limit)),
    };
  }

  @Get(':id/entries/:entryId/audit')
  findEntryAuditLogs(
    @Param('id') directoryId: string,
    @Param('entryId') entryId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('action') action?: string,
  ) {
    let filtered = auditLogs.filter((log) => log.entryId === entryId);

    if (action) {
      filtered = filtered.filter((log) => log.action === action);
    }

    return {
      data: filtered,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filtered.length / Number(limit)),
    };
  }

  // =========================================================================
  // HIERARCHY
  // =========================================================================

  @Get(':id/tree')
  getTree(@Param('id') directoryId: string) {
    // Simulate non-hierarchical directory check
    if (directoryId === 'non-hierarchical-dir') {
      throw new BadRequestException('Directory is not hierarchical');
    }
    return hierarchyTree;
  }

  @Post(':id/entries/:entryId/move')
  @HttpCode(HttpStatus.OK)
  moveEntry(
    @Param('id') directoryId: string,
    @Param('entryId') entryId: string,
    @Body() body: any,
  ) {
    // Simulate validation errors
    if (body.newParentId === entryId) {
      throw new BadRequestException('Entry cannot be its own parent');
    }

    if (body.newParentId === 'cycle-parent') {
      throw new BadRequestException(
        'Moving this entry would create a cycle in the hierarchy',
      );
    }

    return entrySample({
      id: entryId,
      parentId: body.newParentId ?? null,
      version: 2,
      updated_at: new Date().toISOString(),
    });
  }

  // =========================================================================
  // INLINE CREATE
  // =========================================================================

  @Post(':id/entries/inline')
  inlineCreateEntry(@Param('id') directoryId: string, @Body() body: any) {
    if (!body.name) {
      throw new BadRequestException('name should not be empty');
    }

    // Simulate directory settings check
    if (directoryId === 'no-inline-dir') {
      throw new BadRequestException(
        'Inline create is not allowed for this directory',
      );
    }

    return entrySample({
      id: 'new-entry-id',
      directoryId,
      name: body.name,
      code: body.code ?? null,
      parentId: body.parentId ?? null,
      data: body.data ?? {},
      origin: 'local',
      status: body.status ?? 'active',
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Directories Module Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [MockDirectoriesController],
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // ===========================================================================
  // SOURCES CRUD
  // ===========================================================================

  describe('Sources CRUD', () => {
    describe('GET /api/v1/directories/:id/sources', () => {
      it('should return paginated sources', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/sources`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.total).toBe(2);
      });

      it('should filter sources by isActive=true', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/sources?isActive=true`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].isActive).toBe(true);
      });

      it('should filter sources by isActive=false', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/sources?isActive=false`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].isActive).toBe(false);
      });

      it('should accept pagination parameters', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/sources?page=1&limit=10`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(10);
      });
    });

    describe('POST /api/v1/directories/:id/sources', () => {
      const validPayload = {
        name: 'New API Source',
        type: 'api',
        url: 'https://api.example.com/data',
        isActive: true,
        syncInterval: 7200,
      };

      it('should create a source with valid data', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/directories/${DIRECTORY_ID}/sources`)
          .set('Authorization', 'Bearer mock-token')
          .send(validPayload)
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe(validPayload.name);
        expect(res.body.type).toBe(validPayload.type);
        expect(res.body.url).toBe(validPayload.url);
        expect(res.body.directoryId).toBe(DIRECTORY_ID);
      });

      it('should reject creation with missing name', async () => {
        await request(app.getHttpServer())
          .post(`/api/v1/directories/${DIRECTORY_ID}/sources`)
          .set('Authorization', 'Bearer mock-token')
          .send({ type: 'api', url: 'https://api.example.com' })
          .expect(400);
      });

      it('should reject creation with missing type', async () => {
        await request(app.getHttpServer())
          .post(`/api/v1/directories/${DIRECTORY_ID}/sources`)
          .set('Authorization', 'Bearer mock-token')
          .send({ name: 'Test Source', url: 'https://api.example.com' })
          .expect(400);
      });
    });

    describe('GET /api/v1/directories/:id/sources/:sourceId', () => {
      it('should return a source by ID', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/sources/${SOURCE_ID}`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body).toHaveProperty('id', SOURCE_ID);
        expect(res.body).toHaveProperty('name');
        expect(res.body).toHaveProperty('type');
        expect(res.body).toHaveProperty('url');
      });

      it('should return 404 for non-existent source', async () => {
        await request(app.getHttpServer())
          .get(
            `/api/v1/directories/${DIRECTORY_ID}/sources/00000000-0000-0000-0000-000000000000`,
          )
          .set('Authorization', 'Bearer mock-token')
          .expect(404);
      });
    });

    describe('PATCH /api/v1/directories/:id/sources/:sourceId', () => {
      it('should update a source', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/api/v1/directories/${DIRECTORY_ID}/sources/${SOURCE_ID}`)
          .set('Authorization', 'Bearer mock-token')
          .send({ name: 'Updated Source Name', isActive: false })
          .expect(200);

        expect(res.body.name).toBe('Updated Source Name');
        expect(res.body.isActive).toBe(false);
        expect(res.body).toHaveProperty('updated_at');
      });

      it('should return 404 when updating non-existent source', async () => {
        await request(app.getHttpServer())
          .patch(
            `/api/v1/directories/${DIRECTORY_ID}/sources/00000000-0000-0000-0000-000000000000`,
          )
          .set('Authorization', 'Bearer mock-token')
          .send({ name: 'No Source' })
          .expect(404);
      });
    });

    describe('DELETE /api/v1/directories/:id/sources/:sourceId', () => {
      it('should delete a source and return 204', async () => {
        await request(app.getHttpServer())
          .delete(`/api/v1/directories/${DIRECTORY_ID}/sources/${SOURCE_ID}`)
          .set('Authorization', 'Bearer mock-token')
          .expect(204);
      });

      it('should return 404 for non-existent source', async () => {
        await request(app.getHttpServer())
          .delete(
            `/api/v1/directories/${DIRECTORY_ID}/sources/00000000-0000-0000-0000-000000000000`,
          )
          .set('Authorization', 'Bearer mock-token')
          .expect(404);
      });
    });

    describe('POST /api/v1/directories/:id/sources/:sourceId/sync', () => {
      it('should trigger sync and return sync log', async () => {
        const res = await request(app.getHttpServer())
          .post(
            `/api/v1/directories/${DIRECTORY_ID}/sources/${SOURCE_ID}/sync`,
          )
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('totalRecords');
        expect(res.body).toHaveProperty('createdCount');
        expect(res.body).toHaveProperty('updatedCount');
        expect(res.body).toHaveProperty('errorCount');
        expect(res.body.directoryId).toBe(DIRECTORY_ID);
        expect(res.body.sourceId).toBe(SOURCE_ID);
      });

      it('should return 404 for non-existent source', async () => {
        await request(app.getHttpServer())
          .post(
            `/api/v1/directories/${DIRECTORY_ID}/sources/00000000-0000-0000-0000-000000000000/sync`,
          )
          .set('Authorization', 'Bearer mock-token')
          .expect(404);
      });

      it('should return 400 for inactive source', async () => {
        const inactiveSourceId = 'src-bbbb-cccc-dddd-eeeeeeeeeeee';
        await request(app.getHttpServer())
          .post(
            `/api/v1/directories/${DIRECTORY_ID}/sources/${inactiveSourceId}/sync`,
          )
          .set('Authorization', 'Bearer mock-token')
          .expect(400);
      });
    });
  });

  // ===========================================================================
  // SYNC LOGS
  // ===========================================================================

  describe('Sync Logs', () => {
    describe('GET /api/v1/directories/:id/sync-logs', () => {
      it('should return paginated sync logs', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/sync-logs`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.total).toBe(3);
        expect(res.body.data[0]).toHaveProperty('status');
        expect(res.body.data[0]).toHaveProperty('totalRecords');
      });

      it('should filter sync logs by sourceId', async () => {
        const res = await request(app.getHttpServer())
          .get(
            `/api/v1/directories/${DIRECTORY_ID}/sync-logs?sourceId=${SOURCE_ID}`,
          )
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body.data.length).toBe(3);
        res.body.data.forEach((log: any) => {
          expect(log.sourceId).toBe(SOURCE_ID);
        });
      });

      it('should accept pagination parameters', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/sync-logs?page=1&limit=2`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(2);
      });

      it('should return logs with different statuses', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/sync-logs`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        const statuses = res.body.data.map((log: any) => log.status);
        expect(statuses).toContain('success');
        expect(statuses).toContain('partial');
        expect(statuses).toContain('failed');
      });
    });
  });

  // ===========================================================================
  // AUDIT LOGS
  // ===========================================================================

  describe('Audit Logs', () => {
    describe('GET /api/v1/directories/:id/audit', () => {
      it('should return paginated audit logs', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/audit`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.total).toBe(3);
        expect(res.body.data[0]).toHaveProperty('action');
        expect(res.body.data[0]).toHaveProperty('changedBy');
      });

      it('should filter audit logs by entryId', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/audit?entryId=${ENTRY_ID}`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body.data.length).toBe(3);
        res.body.data.forEach((log: any) => {
          expect(log.entryId).toBe(ENTRY_ID);
        });
      });

      it('should filter audit logs by action', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/audit?action=create`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].action).toBe('create');
      });

      it('should accept pagination parameters', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/audit?page=1&limit=2`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(2);
      });
    });

    describe('GET /api/v1/directories/:id/entries/:entryId/audit', () => {
      it('should return audit logs for specific entry', async () => {
        const res = await request(app.getHttpServer())
          .get(
            `/api/v1/directories/${DIRECTORY_ID}/entries/${ENTRY_ID}/audit`,
          )
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(Array.isArray(res.body.data)).toBe(true);
        res.body.data.forEach((log: any) => {
          expect(log.entryId).toBe(ENTRY_ID);
        });
      });

      it('should filter entry audit logs by action', async () => {
        const res = await request(app.getHttpServer())
          .get(
            `/api/v1/directories/${DIRECTORY_ID}/entries/${ENTRY_ID}/audit?action=update`,
          )
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].action).toBe('update');
      });

      it('should return different audit actions', async () => {
        const res = await request(app.getHttpServer())
          .get(
            `/api/v1/directories/${DIRECTORY_ID}/entries/${ENTRY_ID}/audit`,
          )
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        const actions = res.body.data.map((log: any) => log.action);
        expect(actions).toContain('create');
        expect(actions).toContain('update');
        expect(actions).toContain('sync');
      });
    });
  });

  // ===========================================================================
  // HIERARCHY
  // ===========================================================================

  describe('Hierarchy Operations', () => {
    describe('GET /api/v1/directories/:id/tree', () => {
      it('should return nested hierarchy tree', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/tree`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
        expect(res.body[0]).toHaveProperty('id');
        expect(res.body[0]).toHaveProperty('name');
        expect(res.body[0]).toHaveProperty('children');
        expect(Array.isArray(res.body[0].children)).toBe(true);
      });

      it('should include nested children in tree', async () => {
        const res = await request(app.getHttpServer())
          .get(`/api/v1/directories/${DIRECTORY_ID}/tree`)
          .set('Authorization', 'Bearer mock-token')
          .expect(200);

        const beverages = res.body.find((node: any) => node.name === 'Beverages');
        expect(beverages).toBeDefined();
        expect(beverages.children.length).toBe(2);
        expect(beverages.children[0].name).toBe('Hot Drinks');
        expect(beverages.children[1].name).toBe('Cold Drinks');
      });

      it('should return 400 for non-hierarchical directory', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/directories/non-hierarchical-dir/tree')
          .set('Authorization', 'Bearer mock-token')
          .expect(400);
      });
    });

    describe('POST /api/v1/directories/:id/entries/:entryId/move', () => {
      it('should move entry to new parent', async () => {
        const res = await request(app.getHttpServer())
          .post(
            `/api/v1/directories/${DIRECTORY_ID}/entries/${ENTRY_ID}/move`,
          )
          .set('Authorization', 'Bearer mock-token')
          .send({ newParentId: 'parent-123' })
          .expect(200);

        expect(res.body).toHaveProperty('id', ENTRY_ID);
        expect(res.body.parentId).toBe('parent-123');
        expect(res.body).toHaveProperty('version', 2);
        expect(res.body).toHaveProperty('updated_at');
      });

      it('should move entry to root (null parent)', async () => {
        const res = await request(app.getHttpServer())
          .post(
            `/api/v1/directories/${DIRECTORY_ID}/entries/${ENTRY_ID}/move`,
          )
          .set('Authorization', 'Bearer mock-token')
          .send({ newParentId: null })
          .expect(200);

        expect(res.body.parentId).toBeNull();
      });

      it('should reject moving entry to itself', async () => {
        await request(app.getHttpServer())
          .post(
            `/api/v1/directories/${DIRECTORY_ID}/entries/${ENTRY_ID}/move`,
          )
          .set('Authorization', 'Bearer mock-token')
          .send({ newParentId: ENTRY_ID })
          .expect(400);
      });

      it('should reject moves that create cycles', async () => {
        await request(app.getHttpServer())
          .post(
            `/api/v1/directories/${DIRECTORY_ID}/entries/${ENTRY_ID}/move`,
          )
          .set('Authorization', 'Bearer mock-token')
          .send({ newParentId: 'cycle-parent' })
          .expect(400);
      });
    });
  });

  // ===========================================================================
  // INLINE CREATE
  // ===========================================================================

  describe('Inline Entry Creation', () => {
    describe('POST /api/v1/directories/:id/entries/inline', () => {
      const validPayload = {
        name: 'Quick Entry',
        code: 'QE-001',
      };

      it('should create entry with minimal data', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/directories/${DIRECTORY_ID}/entries/inline`)
          .set('Authorization', 'Bearer mock-token')
          .send(validPayload)
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe(validPayload.name);
        expect(res.body.code).toBe(validPayload.code);
        expect(res.body.origin).toBe('local');
        expect(res.body.directoryId).toBe(DIRECTORY_ID);
      });

      it('should create entry with only name (minimal)', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/directories/${DIRECTORY_ID}/entries/inline`)
          .set('Authorization', 'Bearer mock-token')
          .send({ name: 'Minimal Entry' })
          .expect(201);

        expect(res.body.name).toBe('Minimal Entry');
        expect(res.body.code).toBeNull();
      });

      it('should create entry with parentId for hierarchical directory', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/directories/${DIRECTORY_ID}/entries/inline`)
          .set('Authorization', 'Bearer mock-token')
          .send({ name: 'Child Entry', parentId: 'parent-123' })
          .expect(201);

        expect(res.body.name).toBe('Child Entry');
        expect(res.body.parentId).toBe('parent-123');
      });

      it('should create entry with custom data', async () => {
        const res = await request(app.getHttpServer())
          .post(`/api/v1/directories/${DIRECTORY_ID}/entries/inline`)
          .set('Authorization', 'Bearer mock-token')
          .send({
            name: 'Entry with Data',
            data: { color: 'blue', priority: 1 },
          })
          .expect(201);

        expect(res.body.name).toBe('Entry with Data');
        expect(res.body.data).toEqual({ color: 'blue', priority: 1 });
      });

      it('should reject creation with missing name', async () => {
        await request(app.getHttpServer())
          .post(`/api/v1/directories/${DIRECTORY_ID}/entries/inline`)
          .set('Authorization', 'Bearer mock-token')
          .send({ code: 'CODE-001' })
          .expect(400);
      });

      it('should return 400 when inline create is not allowed', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/directories/no-inline-dir/entries/inline')
          .set('Authorization', 'Bearer mock-token')
          .send({ name: 'Test Entry' })
          .expect(400);
      });
    });
  });
});
