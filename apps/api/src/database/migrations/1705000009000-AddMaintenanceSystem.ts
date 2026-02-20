import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaintenanceSystem1705000009000 implements MigrationInterface {
  name = 'AddMaintenanceSystem1705000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create maintenance status enum
    await queryRunner.query(`
      CREATE TYPE "maintenance_status_enum" AS ENUM (
        'draft', 'submitted', 'approved', 'rejected', 'scheduled',
        'in_progress', 'awaiting_parts', 'completed', 'verified', 'cancelled'
      )
    `);

    // Create maintenance type enum
    await queryRunner.query(`
      CREATE TYPE "maintenance_type_enum" AS ENUM (
        'preventive', 'corrective', 'predictive', 'emergency',
        'inspection', 'calibration', 'cleaning', 'upgrade'
      )
    `);

    // Create maintenance priority enum
    await queryRunner.query(`
      CREATE TYPE "maintenance_priority_enum" AS ENUM ('low', 'normal', 'high', 'critical')
    `);

    // Create work type enum
    await queryRunner.query(`
      CREATE TYPE "work_type_enum" AS ENUM (
        'diagnosis', 'repair', 'replacement', 'cleaning', 'calibration', 'testing', 'other'
      )
    `);

    // Create maintenance_requests table
    await queryRunner.query(`
      CREATE TABLE "maintenance_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "requestNumber" varchar(50) NOT NULL,
        "maintenanceType" "maintenance_type_enum" NOT NULL,
        "status" "maintenance_status_enum" NOT NULL DEFAULT 'draft',
        "priority" "maintenance_priority_enum" NOT NULL DEFAULT 'normal',
        "machineId" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "symptoms" jsonb,
        "errorCodes" jsonb,
        "assignedTechnicianId" uuid,
        "createdByUserId" uuid NOT NULL,
        "scheduledDate" timestamp with time zone,
        "estimatedDuration" integer,
        "startedAt" timestamp with time zone,
        "completedAt" timestamp with time zone,
        "actualDuration" integer,
        "approvedByUserId" uuid,
        "approvedAt" timestamp with time zone,
        "rejectionReason" text,
        "verifiedByUserId" uuid,
        "verifiedAt" timestamp with time zone,
        "estimatedCost" decimal(15,2),
        "laborCost" decimal(15,2) DEFAULT 0,
        "partsCost" decimal(15,2) DEFAULT 0,
        "totalCost" decimal(15,2) DEFAULT 0,
        "completionNotes" text,
        "rootCause" text,
        "actionsTaken" jsonb,
        "recommendations" text,
        "hasPhotosBefore" boolean DEFAULT false,
        "hasPhotosAfter" boolean DEFAULT false,
        "photos" jsonb,
        "slaDueDate" timestamp with time zone,
        "slaBreached" boolean DEFAULT false,
        "downtimeStart" timestamp with time zone,
        "downtimeEnd" timestamp with time zone,
        "downtimeMinutes" integer,
        "relatedTaskId" uuid,
        "isScheduled" boolean DEFAULT false,
        "maintenanceScheduleId" uuid,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deletedAt" timestamp,
        CONSTRAINT "UQ_maintenance_requests_number" UNIQUE ("requestNumber"),
        CONSTRAINT "PK_maintenance_requests" PRIMARY KEY ("id")
      )
    `);

    // Create maintenance_parts table
    await queryRunner.query(`
      CREATE TABLE "maintenance_parts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "maintenanceRequestId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "partName" varchar(255) NOT NULL,
        "partNumber" varchar(100),
        "quantityNeeded" decimal(10,3) NOT NULL,
        "quantityUsed" decimal(10,3) DEFAULT 0,
        "unitPrice" decimal(15,2) NOT NULL,
        "totalPrice" decimal(15,2) DEFAULT 0,
        "status" varchar(50) DEFAULT 'pending',
        "serialNumber" varchar(100),
        "oldSerialNumber" varchar(100),
        "warrantyUntil" date,
        "notes" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenance_parts" PRIMARY KEY ("id")
      )
    `);

    // Create maintenance_work_logs table
    await queryRunner.query(`
      CREATE TABLE "maintenance_work_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "maintenanceRequestId" uuid NOT NULL,
        "technicianId" uuid NOT NULL,
        "workType" "work_type_enum" NOT NULL,
        "workDate" date NOT NULL,
        "startTime" time NOT NULL,
        "endTime" time NOT NULL,
        "durationMinutes" integer NOT NULL,
        "hourlyRate" decimal(15,2),
        "laborCost" decimal(15,2),
        "description" text NOT NULL,
        "notes" text,
        "isBillable" boolean DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenance_work_logs" PRIMARY KEY ("id")
      )
    `);

    // Create maintenance_schedules table
    await queryRunner.query(`
      CREATE TABLE "maintenance_schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "maintenanceType" "maintenance_type_enum" NOT NULL,
        "machineId" uuid,
        "machineModel" varchar(100),
        "frequencyType" varchar(50) NOT NULL,
        "frequencyValue" integer NOT NULL,
        "daysOfWeek" jsonb,
        "dayOfMonth" integer,
        "lastExecutedDate" date,
        "nextDueDate" date,
        "timesExecuted" integer DEFAULT 0,
        "checklistTemplate" jsonb,
        "estimatedDuration" integer,
        "estimatedCost" decimal(15,2),
        "notifyDaysBefore" integer DEFAULT 7,
        "autoCreateRequest" boolean DEFAULT false,
        "isActive" boolean DEFAULT true,
        "createdByUserId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deletedAt" timestamp,
        CONSTRAINT "PK_maintenance_schedules" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_org_status" ON "maintenance_requests" ("organizationId", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_machine" ON "maintenance_requests" ("machineId")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_technician" ON "maintenance_requests" ("assignedTechnicianId")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_scheduled" ON "maintenance_requests" ("scheduledDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_priority" ON "maintenance_requests" ("priority")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_parts_request" ON "maintenance_parts" ("maintenanceRequestId")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_parts_product" ON "maintenance_parts" ("productId")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_work_logs_request" ON "maintenance_work_logs" ("maintenanceRequestId")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_work_logs_technician" ON "maintenance_work_logs" ("technicianId")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_work_logs_date" ON "maintenance_work_logs" ("workDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_schedules_org" ON "maintenance_schedules" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_schedules_machine" ON "maintenance_schedules" ("machineId")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_schedules_active" ON "maintenance_schedules" ("isActive")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_schedules_next_due" ON "maintenance_schedules" ("nextDueDate")`);

    // Create foreign keys
    await queryRunner.query(`
      ALTER TABLE "maintenance_parts"
      ADD CONSTRAINT "FK_maintenance_parts_request"
      FOREIGN KEY ("maintenanceRequestId") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "maintenance_work_logs"
      ADD CONSTRAINT "FK_maintenance_work_logs_request"
      FOREIGN KEY ("maintenanceRequestId") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "maintenance_work_logs" DROP CONSTRAINT "FK_maintenance_work_logs_request"`);
    await queryRunner.query(`ALTER TABLE "maintenance_parts" DROP CONSTRAINT "FK_maintenance_parts_request"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_maintenance_schedules_next_due"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_schedules_active"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_schedules_machine"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_schedules_org"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_work_logs_date"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_work_logs_technician"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_work_logs_request"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_parts_product"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_parts_request"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_requests_priority"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_requests_scheduled"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_requests_technician"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_requests_machine"`);
    await queryRunner.query(`DROP INDEX "IDX_maintenance_requests_org_status"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "maintenance_schedules"`);
    await queryRunner.query(`DROP TABLE "maintenance_work_logs"`);
    await queryRunner.query(`DROP TABLE "maintenance_parts"`);
    await queryRunner.query(`DROP TABLE "maintenance_requests"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "work_type_enum"`);
    await queryRunner.query(`DROP TYPE "maintenance_priority_enum"`);
    await queryRunner.query(`DROP TYPE "maintenance_type_enum"`);
    await queryRunner.query(`DROP TYPE "maintenance_status_enum"`);
  }
}
