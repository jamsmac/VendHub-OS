import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add import tracking fields to payment_report_rows and payment_report_uploads.
 *
 * Enables Phase 1: PaymentReportRow → HwImportedSale → Transaction pipeline.
 * - payment_report_rows: track which rows have been imported as transactions
 * - payment_report_uploads: track aggregate import stats per upload
 */
export class AddImportFieldsToPaymentReports1775500000000 implements MigrationInterface {
  name = "AddImportFieldsToPaymentReports1775500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // payment_report_rows: import tracking
    await queryRunner.query(`
      ALTER TABLE "payment_report_rows"
        ADD COLUMN "is_imported" boolean NOT NULL DEFAULT false,
        ADD COLUMN "imported_transaction_id" uuid,
        ADD COLUMN "import_error" text
    `);

    // payment_report_uploads: aggregate import stats
    await queryRunner.query(`
      ALTER TABLE "payment_report_uploads"
        ADD COLUMN "imported_rows" integer NOT NULL DEFAULT 0,
        ADD COLUMN "import_errors" integer NOT NULL DEFAULT 0,
        ADD COLUMN "imported_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN "imported_by" varchar(255)
    `);

    // Index: fast lookup of non-imported rows per upload
    await queryRunner.query(`
      CREATE INDEX "IDX_report_rows_import"
        ON "payment_report_rows" ("upload_id", "is_imported")
        WHERE "deleted_at" IS NULL
    `);

    // Index: find rows linked to a specific transaction
    await queryRunner.query(`
      CREATE INDEX "IDX_report_rows_txn"
        ON "payment_report_rows" ("imported_transaction_id")
        WHERE "imported_transaction_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_report_rows_txn"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_report_rows_import"`);

    await queryRunner.query(`
      ALTER TABLE "payment_report_uploads"
        DROP COLUMN IF EXISTS "imported_rows",
        DROP COLUMN IF EXISTS "import_errors",
        DROP COLUMN IF EXISTS "imported_at",
        DROP COLUMN IF EXISTS "imported_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_report_rows"
        DROP COLUMN IF EXISTS "is_imported",
        DROP COLUMN IF EXISTS "imported_transaction_id",
        DROP COLUMN IF EXISTS "import_error"
    `);
  }
}
