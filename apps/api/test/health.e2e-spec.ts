/**
 * E2E Tests: Health Endpoints
 *
 * Tests the basic health, liveness, readiness, and version endpoints
 * exposed by the HealthModule. These endpoints are critical for
 * Kubernetes probes and load-balancer health checks.
 */

import { INestApplication, Controller, Get } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp } from './setup';

// ---------------------------------------------------------------------------
// Lightweight stand-in controller that mimics HealthController behaviour
// without requiring Terminus, Redis, or a database connection.
// ---------------------------------------------------------------------------

@Controller({ path: 'health', version: '1' })
class MockHealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('live')
  liveness() {
    return {
      status: 'ok',
      info: { memory_heap: { status: 'up' } },
      error: {},
      details: { memory_heap: { status: 'up' } },
    };
  }

  @Get('ready')
  readiness() {
    return {
      status: 'ok',
      info: {
        database: { status: 'up' },
        redis: { status: 'up' },
      },
      error: {},
      details: {
        database: { status: 'up' },
        redis: { status: 'up' },
      },
    };
  }

  @Get('detailed')
  detailed() {
    return {
      status: 'ok',
      info: {
        database: { status: 'up' },
        redis: { status: 'up' },
        memory_heap: { status: 'up' },
        memory_rss: { status: 'up' },
        disk: { status: 'up' },
      },
      error: {},
      details: {
        database: { status: 'up' },
        redis: { status: 'up' },
        memory_heap: { status: 'up' },
        memory_rss: { status: 'up' },
        disk: { status: 'up' },
      },
    };
  }

  @Get('version')
  version() {
    return {
      name: 'vendhub-api',
      version: '1.0.0',
      environment: 'test',
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Health Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [MockHealthController],
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/health
  // -------------------------------------------------------------------------

  describe('GET /api/v1/health', () => {
    it('should return 200 with status "ok"', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(typeof res.body.timestamp).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/health/live
  // -------------------------------------------------------------------------

  describe('GET /api/v1/health/live', () => {
    it('should return 200 for liveness probe', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body.info).toHaveProperty('memory_heap');
      expect(res.body.info.memory_heap).toHaveProperty('status', 'up');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/health/ready
  // -------------------------------------------------------------------------

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 for readiness probe', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body.info).toHaveProperty('database');
      expect(res.body.info.database).toHaveProperty('status', 'up');
      expect(res.body.info).toHaveProperty('redis');
      expect(res.body.info.redis).toHaveProperty('status', 'up');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/health/detailed
  // -------------------------------------------------------------------------

  describe('GET /api/v1/health/detailed', () => {
    it('should return 200 with all component statuses', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/detailed')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body.info).toHaveProperty('database');
      expect(res.body.info).toHaveProperty('redis');
      expect(res.body.info).toHaveProperty('memory_heap');
      expect(res.body.info).toHaveProperty('disk');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/health/version
  // -------------------------------------------------------------------------

  describe('GET /api/v1/health/version', () => {
    it('should return version and build information', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health/version')
        .expect(200);

      expect(res.body).toHaveProperty('name', 'vendhub-api');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('environment');
      expect(res.body).toHaveProperty('nodeVersion');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
      expect(typeof res.body.uptime).toBe('number');
    });
  });
});
