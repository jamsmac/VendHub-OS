/**
 * E2E Tests: Products CRUD
 *
 * Tests product lifecycle: create, list with filters, get by ID, update,
 * soft delete, and input validation. Uses a mock controller to avoid
 * database dependencies.
 *
 * Endpoint prefix: /api/v1/products
 * Controller: ProductsController (src/modules/products/products.controller.ts)
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
} from '@nestjs/common';
import request from 'supertest';
import { createTestApp, closeTestApp, mockUuid, mockUuid2 } from './setup';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_ID = mockUuid2();

function productSample(overrides: Record<string, any> = {}) {
  return {
    id: mockUuid(),
    name: 'Espresso',
    nameUz: 'Espresso',
    sku: 'COFFEE-ESP-001',
    barcode: '4607001234001',
    description: 'Classic espresso',
    category: 'coffee',
    subcategory: 'hot',
    brand: 'VendHub Coffee',
    unit: 'cup',
    basePrice: 8000,
    costPrice: 2500,
    vatRate: 12,
    organizationId: ORG_ID,
    isAvailable: true,
    isActive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

const products = [
  productSample(),
  productSample({
    id: '33333333-4444-5555-6666-777777777777',
    name: 'Latte',
    sku: 'COFFEE-LAT-002',
    category: 'coffee',
    subcategory: 'hot',
    basePrice: 12000,
  }),
  productSample({
    id: '44444444-5555-6666-7777-888888888888',
    name: 'Cola 0.5L',
    sku: 'DRINK-COL-001',
    category: 'drinks',
    subcategory: 'cold',
    basePrice: 6000,
  }),
];

// ---------------------------------------------------------------------------
// Mock controller
// ---------------------------------------------------------------------------

@Controller({ path: 'products', version: '1' })
class MockProductsController {
  @Post()
  create(@Body() body: any) {
    // Simulate validation
    if (!body.name) {
      throw new BadRequestException('name should not be empty');
    }
    if (!body.sku) {
      throw new BadRequestException('sku should not be empty');
    }
    if (body.basePrice === undefined || body.basePrice === null) {
      throw new BadRequestException('basePrice is required');
    }

    return productSample({
      name: body.name,
      sku: body.sku,
      basePrice: body.basePrice,
      category: body.category,
      type: body.type,
      organizationId: ORG_ID,
    });
  }

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    let filtered = [...products];

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      );
    }

    return {
      data: filtered,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(filtered.length / Number(limit)),
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const product = products.find((p) => p.id === id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const product = products.find((p) => p.id === id);
    if (!product) throw new NotFoundException('Product not found');
    return { ...product, ...body, updated_at: new Date().toISOString() };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const product = products.find((p) => p.id === id);
    if (!product) throw new NotFoundException('Product not found');
    return { ...product, deleted_at: new Date().toISOString() };
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    const product = products.find((p) => p.barcode === barcode);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Products Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [MockProductsController],
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // =========================================================================
  // POST /api/v1/products — Create product
  // =========================================================================

  describe('POST /api/v1/products', () => {
    const validPayload = {
      name: 'Americano',
      sku: 'COFFEE-AMR-003',
      basePrice: 10000,
      category: 'coffee',
      costPrice: 3000,
      vatRate: 12,
      organizationId: ORG_ID,
    };

    it('should create a product with valid data', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', 'Bearer mock-token')
        .send(validPayload)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(validPayload.name);
      expect(res.body.sku).toBe(validPayload.sku);
      expect(res.body.basePrice).toBe(validPayload.basePrice);
      expect(res.body.organizationId).toBe(ORG_ID);
    });

    it('should reject creation with missing name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', 'Bearer mock-token')
        .send({ sku: 'TEST-001', basePrice: 5000, organizationId: ORG_ID })
        .expect(400);
    });

    it('should reject creation with missing sku', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', 'Bearer mock-token')
        .send({ name: 'Test Product', basePrice: 5000, organizationId: ORG_ID })
        .expect(400);
    });

    it('should reject creation with missing basePrice', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', 'Bearer mock-token')
        .send({ name: 'Test Product', sku: 'TEST-001', organizationId: ORG_ID })
        .expect(400);
    });
  });

  // =========================================================================
  // GET /api/v1/products — List with filters
  // =========================================================================

  describe('GET /api/v1/products', () => {
    it('should return all products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBe(3);
    });

    it('should filter products by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products?category=coffee')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.data.length).toBe(2);
      res.body.data.forEach((p: any) => {
        expect(p.category).toBe('coffee');
      });
    });

    it('should filter products by search query', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products?search=Cola')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Cola 0.5L');
    });

    it('should return empty array for no matching search', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products?search=nonexistent')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.data.length).toBe(0);
    });

    it('should accept pagination parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products?page=1&limit=2')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
    });
  });

  // =========================================================================
  // GET /api/v1/products/:id — Get product by ID
  // =========================================================================

  describe('GET /api/v1/products/:id', () => {
    it('should return a product by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${mockUuid()}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('id', mockUuid());
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('sku');
      expect(res.body).toHaveProperty('basePrice');
      expect(res.body).toHaveProperty('category');
    });

    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });

  // =========================================================================
  // PATCH /api/v1/products/:id — Update product
  // =========================================================================

  describe('PATCH /api/v1/products/:id', () => {
    it('should update a product', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${mockUuid()}`)
        .set('Authorization', 'Bearer mock-token')
        .send({ name: 'Updated Espresso', basePrice: 9000 })
        .expect(200);

      expect(res.body.name).toBe('Updated Espresso');
      expect(res.body.basePrice).toBe(9000);
      expect(res.body).toHaveProperty('updated_at');
    });

    it('should return 404 when updating non-existent product', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer mock-token')
        .send({ name: 'No Product' })
        .expect(404);
    });
  });

  // =========================================================================
  // DELETE /api/v1/products/:id — Soft delete
  // =========================================================================

  describe('DELETE /api/v1/products/:id', () => {
    it('should soft delete a product', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/products/${mockUuid()}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body).toHaveProperty('deleted_at');
      expect(res.body.deleted_at).not.toBeNull();
    });

    it('should return 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });

  // =========================================================================
  // GET /api/v1/products/barcode/:barcode — Find by barcode
  // =========================================================================

  describe('GET /api/v1/products/barcode/:barcode', () => {
    it('should find a product by barcode', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/barcode/4607001234001')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(res.body.barcode).toBe('4607001234001');
      expect(res.body).toHaveProperty('name');
    });

    it('should return 404 for unknown barcode', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/barcode/0000000000000')
        .set('Authorization', 'Bearer mock-token')
        .expect(404);
    });
  });
});
