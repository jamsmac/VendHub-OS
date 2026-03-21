import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreatePaymentReportTables1774400000000 implements MigrationInterface {
  name = "CreatePaymentReportTables1774400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─────────────────────────────────────────────
    // payment_report_uploads
    // ─────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: "payment_report_uploads",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "file_name",
            type: "varchar",
            length: "500",
            isNullable: false,
          },
          {
            name: "file_path",
            type: "varchar",
            length: "1000",
            isNullable: true,
          },
          { name: "file_size", type: "bigint", isNullable: true },
          {
            name: "mime_type",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "report_type",
            type: "enum",
            enum: [
              "PAYME",
              "CLICK",
              "VENDHUB_ORDERS",
              "VENDHUB_CSV",
              "KASSA_FISCAL",
              "UNKNOWN",
            ],
            default: "'UNKNOWN'",
          },
          { name: "detection_confidence", type: "int", default: 0 },
          {
            name: "status",
            type: "enum",
            enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "DUPLICATE"],
            default: "'PENDING'",
          },
          { name: "error_message", type: "text", isNullable: true },
          { name: "report_meta", type: "json", isNullable: true },
          { name: "period_from", type: "timestamp", isNullable: true },
          { name: "period_to", type: "timestamp", isNullable: true },
          { name: "total_rows", type: "int", default: 0 },
          { name: "processed_rows", type: "int", default: 0 },
          { name: "new_rows", type: "int", default: 0 },
          { name: "duplicate_rows", type: "int", default: 0 },
          {
            name: "total_amount",
            type: "decimal",
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          { name: "currency", type: "varchar", length: "10", default: "'UZS'" },
          {
            name: "file_hash",
            type: "varchar",
            length: "64",
            isNullable: true,
          },
          {
            name: "uploaded_by",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "payment_report_uploads",
      new TableIndex({
        name: "IDX_pru_type_date",
        columnNames: ["report_type", "created_at"],
      }),
    );
    await queryRunner.createIndex(
      "payment_report_uploads",
      new TableIndex({ name: "IDX_pru_status", columnNames: ["status"] }),
    );
    await queryRunner.createIndex(
      "payment_report_uploads",
      new TableIndex({ name: "IDX_pru_hash", columnNames: ["file_hash"] }),
    );

    // ─────────────────────────────────────────────
    // payment_report_rows
    // ─────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: "payment_report_rows",
        columns: [
          {
            name: "id",
            type: "varchar",
            length: "36",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "upload_id",
            type: "varchar",
            length: "36",
            isNullable: false,
          },
          {
            name: "report_type",
            type: "enum",
            enum: [
              "PAYME",
              "CLICK",
              "VENDHUB_ORDERS",
              "VENDHUB_CSV",
              "KASSA_FISCAL",
              "UNKNOWN",
            ],
          },
          { name: "row_index", type: "int" },
          {
            name: "external_id",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "order_number",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          { name: "payment_time", type: "timestamp", isNullable: true },
          {
            name: "amount",
            type: "decimal",
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: "payment_status",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "payment_method",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "card_number",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "client_phone",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "goods_name",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          {
            name: "machine_code",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "location",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          { name: "raw_data", type: "json", isNullable: false },
          { name: "is_duplicate", type: "boolean", default: false },
          {
            name: "duplicate_of",
            type: "varchar",
            length: "36",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
        ],
        foreignKeys: [
          {
            name: "FK_prr_upload",
            columnNames: ["upload_id"],
            referencedTableName: "payment_report_uploads",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "payment_report_rows",
      new TableIndex({
        name: "IDX_prr_upload",
        columnNames: ["upload_id", "row_index"],
      }),
    );
    await queryRunner.createIndex(
      "payment_report_rows",
      new TableIndex({
        name: "IDX_prr_ext",
        columnNames: ["report_type", "external_id"],
      }),
    );
    await queryRunner.createIndex(
      "payment_report_rows",
      new TableIndex({
        name: "IDX_prr_time",
        columnNames: ["report_type", "payment_time"],
      }),
    );
    await queryRunner.createIndex(
      "payment_report_rows",
      new TableIndex({ name: "IDX_prr_order", columnNames: ["order_number"] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("payment_report_rows", true);
    await queryRunner.dropTable("payment_report_uploads", true);
  }
}
