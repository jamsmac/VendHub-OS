import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreatePromoCodesTables
 *
 * Creates the promo_codes and promo_code_redemptions tables for
 * promotional discounts, fixed-amount vouchers, and loyalty bonus codes.
 * Each promo code tracks usage limits, validity periods, and applicability
 * rules (machines, products). Redemptions record every usage instance.
 */
export class CreatePromoCodesTables1710000004000 implements MigrationInterface {
  name = 'CreatePromoCodesTables1710000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: promo_code_type_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE promo_code_type_enum AS ENUM (
          'percentage',
          'fixed_amount',
          'loyalty_bonus'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: promo_code_status_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE promo_code_status_enum AS ENUM (
          'draft',
          'active',
          'paused',
          'expired'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // TABLE: promo_codes
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- Code identity
        code varchar(50) NOT NULL,
        name varchar(100) NOT NULL,
        description text,

        -- Discount type & value
        type promo_code_type_enum NOT NULL,
        value decimal(12, 2) NOT NULL,

        -- Status
        status promo_code_status_enum NOT NULL DEFAULT 'draft',

        -- Usage limits
        max_total_uses integer,
        max_uses_per_user integer NOT NULL DEFAULT 1,
        current_total_uses integer NOT NULL DEFAULT 0,

        -- Validity period
        valid_from timestamptz NOT NULL,
        valid_until timestamptz NOT NULL,

        -- Applicability rules
        min_order_amount decimal(12, 2),
        max_discount_amount decimal(12, 2),
        applicable_machine_ids jsonb,
        applicable_product_ids jsonb,

        -- Metadata
        metadata jsonb,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ========================================================================
    // TABLE: promo_code_redemptions
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promo_code_redemptions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope
        organization_id uuid NOT NULL,

        -- References
        promo_code_id uuid NOT NULL,
        client_user_id uuid NOT NULL,
        order_id uuid,

        -- Amounts
        discount_applied decimal(12, 2) NOT NULL,
        loyalty_points_awarded integer NOT NULL DEFAULT 0,
        order_amount decimal(12, 2),

        -- Timestamp
        redeemed_at timestamptz NOT NULL DEFAULT now(),

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ========================================================================
    // INDEXES: promo_codes
    // ========================================================================

    // Unique code constraint
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_code
        ON promo_codes(code)
        WHERE deleted_at IS NULL
    `);

    // Organization + status for listing
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_org_status
        ON promo_codes(organization_id, status)
    `);

    // Validity date range lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_codes_valid_range
        ON promo_codes(valid_from, valid_until)
    `);

    // ========================================================================
    // INDEXES: promo_code_redemptions
    // ========================================================================

    // Composite: promo_code + client_user (check per-user usage)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code_client
        ON promo_code_redemptions(promo_code_id, client_user_id)
    `);

    // By promo code
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo_code
        ON promo_code_redemptions(promo_code_id)
    `);

    // By client user
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_redemptions_client_user
        ON promo_code_redemptions(client_user_id)
    `);

    // By order
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promo_redemptions_order
        ON promo_code_redemptions(order_id)
        WHERE order_id IS NOT NULL
    `);

    // ========================================================================
    // FOREIGN KEYS
    // ========================================================================

    await queryRunner.query(`
      ALTER TABLE promo_codes
        ADD CONSTRAINT fk_promo_codes_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE promo_code_redemptions
        ADD CONSTRAINT fk_promo_redemptions_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE promo_code_redemptions
        ADD CONSTRAINT fk_promo_redemptions_promo_code
        FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop foreign keys
    await queryRunner.query(`ALTER TABLE promo_code_redemptions DROP CONSTRAINT IF EXISTS fk_promo_redemptions_promo_code`);
    await queryRunner.query(`ALTER TABLE promo_code_redemptions DROP CONSTRAINT IF EXISTS fk_promo_redemptions_organization`);
    await queryRunner.query(`ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS fk_promo_codes_organization`);

    // -- Drop indexes (promo_code_redemptions)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_promo_redemptions_order`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_promo_redemptions_client_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_promo_redemptions_promo_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_promo_redemptions_code_client`);

    // -- Drop indexes (promo_codes)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_promo_codes_valid_range`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_promo_codes_org_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_promo_codes_code`);

    // -- Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS promo_code_redemptions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS promo_codes CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS promo_code_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS promo_code_type_enum`);
  }
}
