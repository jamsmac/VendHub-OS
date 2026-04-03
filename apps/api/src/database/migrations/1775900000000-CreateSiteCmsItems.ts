import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSiteCmsItems1775900000000 implements MigrationInterface {
  name = "CreateSiteCmsItems1775900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "site_cms_items" (
        "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
        "collection"      VARCHAR(50)  NOT NULL,
        "data"            JSONB        NOT NULL DEFAULT '{}',
        "sort_order"      INTEGER      NOT NULL DEFAULT 0,
        "is_active"       BOOLEAN      NOT NULL DEFAULT true,
        "organization_id" UUID         NOT NULL,
        "created_by_id"   UUID,
        "updated_by_id"   UUID,
        "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"      TIMESTAMPTZ,
        CONSTRAINT "PK_site_cms_items" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_site_cms_org_collection"
        ON "site_cms_items" ("organization_id", "collection");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_site_cms_org_collection_active_sort"
        ON "site_cms_items" ("organization_id", "collection", "is_active", "sort_order");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_site_cms_org_collection_active_sort";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_site_cms_org_collection";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "site_cms_items";`);
  }
}
