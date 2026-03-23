import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from "typeorm";

export class AddOrganizationIdToPaymentReports1774600000000 implements MigrationInterface {
  name = "AddOrganizationIdToPaymentReports1774600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add organization_id to payment_report_uploads
    await queryRunner.addColumn(
      "payment_report_uploads",
      new TableColumn({
        name: "organization_id",
        type: "uuid",
        isNullable: true, // nullable initially for backfill
      }),
    );

    await queryRunner.createIndex(
      "payment_report_uploads",
      new TableIndex({
        name: "IDX_payment_report_uploads_organization_id",
        columnNames: ["organization_id"],
      }),
    );

    await queryRunner.createIndex(
      "payment_report_uploads",
      new TableIndex({
        name: "IDX_payment_report_uploads_org_created",
        columnNames: ["organization_id", "created_at"],
      }),
    );

    // Add organization_id to payment_report_rows
    await queryRunner.addColumn(
      "payment_report_rows",
      new TableColumn({
        name: "organization_id",
        type: "uuid",
        isNullable: true, // nullable initially for backfill
      }),
    );

    await queryRunner.createIndex(
      "payment_report_rows",
      new TableIndex({
        name: "IDX_payment_report_rows_organization_id",
        columnNames: ["organization_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      "payment_report_rows",
      "IDX_payment_report_rows_organization_id",
    );
    await queryRunner.dropColumn("payment_report_rows", "organization_id");

    await queryRunner.dropIndex(
      "payment_report_uploads",
      "IDX_payment_report_uploads_org_created",
    );
    await queryRunner.dropIndex(
      "payment_report_uploads",
      "IDX_payment_report_uploads_organization_id",
    );
    await queryRunner.dropColumn("payment_report_uploads", "organization_id");
  }
}
