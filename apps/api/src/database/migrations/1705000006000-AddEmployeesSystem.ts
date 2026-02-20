import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeesSystem1705000006000 implements MigrationInterface {
  name = 'AddEmployeesSystem1705000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create employee role enum
    await queryRunner.query(`
      CREATE TYPE "employee_role_enum" AS ENUM (
        'operator',
        'technician',
        'warehouse',
        'driver',
        'manager',
        'accountant',
        'supervisor'
      )
    `);

    // Create employee status enum
    await queryRunner.query(`
      CREATE TYPE "employee_status_enum" AS ENUM (
        'active',
        'on_leave',
        'suspended',
        'terminated'
      )
    `);

    // Create salary frequency enum
    await queryRunner.query(`
      CREATE TYPE "salary_frequency_enum" AS ENUM (
        'hourly',
        'daily',
        'weekly',
        'biweekly',
        'monthly'
      )
    `);

    // Create employees table
    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "userId" uuid,
        "employeeNumber" varchar NOT NULL,
        "firstName" varchar(100) NOT NULL,
        "lastName" varchar(100) NOT NULL,
        "middleName" varchar(100),
        "phone" varchar(20),
        "email" varchar(255),
        "employeeRole" "employee_role_enum" NOT NULL,
        "status" "employee_status_enum" NOT NULL DEFAULT 'active',
        "telegramUserId" varchar,
        "telegramUsername" varchar(100),
        "hireDate" date NOT NULL,
        "terminationDate" date,
        "terminationReason" text,
        "salary" decimal(15,2),
        "salaryFrequency" "salary_frequency_enum",
        "address" text,
        "city" varchar(100),
        "district" varchar(100),
        "emergencyContactName" varchar(200),
        "emergencyContactPhone" varchar(20),
        "emergencyContactRelation" varchar(100),
        "documents" jsonb,
        "notes" text,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deletedAt" timestamp,
        CONSTRAINT "UQ_employees_number" UNIQUE ("employeeNumber"),
        CONSTRAINT "PK_employees" PRIMARY KEY ("id")
      )
    `);

    // Create employee_documents table
    await queryRunner.query(`
      CREATE TABLE "employee_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" uuid NOT NULL,
        "documentType" varchar(50) NOT NULL,
        "name" varchar(255) NOT NULL,
        "url" varchar(500) NOT NULL,
        "expiryDate" date,
        "notes" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employee_documents" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_employees_org_status" ON "employees" ("organizationId", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_employees_telegram" ON "employees" ("telegramUserId")`);
    await queryRunner.query(`CREATE INDEX "IDX_employee_documents_employee_type" ON "employee_documents" ("employeeId", "documentType")`);

    // Create foreign keys
    await queryRunner.query(`
      ALTER TABLE "employee_documents"
      ADD CONSTRAINT "FK_employee_documents_employee"
      FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "employee_documents" DROP CONSTRAINT "FK_employee_documents_employee"`);
    await queryRunner.query(`DROP INDEX "IDX_employee_documents_employee_type"`);
    await queryRunner.query(`DROP INDEX "IDX_employees_telegram"`);
    await queryRunner.query(`DROP INDEX "IDX_employees_org_status"`);
    await queryRunner.query(`DROP TABLE "employee_documents"`);
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(`DROP TYPE "salary_frequency_enum"`);
    await queryRunner.query(`DROP TYPE "employee_status_enum"`);
    await queryRunner.query(`DROP TYPE "employee_role_enum"`);
  }
}
