import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReferralTable1714300000000 implements MigrationInterface {
  name = "AddReferralTable1714300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create referral_status enum (idempotent — may already exist from earlier migration)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "referral_status_enum" AS ENUM ('pending', 'completed', 'expired', 'cancelled');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Create referrals table (idempotent — may already exist from earlier migration)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referrals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "referrer_id" uuid NOT NULL,
        "referred_id" uuid,
        "code" varchar(8) NOT NULL,
        "status" "referral_status_enum" NOT NULL DEFAULT 'pending',
        "referrer_rewarded" boolean NOT NULL DEFAULT false,
        "referred_rewarded" boolean NOT NULL DEFAULT false,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_referrals" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_referrals_code" UNIQUE ("code")
      )
    `);

    // Create indexes (IF NOT EXISTS for idempotency)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_referrals_organization_id" ON "referrals" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_referrals_referrer_id" ON "referrals" ("referrer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_referrals_referred_id" ON "referrals" ("referred_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_referrals_organization_status" ON "referrals" ("organization_id", "status")
    `);

    // Add foreign key constraints (idempotent — skip if already exist)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "referrals"
          ADD CONSTRAINT "FK_referrals_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "referrals"
          ADD CONSTRAINT "FK_referrals_referrer"
          FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "referrals"
          ADD CONSTRAINT "FK_referrals_referred"
          FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_referrals_referred"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_referrals_referrer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_referrals_organization"`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_referrals_organization_status"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_referrals_referred_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_referrals_referrer_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_referrals_organization_id"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "referrals"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS "referral_status_enum"`);
  }
}
