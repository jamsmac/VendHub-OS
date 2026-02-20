import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWarehouseZonesAndImport1705000011 implements MigrationInterface {
  name = 'AddWarehouseZonesAndImport1705000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // WAREHOUSE ZONES
    // ========================================================================

    // Create zone type enum
    await queryRunner.query(`
      CREATE TYPE "zone_type_enum" AS ENUM (
        'storage', 'receiving', 'shipping', 'picking', 'cold',
        'frozen', 'hazardous', 'quarantine', 'returns', 'damaged'
      )
    `);

    // Create zone status enum
    await queryRunner.query(`
      CREATE TYPE "zone_status_enum" AS ENUM ('active', 'inactive', 'maintenance', 'full')
    `);

    // Create storage condition enum
    await queryRunner.query(`
      CREATE TYPE "storage_condition_enum" AS ENUM (
        'ambient', 'cool', 'refrigerated', 'frozen', 'dry', 'climate_controlled'
      )
    `);

    // Create warehouse_zones table
    await queryRunner.query(`
      CREATE TABLE "warehouse_zones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "code" varchar(20) NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text,
        "zoneType" "zone_type_enum" NOT NULL DEFAULT 'storage',
        "status" "zone_status_enum" NOT NULL DEFAULT 'active',
        "storageCondition" "storage_condition_enum" NOT NULL DEFAULT 'ambient',
        "floor" integer DEFAULT 1,
        "aisle" varchar(20),
        "totalCapacity" decimal(10,2),
        "usedCapacity" decimal(10,2) DEFAULT 0,
        "capacityUnit" varchar(20) DEFAULT 'units',
        "minTemperature" decimal(5,2),
        "maxTemperature" decimal(5,2),
        "currentTemperature" decimal(5,2),
        "temperatureUpdatedAt" timestamp with time zone,
        "allowedCategories" jsonb,
        "excludedCategories" jsonb,
        "isPickable" boolean DEFAULT true,
        "pickPriority" integer DEFAULT 100,
        "fifoEnabled" boolean DEFAULT true,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deletedAt" timestamp,
        CONSTRAINT "PK_warehouse_zones" PRIMARY KEY ("id")
      )
    `);

    // Create warehouse_bins table
    await queryRunner.query(`
      CREATE TABLE "warehouse_bins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "zoneId" uuid NOT NULL,
        "barcode" varchar(50) NOT NULL,
        "name" varchar(100),
        "row" integer,
        "shelf" integer,
        "position" integer,
        "status" varchar(20) DEFAULT 'available',
        "maxCapacity" decimal(10,2),
        "currentQuantity" decimal(10,2) DEFAULT 0,
        "productId" uuid,
        "lotNumber" varchar(100),
        "expiryDate" date,
        "width" decimal(8,2),
        "height" decimal(8,2),
        "depth" decimal(8,2),
        "maxWeight" decimal(10,2),
        "isPickable" boolean DEFAULT true,
        "lastPickedAt" timestamp with time zone,
        "lastRestockedAt" timestamp with time zone,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deletedAt" timestamp,
        CONSTRAINT "PK_warehouse_bins" PRIMARY KEY ("id")
      )
    `);

    // Create bin_content_history table
    await queryRunner.query(`
      CREATE TABLE "bin_content_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "binId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "action" varchar(20) NOT NULL,
        "quantity" decimal(10,3) NOT NULL,
        "lotNumber" varchar(100),
        "performedByUserId" uuid,
        "referenceId" varchar(100),
        "notes" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bin_content_history" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for warehouse zones
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_warehouse_zones_org_code" ON "warehouse_zones" ("organizationId", "code")`);
    await queryRunner.query(`CREATE INDEX "IDX_warehouse_zones_org_type" ON "warehouse_zones" ("organizationId", "zoneType")`);
    await queryRunner.query(`CREATE INDEX "IDX_warehouse_zones_org_status" ON "warehouse_zones" ("organizationId", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_warehouse_bins_org_zone" ON "warehouse_bins" ("organizationId", "zoneId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_warehouse_bins_org_barcode" ON "warehouse_bins" ("organizationId", "barcode")`);
    await queryRunner.query(`CREATE INDEX "IDX_warehouse_bins_status" ON "warehouse_bins" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_bin_content_history_bin" ON "bin_content_history" ("binId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_bin_content_history_product" ON "bin_content_history" ("productId")`);

    // Create foreign keys for warehouse
    await queryRunner.query(`
      ALTER TABLE "warehouse_bins"
      ADD CONSTRAINT "FK_warehouse_bins_zone"
      FOREIGN KEY ("zoneId") REFERENCES "warehouse_zones"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bin_content_history"
      ADD CONSTRAINT "FK_bin_content_history_bin"
      FOREIGN KEY ("binId") REFERENCES "warehouse_bins"("id") ON DELETE CASCADE
    `);

    // ========================================================================
    // IMPORT MODULE
    // ========================================================================

    // Create import type enum
    await queryRunner.query(`
      CREATE TYPE "import_type_enum" AS ENUM (
        'products', 'machines', 'users', 'employees', 'transactions',
        'sales', 'inventory', 'customers', 'prices', 'categories',
        'locations', 'contractors'
      )
    `);

    // Create import status enum
    await queryRunner.query(`
      CREATE TYPE "import_status_enum" AS ENUM (
        'pending', 'validating', 'validation_failed', 'processing',
        'completed', 'completed_with_errors', 'failed', 'cancelled'
      )
    `);

    // Create import source enum
    await queryRunner.query(`
      CREATE TYPE "import_source_enum" AS ENUM ('csv', 'excel', 'json', 'api', 'legacy_system')
    `);

    // Create import_jobs table
    await queryRunner.query(`
      CREATE TABLE "import_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "jobNumber" varchar(50) NOT NULL,
        "importType" "import_type_enum" NOT NULL,
        "source" "import_source_enum" NOT NULL,
        "status" "import_status_enum" NOT NULL DEFAULT 'pending',
        "fileName" varchar(255),
        "fileUrl" varchar(500),
        "fileSize" bigint,
        "totalRows" integer DEFAULT 0,
        "processedRows" integer DEFAULT 0,
        "successfulRows" integer DEFAULT 0,
        "failedRows" integer DEFAULT 0,
        "skippedRows" integer DEFAULT 0,
        "startedAt" timestamp with time zone,
        "completedAt" timestamp with time zone,
        "durationSeconds" integer,
        "errorMessage" text,
        "errorDetails" jsonb,
        "validationWarnings" jsonb,
        "options" jsonb,
        "summary" jsonb,
        "createdByUserId" uuid NOT NULL,
        "cancelledByUserId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_import_jobs_number" UNIQUE ("jobNumber"),
        CONSTRAINT "PK_import_jobs" PRIMARY KEY ("id")
      )
    `);

    // Create import_templates table
    await queryRunner.query(`
      CREATE TABLE "import_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text,
        "importType" "import_type_enum" NOT NULL,
        "source" "import_source_enum" NOT NULL,
        "columnMappings" jsonb NOT NULL,
        "defaultValues" jsonb,
        "transformations" jsonb,
        "validationRules" jsonb,
        "options" jsonb,
        "isActive" boolean DEFAULT true,
        "createdByUserId" uuid NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_import_templates" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for import
    await queryRunner.query(`CREATE INDEX "IDX_import_jobs_org_status" ON "import_jobs" ("organizationId", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_import_jobs_org_type" ON "import_jobs" ("organizationId", "importType")`);
    await queryRunner.query(`CREATE INDEX "IDX_import_jobs_created" ON "import_jobs" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_import_templates_org_type" ON "import_templates" ("organizationId", "importType")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop import indexes
    await queryRunner.query(`DROP INDEX "IDX_import_templates_org_type"`);
    await queryRunner.query(`DROP INDEX "IDX_import_jobs_created"`);
    await queryRunner.query(`DROP INDEX "IDX_import_jobs_org_type"`);
    await queryRunner.query(`DROP INDEX "IDX_import_jobs_org_status"`);

    // Drop import tables
    await queryRunner.query(`DROP TABLE "import_templates"`);
    await queryRunner.query(`DROP TABLE "import_jobs"`);

    // Drop import enums
    await queryRunner.query(`DROP TYPE "import_source_enum"`);
    await queryRunner.query(`DROP TYPE "import_status_enum"`);
    await queryRunner.query(`DROP TYPE "import_type_enum"`);

    // Drop warehouse foreign keys
    await queryRunner.query(`ALTER TABLE "bin_content_history" DROP CONSTRAINT "FK_bin_content_history_bin"`);
    await queryRunner.query(`ALTER TABLE "warehouse_bins" DROP CONSTRAINT "FK_warehouse_bins_zone"`);

    // Drop warehouse indexes
    await queryRunner.query(`DROP INDEX "IDX_bin_content_history_product"`);
    await queryRunner.query(`DROP INDEX "IDX_bin_content_history_bin"`);
    await queryRunner.query(`DROP INDEX "IDX_warehouse_bins_status"`);
    await queryRunner.query(`DROP INDEX "IDX_warehouse_bins_org_barcode"`);
    await queryRunner.query(`DROP INDEX "IDX_warehouse_bins_org_zone"`);
    await queryRunner.query(`DROP INDEX "IDX_warehouse_zones_org_status"`);
    await queryRunner.query(`DROP INDEX "IDX_warehouse_zones_org_type"`);
    await queryRunner.query(`DROP INDEX "IDX_warehouse_zones_org_code"`);

    // Drop warehouse tables
    await queryRunner.query(`DROP TABLE "bin_content_history"`);
    await queryRunner.query(`DROP TABLE "warehouse_bins"`);
    await queryRunner.query(`DROP TABLE "warehouse_zones"`);

    // Drop warehouse enums
    await queryRunner.query(`DROP TYPE "storage_condition_enum"`);
    await queryRunner.query(`DROP TYPE "zone_status_enum"`);
    await queryRunner.query(`DROP TYPE "zone_type_enum"`);
  }
}
