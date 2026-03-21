import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add extensibility tables per Spec v2 Section 6.5 + 7.8:
 * - entity_custom_tabs: admin-defined tabs on entity cards
 * - entity_custom_fields: admin-defined fields with type/validation
 * Values stored in entity metadata JSONB under "customFields" key.
 */
export class AddCustomFieldsTables1774300200000 implements MigrationInterface {
  name = "AddCustomFieldsTables1774300200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create field type enum
    await queryRunner.query(`
      CREATE TYPE "custom_field_type_enum" AS ENUM (
        'text', 'number', 'date', 'select', 'file',
        'boolean', 'url', 'email', 'phone', 'textarea'
      )
    `);

    // entity_custom_tabs
    await queryRunner.query(`
      CREATE TABLE "entity_custom_tabs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "entity_type" varchar(50) NOT NULL,
        "tab_name" varchar(100) NOT NULL,
        "tab_name_uz" varchar(100),
        "tab_icon" varchar(50),
        "sort_order" int NOT NULL DEFAULT 100,
        "visibility_roles" jsonb NOT NULL DEFAULT '[]',
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_entity_custom_tabs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_custom_tabs_org" ON "entity_custom_tabs" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_custom_tabs_org_type" ON "entity_custom_tabs" ("organization_id", "entity_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_custom_tabs_org_type_sort" ON "entity_custom_tabs" ("organization_id", "entity_type", "sort_order")`,
    );

    // entity_custom_fields
    await queryRunner.query(`
      CREATE TABLE "entity_custom_fields" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "entity_type" varchar(50) NOT NULL,
        "field_key" varchar(100) NOT NULL,
        "field_label" varchar(200) NOT NULL,
        "field_label_uz" varchar(200),
        "field_type" "custom_field_type_enum" NOT NULL DEFAULT 'text',
        "tab_name" varchar(100),
        "is_required" boolean NOT NULL DEFAULT false,
        "sort_order" int NOT NULL DEFAULT 0,
        "options" jsonb,
        "default_value" varchar(500),
        "placeholder" varchar(200),
        "help_text" varchar(500),
        "validation_min" decimal(15,2),
        "validation_max" decimal(15,2),
        "validation_pattern" varchar(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_entity_custom_fields" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_custom_fields_org" ON "entity_custom_fields" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_custom_fields_org_type" ON "entity_custom_fields" ("organization_id", "entity_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_custom_fields_org_type_tab" ON "entity_custom_fields" ("organization_id", "entity_type", "tab_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_custom_fields_org_type_sort" ON "entity_custom_fields" ("organization_id", "entity_type", "sort_order")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "entity_custom_fields"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "entity_custom_tabs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "custom_field_type_enum"`);
  }
}
