import { MigrationInterface, QueryRunner } from "typeorm";

export class PredictiveRefillPhase31776100000000 implements MigrationInterface {
  name = "PredictiveRefillPhase31776100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pricing columns to refill_recommendations
    await queryRunner.query(`
      ALTER TABLE refill_recommendations
        ADD COLUMN selling_price DECIMAL(12,2) DEFAULT 0,
        ADD COLUMN cost_price DECIMAL(12,2) DEFAULT 0,
        ADD COLUMN margin DECIMAL(12,2) DEFAULT 0,
        ADD COLUMN daily_profit DECIMAL(12,2) DEFAULT 0
    `);

    // Seed PREDICTED_STOCKOUT alert rule for each active org
    await queryRunner.query(`
      INSERT INTO alert_rules (
        id, organization_id, name, description, metric, condition,
        threshold, severity, machine_id, notify_channels, notify_user_ids,
        cooldown_minutes, is_active, metadata, created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        o.id,
        'Прогноз дефицита',
        'Предупреждение о скором окончании товара на основе EWMA прогноза',
        'predicted_stockout',
        'less_than',
        2,
        'critical',
        NULL,
        '["in_app", "telegram"]'::jsonb,
        '[]'::jsonb,
        1440,
        true,
        '{}'::jsonb,
        NOW(),
        NOW()
      FROM organizations o
      WHERE o.deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM alert_rules WHERE metric = 'predicted_stockout'
    `);
    await queryRunner.query(`
      ALTER TABLE refill_recommendations
        DROP COLUMN selling_price,
        DROP COLUMN cost_price,
        DROP COLUMN margin,
        DROP COLUMN daily_profit
    `);
  }
}
