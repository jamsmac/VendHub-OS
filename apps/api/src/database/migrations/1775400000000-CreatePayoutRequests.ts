import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Create payout_requests table for payout request lifecycle management.
 *
 * Lifecycle: PENDING → APPROVED → PROCESSING → COMPLETED
 *            ↓          ↓           ↓
 *         REJECTED   CANCELLED    FAILED
 */
export class CreatePayoutRequests1775400000000 implements MigrationInterface {
  name = "CreatePayoutRequests1775400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "payout_request_status_enum"
        AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled', 'failed')
    `);

    await queryRunner.query(`
      CREATE TYPE "payout_method_enum"
        AS ENUM ('bank_transfer', 'card', 'cash')
    `);

    // Create table
    await queryRunner.query(`
      CREATE TABLE "payout_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "organization_id" uuid NOT NULL,
        "amount" decimal(15, 2) NOT NULL,
        "status" "payout_request_status_enum" NOT NULL DEFAULT 'pending',
        "payout_method" "payout_method_enum" NOT NULL DEFAULT 'bank_transfer',
        "requested_by_id" uuid NOT NULL,
        "reviewed_by_id" uuid,
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "reason" text,
        "review_comment" text,
        "payout_destination" varchar(255),
        "transaction_reference" varchar(255),
        CONSTRAINT "PK_payout_requests" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_payout_requests_organization_id"
        ON "payout_requests" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payout_requests_status"
        ON "payout_requests" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payout_requests_requested_by_id"
        ON "payout_requests" ("requested_by_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payout_requests_created_at"
        ON "payout_requests" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_requests"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payout_request_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payout_method_enum"`);
  }
}
