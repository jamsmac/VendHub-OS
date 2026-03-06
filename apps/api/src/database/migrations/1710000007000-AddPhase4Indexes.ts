import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddPhase4Indexes
 *
 * Adds composite and optimized partial indexes across Phase 4 tables
 * to accelerate common query patterns:
 * - Payment transaction lookups by provider/status and date ranges
 * - Telegram analytics and message log time-series queries
 * - Import session progress dashboards
 * - Client activity feeds and order history
 * - Active promo code lookups
 * - HR attendance, payroll, and leave queries
 */
export class AddPhase4Indexes1710000007000 implements MigrationInterface {
  name = "AddPhase4Indexes1710000007000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper: safely create index, skip if table/column doesn't exist
    const safeIndex = async (sql: string) => {
      await queryRunner.query(`
        DO $$ BEGIN
          ${sql};
        EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
        END $$
      `);
    };

    // PAYMENT PERFORMANCE INDEXES
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_status ON payment_transactions(provider, status) WHERE deleted_at IS NULL`,
    );

    // TELEGRAM ANALYTICS INDEXES
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_telegram_analytics_date ON telegram_bot_analytics(created_at DESC) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_telegram_messages_date ON telegram_message_logs(created_at DESC) WHERE deleted_at IS NULL`,
    );

    // IMPORT SESSION PERFORMANCE INDEXES
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_import_sessions_created ON import_sessions(created_at DESC) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_import_audit_logs_session ON import_audit_logs(session_id, executed_at DESC) WHERE deleted_at IS NULL`,
    );

    // CLIENT ACTIVITY INDEXES
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_client_orders_created ON client_orders(created_at DESC) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_client_users_activity ON client_users(last_activity_at DESC) WHERE deleted_at IS NULL AND is_active = true`,
    );

    // PROMO CODES ACTIVE LOOKUP
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(status, valid_from, valid_until) WHERE deleted_at IS NULL AND status = 'active'`,
    );

    // HR OPTIMIZED LOOKUPS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_attendances_month ON attendances(organization_id, date) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_payrolls_period ON payrolls(organization_id, period_start, period_end) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_dates ON leave_requests(start_date, end_date) WHERE deleted_at IS NULL AND status = 'approved'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- HR indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_leave_requests_approved_dates`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payrolls_period`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_attendances_month`);

    // -- Promo codes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_promo_codes_active`);

    // -- Client activity
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_users_activity`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_client_orders_created`);

    // -- Import sessions
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_import_audit_logs_session`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_sessions_created`);

    // -- Telegram
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_messages_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_analytics_date`);

    // -- Payments
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payment_transactions_provider_status`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payment_transactions_created_at`,
    );
  }
}
