import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Sprint G5 — OLMA Schema Additions
 *
 * Extends 5 existing entities + creates Category entity to support:
 * - Public tenant view (orgSlug / locationSlug URLs)
 * - Multi-location hierarchy (parentLocationId)
 * - Machine grid rendering (rows/cols)
 * - Product forecast hints (expectedSalesPerDay, slotCapacity, tags)
 * - Supplier legal info + default payment method
 * - First-class Category entity with code/icon/color/defaultMarkup
 *
 * All operations use IF NOT EXISTS for idempotency. Safe to re-run.
 */
export class OlmaSchemaAdditions1776800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. organizations: publicEnabled, settings extension (slug already exists)
    await queryRunner.query(`
      ALTER TABLE organizations
        ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN DEFAULT FALSE
    `);

    // 2. locations: slug, publicEnabled, parentLocationId
    await queryRunner.query(`
      ALTER TABLE locations
        ADD COLUMN IF NOT EXISTS slug VARCHAR(100),
        ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS parent_location_id UUID REFERENCES locations(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_slug ON locations (slug) WHERE slug IS NOT NULL AND deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations (parent_location_id) WHERE parent_location_id IS NOT NULL
    `);

    // 3. machines: rows, cols (for grid rendering)
    await queryRunner.query(`
      ALTER TABLE machines
        ADD COLUMN IF NOT EXISTS grid_rows INT,
        ADD COLUMN IF NOT EXISTS grid_cols INT
    `);

    // 4. products: expectedSalesPerDay, slotCapacity, tags, categoryId
    // NOTE: products.tags column already exists as jsonb default '[]' — we do NOT
    // overwrite it. Adding the remaining columns idempotently.
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS expected_sales_per_day DECIMAL(6,2),
        ADD COLUMN IF NOT EXISTS default_slot_capacity INT DEFAULT 8
    `);

    // 5. suppliers: defaultPayment (enum), legalName
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE supplier_payment_method_enum AS ENUM (
          'cash', 'card_humo', 'card_uzcard', 'card_visa', 'transfer', 'payme', 'click', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE suppliers
        ADD COLUMN IF NOT EXISTS default_payment supplier_payment_method_enum,
        ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255)
    `);

    // 6. Category entity (new table)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50),
        color VARCHAR(20),
        sort_order INT DEFAULT 0,
        default_markup DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_org_code ON categories (organization_id, code) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_org ON categories (organization_id)
    `);

    // 7. Add category_id to products (optional FK; existing enum column stays for backward compat)
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id) WHERE category_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS category_id`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS categories`);
    await queryRunner.query(
      `ALTER TABLE suppliers DROP COLUMN IF EXISTS legal_name, DROP COLUMN IF EXISTS default_payment`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS supplier_payment_method_enum`);
    await queryRunner.query(
      `ALTER TABLE products DROP COLUMN IF EXISTS default_slot_capacity, DROP COLUMN IF EXISTS expected_sales_per_day`,
    );
    await queryRunner.query(
      `ALTER TABLE machines DROP COLUMN IF EXISTS grid_cols, DROP COLUMN IF EXISTS grid_rows`,
    );
    await queryRunner.query(
      `ALTER TABLE locations DROP COLUMN IF EXISTS parent_location_id, DROP COLUMN IF EXISTS public_enabled, DROP COLUMN IF EXISTS slug`,
    );
    await queryRunner.query(
      `ALTER TABLE organizations DROP COLUMN IF EXISTS public_enabled`,
    );
  }
}
