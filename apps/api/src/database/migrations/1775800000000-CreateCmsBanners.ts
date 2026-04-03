import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCmsBanners1775800000000 implements MigrationInterface {
  name = "CreateCmsBanners1775800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "cms_banner_position_enum" AS ENUM ('hero', 'top', 'sidebar', 'popup', 'inline');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "cms_banner_status_enum" AS ENUM ('draft', 'active', 'scheduled', 'expired', 'archived');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Create table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cms_banners" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "title_ru" varchar(255) NOT NULL,
        "description_ru" text,
        "title_uz" varchar(255),
        "description_uz" text,
        "image_url" text,
        "image_url_mobile" text,
        "link_url" varchar(500),
        "button_text_ru" varchar(100),
        "button_text_uz" varchar(100),
        "position" "cms_banner_position_enum" NOT NULL DEFAULT 'hero',
        "status" "cms_banner_status_enum" NOT NULL DEFAULT 'draft',
        "sort_order" integer NOT NULL DEFAULT 0,
        "valid_from" timestamptz,
        "valid_until" timestamptz,
        "background_color" varchar(7),
        "text_color" varchar(7),
        "impressions" integer NOT NULL DEFAULT 0,
        "clicks" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        CONSTRAINT "PK_cms_banners" PRIMARY KEY ("id")
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_banners_org_status"
        ON "cms_banners" ("organization_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_banners_org_position"
        ON "cms_banners" ("organization_id", "position");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_cms_banners_org_sort"
        ON "cms_banners" ("organization_id", "sort_order");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cms_banners" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cms_banner_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "cms_banner_position_enum";`);
  }
}
