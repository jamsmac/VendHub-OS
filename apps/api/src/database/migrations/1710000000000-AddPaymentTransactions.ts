import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: AddPaymentTransactions
 *
 * Phase 4 - Step 1:
 * 1. CREATE TABLE payment_transactions - records all payment transactions
 *    from Payme, Click, Uzum, Telegram Stars, Cash, Wallet
 * 2. CREATE TABLE payment_refunds - records refund requests and processing
 *
 * Supports multi-provider payment processing with full audit trail,
 * raw request/response storage, and refund workflows.
 */
export class AddPaymentTransactions1710000000000 implements MigrationInterface {
  name = 'AddPaymentTransactions1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: payment_provider_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_provider_enum AS ENUM (
          'payme',
          'click',
          'uzum',
          'telegram_stars',
          'cash',
          'wallet'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: payment_transaction_status_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_transaction_status_enum AS ENUM (
          'pending',
          'processing',
          'completed',
          'failed',
          'cancelled',
          'refunded'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: refund_reason_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE refund_reason_enum AS ENUM (
          'customer_request',
          'machine_error',
          'product_unavailable',
          'duplicate',
          'other'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: refund_status_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE refund_status_enum AS ENUM (
          'pending',
          'processing',
          'completed',
          'failed'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // TABLE: payment_transactions
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization
        organization_id uuid NOT NULL,

        -- Payment provider and reference
        provider payment_provider_enum NOT NULL,
        provider_tx_id varchar(255),

        -- Amounts
        amount decimal(12, 2) NOT NULL,
        currency varchar(10) NOT NULL DEFAULT 'UZS',

        -- Status
        status payment_transaction_status_enum NOT NULL DEFAULT 'pending',

        -- References
        order_id varchar(255),
        machine_id uuid,
        client_user_id uuid,

        -- Details
        description text,
        raw_request jsonb,
        raw_response jsonb,
        error_message text,

        -- Processing
        processed_at timestamptz,

        -- Extra data
        metadata jsonb,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for payment_transactions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_org_status
        ON payment_transactions(organization_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_org_provider
        ON payment_transactions(organization_id, provider)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_provider_tx_id
        ON payment_transactions(provider_tx_id)
        WHERE provider_tx_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id
        ON payment_transactions(order_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_machine_id
        ON payment_transactions(machine_id)
    `);

    // ========================================================================
    // TABLE: payment_refunds
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_refunds (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization
        organization_id uuid NOT NULL,

        -- Reference to original transaction
        payment_transaction_id uuid NOT NULL,

        -- Refund details
        amount decimal(12, 2) NOT NULL,
        reason refund_reason_enum NOT NULL,
        reason_note text,

        -- Status
        status refund_status_enum NOT NULL DEFAULT 'pending',

        -- Provider reference
        provider_refund_id varchar(255),

        -- Processing
        processed_at timestamptz,
        processed_by_user_id uuid,

        -- Extra data
        metadata jsonb,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for payment_refunds
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_refunds_transaction_id
        ON payment_refunds(payment_transaction_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_refunds_status
        ON payment_refunds(status)
    `);

    // -- FK: payment_refunds -> payment_transactions
    await queryRunner.query(`
      ALTER TABLE payment_refunds
        ADD CONSTRAINT fk_payment_refunds_transaction
        FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop FK constraints
    await queryRunner.query(`ALTER TABLE payment_refunds DROP CONSTRAINT IF EXISTS fk_payment_refunds_transaction`);

    // -- Drop indexes for payment_refunds
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_refunds_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_refunds_transaction_id`);

    // -- Drop indexes for payment_transactions
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_transactions_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_transactions_order_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_transactions_provider_tx_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_transactions_org_provider`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payment_transactions_org_status`);

    // -- Drop tables in reverse order (children first)
    await queryRunner.query(`DROP TABLE IF EXISTS payment_refunds CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_transactions CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS refund_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS refund_reason_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_transaction_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_provider_enum`);
  }
}
