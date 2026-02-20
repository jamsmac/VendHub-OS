/**
 * Add Inventory, Reports, and Audit Tables
 *
 * Run: npm run migration:run
 * Revert: npm run migration:revert
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryAndAuditTables1704153600000 implements MigrationInterface {
  name = 'AddInventoryAndAuditTables1704153600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // ADDITIONAL ENUMS
    // ========================================================================

    await queryRunner.query(`
      CREATE TYPE "inventory_level_enum" AS ENUM (
        'warehouse', 'operator', 'machine'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "movement_type_enum" AS ENUM (
        'purchase', 'transfer_in', 'transfer_out', 'sale', 'replenishment',
        'collection', 'adjustment', 'write_off', 'return', 'loss', 'found'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "audit_action_enum" AS ENUM (
        'create', 'read', 'update', 'delete', 'login', 'logout',
        'export', 'import', 'approve', 'reject', 'assign', 'complete'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "report_type_enum" AS ENUM (
        'sales', 'revenue', 'inventory', 'performance', 'maintenance',
        'complaints', 'tasks', 'financial', 'operator', 'location', 'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "report_status_enum" AS ENUM (
        'pending', 'generating', 'completed', 'failed', 'expired'
      )
    `);

    // ========================================================================
    // INVENTORY TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "inventories" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "level" inventory_level_enum NOT NULL DEFAULT 'warehouse',
        "machine_id" UUID REFERENCES "machines"("id") ON DELETE CASCADE,
        "operator_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
        "warehouse_id" UUID REFERENCES "locations"("id") ON DELETE SET NULL,
        "quantity" INT NOT NULL DEFAULT 0,
        "reserved_quantity" INT DEFAULT 0,
        "minimum_quantity" INT DEFAULT 0,
        "maximum_quantity" INT,
        "reorder_point" INT DEFAULT 0,
        "slot_number" INT,
        "slot_capacity" INT,
        "expiration_date" DATE,
        "batch_number" VARCHAR(100),
        "unit_price" DECIMAL(15,2),
        "total_value" DECIMAL(15,2) DEFAULT 0,
        "last_counted_at" TIMESTAMP,
        "last_movement_at" TIMESTAMP,
        "metadata" JSONB DEFAULT '{}',
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_inventory_level" UNIQUE (
          "product_id", "level", "machine_id", "operator_id", "warehouse_id"
        )
      )
    `);

    // ========================================================================
    // INVENTORY MOVEMENTS TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "movement_number" VARCHAR(50) UNIQUE NOT NULL,
        "type" movement_type_enum NOT NULL,
        "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "from_inventory_id" UUID REFERENCES "inventories"("id") ON DELETE SET NULL,
        "to_inventory_id" UUID REFERENCES "inventories"("id") ON DELETE SET NULL,
        "from_level" inventory_level_enum,
        "to_level" inventory_level_enum,
        "from_machine_id" UUID REFERENCES "machines"("id") ON DELETE SET NULL,
        "to_machine_id" UUID REFERENCES "machines"("id") ON DELETE SET NULL,
        "from_operator_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "to_operator_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "from_warehouse_id" UUID REFERENCES "locations"("id") ON DELETE SET NULL,
        "to_warehouse_id" UUID REFERENCES "locations"("id") ON DELETE SET NULL,
        "quantity" INT NOT NULL,
        "quantity_before" INT,
        "quantity_after" INT,
        "unit_price" DECIMAL(15,2),
        "total_value" DECIMAL(15,2),
        "reason" TEXT,
        "reference_type" VARCHAR(50),
        "reference_id" UUID,
        "batch_number" VARCHAR(100),
        "expiration_date" DATE,
        "task_id" UUID REFERENCES "tasks"("id") ON DELETE SET NULL,
        "transaction_id" UUID REFERENCES "transactions"("id") ON DELETE SET NULL,
        "notes" TEXT,
        "metadata" JSONB DEFAULT '{}',
        "performed_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ========================================================================
    // REPORTS TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "report_number" VARCHAR(50) UNIQUE NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "type" report_type_enum NOT NULL DEFAULT 'custom',
        "status" report_status_enum DEFAULT 'pending',
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "parameters" JSONB DEFAULT '{}',
        "filters" JSONB DEFAULT '{}',
        "date_range" JSONB,
        "generated_data" JSONB,
        "summary" JSONB,
        "file_url" TEXT,
        "file_format" VARCHAR(20),
        "file_size" INT,
        "is_scheduled" BOOLEAN DEFAULT false,
        "schedule_config" JSONB,
        "last_generated_at" TIMESTAMP,
        "next_generation_at" TIMESTAMP,
        "generation_count" INT DEFAULT 0,
        "average_duration_ms" INT,
        "recipients" JSONB DEFAULT '[]',
        "is_public" BOOLEAN DEFAULT false,
        "share_token" VARCHAR(100),
        "expires_at" TIMESTAMP,
        "metadata" JSONB DEFAULT '{}',
        "created_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    // ========================================================================
    // AUDIT LOG TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "action" audit_action_enum NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "entity_id" UUID,
        "entity_name" VARCHAR(255),
        "organization_id" UUID REFERENCES "organizations"("id") ON DELETE CASCADE,
        "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "user_name" VARCHAR(200),
        "user_role" VARCHAR(50),
        "changes" JSONB,
        "old_values" JSONB,
        "new_values" JSONB,
        "ip_address" VARCHAR(50),
        "user_agent" TEXT,
        "session_id" VARCHAR(100),
        "request_id" VARCHAR(100),
        "request_path" VARCHAR(500),
        "request_method" VARCHAR(10),
        "response_status" INT,
        "duration_ms" INT,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ========================================================================
    // TRANSACTION ITEMS TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "transaction_items" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "transaction_id" UUID NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
        "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "product_name" VARCHAR(255) NOT NULL,
        "product_sku" VARCHAR(100),
        "slot_number" INT,
        "quantity" INT NOT NULL DEFAULT 1,
        "unit_price" DECIMAL(15,2) NOT NULL,
        "discount_amount" DECIMAL(15,2) DEFAULT 0,
        "vat_amount" DECIMAL(15,2) DEFAULT 0,
        "total_amount" DECIMAL(15,2) NOT NULL,
        "dispensed" BOOLEAN DEFAULT false,
        "dispensed_at" TIMESTAMP,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ========================================================================
    // COMPLAINT COMMENTS TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "complaint_comments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "complaint_id" UUID NOT NULL REFERENCES "complaints"("id") ON DELETE CASCADE,
        "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "content" TEXT NOT NULL,
        "is_internal" BOOLEAN DEFAULT true,
        "is_system" BOOLEAN DEFAULT false,
        "attachments" JSONB DEFAULT '[]',
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ========================================================================
    // TASK HISTORY TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "task_history" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "action" VARCHAR(50) NOT NULL,
        "old_status" VARCHAR(50),
        "new_status" VARCHAR(50),
        "comment" TEXT,
        "changes" JSONB,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ========================================================================
    // MACHINE PLANOGRAMS TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "machine_planograms" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "machine_id" UUID NOT NULL REFERENCES "machines"("id") ON DELETE CASCADE,
        "slot_number" INT NOT NULL,
        "product_id" UUID REFERENCES "products"("id") ON DELETE SET NULL,
        "price" DECIMAL(15,2),
        "capacity" INT NOT NULL DEFAULT 10,
        "current_quantity" INT DEFAULT 0,
        "minimum_quantity" INT DEFAULT 2,
        "is_active" BOOLEAN DEFAULT true,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_machine_slot" UNIQUE ("machine_id", "slot_number")
      )
    `);

    // ========================================================================
    // LOCATION CONTRACTS TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "location_contracts" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "location_id" UUID NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "contract_number" VARCHAR(100) UNIQUE NOT NULL,
        "status" VARCHAR(50) DEFAULT 'draft',
        "type" VARCHAR(50) DEFAULT 'rent',
        "start_date" DATE NOT NULL,
        "end_date" DATE,
        "is_auto_renew" BOOLEAN DEFAULT false,
        "monthly_rent" DECIMAL(15,2) DEFAULT 0,
        "revenue_share_percent" DECIMAL(5,2) DEFAULT 0,
        "minimum_guarantee" DECIMAL(15,2) DEFAULT 0,
        "payment_terms" VARCHAR(100),
        "currency" VARCHAR(10) DEFAULT 'UZS',
        "terms_and_conditions" TEXT,
        "documents" JSONB DEFAULT '[]',
        "contacts" JSONB DEFAULT '[]',
        "notes" TEXT,
        "metadata" JSONB DEFAULT '{}',
        "signed_at" TIMESTAMP,
        "signed_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "terminated_at" TIMESTAMP,
        "termination_reason" TEXT,
        "created_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    // ========================================================================
    // CASH COLLECTIONS TABLE
    // ========================================================================

    await queryRunner.query(`
      CREATE TABLE "cash_collections" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "collection_number" VARCHAR(50) UNIQUE NOT NULL,
        "machine_id" UUID NOT NULL REFERENCES "machines"("id") ON DELETE CASCADE,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "task_id" UUID REFERENCES "tasks"("id") ON DELETE SET NULL,
        "collected_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "expected_amount" DECIMAL(15,2) DEFAULT 0,
        "actual_amount" DECIMAL(15,2) NOT NULL,
        "difference" DECIMAL(15,2) DEFAULT 0,
        "currency" VARCHAR(10) DEFAULT 'UZS',
        "denominations" JSONB,
        "notes" TEXT,
        "photos" JSONB DEFAULT '[]',
        "verified_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "verified_at" TIMESTAMP,
        "deposited" BOOLEAN DEFAULT false,
        "deposited_at" TIMESTAMP,
        "deposit_reference" VARCHAR(100),
        "metadata" JSONB DEFAULT '{}',
        "collected_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ========================================================================
    // INDEXES
    // ========================================================================

    // Inventory indexes
    await queryRunner.query(`CREATE INDEX "idx_inventories_product" ON "inventories"("product_id")`);
    await queryRunner.query(`CREATE INDEX "idx_inventories_org_level" ON "inventories"("organization_id", "level")`);
    await queryRunner.query(`CREATE INDEX "idx_inventories_machine" ON "inventories"("machine_id")`);
    await queryRunner.query(`CREATE INDEX "idx_inventories_operator" ON "inventories"("operator_id")`);
    await queryRunner.query(`CREATE INDEX "idx_inventories_low_stock" ON "inventories"("quantity", "minimum_quantity") WHERE "is_active" = true`);

    // Movement indexes
    await queryRunner.query(`CREATE INDEX "idx_movements_product" ON "inventory_movements"("product_id")`);
    await queryRunner.query(`CREATE INDEX "idx_movements_org_type" ON "inventory_movements"("organization_id", "type")`);
    await queryRunner.query(`CREATE INDEX "idx_movements_date" ON "inventory_movements"("created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_movements_task" ON "inventory_movements"("task_id")`);

    // Reports indexes
    await queryRunner.query(`CREATE INDEX "idx_reports_org_type" ON "reports"("organization_id", "type")`);
    await queryRunner.query(`CREATE INDEX "idx_reports_status" ON "reports"("status")`);
    await queryRunner.query(`CREATE INDEX "idx_reports_scheduled" ON "reports"("next_generation_at") WHERE "is_scheduled" = true`);

    // Audit indexes
    await queryRunner.query(`CREATE INDEX "idx_audit_org_date" ON "audit_logs"("organization_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_user" ON "audit_logs"("user_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_action" ON "audit_logs"("action", "created_at")`);

    // Transaction items indexes
    await queryRunner.query(`CREATE INDEX "idx_tx_items_transaction" ON "transaction_items"("transaction_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tx_items_product" ON "transaction_items"("product_id")`);

    // Complaint comments indexes
    await queryRunner.query(`CREATE INDEX "idx_complaint_comments_complaint" ON "complaint_comments"("complaint_id")`);

    // Task history indexes
    await queryRunner.query(`CREATE INDEX "idx_task_history_task" ON "task_history"("task_id")`);

    // Planogram indexes
    await queryRunner.query(`CREATE INDEX "idx_planogram_machine" ON "machine_planograms"("machine_id")`);
    await queryRunner.query(`CREATE INDEX "idx_planogram_product" ON "machine_planograms"("product_id")`);

    // Contract indexes
    await queryRunner.query(`CREATE INDEX "idx_contracts_location" ON "location_contracts"("location_id")`);
    await queryRunner.query(`CREATE INDEX "idx_contracts_org_status" ON "location_contracts"("organization_id", "status")`);

    // Cash collection indexes
    await queryRunner.query(`CREATE INDEX "idx_collections_machine_date" ON "cash_collections"("machine_id", "collected_at")`);
    await queryRunner.query(`CREATE INDEX "idx_collections_org_date" ON "cash_collections"("organization_id", "collected_at")`);

    console.log('✅ Inventory and Audit tables migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_collections_org_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_collections_machine_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_contracts_org_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_contracts_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_planogram_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_planogram_machine"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_task_history_task"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_complaint_comments_complaint"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tx_items_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tx_items_transaction"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_org_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reports_scheduled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reports_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reports_org_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_task"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_org_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventories_low_stock"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventories_operator"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventories_machine"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventories_org_level"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventories_product"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_collections" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location_contracts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_planograms" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_history" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "complaint_comments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_movements" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventories" CASCADE`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "report_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "report_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "movement_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_level_enum"`);

    console.log('✅ Inventory and Audit tables migration reverted successfully');
  }
}
