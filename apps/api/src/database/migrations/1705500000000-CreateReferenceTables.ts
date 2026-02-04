import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the 5 reference tables for VendHub OS:
 * - vat_rates: VAT rates for Uzbekistan tax system
 * - package_types: Package types for goods
 * - payment_providers: Payment providers (Payme, Click, Uzum, etc.)
 * - goods_classifiers: MXIK commodity classification codes
 * - ikpu_codes: Tax identification codes for goods
 *
 * These tables are global (not organization-scoped) and hold
 * foundational reference data needed by other modules.
 */
export class CreateReferenceTables1705500000000 implements MigrationInterface {
  name = 'CreateReferenceTables1705500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. Create payment_provider_type enum
    // ============================================================
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider_type') THEN
          CREATE TYPE payment_provider_type AS ENUM (
            'card', 'qr', 'nfc', 'cash', 'telegram', 'bank_transfer'
          );
        END IF;
      END $$;
    `);

    // ============================================================
    // 2. vat_rates
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vat_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        rate DECIMAL(5, 2) NOT NULL,
        name_ru VARCHAR(255) NOT NULL,
        name_uz VARCHAR(255),
        description TEXT,
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        effective_from DATE,
        effective_to DATE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vat_rates_code" ON vat_rates (code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vat_rates_is_active" ON vat_rates (is_active);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vat_rates_is_default" ON vat_rates (is_default);
    `);

    // ============================================================
    // 3. package_types
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS package_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name_ru VARCHAR(255) NOT NULL,
        name_uz VARCHAR(255),
        name_en VARCHAR(255),
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_package_types_code" ON package_types (code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_package_types_is_active" ON package_types (is_active);
    `);

    // ============================================================
    // 4. payment_providers
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        name_ru VARCHAR(255),
        name_uz VARCHAR(255),
        type payment_provider_type NOT NULL,
        logo_url TEXT,
        website_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_default BOOLEAN NOT NULL DEFAULT false,
        commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
        settings JSONB,
        supported_currencies JSONB,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_providers_code" ON payment_providers (code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_providers_is_active" ON payment_providers (is_active);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_providers_type" ON payment_providers (type);
    `);

    // ============================================================
    // 5. goods_classifiers (MXIK codes)
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS goods_classifiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) NOT NULL UNIQUE,
        name_ru VARCHAR(500) NOT NULL,
        name_uz VARCHAR(500),
        name_en VARCHAR(500),
        group_code VARCHAR(20),
        group_name VARCHAR(500),
        subgroup_code VARCHAR(20),
        subgroup_name VARCHAR(500),
        parent_code VARCHAR(20),
        level INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_goods_classifiers_code" ON goods_classifiers (code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_goods_classifiers_group_code" ON goods_classifiers (group_code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_goods_classifiers_parent_code" ON goods_classifiers (parent_code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_goods_classifiers_is_active" ON goods_classifiers (is_active);
    `);

    // ============================================================
    // 6. ikpu_codes
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ikpu_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) NOT NULL UNIQUE,
        name_ru VARCHAR(500) NOT NULL,
        name_uz VARCHAR(500),
        mxik_code VARCHAR(20),
        vat_rate DECIMAL(5, 2) NOT NULL DEFAULT 12,
        is_marked BOOLEAN NOT NULL DEFAULT false,
        package_code VARCHAR(20),
        is_active BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ikpu_codes_code" ON ikpu_codes (code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ikpu_codes_mxik_code" ON ikpu_codes (mxik_code);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ikpu_codes_is_active" ON ikpu_codes (is_active);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ikpu_codes_is_marked" ON ikpu_codes (is_marked);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS ikpu_codes CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS goods_classifiers CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_providers CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS package_types CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS vat_rates CASCADE;`);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS payment_provider_type;`);
  }
}
