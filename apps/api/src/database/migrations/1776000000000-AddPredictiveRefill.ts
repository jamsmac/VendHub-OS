import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPredictiveRefill1776000000000 implements MigrationInterface {
  name = "AddPredictiveRefill1776000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE refill_action_enum AS ENUM ('refill_now', 'refill_soon', 'monitor');
    `);

    await queryRunner.query(`
      CREATE TABLE consumption_rates (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        slot_id VARCHAR(64),
        rate_per_day DECIMAL(10, 4) DEFAULT 0 NOT NULL,
        period_days INTEGER NOT NULL,
        sample_size INTEGER DEFAULT 0 NOT NULL,
        last_calculated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMPTZ,
        created_by_id UUID,
        updated_by_id UUID,
        UNIQUE (organization_id, machine_id, product_id, period_days)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_consumption_rates_org_calculated
        ON consumption_rates (organization_id, last_calculated_at);
    `);

    await queryRunner.query(`
      CREATE TABLE refill_recommendations (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        slot_id VARCHAR(64),
        current_stock INTEGER NOT NULL,
        capacity INTEGER NOT NULL,
        daily_rate DECIMAL(10, 4) NOT NULL,
        days_of_supply DECIMAL(6, 2) NOT NULL,
        priority_score DECIMAL(10, 4) DEFAULT 0 NOT NULL,
        recommended_action refill_action_enum DEFAULT 'monitor' NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL,
        acted_upon_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMPTZ,
        created_by_id UUID,
        updated_by_id UUID,
        UNIQUE (organization_id, machine_id, product_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refill_recommendations_org_priority
        ON refill_recommendations (organization_id, priority_score DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refill_recommendations_org_action
        ON refill_recommendations (organization_id, recommended_action);
    `);

    await queryRunner.query(`
      ALTER TYPE alert_metric_enum ADD VALUE IF NOT EXISTS 'predicted_stockout';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refill_recommendations;`);
    await queryRunner.query(`DROP TABLE IF EXISTS consumption_rates;`);
    await queryRunner.query(`DROP TYPE IF EXISTS refill_action_enum;`);
  }
}
