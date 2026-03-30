import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add Lifecycle Traceability tables:
 * - entity_events: unified business event timeline
 * - batch_movements: ingredient/material flow tracking
 * - sale_ingredients: per-sale cost-of-goods breakdown
 * - containers.current_batch_id: batch→bunker traceability
 */
export class AddLifecycleTraceability1774300000000 implements MigrationInterface {
  name = "AddLifecycleTraceability1774300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ================================================================
    // 1. entity_events
    // ================================================================
    await queryRunner.query(`
      CREATE TABLE "entity_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "entity_id" uuid NOT NULL,
        "entity_type" varchar(50) NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "event_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "performed_by" uuid NOT NULL,
        "related_entity_id" uuid,
        "related_event_id" uuid,
        "quantity" decimal(15,3),
        "document_number" varchar(100),
        "notes" text,
        "photos" jsonb,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_entity_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_entity_events_org" ON "entity_events" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_entity_events_entity" ON "entity_events" ("entity_id", "entity_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_entity_events_type" ON "entity_events" ("entity_type", "event_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_entity_events_date" ON "entity_events" ("event_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_entity_events_performer" ON "entity_events" ("performed_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_entity_events_org_entity_date" ON "entity_events" ("organization_id", "entity_id", "event_date" DESC)`,
    );

    // ================================================================
    // 2. batch_movements
    // ================================================================
    await queryRunner.query(`
      CREATE TABLE "batch_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "batch_id" uuid NOT NULL,
        "event_id" uuid,
        "movement_type" varchar(30) NOT NULL,
        "quantity" decimal(12,3) NOT NULL,
        "container_id" uuid,
        "machine_id" uuid,
        "mixed_with_batch_id" uuid,
        "mix_ratio" jsonb,
        "performed_by" uuid NOT NULL,
        "notes" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_batch_movements" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_movements_org" ON "batch_movements" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_movements_batch" ON "batch_movements" ("batch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_movements_batch_type" ON "batch_movements" ("batch_id", "movement_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_movements_container" ON "batch_movements" ("container_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_movements_machine" ON "batch_movements" ("machine_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_batch_movements_event" ON "batch_movements" ("event_id")`,
    );

    // ================================================================
    // 3. sale_ingredients
    // ================================================================
    await queryRunner.query(`
      CREATE TABLE "sale_ingredients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "transaction_id" uuid NOT NULL,
        "ingredient_id" uuid NOT NULL,
        "batch_id" uuid NOT NULL,
        "container_id" uuid,
        "quantity_used" decimal(12,3) NOT NULL,
        "unit_cost_at_time" decimal(15,2) NOT NULL,
        "cost_total" decimal(15,2) NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_sale_ingredients" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sale_ingredients_org" ON "sale_ingredients" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sale_ingredients_tx" ON "sale_ingredients" ("transaction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sale_ingredients_batch" ON "sale_ingredients" ("batch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sale_ingredients_ingredient" ON "sale_ingredients" ("ingredient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sale_ingredients_container" ON "sale_ingredients" ("container_id")`,
    );

    // ================================================================
    // 4. Add current_batch_id to containers
    // ================================================================
    await queryRunner.query(
      `ALTER TABLE "containers" ADD "current_batch_id" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "containers" DROP COLUMN IF EXISTS "current_batch_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_ingredients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "batch_movements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "entity_events"`);
  }
}
