import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBaseEntityFieldsToPaymentReports1774500000000 implements MigrationInterface {
  name = "AddBaseEntityFieldsToPaymentReports1774500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─────────────────────────────────────────────
    // payment_report_uploads — add BaseEntity fields
    // ─────────────────────────────────────────────
    await queryRunner.addColumns("payment_report_uploads", [
      new TableColumn({
        name: "deleted_at",
        type: "timestamp",
        isNullable: true,
        default: null,
      }),
      new TableColumn({
        name: "created_by_id",
        type: "uuid",
        isNullable: true,
      }),
      new TableColumn({
        name: "updated_by_id",
        type: "uuid",
        isNullable: true,
      }),
    ]);

    // ─────────────────────────────────────────────
    // payment_report_rows — add BaseEntity fields
    // (also add missing updated_at)
    // ─────────────────────────────────────────────
    await queryRunner.addColumns("payment_report_rows", [
      new TableColumn({
        name: "updated_at",
        type: "timestamp",
        default: "CURRENT_TIMESTAMP",
      }),
      new TableColumn({
        name: "deleted_at",
        type: "timestamp",
        isNullable: true,
        default: null,
      }),
      new TableColumn({
        name: "created_by_id",
        type: "uuid",
        isNullable: true,
      }),
      new TableColumn({
        name: "updated_by_id",
        type: "uuid",
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns("payment_report_rows", [
      "updated_by_id",
      "created_by_id",
      "deleted_at",
      "updated_at",
    ]);
    await queryRunner.dropColumns("payment_report_uploads", [
      "updated_by_id",
      "created_by_id",
      "deleted_at",
    ]);
  }
}
