import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvestorModule1715000000000 implements MigrationInterface {
  name = "AddInvestorModule1715000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "investor_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "share_percent" decimal(5,2) NOT NULL DEFAULT 0,
        "total_invested" bigint NOT NULL DEFAULT 0,
        "payback_months" int,
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "notes" text,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_investor_profiles" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dividend_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "investor_profile_id" uuid NOT NULL,
        "period" varchar(20) NOT NULL,
        "payment_date" date NOT NULL,
        "amount" bigint NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'paid',
        "notes" text,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_dividend_payments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_investor_profiles_org" ON "investor_profiles" ("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_investor_profiles_user" ON "investor_profiles" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_dividend_payments_profile" ON "dividend_payments" ("investor_profile_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_dividend_payments_org" ON "dividend_payments" ("organization_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dividend_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "investor_profiles"`);
  }
}
