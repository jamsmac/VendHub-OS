import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Create machine_templates table and add templateId + contentModel to machines.
 *
 * MachineTemplate is a "blueprint" for creating machines:
 * - Defines content model (containers vs slots vs mixed)
 * - Stores default bunkers, slots, and components as JSONB
 * - Referenced by machines via template_id FK
 */
export class CreateMachineTemplates1775100000000 implements MigrationInterface {
  name = "CreateMachineTemplates1775100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create content_model enum
    await queryRunner.query(`
      CREATE TYPE "content_model_enum"
        AS ENUM ('containers', 'slots', 'mixed')
    `);

    // ── machine_templates table ──
    await queryRunner.query(`
      CREATE TABLE "machine_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "type" "machines_type_enum" NOT NULL,
        "content_model" "content_model_enum" NOT NULL,
        "manufacturer" varchar(100),
        "model" varchar(100),
        "description" text,
        "image_url" text,
        "max_product_slots" int NOT NULL DEFAULT 0,
        "default_containers" jsonb NOT NULL DEFAULT '[]',
        "default_slots" jsonb NOT NULL DEFAULT '[]',
        "default_components" jsonb NOT NULL DEFAULT '[]',
        "accepts_cash" boolean NOT NULL DEFAULT true,
        "accepts_card" boolean NOT NULL DEFAULT false,
        "accepts_qr" boolean NOT NULL DEFAULT false,
        "accepts_nfc" boolean NOT NULL DEFAULT false,
        "is_system" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_machine_templates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_machine_templates_org" ON "machine_templates" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_machine_templates_type" ON "machine_templates" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_machine_templates_active" ON "machine_templates" ("is_active")`,
    );

    // ── Add template_id and content_model to machines ──
    await queryRunner.query(`
      ALTER TABLE "machines"
        ADD COLUMN "template_id" uuid,
        ADD COLUMN "content_model" "content_model_enum" NOT NULL DEFAULT 'slots'
    `);

    await queryRunner.query(`
      ALTER TABLE "machines"
        ADD CONSTRAINT "FK_machines_template"
        FOREIGN KEY ("template_id") REFERENCES "machine_templates"("id")
        ON DELETE SET NULL
    `);

    // Back-fill content_model based on existing machine type
    await queryRunner.query(`
      UPDATE "machines" SET "content_model" = 'containers'
      WHERE "type" IN ('coffee', 'water')
    `);
    await queryRunner.query(`
      UPDATE "machines" SET "content_model" = 'mixed'
      WHERE "type" = 'combo'
    `);
    // slots is already the default for snack/drink/fresh/ice_cream
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "machines" DROP CONSTRAINT IF EXISTS "FK_machines_template"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" DROP COLUMN IF EXISTS "content_model"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" DROP COLUMN IF EXISTS "template_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_templates"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "content_model_enum"`);
  }
}
