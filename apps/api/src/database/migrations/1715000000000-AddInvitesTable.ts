import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvitesTable1715000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create invite_status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "invite_status_enum" AS ENUM ('active', 'used', 'expired', 'revoked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create invites table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(24) NOT NULL,
        "role" "users_role_enum" NOT NULL,
        "organization_id" uuid NOT NULL,
        "status" "invite_status_enum" NOT NULL DEFAULT 'active',
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "max_uses" int NOT NULL DEFAULT 1,
        "current_uses" int NOT NULL DEFAULT 0,
        "description" varchar(255),
        "used_by_id" uuid,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_invites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invites_code" UNIQUE ("code"),
        CONSTRAINT "FK_invites_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invites_used_by" FOREIGN KEY ("used_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Index for fast code lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_invites_code" ON "invites" ("code")
    `);

    // Index for listing active invites by organization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_invites_org_status" ON "invites" ("organization_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invites"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invite_status_enum"`);
  }
}
