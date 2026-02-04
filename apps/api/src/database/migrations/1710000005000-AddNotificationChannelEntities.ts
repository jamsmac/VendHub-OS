import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: AddNotificationChannelEntities
 *
 * Creates push_subscriptions (Web Push API) and fcm_tokens (Firebase Cloud
 * Messaging) tables for multi-channel browser and mobile push notifications.
 * Supports device-type tracking, active/inactive management, and metadata.
 */
export class AddNotificationChannelEntities1710000005000 implements MigrationInterface {
  name = 'AddNotificationChannelEntities1710000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: device_type_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE device_type_enum AS ENUM (
          'ios',
          'android',
          'web'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // TABLE: push_subscriptions (Web Push API)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope (nullable for system-wide admins)
        organization_id uuid,

        -- Owner
        user_id uuid NOT NULL,

        -- Web Push subscription keys
        endpoint text NOT NULL,
        p256dh text NOT NULL,
        auth text NOT NULL,

        -- Browser info
        user_agent varchar(500),

        -- Status
        is_active boolean NOT NULL DEFAULT true,
        last_used_at timestamptz,

        -- Metadata
        metadata jsonb,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ========================================================================
    // TABLE: fcm_tokens (Firebase Cloud Messaging)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization scope (nullable for system-wide admins)
        organization_id uuid,

        -- Owner
        user_id uuid NOT NULL,

        -- FCM token
        token text NOT NULL,

        -- Device info
        device_type device_type_enum NOT NULL,
        device_name varchar(200),
        device_id varchar(200),

        -- Status
        is_active boolean NOT NULL DEFAULT true,
        last_used_at timestamptz,

        -- Metadata
        metadata jsonb,

        -- BaseEntity standard columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // ========================================================================
    // INDEXES: push_subscriptions
    // ========================================================================

    // User lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
        ON push_subscriptions(user_id)
    `);

    // Unique endpoint (only one subscription per endpoint)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
        ON push_subscriptions(endpoint)
        WHERE deleted_at IS NULL
    `);

    // Active subscriptions for bulk sends
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
        ON push_subscriptions(is_active)
        WHERE deleted_at IS NULL AND is_active = true
    `);

    // ========================================================================
    // INDEXES: fcm_tokens
    // ========================================================================

    // User lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id
        ON fcm_tokens(user_id)
    `);

    // Unique token (only one registration per token)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_tokens_token
        ON fcm_tokens(token)
        WHERE deleted_at IS NULL
    `);

    // Active tokens by device type for targeted sends
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active_device
        ON fcm_tokens(device_type, is_active)
        WHERE deleted_at IS NULL AND is_active = true
    `);

    // ========================================================================
    // FOREIGN KEYS
    // ========================================================================

    await queryRunner.query(`
      ALTER TABLE push_subscriptions
        ADD CONSTRAINT fk_push_subscriptions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE fcm_tokens
        ADD CONSTRAINT fk_fcm_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop foreign keys
    await queryRunner.query(`ALTER TABLE fcm_tokens DROP CONSTRAINT IF EXISTS fk_fcm_tokens_user`);
    await queryRunner.query(`ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS fk_push_subscriptions_user`);

    // -- Drop indexes (fcm_tokens)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fcm_tokens_active_device`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fcm_tokens_token`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fcm_tokens_user_id`);

    // -- Drop indexes (push_subscriptions)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_push_subscriptions_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_push_subscriptions_endpoint`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_push_subscriptions_user_id`);

    // -- Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS fcm_tokens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS push_subscriptions CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS device_type_enum`);
  }
}
