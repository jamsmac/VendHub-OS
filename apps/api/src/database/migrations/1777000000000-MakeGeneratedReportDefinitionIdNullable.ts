import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ad-hoc reports (e.g. GET /reports/sales?period=month) are generated
 * without a saved ReportDefinition — there's no template to reference,
 * the user just wants a one-shot snapshot. The column needs to allow
 * NULL so those rows can be persisted; previously the service tried
 * to insert "" and Postgres rejected with "invalid input syntax for
 * type uuid".
 */
export class MakeGeneratedReportDefinitionIdNullable1777000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "generated_reports" ALTER COLUMN "definition_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "generated_reports" ALTER COLUMN "definition_id" SET NOT NULL`,
    );
  }
}
