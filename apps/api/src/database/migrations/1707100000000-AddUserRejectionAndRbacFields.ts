import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: AddUserRejectionAndRbacFields
 *
 * Adds rejection workflow fields to users table and
 * updates the user_status_enum to include new statuses.
 * The user_roles junction table is created in the RBAC migration.
 */
export class AddUserRejectionAndRbacFields1707100000000 implements MigrationInterface {
  name = 'AddUserRejectionAndRbacFields1707100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum values to user status
    await queryRunner.query(`
      ALTER TYPE "users_status_enum" ADD VALUE IF NOT EXISTS 'rejected';
    `);
    await queryRunner.query(`
      ALTER TYPE "users_status_enum" ADD VALUE IF NOT EXISTS 'password_change_required';
    `);

    // Add rejection fields
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'rejected_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
      new TableColumn({
        name: 'rejected_by_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'rejection_reason',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'password_changed_by_user',
        type: 'boolean',
        default: false,
      }),
    ]);

    // Add FK for rejected_by_id
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_rejected_by_id"
      FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_rejected_by_id";
    `);

    await queryRunner.dropColumns('users', [
      'rejected_at',
      'rejected_by_id',
      'rejection_reason',
      'password_changed_by_user',
    ]);

    // Note: Cannot remove enum values in PostgreSQL without recreating the type
  }
}
