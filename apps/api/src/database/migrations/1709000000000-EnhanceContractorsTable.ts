import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: EnhanceContractorsTable
 *
 * Phase 3 - Step 1:
 * 1. ALTER TABLE contractors: add enhanced fields (short_name, inn, oked, mfo,
 *    bank_account, bank_name, legal_address, actual_address, director_name,
 *    director_position, is_vat_payer, vat_rate, credit_limit, type)
 * 2. CREATE TABLE contracts: full contract management with commission types
 * 3. CREATE TABLE commission_calculations: periodic commission computation records
 *
 * Updates service_type_enum to include new values (location_owner, supplier).
 * Creates new enums: contractor_type_enum, contract_status_enum,
 * commission_type_enum, commission_payment_status_enum.
 */
export class EnhanceContractorsTable1709000000000 implements MigrationInterface {
  name = 'EnhanceContractorsTable1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: Add missing values to service_type_enum
    // ========================================================================
    // PostgreSQL doesn't have IF NOT EXISTS for ADD VALUE before v14,
    // so we wrap each in a DO block to handle duplicates gracefully.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'location_owner'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_type_enum'))
        THEN
          ALTER TYPE service_type_enum ADD VALUE 'location_owner';
        END IF;
      END $$
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'supplier'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'service_type_enum'))
        THEN
          ALTER TYPE service_type_enum ADD VALUE 'supplier';
        END IF;
      END $$
    `);

    // ========================================================================
    // ENUM: contractor_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE contractor_type_enum AS ENUM (
        'client',
        'supplier',
        'partner',
        'location_owner'
      )
    `);

    // ========================================================================
    // ENUM: contract_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE contract_status_enum AS ENUM (
        'draft',
        'active',
        'suspended',
        'expired',
        'terminated'
      )
    `);

    // ========================================================================
    // ENUM: commission_type_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE commission_type_enum AS ENUM (
        'percentage',
        'fixed',
        'tiered',
        'hybrid'
      )
    `);

    // ========================================================================
    // ENUM: commission_payment_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE commission_payment_status_enum AS ENUM (
        'pending',
        'paid',
        'overdue',
        'cancelled'
      )
    `);

    // ========================================================================
    // ALTER TABLE: contractors — add enhanced columns
    // ========================================================================
    await queryRunner.query(`
      ALTER TABLE contractors
        ADD COLUMN IF NOT EXISTS short_name varchar(100),
        ADD COLUMN IF NOT EXISTS inn varchar(9),
        ADD COLUMN IF NOT EXISTS oked varchar(10),
        ADD COLUMN IF NOT EXISTS mfo varchar(5),
        ADD COLUMN IF NOT EXISTS bank_account varchar(30),
        ADD COLUMN IF NOT EXISTS bank_name varchar(200),
        ADD COLUMN IF NOT EXISTS legal_address text,
        ADD COLUMN IF NOT EXISTS actual_address text,
        ADD COLUMN IF NOT EXISTS director_name varchar(200),
        ADD COLUMN IF NOT EXISTS director_position varchar(100),
        ADD COLUMN IF NOT EXISTS is_vat_payer boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS vat_rate decimal(5, 2),
        ADD COLUMN IF NOT EXISTS credit_limit decimal(15, 2),
        ADD COLUMN IF NOT EXISTS type contractor_type_enum NOT NULL DEFAULT 'supplier'
    `);

    // ========================================================================
    // TABLE: contracts
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        contractor_id uuid NOT NULL,

        -- Contract details
        contract_number varchar(50) NOT NULL,
        start_date date NOT NULL,
        end_date date,
        status contract_status_enum NOT NULL DEFAULT 'draft',

        -- Commission configuration
        commission_type commission_type_enum NOT NULL DEFAULT 'percentage',
        commission_rate decimal(5, 2),
        commission_fixed_amount decimal(15, 2),
        commission_fixed_period varchar(20),
        commission_tiers jsonb,
        commission_hybrid_fixed decimal(15, 2),
        commission_hybrid_rate decimal(5, 2),

        -- Payment terms
        currency varchar(3) NOT NULL DEFAULT 'UZS',
        payment_term_days int NOT NULL DEFAULT 30,
        payment_type varchar(50),

        -- Revenue conditions
        minimum_monthly_revenue decimal(15, 2),
        penalty_rate decimal(5, 2),

        -- Notes & files
        special_conditions text,
        notes text,
        contract_file_id uuid,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for contracts
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_organization_id
        ON contracts(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id
        ON contracts(contractor_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_status
        ON contracts(status)
    `);

    // Partial unique index on contract_number (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_contract_number_unique
        ON contracts(contract_number)
        WHERE deleted_at IS NULL
    `);

    // -- FK: contracts -> contractors
    await queryRunner.query(`
      ALTER TABLE contracts
        ADD CONSTRAINT fk_contracts_contractor
        FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
    `);

    // ========================================================================
    // TABLE: commission_calculations
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS commission_calculations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        contract_id uuid NOT NULL,

        -- Period
        period_start date NOT NULL,
        period_end date NOT NULL,

        -- Revenue & transaction data
        total_revenue decimal(15, 2) NOT NULL,
        transaction_count int NOT NULL,
        commission_amount decimal(15, 2) NOT NULL,

        -- Commission type applied
        commission_type commission_type_enum NOT NULL,

        -- Detailed breakdown (JSONB)
        calculation_details jsonb,

        -- Payment tracking
        payment_status commission_payment_status_enum NOT NULL DEFAULT 'pending',
        payment_due_date date,
        payment_date date,
        payment_transaction_id uuid,

        -- Audit
        notes text,
        calculated_by_user_id uuid,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for commission_calculations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_commission_calculations_organization_id
        ON commission_calculations(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_commission_calculations_contract_id
        ON commission_calculations(contract_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_commission_calculations_period
        ON commission_calculations(period_start, period_end)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_commission_calculations_payment_status
        ON commission_calculations(payment_status)
    `);

    // -- FK: commission_calculations -> contracts
    await queryRunner.query(`
      ALTER TABLE commission_calculations
        ADD CONSTRAINT fk_commission_calculations_contract
        FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop FK constraints
    await queryRunner.query(`ALTER TABLE commission_calculations DROP CONSTRAINT IF EXISTS fk_commission_calculations_contract`);
    await queryRunner.query(`ALTER TABLE contracts DROP CONSTRAINT IF EXISTS fk_contracts_contractor`);

    // -- Drop indexes for commission_calculations
    await queryRunner.query(`DROP INDEX IF EXISTS idx_commission_calculations_payment_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_commission_calculations_period`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_commission_calculations_contract_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_commission_calculations_organization_id`);

    // -- Drop indexes for contracts
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contracts_contract_number_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contracts_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contracts_contractor_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contracts_organization_id`);

    // -- Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS commission_calculations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS contracts CASCADE`);

    // -- Remove enhanced columns from contractors
    await queryRunner.query(`
      ALTER TABLE contractors
        DROP COLUMN IF EXISTS short_name,
        DROP COLUMN IF EXISTS inn,
        DROP COLUMN IF EXISTS oked,
        DROP COLUMN IF EXISTS mfo,
        DROP COLUMN IF EXISTS bank_account,
        DROP COLUMN IF EXISTS bank_name,
        DROP COLUMN IF EXISTS legal_address,
        DROP COLUMN IF EXISTS actual_address,
        DROP COLUMN IF EXISTS director_name,
        DROP COLUMN IF EXISTS director_position,
        DROP COLUMN IF EXISTS is_vat_payer,
        DROP COLUMN IF EXISTS vat_rate,
        DROP COLUMN IF EXISTS credit_limit,
        DROP COLUMN IF EXISTS type
    `);

    // -- Drop enum types (cannot remove values from service_type_enum easily)
    await queryRunner.query(`DROP TYPE IF EXISTS commission_payment_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS commission_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS contract_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS contractor_type_enum`);
  }
}
