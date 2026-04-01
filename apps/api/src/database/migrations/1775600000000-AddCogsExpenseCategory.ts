import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add COGS (Cost of Goods Sold) value to expense_category enum.
 * Enables automatic EXPENSE transaction creation when ingredients are consumed.
 */
export class AddCogsExpenseCategory1775600000000 implements MigrationInterface {
  name = "AddCogsExpenseCategory1775600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'cogs' to the existing expense_category enum
    // PostgreSQL requires ALTER TYPE to add new enum values
    await queryRunner.query(`
      ALTER TYPE "transactions_expensecategory_enum"
        ADD VALUE IF NOT EXISTS 'cogs' BEFORE 'rent'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly.
    // To revert, you'd need to create a new type without 'cogs' and migrate.
    // For safety, we leave the enum value in place on rollback.
  }
}
