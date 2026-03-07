import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAchievementTables1714200000000 implements MigrationInterface {
  name = "AddAchievementTables1714200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create achievements table
    await queryRunner.query(`
      CREATE TABLE "achievements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "title_uz" varchar(255),
        "description" text NOT NULL,
        "description_uz" text,
        "icon" varchar(100) NOT NULL DEFAULT 'trophy',
        "category" varchar(50) NOT NULL DEFAULT 'beginner',
        "rarity" varchar(50) NOT NULL DEFAULT 'common',
        "condition_type" varchar(50) NOT NULL,
        "condition_value" integer NOT NULL,
        "conditions" jsonb,
        "points_reward" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_hidden" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_achievements" PRIMARY KEY ("id")
      )
    `);

    // Create user_achievements table
    await queryRunner.query(`
      CREATE TABLE "user_achievements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "achievement_id" uuid NOT NULL,
        "unlocked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "points_awarded" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_user_achievements" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_achievement" UNIQUE ("user_id", "achievement_id"),
        CONSTRAINT "FK_user_achievements_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_achievements_achievement" FOREIGN KEY ("achievement_id")
          REFERENCES "achievements"("id") ON DELETE CASCADE
      )
    `);

    // Indexes for achievements
    await queryRunner.query(`
      CREATE INDEX "IDX_achievements_organization_id"
        ON "achievements" ("organization_id")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_achievements_category"
        ON "achievements" ("category")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_achievements_is_active"
        ON "achievements" ("is_active")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_achievements_sort_order"
        ON "achievements" ("sort_order")
        WHERE "deleted_at" IS NULL
    `);

    // Indexes for user_achievements
    await queryRunner.query(`
      CREATE INDEX "IDX_user_achievements_organization_id"
        ON "user_achievements" ("organization_id")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_achievements_user_id"
        ON "user_achievements" ("user_id")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_achievements_achievement_id"
        ON "user_achievements" ("achievement_id")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_achievements_unlocked_at"
        ON "user_achievements" ("unlocked_at")
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_achievements_unlocked_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_achievements_achievement_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_achievements_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_achievements_organization_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_achievements_sort_order"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_achievements_is_active"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_achievements_category"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_achievements_organization_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_achievements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "achievements"`);
  }
}
