import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDeviceTokens1776300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE device_type_enum AS ENUM ('ios', 'android', 'web')
    `);
    await queryRunner.query(`
      CREATE TABLE device_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        user_id UUID NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        device_type device_type_enum NOT NULL,
        platform_version VARCHAR(100),
        app_version VARCHAR(100),
        last_used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by_id UUID,
        updated_by_id UUID
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_device_tokens_org_user ON device_tokens (organization_id, user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS device_tokens`);
    await queryRunner.query(`DROP TYPE IF EXISTS device_type_enum`);
  }
}
