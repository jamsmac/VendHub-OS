import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: DatabaseOptimizationIndexes
 *
 * Phase 5.5 -- Comprehensive index optimization across all entities.
 * Adds MISSING composite and partial indexes to accelerate common query patterns:
 *
 * 1. Missing (organization_id, status) composites on high-traffic tables
 * 2. Missing (organization_id, created_at) composites for time-sorted listings
 * 3. Missing FK indexes on columns used in JOINs
 * 4. Missing composite indexes for common dashboard/report query patterns
 * 5. Partial indexes on soft-deleted records (WHERE deleted_at IS NULL)
 *
 * All statements use CREATE INDEX IF NOT EXISTS for idempotent safety.
 */
export class DatabaseOptimizationIndexes1710000010000 implements MigrationInterface {
  name = "DatabaseOptimizationIndexes1710000010000";

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

    // 1. MACHINES
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_machines_org_status ON machines(organization_id, status) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_machines_org_created ON machines(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 2. USERS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_users_org_status ON users(organization_id, status) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_users_org_created ON users(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 3. TRANSACTIONS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_transactions_org_status ON transactions(organization_id, status) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_transactions_org_created ON transactions(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_transactions_machine_created ON transactions(machine_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 4. TASKS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_tasks_org_created ON tasks(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 5. PRODUCTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active) WHERE deleted_at IS NULL`,
    );

    // 6. COLLECTION RECORDS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_collection_records_org_created ON collection_records(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 7. EMPLOYEES
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL`,
    );

    // 8. PAYMENT TRANSACTIONS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_payment_transactions_client_user ON payment_transactions(client_user_id) WHERE client_user_id IS NOT NULL AND deleted_at IS NULL`,
    );

    // 9. CLIENT LOYALTY ACCOUNTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_client_loyalty_accounts_org ON client_loyalty_accounts(organization_id) WHERE organization_id IS NOT NULL`,
    );

    // 10. CLIENT WALLET LEDGER
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_client_wallet_ledger_org ON client_wallet_ledger(organization_id) WHERE organization_id IS NOT NULL`,
    );

    // 11. CLIENT LOYALTY LEDGER
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_client_loyalty_ledger_org ON client_loyalty_ledger(organization_id) WHERE organization_id IS NOT NULL`,
    );

    // 12. PROMO CODE REDEMPTIONS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_org ON promo_code_redemptions(organization_id) WHERE deleted_at IS NULL`,
    );

    // 13. FISCAL RECEIPTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_fiscal_receipts_status_pending ON fiscal_receipts(status, retry_count) WHERE deleted_at IS NULL AND status IN ('pending', 'failed')`,
    );

    // 14. FISCAL QUEUE
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_fiscal_queue_retry ON fiscal_queue(status, next_retry_at) WHERE deleted_at IS NULL AND status IN ('pending', 'retry')`,
    );

    // 15. SECURITY EVENTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_security_events_org_created ON security_events(organization_id, created_at DESC) WHERE organization_id IS NOT NULL`,
    );

    // 16. INCIDENTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_incidents_org_status ON incidents(organization_id, status) WHERE deleted_at IS NULL`,
    );

    // 17. ROUTES
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_routes_org_planned ON routes(organization_id, planned_date) WHERE deleted_at IS NULL`,
    );

    // 18. ALERT HISTORY
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_alert_history_org_triggered ON alert_history(organization_id, triggered_at DESC) WHERE deleted_at IS NULL`,
    );

    // 19. RECONCILIATION RUNS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_reconciliation_runs_org_created ON reconciliation_runs(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 20. INVOICES
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status) WHERE deleted_at IS NULL`,
    );

    // 21. INVENTORY MOVEMENTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_opdate ON inventory_movements(organization_id, operation_date DESC) WHERE deleted_at IS NULL`,
    );

    // 22. ORGANIZATION INVITATIONS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_org_invitations_org_status ON organization_invitations(organization_id, status) WHERE deleted_at IS NULL`,
    );

    // 23. ORGANIZATION AUDIT LOGS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_org_audit_logs_org_created ON organization_audit_logs(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 24. STOCK MOVEMENTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_stock_movements_org_requested ON stock_movements(organization_id, requested_at DESC) WHERE deleted_at IS NULL`,
    );

    // 25. GENERATED REPORTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_generated_reports_generating ON generated_reports(organization_id, started_at) WHERE deleted_at IS NULL AND status = 'generating'`,
    );

    // 26. TELEGRAM PAYMENTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_telegram_payments_org_status ON telegram_payments(organization_id, status) WHERE deleted_at IS NULL`,
    );

    // 27. MAINTENANCE REQUESTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_maintenance_requests_org_created ON maintenance_requests(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 28. WORK LOGS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_work_logs_org_created ON work_logs(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 29. COMPLAINTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_complaints_org_priority ON complaints(organization_id, priority) WHERE deleted_at IS NULL AND status NOT IN ('resolved', 'closed')`,
    );

    // 30. MACHINE ERROR LOGS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_machine_error_logs_machine_time ON machine_error_logs(machine_id, occurred_at DESC) WHERE deleted_at IS NULL`,
    );

    // 31. NOTIFICATIONS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 32. ORDERS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_orders_org_created ON orders(organization_id, created_at DESC) WHERE deleted_at IS NULL`,
    );

    // 33. REFERRALS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_referrals_pending ON referrals(organization_id, created_at) WHERE deleted_at IS NULL AND status = 'pending'`,
    );

    // 34. LOCATION CONTRACTS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_location_contracts_org_expiry ON location_contracts(organization_id, end_date) WHERE deleted_at IS NULL AND status = 'active'`,
    );

    // 35. INTEGRATION WEBHOOKS
    await safeIndex(
      `CREATE INDEX IF NOT EXISTS idx_integration_webhooks_unprocessed ON integration_webhooks(organization_id, created_at) WHERE deleted_at IS NULL AND processed = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order

    // 35. Integration webhooks
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_integration_webhooks_unprocessed`,
    );

    // 34. Location contracts expiry
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_location_contracts_org_expiry`,
    );

    // 33. Referrals pending
    await queryRunner.query(`DROP INDEX IF EXISTS idx_referrals_pending`);

    // 32. Orders org+created
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_org_created`);

    // 31. Notifications user+created
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_notifications_user_created`,
    );

    // 30. Machine error logs machine+time
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_machine_error_logs_machine_time`,
    );

    // 29. Complaints org+priority
    await queryRunner.query(`DROP INDEX IF EXISTS idx_complaints_org_priority`);

    // 28. Work logs org+created
    await queryRunner.query(`DROP INDEX IF EXISTS idx_work_logs_org_created`);

    // 27. Maintenance requests org+created
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_maintenance_requests_org_created`,
    );

    // 26. Telegram payments org+status
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_telegram_payments_org_status`,
    );

    // 25. Generated reports generating
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_generated_reports_generating`,
    );

    // 24. Stock movements org+requested
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_stock_movements_org_requested`,
    );

    // 23. Org audit logs org+created
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_org_audit_logs_org_created`,
    );

    // 22. Org invitations org+status
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_org_invitations_org_status`,
    );

    // 21. Inventory movements org+opdate
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_inventory_movements_org_opdate`,
    );

    // 20. Invoices org+status
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_org_status`);

    // 19. Reconciliation runs org+created
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_reconciliation_runs_org_created`,
    );

    // 18. Alert history org+triggered
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_alert_history_org_triggered`,
    );

    // 17. Routes org+planned
    await queryRunner.query(`DROP INDEX IF EXISTS idx_routes_org_planned`);

    // 16. Incidents org+status
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_org_status`);

    // 15. Security events org+created
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_security_events_org_created`,
    );

    // 14. Fiscal queue retry
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fiscal_queue_retry`);

    // 13. Fiscal receipts status pending
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_fiscal_receipts_status_pending`,
    );

    // 12. Promo code redemptions org
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_promo_code_redemptions_org`,
    );

    // 11. Client loyalty ledger org
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_client_loyalty_ledger_org`,
    );

    // 10. Client wallet ledger org
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_client_wallet_ledger_org`,
    );

    // 9. Client loyalty accounts org
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_client_loyalty_accounts_org`,
    );

    // 8. Payment transactions client_user
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payment_transactions_client_user`,
    );

    // 7. Employees user_id
    await queryRunner.query(`DROP INDEX IF EXISTS idx_employees_user_id`);

    // 6. Collection records org+created
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_collection_records_org_created`,
    );

    // 5. Products org+active
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_org_active`);

    // 4. Tasks org+created
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_org_created`);

    // 3. Transactions machine+created
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_transactions_machine_created`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_transactions_org_created`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_org_status`);

    // 2. Users org+created, org+status
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_org_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_org_status`);

    // 1. Machines org+created, org+status
    await queryRunner.query(`DROP INDEX IF EXISTS idx_machines_org_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_machines_org_status`);
  }
}
