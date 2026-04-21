import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPerformanceIndexes1776200000000 implements MigrationInterface {
  name = "AddPerformanceIndexes1776200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Transactions: composite (org + date) for date-range analytics / sparklines
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_org_date
        ON transactions (organization_id, transaction_date DESC)
    `);

    // Transactions: composite (machine + date) for per-machine analytics,
    // partial index to skip rows where machine_id is NULL
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_machine_date
        ON transactions (machine_id, transaction_date DESC)
        WHERE machine_id IS NOT NULL
    `);

    // transaction_items: product_id and transaction_id single-column indexes
    // already exist via @Index decorators on the entity — skipped to avoid duplicates

    // Machine slots: composite (machine + product) for predictive-refill joins,
    // partial index to skip empty slots (product_id IS NULL)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_machine_slots_machine_product
        ON machine_slots (machine_id, product_id)
        WHERE product_id IS NOT NULL
    `);

    // Routes: composite (org + status + planned_date) for "today's active routes"
    // dashboard queries that filter on all three columns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_org_status_date
        ON routes (organization_id, status, planned_date DESC)
    `);

    // Route stops: (route_id, sequence) for ordered stop fetching.
    // The existing unique index on (route_id, sequence) is partial
    // (WHERE deleted_at IS NULL), so a full non-partial index is still useful
    // for queries that include soft-deleted stops.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_route_stops_route
        ON route_stops (route_id, sequence)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_route_stops_route`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_routes_org_status_date`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_machine_slots_machine_product`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_transactions_machine_date`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_org_date`);
  }
}
