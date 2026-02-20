import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: AddPhase3Indexes
 *
 * Adds supplementary cross-table and composite indexes for Phase 3 tables
 * to optimize common query patterns:
 * - Transaction lookups by counterparty and contract (expense/commission flows)
 * - Purchase history date-range queries filtered by organization
 * - Opening balance lookups for unapplied balances per warehouse
 * - Sales import progress queries
 */
export class AddPhase3Indexes1709000007000 implements MigrationInterface {
  name = 'AddPhase3Indexes1709000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // TRANSACTIONS: Additional indexes for Phase 3 query patterns
    // ========================================================================

    // -- Index on counterparty_id for expense tracking and supplier-linked transactions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_counterparty_id
        ON transactions(counterparty_id)
        WHERE counterparty_id IS NOT NULL
    `);

    // -- Index on contract_id for commission calculation queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_contract_id
        ON transactions(contract_id)
        WHERE contract_id IS NOT NULL
    `);

    // -- Composite index: organization + type + date range (common report query)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_org_type_date
        ON transactions(organization_id, type, transaction_date)
    `);

    // -- Composite index: organization + expense_category (expense reports)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_org_expense_category
        ON transactions(organization_id, expense_category)
        WHERE expense_category IS NOT NULL
    `);

    // ========================================================================
    // PURCHASE_HISTORY: Composite indexes for common queries
    // ========================================================================

    // -- Composite: organization + purchase date range (monthly purchase reports)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_org_date
        ON purchase_history(organization_id, purchase_date)
    `);

    // -- Composite: organization + supplier + status (supplier purchase tracking)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_org_supplier_status
        ON purchase_history(organization_id, supplier_id, status)
        WHERE supplier_id IS NOT NULL
    `);

    // -- Composite: product + warehouse (product stock analysis from purchases)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_history_product_warehouse
        ON purchase_history(product_id, warehouse_id)
    `);

    // ========================================================================
    // STOCK_OPENING_BALANCES: Composite indexes for common queries
    // ========================================================================

    // -- Composite: organization + warehouse + is_applied (unapplied balances per warehouse)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_opening_balances_org_warehouse_applied
        ON stock_opening_balances(organization_id, warehouse_id, is_applied)
    `);

    // -- Composite: organization + balance_date (period-based balance queries)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_opening_balances_org_date
        ON stock_opening_balances(organization_id, balance_date)
    `);

    // -- Composite: product + warehouse + balance_date (product balance history)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_opening_balances_product_warehouse_date
        ON stock_opening_balances(product_id, warehouse_id, balance_date)
    `);

    // ========================================================================
    // SALES_IMPORTS: Composite indexes for common queries
    // ========================================================================

    // -- Composite: organization + status (active import jobs dashboard)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_imports_org_status
        ON sales_imports(organization_id, status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop sales_imports composite indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sales_imports_org_status`);

    // -- Drop stock_opening_balances composite indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_opening_balances_product_warehouse_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_opening_balances_org_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_opening_balances_org_warehouse_applied`);

    // -- Drop purchase_history composite indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_product_warehouse`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_org_supplier_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_purchase_history_org_date`);

    // -- Drop transactions additional indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_org_expense_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_org_type_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_contract_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_counterparty_id`);
  }
}
