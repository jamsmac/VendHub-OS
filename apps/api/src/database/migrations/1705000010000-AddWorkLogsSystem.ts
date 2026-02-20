import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkLogsSystem1705000010000 implements MigrationInterface {
  name = 'AddWorkLogsSystem1705000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create work log status enum
    await queryRunner.query(`
      CREATE TYPE "work_log_status_enum" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'paid')
    `);

    // Create work log type enum
    await queryRunner.query(`
      CREATE TYPE "work_log_type_enum" AS ENUM (
        'regular', 'overtime', 'weekend', 'holiday', 'night_shift', 'on_call', 'travel', 'training'
      )
    `);

    // Create activity type enum
    await queryRunner.query(`
      CREATE TYPE "activity_type_enum" AS ENUM (
        'refill', 'collection', 'maintenance', 'repair', 'inspection',
        'cleaning', 'installation', 'delivery', 'office', 'meeting', 'travel', 'other'
      )
    `);

    // Create time off type enum
    await queryRunner.query(`
      CREATE TYPE "time_off_type_enum" AS ENUM (
        'vacation', 'sick_leave', 'personal', 'unpaid', 'maternity',
        'paternity', 'bereavement', 'jury_duty', 'military', 'other'
      )
    `);

    // Create time off status enum
    await queryRunner.query(`
      CREATE TYPE "time_off_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'cancelled')
    `);

    // Create work_logs table
    await queryRunner.query(`
      CREATE TABLE "work_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "employeeId" uuid NOT NULL,
        "workDate" date NOT NULL,
        "workType" "work_log_type_enum" NOT NULL DEFAULT 'regular',
        "activityType" "activity_type_enum" NOT NULL,
        "status" "work_log_status_enum" NOT NULL DEFAULT 'draft',
        "clockIn" time NOT NULL,
        "clockOut" time NOT NULL,
        "breakMinutes" integer DEFAULT 0,
        "workedMinutes" integer NOT NULL,
        "overtimeMinutes" integer DEFAULT 0,
        "checkInLatitude" decimal(10,8),
        "checkInLongitude" decimal(11,8),
        "checkOutLatitude" decimal(10,8),
        "checkOutLongitude" decimal(11,8),
        "taskId" uuid,
        "machineId" uuid,
        "maintenanceRequestId" uuid,
        "description" text NOT NULL,
        "notes" text,
        "hourlyRate" decimal(15,2),
        "overtimeMultiplier" decimal(3,2) DEFAULT 1.5,
        "payAmount" decimal(15,2),
        "approvedByUserId" uuid,
        "approvedAt" timestamp with time zone,
        "rejectionReason" text,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deletedAt" timestamp,
        CONSTRAINT "PK_work_logs" PRIMARY KEY ("id")
      )
    `);

    // Create time_off_requests table
    await queryRunner.query(`
      CREATE TABLE "time_off_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "requestNumber" varchar(50) NOT NULL,
        "employeeId" uuid NOT NULL,
        "timeOffType" "time_off_type_enum" NOT NULL,
        "status" "time_off_status_enum" NOT NULL DEFAULT 'pending',
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "totalDays" integer NOT NULL,
        "halfDayStart" boolean DEFAULT false,
        "halfDayEnd" boolean DEFAULT false,
        "reason" text,
        "documents" jsonb,
        "approvedByUserId" uuid,
        "approvedAt" timestamp with time zone,
        "rejectionReason" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deletedAt" timestamp,
        CONSTRAINT "UQ_time_off_requests_number" UNIQUE ("requestNumber"),
        CONSTRAINT "PK_time_off_requests" PRIMARY KEY ("id")
      )
    `);

    // Create timesheets table
    await queryRunner.query(`
      CREATE TABLE "timesheets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "timesheetNumber" varchar(50) NOT NULL,
        "employeeId" uuid NOT NULL,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "status" varchar(50) DEFAULT 'draft',
        "totalWorkedDays" integer DEFAULT 0,
        "totalWorkedHours" decimal(10,2) DEFAULT 0,
        "totalOvertimeHours" decimal(10,2) DEFAULT 0,
        "totalTimeOffDays" integer DEFAULT 0,
        "totalSickDays" integer DEFAULT 0,
        "regularPay" decimal(15,2) DEFAULT 0,
        "overtimePay" decimal(15,2) DEFAULT 0,
        "deductions" decimal(15,2) DEFAULT 0,
        "totalPay" decimal(15,2) DEFAULT 0,
        "dailySummary" jsonb,
        "submittedAt" timestamp with time zone,
        "approvedByUserId" uuid,
        "approvedAt" timestamp with time zone,
        "paidAt" timestamp with time zone,
        "notes" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deletedAt" timestamp,
        CONSTRAINT "UQ_timesheets_number" UNIQUE ("timesheetNumber"),
        CONSTRAINT "PK_timesheets" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_work_logs_org_employee" ON "work_logs" ("organizationId", "employeeId")`);
    await queryRunner.query(`CREATE INDEX "IDX_work_logs_org_date" ON "work_logs" ("organizationId", "workDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_work_logs_employee_date" ON "work_logs" ("employeeId", "workDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_work_logs_status" ON "work_logs" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_time_off_requests_org_employee" ON "time_off_requests" ("organizationId", "employeeId")`);
    await queryRunner.query(`CREATE INDEX "IDX_time_off_requests_dates" ON "time_off_requests" ("startDate", "endDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_time_off_requests_status" ON "time_off_requests" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_timesheets_org_employee" ON "timesheets" ("organizationId", "employeeId")`);
    await queryRunner.query(`CREATE INDEX "IDX_timesheets_period" ON "timesheets" ("periodStart", "periodEnd")`);
    await queryRunner.query(`CREATE INDEX "IDX_timesheets_status" ON "timesheets" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_timesheets_status"`);
    await queryRunner.query(`DROP INDEX "IDX_timesheets_period"`);
    await queryRunner.query(`DROP INDEX "IDX_timesheets_org_employee"`);
    await queryRunner.query(`DROP INDEX "IDX_time_off_requests_status"`);
    await queryRunner.query(`DROP INDEX "IDX_time_off_requests_dates"`);
    await queryRunner.query(`DROP INDEX "IDX_time_off_requests_org_employee"`);
    await queryRunner.query(`DROP INDEX "IDX_work_logs_status"`);
    await queryRunner.query(`DROP INDEX "IDX_work_logs_employee_date"`);
    await queryRunner.query(`DROP INDEX "IDX_work_logs_org_date"`);
    await queryRunner.query(`DROP INDEX "IDX_work_logs_org_employee"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "timesheets"`);
    await queryRunner.query(`DROP TABLE "time_off_requests"`);
    await queryRunner.query(`DROP TABLE "work_logs"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "time_off_status_enum"`);
    await queryRunner.query(`DROP TYPE "time_off_type_enum"`);
    await queryRunner.query(`DROP TYPE "activity_type_enum"`);
    await queryRunner.query(`DROP TYPE "work_log_type_enum"`);
    await queryRunner.query(`DROP TYPE "work_log_status_enum"`);
  }
}
