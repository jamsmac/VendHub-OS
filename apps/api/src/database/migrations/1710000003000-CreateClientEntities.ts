import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateClientEntities
 *
 * Phase 4 - Step 4:
 * 1. CREATE TABLE client_users - B2C end-customers (Telegram, app users)
 * 2. CREATE TABLE client_wallets - customer wallet balances
 * 3. CREATE TABLE client_wallet_ledger - immutable wallet transaction log
 * 4. CREATE TABLE client_loyalty_accounts - loyalty points & tier tracking
 * 5. CREATE TABLE client_loyalty_ledger - immutable loyalty points transaction log
 * 6. CREATE TABLE client_orders - B2C purchase orders from vending machines
 * 7. CREATE TABLE client_payments - payment transactions for client orders
 *
 * Supports the full B2C customer lifecycle: registration, wallet top-up,
 * loyalty rewards, order placement, multi-provider payment, and refunds.
 */
export class CreateClientEntities1710000003000 implements MigrationInterface {
  name = 'CreateClientEntities1710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: wallet_transaction_type_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE wallet_transaction_type_enum AS ENUM (
          'TOP_UP',
          'PURCHASE',
          'REFUND',
          'MANUAL_ADJUSTMENT',
          'BONUS'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: loyalty_transaction_reason_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE loyalty_transaction_reason_enum AS ENUM (
          'ORDER_EARNED',
          'ORDER_REDEEMED',
          'ORDER_REFUND',
          'REFERRAL_BONUS',
          'PROMO_BONUS',
          'MANUAL_ADJUSTMENT',
          'EXPIRATION'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: client_order_status_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE client_order_status_enum AS ENUM (
          'PENDING',
          'PAID',
          'DISPENSING',
          'COMPLETED',
          'FAILED',
          'CANCELLED',
          'REFUNDED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: client_payment_status_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE client_payment_status_enum AS ENUM (
          'PENDING',
          'SUCCESS',
          'FAILED',
          'REFUNDED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // TABLE: client_users
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization (nullable for unlinked users)
        organization_id uuid,

        -- Identity
        telegram_id varchar(50),
        phone varchar(20),
        email varchar(255),
        first_name varchar(100),
        last_name varchar(100),
        username varchar(100),
        avatar_url varchar(500),

        -- Preferences
        language varchar(5) NOT NULL DEFAULT 'ru',

        -- Status
        is_verified boolean NOT NULL DEFAULT false,
        is_blocked boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,

        -- Activity
        last_activity_at timestamptz,

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

    // -- Indexes for client_users
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_users_telegram_id
        ON client_users(telegram_id)
        WHERE telegram_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_users_phone
        ON client_users(phone)
        WHERE phone IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_users_email
        ON client_users(email)
        WHERE email IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_users_organization_id
        ON client_users(organization_id)
    `);

    // ========================================================================
    // TABLE: client_wallets
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_wallets (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Owner
        client_user_id uuid NOT NULL,

        -- Organization
        organization_id uuid,

        -- Balance
        balance decimal(15, 2) NOT NULL DEFAULT 0,
        currency varchar(10) NOT NULL DEFAULT 'UZS',

        -- Status
        is_active boolean NOT NULL DEFAULT true,

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

    // -- Indexes for client_wallets
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_wallets_client_user_id
        ON client_wallets(client_user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_wallets_organization_id
        ON client_wallets(organization_id)
    `);

    // -- FK: client_wallets -> client_users
    await queryRunner.query(`
      ALTER TABLE client_wallets
        ADD CONSTRAINT fk_client_wallets_user
        FOREIGN KEY (client_user_id) REFERENCES client_users(id) ON DELETE CASCADE
    `);

    // ========================================================================
    // TABLE: client_wallet_ledger
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_wallet_ledger (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Wallet reference
        wallet_id uuid NOT NULL,

        -- Organization
        organization_id uuid,

        -- Transaction details
        transaction_type wallet_transaction_type_enum NOT NULL,
        amount decimal(15, 2) NOT NULL,
        balance_before decimal(15, 2) NOT NULL,
        balance_after decimal(15, 2) NOT NULL,

        -- Description and reference
        description text,
        reference_id uuid,
        reference_type varchar(50),

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

    // -- Indexes for client_wallet_ledger
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_wallet_ledger_wallet_created
        ON client_wallet_ledger(wallet_id, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_wallet_ledger_type
        ON client_wallet_ledger(transaction_type)
    `);

    // -- FK: client_wallet_ledger -> client_wallets
    await queryRunner.query(`
      ALTER TABLE client_wallet_ledger
        ADD CONSTRAINT fk_client_wallet_ledger_wallet
        FOREIGN KEY (wallet_id) REFERENCES client_wallets(id) ON DELETE CASCADE
    `);

    // ========================================================================
    // TABLE: client_loyalty_accounts
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_loyalty_accounts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Owner
        client_user_id uuid NOT NULL,

        -- Organization
        organization_id uuid,

        -- Points tracking
        points_balance integer NOT NULL DEFAULT 0,
        total_earned integer NOT NULL DEFAULT 0,
        total_redeemed integer NOT NULL DEFAULT 0,

        -- Tier
        tier varchar(20) NOT NULL DEFAULT 'bronze',
        tier_updated_at timestamptz,

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

    // -- Indexes for client_loyalty_accounts
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_loyalty_accounts_client_user_id
        ON client_loyalty_accounts(client_user_id)
    `);

    // -- FK: client_loyalty_accounts -> client_users
    await queryRunner.query(`
      ALTER TABLE client_loyalty_accounts
        ADD CONSTRAINT fk_client_loyalty_accounts_user
        FOREIGN KEY (client_user_id) REFERENCES client_users(id) ON DELETE CASCADE
    `);

    // ========================================================================
    // TABLE: client_loyalty_ledger
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_loyalty_ledger (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Account reference
        loyalty_account_id uuid NOT NULL,

        -- Organization
        organization_id uuid,

        -- Transaction details
        reason loyalty_transaction_reason_enum NOT NULL,
        points integer NOT NULL,
        balance_before integer NOT NULL,
        balance_after integer NOT NULL,

        -- Description and reference
        description text,
        reference_id uuid,
        reference_type varchar(50),

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

    // -- Indexes for client_loyalty_ledger
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_loyalty_ledger_account_created
        ON client_loyalty_ledger(loyalty_account_id, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_loyalty_ledger_reason
        ON client_loyalty_ledger(reason)
    `);

    // -- FK: client_loyalty_ledger -> client_loyalty_accounts
    await queryRunner.query(`
      ALTER TABLE client_loyalty_ledger
        ADD CONSTRAINT fk_client_loyalty_ledger_account
        FOREIGN KEY (loyalty_account_id) REFERENCES client_loyalty_accounts(id) ON DELETE CASCADE
    `);

    // ========================================================================
    // TABLE: client_orders
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_orders (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization
        organization_id uuid,

        -- Customer
        client_user_id uuid NOT NULL,

        -- Machine
        machine_id uuid,

        -- Order identification
        order_number varchar(50) NOT NULL,

        -- Status
        status client_order_status_enum NOT NULL DEFAULT 'PENDING',

        -- Items (JSONB array of {product_id, product_name, quantity, unit_price, total_price})
        items jsonb NOT NULL DEFAULT '[]',

        -- Amounts
        subtotal decimal(15, 2) NOT NULL,
        discount_amount decimal(15, 2) NOT NULL DEFAULT 0,
        loyalty_points_used integer NOT NULL DEFAULT 0,
        total_amount decimal(15, 2) NOT NULL,
        currency varchar(10) NOT NULL DEFAULT 'UZS',

        -- Promo
        promo_code_id uuid,
        loyalty_points_earned integer NOT NULL DEFAULT 0,
        loyalty_points_redeemed integer NOT NULL DEFAULT 0,

        -- Timestamps
        paid_at timestamptz,
        completed_at timestamptz,
        cancelled_at timestamptz,

        -- Notes
        cancellation_reason text,
        notes text,

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

    // -- Indexes for client_orders
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_client_orders_order_number
        ON client_orders(order_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_orders_client_status
        ON client_orders(client_user_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_orders_client_created
        ON client_orders(client_user_id, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_orders_machine_id
        ON client_orders(machine_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_orders_status
        ON client_orders(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_orders_organization_id
        ON client_orders(organization_id)
    `);

    // -- FK: client_orders -> client_users
    await queryRunner.query(`
      ALTER TABLE client_orders
        ADD CONSTRAINT fk_client_orders_user
        FOREIGN KEY (client_user_id) REFERENCES client_users(id) ON DELETE CASCADE
    `);

    // ========================================================================
    // TABLE: client_payments
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_payments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization
        organization_id uuid,

        -- References
        order_id uuid NOT NULL,
        client_user_id uuid NOT NULL,

        -- Provider
        provider varchar(20) NOT NULL,
        provider_payment_id varchar(255),

        -- Amount
        amount decimal(15, 2) NOT NULL,
        currency varchar(10) NOT NULL DEFAULT 'UZS',

        -- Status
        status client_payment_status_enum NOT NULL DEFAULT 'PENDING',

        -- Processing
        paid_at timestamptz,
        error_message text,

        -- Raw data
        raw_response jsonb,

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

    // -- Indexes for client_payments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_payments_order_id
        ON client_payments(order_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_payments_client_user_id
        ON client_payments(client_user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_payments_provider_status
        ON client_payments(provider, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_client_payments_provider_payment_id
        ON client_payments(provider_payment_id)
    `);

    // -- FK: client_payments -> client_orders
    await queryRunner.query(`
      ALTER TABLE client_payments
        ADD CONSTRAINT fk_client_payments_order
        FOREIGN KEY (order_id) REFERENCES client_orders(id) ON DELETE CASCADE
    `);

    // -- FK: client_payments -> client_users
    await queryRunner.query(`
      ALTER TABLE client_payments
        ADD CONSTRAINT fk_client_payments_user
        FOREIGN KEY (client_user_id) REFERENCES client_users(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop FK constraints
    await queryRunner.query(`ALTER TABLE client_payments DROP CONSTRAINT IF EXISTS fk_client_payments_user`);
    await queryRunner.query(`ALTER TABLE client_payments DROP CONSTRAINT IF EXISTS fk_client_payments_order`);
    await queryRunner.query(`ALTER TABLE client_orders DROP CONSTRAINT IF EXISTS fk_client_orders_user`);
    await queryRunner.query(`ALTER TABLE client_loyalty_ledger DROP CONSTRAINT IF EXISTS fk_client_loyalty_ledger_account`);
    await queryRunner.query(`ALTER TABLE client_loyalty_accounts DROP CONSTRAINT IF EXISTS fk_client_loyalty_accounts_user`);
    await queryRunner.query(`ALTER TABLE client_wallet_ledger DROP CONSTRAINT IF EXISTS fk_client_wallet_ledger_wallet`);
    await queryRunner.query(`ALTER TABLE client_wallets DROP CONSTRAINT IF EXISTS fk_client_wallets_user`);

    // -- Drop indexes for client_payments
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_payments_provider_payment_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_payments_provider_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_payments_client_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_payments_order_id`);

    // -- Drop indexes for client_orders
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_orders_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_orders_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_orders_machine_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_orders_client_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_orders_client_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_orders_order_number`);

    // -- Drop indexes for client_loyalty_ledger
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_loyalty_ledger_reason`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_loyalty_ledger_account_created`);

    // -- Drop indexes for client_loyalty_accounts
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_loyalty_accounts_client_user_id`);

    // -- Drop indexes for client_wallet_ledger
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_wallet_ledger_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_wallet_ledger_wallet_created`);

    // -- Drop indexes for client_wallets
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_wallets_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_wallets_client_user_id`);

    // -- Drop indexes for client_users
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_users_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_users_email`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_users_phone`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_users_telegram_id`);

    // -- Drop tables in reverse order (children first)
    await queryRunner.query(`DROP TABLE IF EXISTS client_payments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_orders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_loyalty_ledger CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_loyalty_accounts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_wallet_ledger CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_wallets CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_users CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS client_payment_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS client_order_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS loyalty_transaction_reason_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS wallet_transaction_type_enum`);
  }
}
