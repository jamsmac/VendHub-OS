import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateBillingTables
 *
 * Phase 3 - Step 3:
 * 1. CREATE TABLE invoices - B2B invoice management with line items (JSONB)
 * 2. CREATE TABLE billing_payments - payment records linked to invoices
 *
 * Includes a partial unique index on invoice_number WHERE deleted_at IS NULL
 * to enforce uniqueness only among active (non-soft-deleted) records.
 */
export class CreateBillingTables1709000002000 implements MigrationInterface {
  name = 'CreateBillingTables1709000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: billing_invoice_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE billing_invoice_status_enum AS ENUM (
        'draft',
        'sent',
        'paid',
        'overdue',
        'cancelled',
        'partially_paid'
      )
    `);

    // ========================================================================
    // ENUM: billing_payment_method_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE billing_payment_method_enum AS ENUM (
        'cash',
        'bank_transfer',
        'card',
        'online'
      )
    `);

    // ========================================================================
    // ENUM: billing_payment_status_enum
    // ========================================================================
    await queryRunner.query(`
      CREATE TYPE billing_payment_status_enum AS ENUM (
        'pending',
        'completed',
        'failed',
        'refunded'
      )
    `);

    // ========================================================================
    // TABLE: invoices
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        customer_id uuid,
        customer_name varchar(255),

        -- Invoice details
        invoice_number varchar(50) NOT NULL,
        issue_date date NOT NULL,
        due_date date NOT NULL,
        status billing_invoice_status_enum NOT NULL DEFAULT 'draft',

        -- Financial
        subtotal decimal(15, 2) NOT NULL,
        tax_amount decimal(15, 2) NOT NULL DEFAULT 0,
        discount_amount decimal(15, 2) NOT NULL DEFAULT 0,
        total_amount decimal(15, 2) NOT NULL,
        paid_amount decimal(15, 2) NOT NULL DEFAULT 0,
        currency varchar(3) NOT NULL DEFAULT 'UZS',

        -- Line items (JSONB array)
        line_items jsonb NOT NULL,

        -- Notes & metadata
        notes text,
        paid_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for invoices
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_organization_id
        ON invoices(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_customer_id
        ON invoices(customer_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_status
        ON invoices(status)
    `);

    // Partial unique index on invoice_number (soft-delete aware)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_number_unique
        ON invoices(invoice_number)
        WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_due_date
        ON invoices(due_date)
    `);

    // ========================================================================
    // TABLE: billing_payments
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_payments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Relations
        organization_id uuid NOT NULL,
        invoice_id uuid NOT NULL,

        -- Payment details
        payment_number varchar(50),
        amount decimal(15, 2) NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'UZS',
        payment_method billing_payment_method_enum NOT NULL,
        status billing_payment_status_enum NOT NULL DEFAULT 'pending',
        payment_date date NOT NULL,

        -- Reference
        reference_number varchar(100),

        -- Notes & metadata
        notes text,
        metadata jsonb NOT NULL DEFAULT '{}',

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for billing_payments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_payments_organization_id
        ON billing_payments(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_payments_invoice_id
        ON billing_payments(invoice_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_payments_status
        ON billing_payments(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_payments_payment_date
        ON billing_payments(payment_date)
    `);

    // -- FK: billing_payments -> invoices
    await queryRunner.query(`
      ALTER TABLE billing_payments
        ADD CONSTRAINT fk_billing_payments_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop FK constraints
    await queryRunner.query(`ALTER TABLE billing_payments DROP CONSTRAINT IF EXISTS fk_billing_payments_invoice`);

    // -- Drop indexes for billing_payments
    await queryRunner.query(`DROP INDEX IF EXISTS idx_billing_payments_payment_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_billing_payments_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_billing_payments_invoice_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_billing_payments_organization_id`);

    // -- Drop indexes for invoices
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_due_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_invoice_number_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_customer_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_organization_id`);

    // -- Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS billing_payments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoices CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS billing_payment_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS billing_payment_method_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS billing_invoice_status_enum`);
  }
}
