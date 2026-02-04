/**
 * VendHub E2E Test Setup
 *
 * Provides helpers to create and tear down a NestJS test application
 * with mocked providers for running integration tests without a real
 * database or Redis connection.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';

/**
 * Create a fully initialised NestJS application from the given module
 * definition (typically a slimmed-down test module). The returned app
 * has the same global prefix, versioning, and validation pipes as the
 * production application so that supertest requests match real routes.
 */
export async function createTestApp(
  moduleDefinition: Parameters<typeof Test.createTestingModule>[0],
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule(
    moduleDefinition,
  ).compile();

  const app = moduleFixture.createNestApplication();

  // Mirror production bootstrap configuration
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}

/**
 * Safely close the test application, draining connections.
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

/**
 * Returns a UUID v4 string for use in test fixtures.
 */
export function mockUuid(): string {
  return 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
}

export function mockUuid2(): string {
  return '11111111-2222-3333-4444-555555555555';
}

/**
 * Returns a second, different org UUID for cross-tenant isolation tests.
 */
export function otherOrgId(): string {
  return '99999999-8888-7777-6666-555555555555';
}

/**
 * Builds a mock user payload that mirrors the shape injected by
 * the @CurrentUser() decorator after JWT validation.
 */
export function mockUser(overrides: Record<string, any> = {}) {
  return {
    id: mockUuid(),
    email: 'admin@vendhub.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    organizationId: mockUuid2(),
    status: 'active',
    ...overrides,
  };
}
