import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add new AlertMetric enum values for Lifecycle Traceability (Spec v2 Section 4.10):
 * - component_cycles: mixer/grinder cycle count exceeded
 * - flush_due: cups since last flush exceeded threshold
 * - cleaning_due: days since deep cleaning exceeded
 * - expiry_warning: batch expiry approaching
 * - inventory_mismatch: stocktake discrepancy above tolerance
 * - consumable_low: cups/lids below threshold
 */
export class ExtendAlertMetricEnum1774300100000 implements MigrationInterface {
  name = "ExtendAlertMetricEnum1774300100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the enum type exists before altering
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'alert_rules_metric_enum'
    `);

    if (enumExists.length > 0) {
      const newValues = [
        "component_cycles",
        "flush_due",
        "cleaning_due",
        "expiry_warning",
        "inventory_mismatch",
        "consumable_low",
      ];

      for (const val of newValues) {
        // Only add if not already present
        const exists = await queryRunner.query(`
          SELECT 1 FROM pg_enum
          WHERE enumlabel = '${val}'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'alert_rules_metric_enum')
        `);
        if (exists.length === 0) {
          await queryRunner.query(`
            ALTER TYPE "alert_rules_metric_enum" ADD VALUE IF NOT EXISTS '${val}'
          `);
        }
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly.
    // Downgrade would require recreating the enum type, which is destructive.
    // Leaving the extra values is safe — they just won't be used.
  }
}
