import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1705300000000 implements MigrationInterface {
  name = 'InitialSchema1705300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ============================================
    // Organizations
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "description" text,
        "logo" character varying(500),
        "address" text,
        "phone" character varying(20),
        "email" character varying(255),
        "website" character varying(255),
        "settings" jsonb DEFAULT '{}',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      )
    `);

    // ============================================
    // Users
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('super_admin', 'admin', 'manager', 'operator', 'technician', 'customer')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255),
        "phone" character varying(20),
        "passwordHash" character varying(255),
        "firstName" character varying(100),
        "lastName" character varying(100),
        "avatar" character varying(500),
        "role" "user_role_enum" NOT NULL DEFAULT 'customer',
        "telegramId" bigint,
        "telegramUsername" character varying(100),
        "referralCode" character varying(20),
        "referredById" uuid,
        "organizationId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "isPhoneVerified" boolean NOT NULL DEFAULT false,
        "lastLoginAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone"),
        CONSTRAINT "UQ_users_telegramId" UNIQUE ("telegramId"),
        CONSTRAINT "UQ_users_referralCode" UNIQUE ("referralCode"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_users_referredBy" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_telegramId" ON "users" ("telegramId")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_organizationId" ON "users" ("organizationId")`);

    // ============================================
    // Locations
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "address" text NOT NULL,
        "city" character varying(100),
        "region" character varying(100),
        "postalCode" character varying(20),
        "latitude" decimal(10, 8),
        "longitude" decimal(11, 8),
        "timezone" character varying(50) DEFAULT 'Asia/Tashkent',
        "workingHours" jsonb DEFAULT '{}',
        "organizationId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_locations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_locations_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_locations_coordinates" ON "locations" ("latitude", "longitude")`);

    // ============================================
    // Machines
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "machine_status_enum" AS ENUM ('online', 'offline', 'maintenance', 'error')
    `);

    await queryRunner.query(`
      CREATE TABLE "machines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "serialNumber" character varying(100) NOT NULL,
        "name" character varying(255) NOT NULL,
        "model" character varying(100),
        "manufacturer" character varying(100),
        "status" "machine_status_enum" NOT NULL DEFAULT 'offline',
        "firmwareVersion" character varying(50),
        "lastHeartbeat" TIMESTAMP,
        "settings" jsonb DEFAULT '{}',
        "metadata" jsonb DEFAULT '{}',
        "locationId" uuid,
        "organizationId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_machines_serialNumber" UNIQUE ("serialNumber"),
        CONSTRAINT "PK_machines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_machines_location" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_machines_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_machines_status" ON "machines" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_machines_organizationId" ON "machines" ("organizationId")`);

    // ============================================
    // Product Categories
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "product_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "description" text,
        "image" character varying(500),
        "parentId" uuid,
        "sortOrder" integer DEFAULT 0,
        "organizationId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_categories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_categories_parent" FOREIGN KEY ("parentId") REFERENCES "product_categories"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_product_categories_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // ============================================
    // Products
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sku" character varying(100) NOT NULL,
        "barcode" character varying(100),
        "name" character varying(255) NOT NULL,
        "description" text,
        "image" character varying(500),
        "images" jsonb DEFAULT '[]',
        "price" integer NOT NULL,
        "costPrice" integer,
        "categoryId" uuid,
        "nutritionalInfo" jsonb DEFAULT '{}',
        "allergens" jsonb DEFAULT '[]',
        "weight" integer,
        "volume" integer,
        "organizationId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_category" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_products_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_products_sku" ON "products" ("sku")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_organizationId" ON "products" ("organizationId")`);

    // ============================================
    // Machine Inventory
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "machine_inventory" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "machineId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "slotNumber" integer NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "maxQuantity" integer NOT NULL DEFAULT 10,
        "price" integer,
        "lastRestockedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_machine_inventory" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_machine_inventory_slot" UNIQUE ("machineId", "slotNumber"),
        CONSTRAINT "FK_machine_inventory_machine" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_machine_inventory_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);

    // ============================================
    // Orders
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM ('pending', 'confirmed', 'processing', 'dispensing', 'completed', 'cancelled', 'failed', 'refunded')
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM ('payme', 'click', 'uzum', 'telegram_stars', 'cash', 'loyalty_points')
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded')
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderNumber" character varying(50) NOT NULL,
        "userId" uuid,
        "machineId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "status" "order_status_enum" NOT NULL DEFAULT 'pending',
        "paymentMethod" "payment_method_enum",
        "paymentStatus" "payment_status_enum" NOT NULL DEFAULT 'pending',
        "paymentId" character varying(255),
        "subtotal" integer NOT NULL,
        "discount" integer NOT NULL DEFAULT 0,
        "pointsUsed" integer NOT NULL DEFAULT 0,
        "pointsEarned" integer NOT NULL DEFAULT 0,
        "totalAmount" integer NOT NULL,
        "items" jsonb NOT NULL DEFAULT '[]',
        "metadata" jsonb DEFAULT '{}',
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_orders_orderNumber" UNIQUE ("orderNumber"),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_orders_machine" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_orders_userId" ON "orders" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_machineId" ON "orders" ("machineId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_status" ON "orders" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_createdAt" ON "orders" ("createdAt")`);

    // ============================================
    // Loyalty
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "loyalty_tiers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "slug" character varying(50) NOT NULL,
        "minPoints" integer NOT NULL DEFAULT 0,
        "multiplier" decimal(3, 2) NOT NULL DEFAULT 1.00,
        "cashbackPercent" decimal(5, 2) NOT NULL DEFAULT 0,
        "benefits" jsonb DEFAULT '[]',
        "color" character varying(20),
        "icon" character varying(100),
        "organizationId" uuid NOT NULL,
        "sortOrder" integer DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loyalty_tiers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_loyalty_tiers_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_loyalty" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tierId" uuid,
        "points" integer NOT NULL DEFAULT 0,
        "lifetimePoints" integer NOT NULL DEFAULT 0,
        "organizationId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_loyalty" UNIQUE ("userId", "organizationId"),
        CONSTRAINT "PK_user_loyalty" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_loyalty_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_loyalty_tier" FOREIGN KEY ("tierId") REFERENCES "loyalty_tiers"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_user_loyalty_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "points_transaction_type_enum" AS ENUM ('earned', 'redeemed', 'expired', 'adjusted', 'bonus', 'referral')
    `);

    await queryRunner.query(`
      CREATE TABLE "points_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" "points_transaction_type_enum" NOT NULL,
        "points" integer NOT NULL,
        "balance" integer NOT NULL,
        "orderId" uuid,
        "description" character varying(255),
        "metadata" jsonb DEFAULT '{}',
        "organizationId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_points_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_points_transactions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_points_transactions_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_points_transactions_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_points_transactions_userId" ON "points_transactions" ("userId")`);

    // ============================================
    // Quests
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "quest_type_enum" AS ENUM ('daily', 'weekly', 'achievement', 'special')
    `);

    await queryRunner.query(`
      CREATE TABLE "quests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "type" "quest_type_enum" NOT NULL,
        "targetType" character varying(50) NOT NULL,
        "targetValue" integer NOT NULL,
        "rewardPoints" integer NOT NULL,
        "icon" character varying(100),
        "startDate" TIMESTAMP,
        "endDate" TIMESTAMP,
        "organizationId" uuid NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quests_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_quests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "questId" uuid NOT NULL,
        "progress" integer NOT NULL DEFAULT 0,
        "isCompleted" boolean NOT NULL DEFAULT false,
        "isClaimed" boolean NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP,
        "claimedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_quests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_quests_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_quests_quest" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE
      )
    `);

    // ============================================
    // Employees
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "employee_status_enum" AS ENUM ('active', 'inactive', 'on_leave', 'terminated')
    `);

    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "employeeNumber" character varying(50),
        "position" character varying(100),
        "department" character varying(100),
        "status" "employee_status_enum" NOT NULL DEFAULT 'active',
        "hireDate" DATE,
        "salary" integer,
        "managerId" uuid,
        "organizationId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_employees" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employees_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_employees_manager" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_employees_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // ============================================
    // Maintenance
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "maintenance_status_enum" AS ENUM ('draft', 'submitted', 'approved', 'scheduled', 'in_progress', 'completed', 'verified', 'rejected')
    `);

    await queryRunner.query(`
      CREATE TYPE "maintenance_priority_enum" AS ENUM ('low', 'medium', 'high', 'critical')
    `);

    await queryRunner.query(`
      CREATE TABLE "maintenance_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "machineId" uuid NOT NULL,
        "requestedById" uuid NOT NULL,
        "assignedToId" uuid,
        "type" character varying(100) NOT NULL,
        "priority" "maintenance_priority_enum" NOT NULL DEFAULT 'medium',
        "status" "maintenance_status_enum" NOT NULL DEFAULT 'draft',
        "description" text NOT NULL,
        "notes" text,
        "scheduledDate" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "estimatedCost" integer,
        "actualCost" integer,
        "organizationId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_maintenance_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_maintenance_requests_machine" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_maintenance_requests_requestedBy" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_maintenance_requests_assignedTo" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_maintenance_requests_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_maintenance_requests_status" ON "maintenance_requests" ("status")`);

    // ============================================
    // Audit Log
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid,
        "action" character varying(100) NOT NULL,
        "entityType" character varying(100) NOT NULL,
        "entityId" uuid,
        "oldValues" jsonb,
        "newValues" jsonb,
        "ipAddress" character varying(45),
        "userAgent" text,
        "organizationId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entityType" ON "audit_logs" ("entityType")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`);

    console.log('Initial schema migration completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "maintenance_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "employees"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_quests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "quests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "points_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_loyalty"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loyalty_tiers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_inventory"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "locations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "maintenance_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "maintenance_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "employee_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "quest_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "points_transaction_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "machine_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
