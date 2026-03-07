import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddPromoCodeTables
 *
 * Creates loyalty_promo_codes and loyalty_promo_code_usages tables
 * for the loyalty module's promo code feature.
 *
 * Separate from the existing promo_codes / promo_code_redemptions tables
 * (from 1710000004000-CreatePromoCodesTables) which serve the general
 * promo-codes module. These tables are specific to the loyalty program.
 */
export class AddPromoCodeTables1714400000000 implements MigrationInterface {
  name = "AddPromoCodeTables1714400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: loyalty_promo_code_type_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE loyalty_promo_code_type_enum AS ENUM (
          'points_bonus',
          'discount_percent',
          'discount_fixed',
          'free_item'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // TABLE: loyalty_promo_codes
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS loyalty_promo_codes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- Code identity
        code varchar(10) NOT NULL,
        name varchar(255) NOT NULL,
        description text,

        -- Type & value
        type loyalty_promo_code_type_enum NOT NULL,
        value decimal(12, 2) NOT NULL,

        -- Usage limits
        max_usage_total integer,
        max_usage_per_user integer NOT NULL DEFAULT 1,
        current_usage integer NOT NULL DEFAULT 0,

        -- Validity period
        starts_at timestamptz,
        expires_at timestamptz,

        -- Status
        is_active boolean NOT NULL DEFAULT true,

        -- Applicability
        minimum_order_amount decimal(12, 2),

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ========================================================================
    // TABLE: loyalty_promo_code_usages
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS loyalty_promo_code_usages (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- References
        promo_code_id uuid NOT NULL,
        user_id uuid NOT NULL,
        order_id uuid,

        -- Amounts
        points_awarded integer NOT NULL DEFAULT 0,
        discount_applied decimal(12, 2) NOT NULL DEFAULT 0,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ========================================================================
    // INDEXES: loyalty_promo_codes
    // ========================================================================

    // Unique code per organization (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_promo_codes_code_org
        ON loyalty_promo_codes(code, organization_id)
        WHERE deleted_at IS NULL
    `);

    // Organization + active status for listing
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_promo_codes_org_active
        ON loyalty_promo_codes(organization_id, is_active)
    `);

    // Validity date range lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_promo_codes_dates
        ON loyalty_promo_codes(starts_at, expires_at)
    `);

    // ========================================================================
    // INDEXES: loyalty_promo_code_usages
    // ========================================================================

    // Per-user usage check (most common query)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_promo_usages_code_user
        ON loyalty_promo_code_usages(promo_code_id, user_id)
    `);

    // By user
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_promo_usages_user
        ON loyalty_promo_code_usages(user_id)
    `);

    // By organization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_promo_usages_org
        ON loyalty_promo_code_usages(organization_id)
    `);

    // By order (partial index)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_loyalty_promo_usages_order
        ON loyalty_promo_code_usages(order_id)
        WHERE order_id IS NOT NULL
    `);

    // ========================================================================
    // FOREIGN KEYS
    // ========================================================================

    await queryRunner.query(`
      ALTER TABLE loyalty_promo_codes
        ADD CONSTRAINT fk_loyalty_promo_codes_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE loyalty_promo_code_usages
        ADD CONSTRAINT fk_loyalty_promo_usages_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE loyalty_promo_code_usages
        ADD CONSTRAINT fk_loyalty_promo_usages_promo_code
        FOREIGN KEY (promo_code_id) REFERENCES loyalty_promo_codes(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE loyalty_promo_code_usages DROP CONSTRAINT IF EXISTS fk_loyalty_promo_usages_promo_code`,
    );
    await queryRunner.query(
      `ALTER TABLE loyalty_promo_code_usages DROP CONSTRAINT IF EXISTS fk_loyalty_promo_usages_organization`,
    );
    await queryRunner.query(
      `ALTER TABLE loyalty_promo_codes DROP CONSTRAINT IF EXISTS fk_loyalty_promo_codes_organization`,
    );

    // Drop indexes (usages)
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_loyalty_promo_usages_order`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_loyalty_promo_usages_org`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_loyalty_promo_usages_user`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_loyalty_promo_usages_code_user`,
    );

    // Drop indexes (codes)
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_loyalty_promo_codes_dates`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_loyalty_promo_codes_org_active`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_loyalty_promo_codes_code_org`,
    );

    // Drop tables
    await queryRunner.query(
      `DROP TABLE IF EXISTS loyalty_promo_code_usages CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS loyalty_promo_codes CASCADE`);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS loyalty_promo_code_type_enum`);
  }
}
