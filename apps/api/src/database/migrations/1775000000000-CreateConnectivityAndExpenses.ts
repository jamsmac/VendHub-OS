import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Create machine_connectivity and machine_expenses tables.
 * - machine_connectivity: tracks internet connections (SIM, WiFi, Fiber, LAN)
 * - machine_expenses: tracks CAPEX/OPEX costs per machine (transport, wiring, etc.)
 */
export class CreateConnectivityAndExpenses1775000000000
  implements MigrationInterface
{
  name = "CreateConnectivityAndExpenses1775000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create connectivity_type enum
    await queryRunner.query(`
      CREATE TYPE "machine_connectivity_connectivity_type_enum"
        AS ENUM ('sim', 'wifi', 'fiber', 'lan')
    `);

    // Create connectivity_status enum
    await queryRunner.query(`
      CREATE TYPE "machine_connectivity_status_enum"
        AS ENUM ('active', 'inactive', 'suspended')
    `);

    // Create expense_category enum
    await queryRunner.query(`
      CREATE TYPE "machine_expenses_category_enum"
        AS ENUM ('transport', 'electrical', 'socket', 'mounting', 'wiring', 'decoration', 'signage', 'connectivity', 'rent_deposit', 'repair', 'other')
    `);

    // Create expense_type enum
    await queryRunner.query(`
      CREATE TYPE "machine_expenses_expense_type_enum"
        AS ENUM ('capex', 'opex')
    `);

    // ── machine_connectivity table ──
    await queryRunner.query(`
      CREATE TABLE "machine_connectivity" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "machine_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "connectivity_type" "machine_connectivity_connectivity_type_enum" NOT NULL,
        "status" "machine_connectivity_status_enum" NOT NULL DEFAULT 'active',
        "provider_name" varchar(200) NOT NULL,
        "account_number" varchar(100),
        "tariff_name" varchar(200),
        "component_id" uuid,
        "monthly_cost" decimal(12,2) NOT NULL DEFAULT 0,
        "currency" varchar(10) NOT NULL DEFAULT 'UZS',
        "start_date" date NOT NULL,
        "end_date" date,
        "notes" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_machine_connectivity" PRIMARY KEY ("id"),
        CONSTRAINT "FK_machine_connectivity_machine" FOREIGN KEY ("machine_id")
          REFERENCES "machines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_machine_connectivity_component" FOREIGN KEY ("component_id")
          REFERENCES "machine_components"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_machine_connectivity_machine" ON "machine_connectivity" ("machine_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_machine_connectivity_org" ON "machine_connectivity" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_machine_connectivity_type" ON "machine_connectivity" ("connectivity_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_machine_connectivity_status" ON "machine_connectivity" ("status")`,
    );

    // ── machine_expenses table ──
    await queryRunner.query(`
      CREATE TABLE "machine_expenses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "machine_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "location_id" uuid,
        "category" "machine_expenses_category_enum" NOT NULL,
        "expense_type" "machine_expenses_expense_type_enum" NOT NULL,
        "description" varchar(500) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'UZS',
        "expense_date" date NOT NULL,
        "counterparty_id" uuid,
        "performed_by_user_id" uuid,
        "receipt_url" text,
        "invoice_number" varchar(100),
        "notes" text,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_machine_expenses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_machine_expenses_machine" FOREIGN KEY ("machine_id")
          REFERENCES "machines"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_machine_expenses_machine" ON "machine_expenses" ("machine_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_machine_expenses_org" ON "machine_expenses" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_machine_expenses_category" ON "machine_expenses" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_machine_expenses_type" ON "machine_expenses" ("expense_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_machine_expenses_date" ON "machine_expenses" ("expense_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_connectivity"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_expenses_expense_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_expenses_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_connectivity_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_connectivity_connectivity_type_enum"`,
    );
  }
}
