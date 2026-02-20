import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: AddTelegramEntities
 *
 * Phase 4 - Step 2:
 * 1. CREATE TABLE telegram_users - Telegram users linked to VendHub (staff & customer bots)
 * 2. CREATE TABLE telegram_message_logs - incoming/outgoing message audit trail
 * 3. CREATE TABLE telegram_settings - per-organization bot configuration
 * 4. CREATE TABLE telegram_bot_analytics - bot usage event tracking
 *
 * Supports multi-bot architecture (staff + customer), notification preferences,
 * verification workflows, and comprehensive analytics.
 */
export class AddTelegramEntities1710000001000 implements MigrationInterface {
  name = 'AddTelegramEntities1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ========================================================================
    // ENUM: telegram_language_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_language_enum AS ENUM (
          'ru',
          'en',
          'uz'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: telegram_user_status_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_user_status_enum AS ENUM (
          'active',
          'blocked',
          'inactive'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: telegram_message_type_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_message_type_enum AS ENUM (
          'command',
          'notification',
          'callback',
          'message',
          'photo',
          'location',
          'contact',
          'error'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: telegram_message_status_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_message_status_enum AS ENUM (
          'sent',
          'delivered',
          'failed',
          'read'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // ENUM: telegram_event_type_enum
    // ========================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_event_type_enum AS ENUM (
          'command',
          'callback',
          'message',
          'quick_action',
          'voice_command',
          'qr_scan',
          'location_share',
          'bot_start',
          'bot_block',
          'notification_sent',
          'notification_failed'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ========================================================================
    // TABLE: telegram_users
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS telegram_users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization (nullable for unlinked users)
        organization_id uuid,

        -- Link to VendHub user
        user_id uuid,

        -- Telegram identity
        telegram_id varchar(50) NOT NULL,
        chat_id varchar(50) NOT NULL,
        username varchar(100),
        first_name varchar(100),
        last_name varchar(100),
        phone varchar(20),

        -- Preferences
        language telegram_language_enum NOT NULL DEFAULT 'ru',
        bot_type varchar(20) NOT NULL DEFAULT 'staff',
        status telegram_user_status_enum NOT NULL DEFAULT 'active',
        notification_preferences jsonb,

        -- Verification
        is_verified boolean NOT NULL DEFAULT false,
        verification_code varchar(10),
        verification_expires_at timestamptz,

        -- Activity
        last_interaction_at timestamptz,

        -- Extra data
        metadata jsonb,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for telegram_users
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_users_telegram_id
        ON telegram_users(telegram_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id
        ON telegram_users(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_users_org_status
        ON telegram_users(organization_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_users_chat_id
        ON telegram_users(chat_id)
    `);

    // -- FK: telegram_users -> users (optional link)
    // Note: FK to users table is intentionally omitted here because the users table
    // may not exist yet or may be managed by a different migration. The application
    // layer handles referential integrity for this relationship.

    // ========================================================================
    // TABLE: telegram_message_logs
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS telegram_message_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization
        organization_id uuid,

        -- Reference to telegram user
        telegram_user_id uuid NOT NULL,

        -- Message details
        chat_id varchar(50) NOT NULL,
        direction varchar(10) NOT NULL DEFAULT 'incoming',
        message_type telegram_message_type_enum NOT NULL,
        command varchar(100),
        message_text text,
        telegram_message_id integer,

        -- Status
        status telegram_message_status_enum NOT NULL DEFAULT 'sent',

        -- Error handling
        error_message text,

        -- Performance
        response_time_ms integer,

        -- Extra data
        metadata jsonb,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for telegram_message_logs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_message_logs_user_id
        ON telegram_message_logs(telegram_user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_message_logs_chat_created
        ON telegram_message_logs(chat_id, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_message_logs_type_status
        ON telegram_message_logs(message_type, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_message_logs_org_created
        ON telegram_message_logs(organization_id, created_at)
    `);

    // -- FK: telegram_message_logs -> telegram_users
    await queryRunner.query(`
      ALTER TABLE telegram_message_logs
        ADD CONSTRAINT fk_telegram_message_logs_user
        FOREIGN KEY (telegram_user_id) REFERENCES telegram_users(id) ON DELETE CASCADE
    `);

    // ========================================================================
    // TABLE: telegram_settings
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS telegram_settings (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization (nullable for global settings)
        organization_id uuid,

        -- Setting identification
        setting_key varchar(50) NOT NULL,

        -- Bot configuration
        bot_token_encrypted text,
        bot_username varchar(100),
        mode varchar(20) NOT NULL DEFAULT 'polling',
        webhook_url varchar(500),

        -- Feature flags
        is_active boolean NOT NULL DEFAULT true,
        send_notifications boolean NOT NULL DEFAULT true,
        max_messages_per_minute integer NOT NULL DEFAULT 30,

        -- Default language
        default_language telegram_language_enum NOT NULL DEFAULT 'ru',

        -- Welcome messages (i18n)
        welcome_message_ru text,
        welcome_message_en text,
        welcome_message_uz text,

        -- Notification preferences template
        default_notification_preferences jsonb,

        -- Extra data
        metadata jsonb,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for telegram_settings
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_settings_setting_key
        ON telegram_settings(setting_key)
    `);

    // ========================================================================
    // TABLE: telegram_bot_analytics
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS telegram_bot_analytics (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Organization
        organization_id uuid,

        -- User references
        telegram_user_id uuid,
        user_id uuid,

        -- Bot type
        bot_type varchar(20) NOT NULL DEFAULT 'staff',

        -- Event details
        event_type telegram_event_type_enum NOT NULL,
        action_name varchar(100) NOT NULL,
        action_category varchar(50),

        -- Performance
        response_time_ms integer,

        -- Result
        success boolean NOT NULL DEFAULT true,
        error_message text,

        -- Session tracking
        session_id varchar(50),

        -- Extra data
        metadata jsonb,

        -- Standard BaseEntity columns
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        created_by_id uuid,
        updated_by_id uuid
      )
    `);

    // -- Indexes for telegram_bot_analytics
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_bot_analytics_user_created
        ON telegram_bot_analytics(telegram_user_id, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_bot_analytics_event_created
        ON telegram_bot_analytics(event_type, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_bot_analytics_org_created
        ON telegram_bot_analytics(organization_id, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_telegram_bot_analytics_action_name
        ON telegram_bot_analytics(action_name)
    `);

    // -- FK: telegram_bot_analytics -> telegram_users (optional)
    await queryRunner.query(`
      ALTER TABLE telegram_bot_analytics
        ADD CONSTRAINT fk_telegram_bot_analytics_user
        FOREIGN KEY (telegram_user_id) REFERENCES telegram_users(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // -- Drop FK constraints
    await queryRunner.query(`ALTER TABLE telegram_bot_analytics DROP CONSTRAINT IF EXISTS fk_telegram_bot_analytics_user`);
    await queryRunner.query(`ALTER TABLE telegram_message_logs DROP CONSTRAINT IF EXISTS fk_telegram_message_logs_user`);

    // -- Drop indexes for telegram_bot_analytics
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_bot_analytics_action_name`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_bot_analytics_org_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_bot_analytics_event_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_bot_analytics_user_created`);

    // -- Drop indexes for telegram_settings
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_settings_setting_key`);

    // -- Drop indexes for telegram_message_logs
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_message_logs_org_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_message_logs_type_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_message_logs_chat_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_message_logs_user_id`);

    // -- Drop indexes for telegram_users
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_users_chat_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_users_org_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_users_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_telegram_users_telegram_id`);

    // -- Drop tables in reverse order (children first)
    await queryRunner.query(`DROP TABLE IF EXISTS telegram_bot_analytics CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS telegram_settings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS telegram_message_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS telegram_users CASCADE`);

    // -- Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS telegram_event_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS telegram_message_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS telegram_message_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS telegram_user_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS telegram_language_enum`);
  }
}
