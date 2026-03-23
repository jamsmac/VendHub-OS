import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from "typeorm";

export class AddOrganizationIdToAgentSessions1774600100000 implements MigrationInterface {
  name = "AddOrganizationIdToAgentSessions1774600100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "agent_sessions",
      new TableColumn({
        name: "organization_id",
        type: "uuid",
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      "agent_sessions",
      new TableIndex({
        name: "IDX_agent_sessions_organization_id",
        columnNames: ["organization_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      "agent_sessions",
      "IDX_agent_sessions_organization_id",
    );
    await queryRunner.dropColumn("agent_sessions", "organization_id");
  }
}
