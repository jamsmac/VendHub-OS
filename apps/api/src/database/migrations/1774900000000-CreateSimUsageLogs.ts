import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Create sim_usage_logs table for tracking monthly SIM data usage per machine.
 */
export class CreateSimUsageLogs1774900000000 implements MigrationInterface {
  name = "CreateSimUsageLogs1774900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sim_usage_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "component_id" uuid NOT NULL,
        "machine_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "data_used_mb" decimal(10,2) NOT NULL DEFAULT 0,
        "data_limit_mb" decimal(10,2),
        "cost" decimal(12,2) NOT NULL DEFAULT 0,
        "currency" varchar(10) NOT NULL DEFAULT 'UZS',
        "notes" text,
        CONSTRAINT "PK_sim_usage_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sim_usage_logs_component" FOREIGN KEY ("component_id")
          REFERENCES "machine_components"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sim_usage_logs_machine" FOREIGN KEY ("machine_id")
          REFERENCES "machines"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_sim_usage_logs_component" ON "sim_usage_logs" ("component_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sim_usage_logs_machine" ON "sim_usage_logs" ("machine_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sim_usage_logs_period" ON "sim_usage_logs" ("period_start", "period_end")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sim_usage_logs_org" ON "sim_usage_logs" ("organization_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sim_usage_logs"`);
  }
}
