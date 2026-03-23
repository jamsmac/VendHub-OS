import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Backfill organization_id for existing payment_report_uploads and rows.
 *
 * Strategy:
 *   1. For uploads: derive org from uploaded_by → users.id → users.organization_id
 *   2. For rows: copy org from their parent upload
 *   3. If no user match found, assign first organization (single-tenant assumption for existing data)
 *
 * After this migration runs, the follow-up migration can make organization_id NOT NULL.
 */
export class BackfillOrganizationIdPaymentReports1774600200000 implements MigrationInterface {
  name = "BackfillOrganizationIdPaymentReports1774600200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Backfill uploads from uploaded_by → users.organization_id
    await queryRunner.query(`
      UPDATE payment_report_uploads u
      SET organization_id = usr.organization_id
      FROM users usr
      WHERE u.uploaded_by = usr.id::text
        AND u.organization_id IS NULL
        AND usr.organization_id IS NOT NULL
    `);

    // Step 2: Fallback — assign to first organization for any remaining NULLs
    await queryRunner.query(`
      UPDATE payment_report_uploads
      SET organization_id = (
        SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1
      )
      WHERE organization_id IS NULL
    `);

    // Step 3: Copy organization_id from upload to rows
    await queryRunner.query(`
      UPDATE payment_report_rows r
      SET organization_id = u.organization_id
      FROM payment_report_uploads u
      WHERE r.upload_id = u.id
        AND r.organization_id IS NULL
    `);

    // Step 4: Make columns NOT NULL now that all rows are backfilled
    await queryRunner.query(`
      ALTER TABLE payment_report_uploads
      ALTER COLUMN organization_id SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE payment_report_rows
      ALTER COLUMN organization_id SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert NOT NULL constraint (keep the data)
    await queryRunner.query(`
      ALTER TABLE payment_report_rows
      ALTER COLUMN organization_id DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE payment_report_uploads
      ALTER COLUMN organization_id DROP NOT NULL
    `);
  }
}
