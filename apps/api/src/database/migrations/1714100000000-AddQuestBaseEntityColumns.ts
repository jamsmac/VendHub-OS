/**
 * Migration: Add BaseEntity columns to Quest tables
 *
 * The quests and user_quests tables were created without BaseEntity
 * columns (deletedAt, createdById, updatedById). This migration adds
 * them so the entities can properly extend BaseEntity with soft delete.
 */

import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddQuestBaseEntityColumns1714100000000 implements MigrationInterface {
  name = "AddQuestBaseEntityColumns1714100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Add missing BaseEntity columns to quests
    // ============================================
    const questsTable = await queryRunner.getTable("quests");

    if (questsTable && !questsTable.findColumnByName("deletedAt")) {
      await queryRunner.addColumn(
        "quests",
        new TableColumn({
          name: "deletedAt",
          type: "timestamp with time zone",
          isNullable: true,
        }),
      );
    }

    if (questsTable && !questsTable.findColumnByName("createdById")) {
      await queryRunner.addColumn(
        "quests",
        new TableColumn({
          name: "createdById",
          type: "uuid",
          isNullable: true,
        }),
      );
    }

    if (questsTable && !questsTable.findColumnByName("updatedById")) {
      await queryRunner.addColumn(
        "quests",
        new TableColumn({
          name: "updatedById",
          type: "uuid",
          isNullable: true,
        }),
      );
    }

    // ============================================
    // 2. Add missing BaseEntity columns to user_quests
    // ============================================
    const userQuestsTable = await queryRunner.getTable("user_quests");

    if (userQuestsTable && !userQuestsTable.findColumnByName("deletedAt")) {
      await queryRunner.addColumn(
        "user_quests",
        new TableColumn({
          name: "deletedAt",
          type: "timestamp with time zone",
          isNullable: true,
        }),
      );
    }

    if (userQuestsTable && !userQuestsTable.findColumnByName("createdAt")) {
      await queryRunner.addColumn(
        "user_quests",
        new TableColumn({
          name: "createdAt",
          type: "timestamp with time zone",
          default: "CURRENT_TIMESTAMP",
        }),
      );
    }

    if (userQuestsTable && !userQuestsTable.findColumnByName("createdById")) {
      await queryRunner.addColumn(
        "user_quests",
        new TableColumn({
          name: "createdById",
          type: "uuid",
          isNullable: true,
        }),
      );
    }

    if (userQuestsTable && !userQuestsTable.findColumnByName("updatedById")) {
      await queryRunner.addColumn(
        "user_quests",
        new TableColumn({
          name: "updatedById",
          type: "uuid",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from user_quests
    const userQuestsTable = await queryRunner.getTable("user_quests");
    if (userQuestsTable?.findColumnByName("updatedById")) {
      await queryRunner.dropColumn("user_quests", "updatedById");
    }
    if (userQuestsTable?.findColumnByName("createdById")) {
      await queryRunner.dropColumn("user_quests", "createdById");
    }
    if (userQuestsTable?.findColumnByName("deletedAt")) {
      await queryRunner.dropColumn("user_quests", "deletedAt");
    }

    // Remove columns from quests
    const questsTable = await queryRunner.getTable("quests");
    if (questsTable?.findColumnByName("updatedById")) {
      await queryRunner.dropColumn("quests", "updatedById");
    }
    if (questsTable?.findColumnByName("createdById")) {
      await queryRunner.dropColumn("quests", "createdById");
    }
    if (questsTable?.findColumnByName("deletedAt")) {
      await queryRunner.dropColumn("quests", "deletedAt");
    }
  }
}
