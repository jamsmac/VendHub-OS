import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: CreateSettingsTables
 *
 * Creates the system_settings and ai_provider_keys tables for the Settings module.
 *
 * system_settings:
 *   - Key-value configuration store for system and per-org settings
 *   - Supports encrypted values, public/private visibility
 *   - Unique constraint on key (with soft-delete filter)
 *
 * ai_provider_keys:
 *   - Stores API credentials for AI providers (OpenAI, Anthropic, etc.)
 *   - One key per provider per organization (unique constraint)
 *   - Tracks usage count and last used timestamp
 */
export class CreateSettingsTables1707400000000 implements MigrationInterface {
  name = 'CreateSettingsTables1707400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM TYPES
    // ========================================================================

    await queryRunner.query(`
      CREATE TYPE "setting_category_enum" AS ENUM (
        'general', 'smtp', 'sms', 'payment', 'fiscal',
        'notification', 'security', 'ai', 'integration', 'appearance'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "ai_provider_enum" AS ENUM (
        'openai', 'anthropic', 'google', 'yandex', 'custom'
      )
    `);

    // ========================================================================
    // TABLE: system_settings
    // ========================================================================

    await queryRunner.createTable(
      new Table({
        name: 'system_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            default: "'general'",
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_encrypted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Unique key (only among non-deleted records)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_system_settings_key_unique"
      ON "system_settings" ("key")
      WHERE "deleted_at" IS NULL
    `);

    // Category index
    await queryRunner.createIndex(
      'system_settings',
      new TableIndex({
        name: 'IDX_system_settings_category',
        columnNames: ['category'],
      }),
    );

    // Organization index
    await queryRunner.createIndex(
      'system_settings',
      new TableIndex({
        name: 'IDX_system_settings_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    // FK: organization_id -> organizations.id
    await queryRunner.createForeignKey(
      'system_settings',
      new TableForeignKey({
        name: 'FK_system_settings_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ========================================================================
    // TABLE: ai_provider_keys
    // ========================================================================

    await queryRunner.createTable(
      new Table({
        name: 'ai_provider_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'api_key',
            type: 'text',
          },
          {
            name: 'model',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'base_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'usage_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_used_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Unique provider per organization (only among non-deleted records)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ai_provider_keys_provider_org_unique"
      ON "ai_provider_keys" ("provider", "organization_id")
      WHERE "deleted_at" IS NULL
    `);

    // Organization index
    await queryRunner.createIndex(
      'ai_provider_keys',
      new TableIndex({
        name: 'IDX_ai_provider_keys_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    // FK: organization_id -> organizations.id
    await queryRunner.createForeignKey(
      'ai_provider_keys',
      new TableForeignKey({
        name: 'FK_ai_provider_keys_organization_id',
        columnNames: ['organization_id'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('ai_provider_keys', 'FK_ai_provider_keys_organization_id');
    await queryRunner.dropForeignKey('system_settings', 'FK_system_settings_organization_id');

    // Drop tables
    await queryRunner.dropTable('ai_provider_keys', true);
    await queryRunner.dropTable('system_settings', true);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_provider_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "setting_category_enum"`);
  }
}
