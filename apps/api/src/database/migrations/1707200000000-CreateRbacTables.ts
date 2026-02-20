import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateRbacTables
 *
 * Creates the core RBAC (Role-Based Access Control) tables:
 * - roles: System and organization-scoped roles with hierarchy levels
 * - permissions: Resource + action based permissions
 * - role_permissions: Junction table linking roles to permissions
 * - user_roles: Junction table linking users to roles
 *
 * All column names are snake_case per project conventions (SnakeNamingStrategy).
 * BaseEntity columns (id, created_at, updated_at, deleted_at, created_by_id, updated_by_id)
 * are included on roles and permissions tables.
 */
export class CreateRbacTables1707200000000 implements MigrationInterface {
  name = 'CreateRbacTables1707200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension exists (idempotent)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // TABLE: roles
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "is_system" BOOLEAN NOT NULL DEFAULT false,
        "organization_id" UUID,
        "level" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" UUID,
        "updated_by_id" UUID,
        CONSTRAINT "FK_roles_organization_id"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
          ON DELETE SET NULL,
        CONSTRAINT "FK_roles_created_by_id"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
          ON DELETE SET NULL,
        CONSTRAINT "FK_roles_updated_by_id"
          FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
          ON DELETE SET NULL
      )
    `);

    // Partial unique index: (name, organization_id) only for non-deleted rows
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_roles_name_organization_id"
        ON "roles" ("name", "organization_id")
        WHERE "deleted_at" IS NULL
    `);

    // ========================================================================
    // TABLE: permissions
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(255) NOT NULL UNIQUE,
        "resource" VARCHAR(100) NOT NULL,
        "action" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" UUID,
        "updated_by_id" UUID,
        CONSTRAINT "FK_permissions_created_by_id"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
          ON DELETE SET NULL,
        CONSTRAINT "FK_permissions_updated_by_id"
          FOREIGN KEY ("updated_by_id") REFERENCES "users"("id")
          ON DELETE SET NULL
      )
    `);

    // Partial unique index: (resource, action) only for non-deleted rows
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_permissions_resource_action"
        ON "permissions" ("resource", "action")
        WHERE "deleted_at" IS NULL
    `);

    // ========================================================================
    // TABLE: role_permissions (junction)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" UUID NOT NULL,
        "permission_id" UUID NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role_id"
          FOREIGN KEY ("role_id") REFERENCES "roles"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission_id"
          FOREIGN KEY ("permission_id") REFERENCES "permissions"("id")
          ON DELETE CASCADE
      )
    `);

    // ========================================================================
    // TABLE: user_roles (junction)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" UUID NOT NULL,
        "role_id" UUID NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role_id"
          FOREIGN KEY ("role_id") REFERENCES "roles"("id")
          ON DELETE CASCADE
      )
    `);

    // ========================================================================
    // INDEXES
    // ========================================================================
    await queryRunner.query(`CREATE INDEX "IDX_roles_organization_id" ON "roles" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_roles_name" ON "roles" ("name")`);
    await queryRunner.query(`CREATE INDEX "IDX_roles_is_active" ON "roles" ("is_active")`);
    await queryRunner.query(`CREATE INDEX "IDX_roles_is_system" ON "roles" ("is_system")`);
    await queryRunner.query(`CREATE INDEX "IDX_permissions_resource" ON "permissions" ("resource")`);
    await queryRunner.query(`CREATE INDEX "IDX_permissions_action" ON "permissions" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_permissions_is_active" ON "permissions" ("is_active")`);
    await queryRunner.query(`CREATE INDEX "IDX_role_permissions_permission_id" ON "role_permissions" ("permission_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_roles_role_id" ON "user_roles" ("role_id")`);

    console.log('CreateRbacTables migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_roles_role_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_role_permissions_permission_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_permissions_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_permissions_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_permissions_resource"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_roles_is_system"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_roles_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_roles_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_roles_organization_id"`);

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles" CASCADE`);

    console.log('CreateRbacTables migration reverted successfully');
  }
}
