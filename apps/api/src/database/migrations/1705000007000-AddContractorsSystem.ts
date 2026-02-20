import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractorsSystem1705000007000 implements MigrationInterface {
  name = 'AddContractorsSystem1705000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create service type enum
    await queryRunner.query(`
      CREATE TYPE "service_type_enum" AS ENUM (
        'maintenance',
        'cleaning',
        'delivery',
        'repair',
        'security',
        'installation',
        'consulting',
        'other'
      )
    `);

    // Create invoice status enum
    await queryRunner.query(`
      CREATE TYPE "invoice_status_enum" AS ENUM (
        'pending',
        'approved',
        'paid',
        'overdue',
        'cancelled',
        'disputed'
      )
    `);

    // Create contractors table
    await queryRunner.query(`
      CREATE TABLE "contractors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "companyName" varchar(255) NOT NULL,
        "contactPerson" varchar(200),
        "phone" varchar(20),
        "email" varchar(255),
        "address" text,
        "serviceType" "service_type_enum" NOT NULL,
        "contractStart" date,
        "contractEnd" date,
        "contractNumber" text,
        "paymentTerms" text,
        "rating" decimal(3,2),
        "notes" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "bankDetails" jsonb,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contractors" PRIMARY KEY ("id")
      )
    `);

    // Create contractor_invoices table
    await queryRunner.query(`
      CREATE TABLE "contractor_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "contractorId" uuid NOT NULL,
        "invoiceNumber" varchar NOT NULL,
        "amount" decimal(15,2) NOT NULL,
        "paidAmount" decimal(15,2) NOT NULL DEFAULT 0,
        "status" "invoice_status_enum" NOT NULL DEFAULT 'pending',
        "issueDate" date NOT NULL,
        "dueDate" date NOT NULL,
        "paidDate" date,
        "description" text,
        "approvedBy" uuid,
        "approvedAt" timestamp,
        "attachmentUrls" text,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_contractor_invoices_number" UNIQUE ("invoiceNumber"),
        CONSTRAINT "PK_contractor_invoices" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_contractors_org_active" ON "contractors" ("organizationId", "isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_contractors_service_type" ON "contractors" ("serviceType")`);
    await queryRunner.query(`CREATE INDEX "IDX_contractor_invoices_org_status" ON "contractor_invoices" ("organizationId", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_contractor_invoices_contractor" ON "contractor_invoices" ("contractorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_contractor_invoices_due_date" ON "contractor_invoices" ("dueDate")`);

    // Create foreign keys
    await queryRunner.query(`
      ALTER TABLE "contractor_invoices"
      ADD CONSTRAINT "FK_contractor_invoices_contractor"
      FOREIGN KEY ("contractorId") REFERENCES "contractors"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contractor_invoices" DROP CONSTRAINT "FK_contractor_invoices_contractor"`);
    await queryRunner.query(`DROP INDEX "IDX_contractor_invoices_due_date"`);
    await queryRunner.query(`DROP INDEX "IDX_contractor_invoices_contractor"`);
    await queryRunner.query(`DROP INDEX "IDX_contractor_invoices_org_status"`);
    await queryRunner.query(`DROP INDEX "IDX_contractors_service_type"`);
    await queryRunner.query(`DROP INDEX "IDX_contractors_org_active"`);
    await queryRunner.query(`DROP TABLE "contractor_invoices"`);
    await queryRunner.query(`DROP TABLE "contractors"`);
    await queryRunner.query(`DROP TYPE "invoice_status_enum"`);
    await queryRunner.query(`DROP TYPE "service_type_enum"`);
  }
}
