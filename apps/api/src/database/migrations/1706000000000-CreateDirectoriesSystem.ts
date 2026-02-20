import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDirectoriesSystem1706000000000 implements MigrationInterface {
  name = 'CreateDirectoriesSystem1706000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // PART 1: EXTENSIONS
    // ========================================================================

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ========================================================================
    // PART 2: ENUM TYPES
    // All enums use DO $$ blocks for IF NOT EXISTS safety.
    // Enums that could conflict with existing ones are prefixed with
    // "directory_" to avoid collisions.
    // ========================================================================

    // directory_type
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'directory_type') THEN
          CREATE TYPE directory_type AS ENUM (
            'MANUAL',
            'EXTERNAL',
            'PARAM',
            'TEMPLATE'
          );
        END IF;
      END $$
    `);

    // directory_scope
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'directory_scope') THEN
          CREATE TYPE directory_scope AS ENUM (
            'HQ',
            'ORGANIZATION',
            'LOCATION'
          );
        END IF;
      END $$
    `);

    // field_type
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_type') THEN
          CREATE TYPE field_type AS ENUM (
            'TEXT',
            'NUMBER',
            'DATE',
            'DATETIME',
            'BOOLEAN',
            'SELECT_SINGLE',
            'SELECT_MULTI',
            'REF',
            'JSON',
            'FILE',
            'IMAGE'
          );
        END IF;
      END $$
    `);

    // entry_origin
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_origin') THEN
          CREATE TYPE entry_origin AS ENUM (
            'OFFICIAL',
            'LOCAL'
          );
        END IF;
      END $$
    `);

    // entry_status
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_status') THEN
          CREATE TYPE entry_status AS ENUM (
            'DRAFT',
            'PENDING_APPROVAL',
            'ACTIVE',
            'DEPRECATED',
            'ARCHIVED'
          );
        END IF;
      END $$
    `);

    // source_type
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
          CREATE TYPE source_type AS ENUM (
            'URL',
            'API',
            'FILE',
            'TEXT'
          );
        END IF;
      END $$
    `);

    // sync_status
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN
          CREATE TYPE sync_status AS ENUM (
            'SUCCESS',
            'FAILED',
            'PARTIAL'
          );
        END IF;
      END $$
    `);

    // sync_log_status
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_log_status') THEN
          CREATE TYPE sync_log_status AS ENUM (
            'STARTED',
            'SUCCESS',
            'FAILED',
            'PARTIAL'
          );
        END IF;
      END $$
    `);

    // directory_audit_action (renamed from audit_action to avoid conflict
    // with existing audit_action_enum in AddInventoryAndAuditTables)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'directory_audit_action') THEN
          CREATE TYPE directory_audit_action AS ENUM (
            'CREATE',
            'UPDATE',
            'ARCHIVE',
            'RESTORE',
            'SYNC',
            'APPROVE',
            'REJECT'
          );
        END IF;
      END $$
    `);

    // directory_event_type (renamed from event_type to avoid conflict)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'directory_event_type') THEN
          CREATE TYPE directory_event_type AS ENUM (
            'ENTRY_CREATED',
            'ENTRY_UPDATED',
            'ENTRY_ARCHIVED',
            'ENTRY_RESTORED',
            'SYNC_STARTED',
            'SYNC_COMPLETED',
            'SYNC_FAILED',
            'IMPORT_STARTED',
            'IMPORT_COMPLETED',
            'IMPORT_FAILED'
          );
        END IF;
      END $$
    `);

    // directory_delivery_status (renamed from delivery_status to avoid conflict)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'directory_delivery_status') THEN
          CREATE TYPE directory_delivery_status AS ENUM (
            'PENDING',
            'SUCCESS',
            'FAILED',
            'DEAD'
          );
        END IF;
      END $$
    `);

    // directory_import_status (renamed from import_status to avoid conflict
    // with existing import_status_enum in AddWarehouseZonesAndImport)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'directory_import_status') THEN
          CREATE TYPE directory_import_status AS ENUM (
            'PENDING',
            'PROCESSING',
            'COMPLETED',
            'PARTIAL',
            'FAILED',
            'CANCELLED'
          );
        END IF;
      END $$
    `);

    // directory_import_mode (renamed from import_mode to avoid conflict)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'directory_import_mode') THEN
          CREATE TYPE directory_import_mode AS ENUM (
            'CREATE_ONLY',
            'UPSERT',
            'UPDATE_ONLY',
            'DRY_RUN'
          );
        END IF;
      END $$
    `);

    // ========================================================================
    // PART 3: HELPER FUNCTIONS
    // ========================================================================

    // Function: update_updated_at (used by triggers)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Function: normalize_entry_name
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION normalize_entry_name(p_name text)
      RETURNS text AS $$
      BEGIN
        RETURN lower(trim(unaccent(coalesce(p_name, ''))));
      END;
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION normalize_entry_name IS 'Normalizes name: lower + trim + unaccent'
    `);

    // ========================================================================
    // PART 4: TABLES
    // ========================================================================

    // ------------------------------------------------------------------------
    // Table: directories
    // Description: Directory metadata (справочники)
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Core fields
        name text NOT NULL,
        slug text NOT NULL,
        description text,

        -- Type and scope
        type directory_type NOT NULL,
        scope directory_scope NOT NULL DEFAULT 'HQ',
        organization_id uuid,
        location_id uuid,

        -- Flags
        is_hierarchical boolean NOT NULL DEFAULT false,
        is_system boolean NOT NULL DEFAULT false,

        -- Additional
        icon text,
        settings jsonb NOT NULL DEFAULT '{
          "allow_inline_create": true,
          "allow_local_overlay": true,
          "approval_required": false,
          "prefetch": false,
          "offline_enabled": false,
          "offline_max_entries": 1000
        }'::jsonb,

        -- Audit
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directories IS 'Directory metadata (справочники)'`);
    await queryRunner.query(`COMMENT ON COLUMN directories.slug IS 'Unique directory code (latin)'`);
    await queryRunner.query(`COMMENT ON COLUMN directories.settings IS 'Settings: allow_inline_create, allow_local_overlay, approval_required, prefetch, offline_enabled, offline_max_entries'`);
    await queryRunner.query(`COMMENT ON COLUMN directories.is_system IS 'System directory (cannot be deleted)'`);

    // ------------------------------------------------------------------------
    // Table: directory_fields
    // Description: Directory field definitions (EAV schema)
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_fields (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,

        -- Identification
        name text NOT NULL,
        display_name text NOT NULL,
        description text,

        -- Type and source
        field_type field_type NOT NULL,
        ref_directory_id uuid REFERENCES directories(id) ON DELETE SET NULL,
        allow_free_text boolean NOT NULL DEFAULT false,

        -- Rules
        is_required boolean NOT NULL DEFAULT false,
        is_unique boolean NOT NULL DEFAULT false,
        is_unique_per_org boolean NOT NULL DEFAULT false,

        -- Display
        show_in_list boolean NOT NULL DEFAULT false,
        show_in_card boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,

        -- Values
        default_value jsonb,
        validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,

        -- Localization
        translations jsonb,

        -- Audit
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        -- Constraints
        CONSTRAINT uq_fields_directory_name UNIQUE (directory_id, name)
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_fields IS 'Directory field definitions (EAV schema)'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_fields.name IS 'System field name (for API)'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_fields.display_name IS 'Display name'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_fields.ref_directory_id IS 'Source directory for SELECT/REF field types'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_fields.allow_free_text IS 'Allow free text input for SELECT'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_fields.validation_rules IS 'Validation rules (regex, min/max, etc.)'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_fields.translations IS 'Field name translations'`);

    // ------------------------------------------------------------------------
    // Table: directory_entries
    // Description: Directory entries (records)
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,

        -- Hierarchy (self-reference added later)
        parent_id uuid,

        -- Core fields
        name text NOT NULL,
        normalized_name text NOT NULL,
        code text,
        external_key text,
        description text,

        -- Localization
        translations jsonb,

        -- Origin
        origin entry_origin NOT NULL DEFAULT 'LOCAL',
        origin_source text,
        origin_date timestamptz,

        -- Status and versioning
        status entry_status NOT NULL DEFAULT 'ACTIVE',
        version int NOT NULL DEFAULT 1,
        valid_from timestamptz,
        valid_to timestamptz,
        deprecated_at timestamptz,
        replacement_entry_id uuid,

        -- Organization and metadata
        tags text[],
        sort_order int NOT NULL DEFAULT 0,
        data jsonb NOT NULL DEFAULT '{}'::jsonb,
        search_vector tsvector,
        organization_id uuid,

        -- Audit
        created_by uuid,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )
    `);

    // Self-references for directory_entries
    await queryRunner.query(`
      ALTER TABLE directory_entries
        ADD CONSTRAINT fk_entries_parent
        FOREIGN KEY (parent_id) REFERENCES directory_entries(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE directory_entries
        ADD CONSTRAINT fk_entries_replacement
        FOREIGN KEY (replacement_entry_id) REFERENCES directory_entries(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_entries IS 'Directory entries (records)'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_entries.normalized_name IS 'Normalized name: lower(trim(unaccent(name)))'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_entries.external_key IS 'Key from external source'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_entries.origin IS 'Origin: OFFICIAL (external source) or LOCAL (manual addition)'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_entries.replacement_entry_id IS 'Recommended replacement for DEPRECATED entries'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_entries.data IS 'Field values (EAV via JSONB)'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_entries.search_vector IS 'Full-text search vector'`);

    // ------------------------------------------------------------------------
    // Table: directory_sources
    // Description: External data sources
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,

        -- Identification
        name text NOT NULL,
        source_type source_type NOT NULL,

        -- Connection
        url text,
        auth_config jsonb,
        request_config jsonb,

        -- Mapping
        column_mapping jsonb NOT NULL,
        unique_key_field text NOT NULL,

        -- Schedule
        schedule text,
        is_active boolean NOT NULL DEFAULT true,

        -- Sync status
        last_sync_at timestamptz,
        last_sync_status sync_status,
        last_sync_error text,
        consecutive_failures int NOT NULL DEFAULT 0,

        -- Versioning
        source_version text,

        -- Audit
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_sources IS 'External data sources'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_sources.auth_config IS 'Auth config: {type: "bearer", token: "..."} or {type: "basic", ...}'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_sources.request_config IS 'Request config: headers, method, body template'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_sources.column_mapping IS 'Column mapping: {"source_col": "field_name", ...}'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_sources.schedule IS 'Cron expression for automatic sync'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_sources.source_version IS 'Source data version (for cache invalidation)'`);

    // ------------------------------------------------------------------------
    // Table: directory_sync_logs
    // Description: Sync logs
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_sync_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
        source_id uuid NOT NULL REFERENCES directory_sources(id) ON DELETE CASCADE,

        -- Status
        status sync_log_status NOT NULL,

        -- Time
        started_at timestamptz NOT NULL DEFAULT now(),
        finished_at timestamptz,

        -- Statistics
        total_records int,
        created_count int,
        updated_count int,
        deprecated_count int,
        error_count int,

        -- Errors
        errors jsonb,

        -- Who triggered
        triggered_by uuid
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_sync_logs IS 'Sync logs'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_sync_logs.triggered_by IS 'Who triggered sync (null if scheduled)'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_sync_logs.errors IS 'Error array: [{record, field, message}, ...]'`);

    // ------------------------------------------------------------------------
    // Table: directory_entry_audit
    // Description: Entry change history
    // Uses directory_audit_action enum (renamed from audit_action)
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_entry_audit (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,

        -- Action
        action directory_audit_action NOT NULL,

        -- Who and when
        changed_by uuid,
        changed_at timestamptz NOT NULL DEFAULT now(),

        -- Changes
        old_values jsonb,
        new_values jsonb,

        -- Additional
        change_reason text,
        ip_address inet,
        user_agent text
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_entry_audit IS 'Entry change history'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_entry_audit.old_values IS 'Values before change'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_entry_audit.new_values IS 'Values after change'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_entry_audit.change_reason IS 'Change comment/reason'`);

    // ------------------------------------------------------------------------
    // Table: directory_permissions
    // Description: Directory access permissions
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,

        -- Permission subject
        organization_id uuid,
        role text,
        user_id uuid,

        -- Permissions
        can_view boolean NOT NULL DEFAULT true,
        can_create boolean NOT NULL DEFAULT false,
        can_edit boolean NOT NULL DEFAULT false,
        can_archive boolean NOT NULL DEFAULT false,
        can_bulk_import boolean NOT NULL DEFAULT false,
        can_sync_external boolean NOT NULL DEFAULT false,
        can_approve boolean NOT NULL DEFAULT false,

        -- Inheritance and deny
        inherit_from_parent boolean NOT NULL DEFAULT true,
        is_deny boolean NOT NULL DEFAULT false,

        -- Audit
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        -- Constraint: must specify role or user_id
        CONSTRAINT chk_permissions_subject CHECK (role IS NOT NULL OR user_id IS NOT NULL)
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_permissions IS 'Directory access permissions'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_permissions.role IS 'Role: owner, admin, manager, operator, viewer'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_permissions.inherit_from_parent IS 'Inherit permissions from parent organization (HQ)'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_permissions.is_deny IS 'Explicit deny (overrides allow)'`);

    // ------------------------------------------------------------------------
    // Table: directory_events
    // Description: Events for webhooks and triggers
    // Uses directory_event_type enum (renamed from event_type)
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Event type
        event_type directory_event_type NOT NULL,

        -- Relations
        directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
        entry_id uuid REFERENCES directory_entries(id) ON DELETE SET NULL,

        -- Batch (for bulk operations)
        batch_id uuid,
        sequence_num int,

        -- Data
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,

        -- Time
        created_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_events IS 'Events for webhooks and triggers'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_events.batch_id IS 'Event group ID (for bulk operations)'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_events.sequence_num IS 'Sequence number in group'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_events.processed_at IS 'When event was processed (null = pending)'`);

    // ------------------------------------------------------------------------
    // Table: directory_webhooks (renamed from webhooks to avoid conflict)
    // Description: Webhook settings
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_webhooks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Directory relation (null = all directories)
        directory_id uuid REFERENCES directories(id) ON DELETE CASCADE,

        -- Settings
        name text NOT NULL,
        url text NOT NULL,
        secret text,
        event_types text[] NOT NULL,
        is_active boolean NOT NULL DEFAULT true,

        -- Additional headers
        headers jsonb,

        -- Audit
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_webhooks IS 'Webhook settings for directory events'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_webhooks.secret IS 'Secret for HMAC-SHA256 payload signature'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_webhooks.event_types IS 'Event types to send: {ENTRY_CREATED, ENTRY_UPDATED, ...}'`);

    // ------------------------------------------------------------------------
    // Table: directory_webhook_deliveries (renamed from webhook_deliveries)
    // Description: Webhook delivery logs
    // Uses directory_delivery_status enum (renamed from delivery_status)
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_webhook_deliveries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id uuid NOT NULL REFERENCES directory_webhooks(id) ON DELETE CASCADE,
        event_id uuid NOT NULL REFERENCES directory_events(id) ON DELETE CASCADE,

        -- Status
        status directory_delivery_status NOT NULL DEFAULT 'PENDING',
        attempts int NOT NULL DEFAULT 0,

        -- Time
        last_attempt_at timestamptz,
        next_attempt_at timestamptz,

        -- Result
        response_status int,
        response_body text,
        error_message text,

        -- Audit
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_webhook_deliveries IS 'Webhook delivery logs'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_webhook_deliveries.next_attempt_at IS 'Time of next retry attempt'`);

    // ------------------------------------------------------------------------
    // Table: directory_webhook_dead_letters (renamed from webhook_dead_letters)
    // Description: Dead letter queue for failed webhook deliveries
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_webhook_dead_letters (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id uuid NOT NULL REFERENCES directory_webhooks(id) ON DELETE CASCADE,
        event_id uuid NOT NULL REFERENCES directory_events(id) ON DELETE CASCADE,
        delivery_id uuid REFERENCES directory_webhook_deliveries(id) ON DELETE SET NULL,

        -- Error info
        attempts int NOT NULL,
        last_error text,

        -- Stored payload
        payload jsonb NOT NULL,

        -- Audit
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_webhook_dead_letters IS 'Dead letter queue for failed webhook deliveries'`);

    // ------------------------------------------------------------------------
    // Table: directory_import_jobs (renamed from import_jobs to avoid conflict
    // with existing import_jobs in AddWarehouseZonesAndImport)
    // Description: Bulk import jobs
    // Uses directory_import_status and directory_import_mode enums
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_import_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,

        -- Status
        status directory_import_status NOT NULL DEFAULT 'PENDING',
        mode directory_import_mode NOT NULL DEFAULT 'UPSERT',

        -- File
        file_name text,
        file_path text,

        -- Settings
        column_mapping jsonb NOT NULL,
        unique_key_field text,
        is_atomic boolean NOT NULL DEFAULT false,

        -- Statistics
        total_rows int NOT NULL DEFAULT 0,
        processed_rows int NOT NULL DEFAULT 0,
        success_count int NOT NULL DEFAULT 0,
        error_count int NOT NULL DEFAULT 0,

        -- Errors and preview
        errors jsonb NOT NULL DEFAULT '[]'::jsonb,
        warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
        preview_data jsonb,

        -- Audit
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        started_at timestamptz,
        finished_at timestamptz
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_import_jobs IS 'Bulk import jobs for directories'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_import_jobs.is_atomic IS 'Atomic mode: all or nothing'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_import_jobs.errors IS 'Error array: [{row, field, message, data}, ...]'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_import_jobs.preview_data IS 'First 10 rows for preview'`);

    // ------------------------------------------------------------------------
    // Table: directory_import_templates (renamed from import_templates)
    // Description: Import mapping templates
    // Uses directory_import_mode enum
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_import_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,

        -- Identification
        name text NOT NULL,
        description text,

        -- Mapping
        column_mapping jsonb NOT NULL,
        unique_key_field text,
        default_mode directory_import_mode NOT NULL DEFAULT 'UPSERT',

        -- Flags
        is_default boolean NOT NULL DEFAULT false,

        -- Audit
        created_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_import_templates IS 'Import mapping templates for directories'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_import_templates.is_default IS 'Default template for directory'`);

    // ------------------------------------------------------------------------
    // Table: user_recent_selections
    // Description: User recent selections (for autocomplete)
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_recent_selections (
        user_id uuid NOT NULL,
        directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
        entry_id uuid NOT NULL REFERENCES directory_entries(id) ON DELETE CASCADE,

        -- Time and counter
        selected_at timestamptz NOT NULL DEFAULT now(),
        selection_count int NOT NULL DEFAULT 1,

        -- Composite PK
        PRIMARY KEY (user_id, directory_id, entry_id)
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE user_recent_selections IS 'User recent selections for autocomplete'`);
    await queryRunner.query(`COMMENT ON COLUMN user_recent_selections.selection_count IS 'Selection counter (for popularity sorting)'`);

    // ------------------------------------------------------------------------
    // Table: directory_stats
    // Description: Directory statistics
    // ------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS directory_stats (
        directory_id uuid PRIMARY KEY REFERENCES directories(id) ON DELETE CASCADE,

        -- Counters
        total_entries int NOT NULL DEFAULT 0,
        active_entries int NOT NULL DEFAULT 0,
        official_entries int NOT NULL DEFAULT 0,
        local_entries int NOT NULL DEFAULT 0,

        -- Sync
        last_sync_at timestamptz,
        last_sync_status sync_status,
        consecutive_sync_failures int NOT NULL DEFAULT 0,

        -- Import
        last_import_at timestamptz,

        -- Performance
        avg_search_time_ms numeric,

        -- Audit
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`COMMENT ON TABLE directory_stats IS 'Directory statistics'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_stats.consecutive_sync_failures IS 'Number of consecutive sync failures'`);
    await queryRunner.query(`COMMENT ON COLUMN directory_stats.avg_search_time_ms IS 'Average search time in milliseconds'`);

    // ========================================================================
    // PART 5: INDEXES
    // ========================================================================

    // -- directories
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_directories_slug_active
        ON directories(slug) WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_directories_type
        ON directories(type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_directories_scope_org
        ON directories(scope, organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_directories_deleted
        ON directories(deleted_at) WHERE deleted_at IS NOT NULL
    `);

    // -- directory_fields
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fields_directory
        ON directory_fields(directory_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fields_directory_order
        ON directory_fields(directory_id, sort_order)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fields_ref
        ON directory_fields(ref_directory_id)
        WHERE ref_directory_id IS NOT NULL
    `);

    // -- directory_entries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_directory
        ON directory_entries(directory_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_directory_status
        ON directory_entries(directory_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_parent
        ON directory_entries(parent_id) WHERE parent_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_code
        ON directory_entries(directory_id, code) WHERE code IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_external_key
        ON directory_entries(directory_id, external_key)
        WHERE external_key IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_origin
        ON directory_entries(directory_id, origin)
    `);

    // Uniqueness of normalized_name within directory + origin
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_normalized_unique
        ON directory_entries(directory_id, normalized_name, origin)
        WHERE deleted_at IS NULL
    `);

    // Full-text search
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_search_vector
        ON directory_entries USING gin(search_vector)
    `);

    // Trigram for fuzzy search
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_normalized_trgm
        ON directory_entries USING gin(normalized_name gin_trgm_ops)
    `);

    // JSONB indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_tags
        ON directory_entries USING gin(tags)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_data
        ON directory_entries USING gin(data jsonb_path_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_translations
        ON directory_entries USING gin(translations)
    `);

    // -- directory_sources
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sources_directory
        ON directory_sources(directory_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sources_active_schedule
        ON directory_sources(is_active, schedule)
        WHERE schedule IS NOT NULL
    `);

    // -- directory_sync_logs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_logs_directory
        ON directory_sync_logs(directory_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_logs_source
        ON directory_sync_logs(source_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sync_logs_started
        ON directory_sync_logs(started_at DESC)
    `);

    // -- directory_entry_audit
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_audit_entry
        ON directory_entry_audit(entry_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_audit_entry_time
        ON directory_entry_audit(entry_id, changed_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_audit_changed_by
        ON directory_entry_audit(changed_by)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_audit_action
        ON directory_entry_audit(action)
    `);

    // -- directory_permissions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_permissions_directory
        ON directory_permissions(directory_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_permissions_directory_role
        ON directory_permissions(directory_id, role)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_permissions_user
        ON directory_permissions(user_id) WHERE user_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_permissions_org
        ON directory_permissions(organization_id)
        WHERE organization_id IS NOT NULL
    `);

    // -- directory_events
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_events_directory
        ON directory_events(directory_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_events_type_time
        ON directory_events(event_type, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_events_batch
        ON directory_events(batch_id) WHERE batch_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_events_unprocessed
        ON directory_events(created_at) WHERE processed_at IS NULL
    `);

    // -- directory_webhooks
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_webhooks_directory
        ON directory_webhooks(directory_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_webhooks_active
        ON directory_webhooks(is_active) WHERE is_active = true
    `);

    // -- directory_webhook_deliveries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_deliveries_webhook
        ON directory_webhook_deliveries(webhook_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_deliveries_event
        ON directory_webhook_deliveries(event_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_deliveries_pending
        ON directory_webhook_deliveries(next_attempt_at)
        WHERE status = 'PENDING'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_deliveries_dead
        ON directory_webhook_deliveries(webhook_id)
        WHERE status = 'DEAD'
    `);

    // -- directory_webhook_dead_letters
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_dead_letters_webhook
        ON directory_webhook_dead_letters(webhook_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_dead_letters_created
        ON directory_webhook_dead_letters(created_at)
    `);

    // -- directory_import_jobs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_import_jobs_directory
        ON directory_import_jobs(directory_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_import_jobs_status
        ON directory_import_jobs(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_import_jobs_user
        ON directory_import_jobs(created_by)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_import_jobs_created
        ON directory_import_jobs(created_at DESC)
    `);

    // -- directory_import_templates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dir_import_templates_directory
        ON directory_import_templates(directory_id)
    `);

    // -- user_recent_selections
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recent_user_dir
        ON user_recent_selections(user_id, directory_id, selected_at DESC)
    `);

    // ========================================================================
    // PART 6: TRIGGERS AND FUNCTIONS
    // ========================================================================

    // -- updated_at triggers
    await queryRunner.query(`
      CREATE TRIGGER trg_directories_updated_at
        BEFORE UPDATE ON directories
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_fields_updated_at
        BEFORE UPDATE ON directory_fields
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_entries_updated_at
        BEFORE UPDATE ON directory_entries
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_sources_updated_at
        BEFORE UPDATE ON directory_sources
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_permissions_updated_at
        BEFORE UPDATE ON directory_permissions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_dir_webhooks_updated_at
        BEFORE UPDATE ON directory_webhooks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_dir_import_templates_updated_at
        BEFORE UPDATE ON directory_import_templates
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `);

    // -- Trigger: Normalize entry name
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_update_normalized_name()
      RETURNS trigger AS $$
      BEGIN
        NEW.normalized_name := normalize_entry_name(NEW.name);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_entry_normalized_name
        BEFORE INSERT OR UPDATE OF name
        ON directory_entries
        FOR EACH ROW EXECUTE FUNCTION trg_update_normalized_name()
    `);

    // -- Trigger: Update search_vector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_update_entry_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', coalesce(NEW.normalized_name, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.code, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.external_key, '')), 'B') ||
          setweight(to_tsvector('simple', coalesce(NEW.translations::text, '')), 'C') ||
          setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_entry_search_vector
        BEFORE INSERT OR UPDATE OF name, normalized_name, code, external_key, translations, description
        ON directory_entries
        FOR EACH ROW EXECUTE FUNCTION trg_update_entry_search_vector()
    `);

    // -- Function: Check hierarchy cycles
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_hierarchy_cycle(
        p_entry_id uuid,
        p_new_parent_id uuid
      ) RETURNS boolean AS $$
      DECLARE
        v_current_id uuid := p_new_parent_id;
        v_depth int := 0;
        v_max_depth int := 100;
      BEGIN
        -- No parent = no cycle
        IF p_new_parent_id IS NULL THEN
          RETURN false;
        END IF;

        -- Self-reference = cycle
        IF p_entry_id = p_new_parent_id THEN
          RETURN true;
        END IF;

        -- Walk up the hierarchy
        WHILE v_current_id IS NOT NULL AND v_depth < v_max_depth LOOP
          SELECT parent_id INTO v_current_id
          FROM directory_entries
          WHERE id = v_current_id;

          -- Found cycle
          IF v_current_id = p_entry_id THEN
            RETURN true;
          END IF;

          v_depth := v_depth + 1;
        END LOOP;

        RETURN false;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION check_hierarchy_cycle IS 'Checks for cycle when setting parent_id'
    `);

    // -- Trigger: Hierarchy cycle check
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_check_hierarchy_cycle()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.parent_id IS NOT NULL THEN
          IF check_hierarchy_cycle(NEW.id, NEW.parent_id) THEN
            RAISE EXCEPTION 'Cycle detected in hierarchy: entry % cannot have parent %',
              NEW.id, NEW.parent_id
              USING ERRCODE = 'integrity_constraint_violation';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_entry_hierarchy_cycle
        BEFORE INSERT OR UPDATE OF parent_id
        ON directory_entries
        FOR EACH ROW EXECUTE FUNCTION trg_check_hierarchy_cycle()
    `);

    // -- Trigger: Update directory stats
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_update_directory_stats()
      RETURNS trigger AS $$
      DECLARE
        v_directory_id uuid;
      BEGIN
        v_directory_id := coalesce(NEW.directory_id, OLD.directory_id);

        INSERT INTO directory_stats (
          directory_id,
          total_entries,
          active_entries,
          official_entries,
          local_entries,
          updated_at
        )
        SELECT
          v_directory_id,
          count(*),
          count(*) FILTER (WHERE status = 'ACTIVE'),
          count(*) FILTER (WHERE origin = 'OFFICIAL'),
          count(*) FILTER (WHERE origin = 'LOCAL'),
          now()
        FROM directory_entries
        WHERE directory_id = v_directory_id
          AND deleted_at IS NULL
        ON CONFLICT (directory_id) DO UPDATE SET
          total_entries = EXCLUDED.total_entries,
          active_entries = EXCLUDED.active_entries,
          official_entries = EXCLUDED.official_entries,
          local_entries = EXCLUDED.local_entries,
          updated_at = EXCLUDED.updated_at;

        RETURN coalesce(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_entries_update_stats
        AFTER INSERT OR UPDATE OR DELETE ON directory_entries
        FOR EACH ROW EXECUTE FUNCTION trg_update_directory_stats()
    `);

    // -- Function: Cleanup old recent selections
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION cleanup_recent_selections(
        p_user_id uuid DEFAULT NULL,
        p_max_per_directory int DEFAULT 20
      )
      RETURNS int AS $$
      DECLARE
        v_deleted int;
      BEGIN
        WITH ranked AS (
          SELECT
            user_id,
            directory_id,
            entry_id,
            row_number() OVER (
              PARTITION BY user_id, directory_id
              ORDER BY selected_at DESC
            ) AS rn
          FROM user_recent_selections
          WHERE p_user_id IS NULL OR user_id = p_user_id
        ),
        to_delete AS (
          SELECT user_id, directory_id, entry_id
          FROM ranked
          WHERE rn > p_max_per_directory
        )
        DELETE FROM user_recent_selections urs
        USING to_delete td
        WHERE urs.user_id = td.user_id
          AND urs.directory_id = td.directory_id
          AND urs.entry_id = td.entry_id;

        GET DIAGNOSTICS v_deleted = ROW_COUNT;
        RETURN v_deleted;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION cleanup_recent_selections IS
        'Deletes old entries, keeping top-N per directory per user'
    `);

    // -- Function: Get localized name
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION get_localized_name(
        p_entry directory_entries,
        p_locale text,
        p_default_locale text DEFAULT 'ru'
      )
      RETURNS text AS $$
      BEGIN
        -- Try current locale
        IF p_entry.translations IS NOT NULL AND p_entry.translations ? p_locale THEN
          RETURN p_entry.translations ->> p_locale;
        END IF;

        -- Try default locale
        IF p_entry.translations IS NOT NULL AND p_entry.translations ? p_default_locale THEN
          RETURN p_entry.translations ->> p_default_locale;
        END IF;

        -- Return base name
        RETURN p_entry.name;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION get_localized_name IS 'Returns localized name with fallback chain'
    `);

    // -- Function: Search directory entries with ranking
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION search_directory_entries(
        p_directory_id uuid,
        p_query text,
        p_status entry_status DEFAULT 'ACTIVE',
        p_limit int DEFAULT 50
      )
      RETURNS TABLE (
        id uuid,
        name text,
        code text,
        origin entry_origin,
        rank real
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          e.id,
          e.name,
          e.code,
          e.origin,
          ts_rank(e.search_vector, plainto_tsquery('simple', p_query)) AS rank
        FROM directory_entries e
        WHERE e.directory_id = p_directory_id
          AND e.status = p_status
          AND e.deleted_at IS NULL
          AND (
            e.search_vector @@ plainto_tsquery('simple', p_query)
            OR e.normalized_name ILIKE '%' || lower(p_query) || '%'
            OR e.code ILIKE p_query || '%'
          )
        ORDER BY
          CASE WHEN e.code ILIKE p_query || '%' THEN 0 ELSE 1 END,
          rank DESC,
          e.name
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION search_directory_entries IS 'Search entries with combined ranking'
    `);

    // ========================================================================
    // PART 7: SEED DATA (System Directories + Units Entries)
    // ========================================================================

    // System directory: Units (Edinitsy izmereniia)
    await queryRunner.query(`
      INSERT INTO directories (name, slug, type, scope, is_system, description, settings)
      VALUES (
        'Единицы измерения',
        'units',
        'PARAM',
        'HQ',
        true,
        'Единицы измерения для товаров и ингредиентов',
        '{"allow_inline_create": true, "prefetch": true, "offline_enabled": true}'::jsonb
      ) ON CONFLICT DO NOTHING
    `);

    // System directory: Product Categories
    await queryRunner.query(`
      INSERT INTO directories (name, slug, type, scope, is_system, is_hierarchical, description, settings)
      VALUES (
        'Категории товаров',
        'product_categories',
        'PARAM',
        'HQ',
        true,
        true,
        'Иерархический справочник категорий товаров',
        '{"allow_inline_create": true, "prefetch": true}'::jsonb
      ) ON CONFLICT DO NOTHING
    `);

    // System directory: Manufacturers
    await queryRunner.query(`
      INSERT INTO directories (name, slug, type, scope, is_system, description, settings)
      VALUES (
        'Производители',
        'manufacturers',
        'MANUAL',
        'HQ',
        true,
        'Производители товаров',
        '{"allow_inline_create": true, "prefetch": false}'::jsonb
      ) ON CONFLICT DO NOTHING
    `);

    // System directory: Contractor Types
    await queryRunner.query(`
      INSERT INTO directories (name, slug, type, scope, is_system, description, settings)
      VALUES (
        'Типы контрагентов',
        'contractor_types',
        'PARAM',
        'HQ',
        true,
        'Типы контрагентов: поставщик, арендодатель и т.д.',
        '{"allow_inline_create": true, "prefetch": true}'::jsonb
      ) ON CONFLICT DO NOTHING
    `);

    // System directory: Machine Types
    await queryRunner.query(`
      INSERT INTO directories (name, slug, type, scope, is_system, description, settings)
      VALUES (
        'Типы автоматов',
        'machine_types',
        'PARAM',
        'HQ',
        true,
        'Типы вендинговых автоматов',
        '{"allow_inline_create": true, "prefetch": true}'::jsonb
      ) ON CONFLICT DO NOTHING
    `);

    // System directory: Location Types
    await queryRunner.query(`
      INSERT INTO directories (name, slug, type, scope, is_system, description, settings)
      VALUES (
        'Типы локаций',
        'location_types',
        'PARAM',
        'HQ',
        true,
        'Типы локаций: БЦ, ТРЦ, учебное заведение и т.д.',
        '{"allow_inline_create": true, "prefetch": true}'::jsonb
      ) ON CONFLICT DO NOTHING
    `);

    // Seed unit entries
    await queryRunner.query(`
      DO $$
      DECLARE
        v_units_id uuid;
      BEGIN
        SELECT id INTO v_units_id FROM directories WHERE slug = 'units';

        IF v_units_id IS NOT NULL THEN
          INSERT INTO directory_entries (directory_id, name, normalized_name, code, origin, status, sort_order)
          VALUES
            (v_units_id, 'Штука',      normalize_entry_name('Штука'),      'pcs',     'LOCAL', 'ACTIVE', 1),
            (v_units_id, 'Килограмм',   normalize_entry_name('Килограмм'),  'kg',      'LOCAL', 'ACTIVE', 2),
            (v_units_id, 'Грамм',       normalize_entry_name('Грамм'),      'g',       'LOCAL', 'ACTIVE', 3),
            (v_units_id, 'Литр',        normalize_entry_name('Литр'),       'l',       'LOCAL', 'ACTIVE', 4),
            (v_units_id, 'Миллилитр',   normalize_entry_name('Миллилитр'),  'ml',      'LOCAL', 'ACTIVE', 5),
            (v_units_id, 'Упаковка',    normalize_entry_name('Упаковка'),   'pack',    'LOCAL', 'ACTIVE', 6),
            (v_units_id, 'Коробка',     normalize_entry_name('Коробка'),    'box',     'LOCAL', 'ACTIVE', 7),
            (v_units_id, 'Порция',      normalize_entry_name('Порция'),     'portion', 'LOCAL', 'ACTIVE', 8)
          ON CONFLICT DO NOTHING;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // Drop everything in reverse order
    // ========================================================================

    // -- Drop triggers first (before dropping functions they depend on)
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_entries_update_stats ON directory_entries`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_entry_hierarchy_cycle ON directory_entries`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_entry_search_vector ON directory_entries`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_entry_normalized_name ON directory_entries`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_dir_import_templates_updated_at ON directory_import_templates`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_dir_webhooks_updated_at ON directory_webhooks`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_permissions_updated_at ON directory_permissions`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_sources_updated_at ON directory_sources`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_entries_updated_at ON directory_entries`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_fields_updated_at ON directory_fields`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_directories_updated_at ON directories`);

    // -- Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS search_directory_entries(uuid, text, entry_status, int)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS get_localized_name(directory_entries, text, text)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS cleanup_recent_selections(uuid, int)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_update_directory_stats()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_check_hierarchy_cycle()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS check_hierarchy_cycle(uuid, uuid)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_update_entry_search_vector()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_update_normalized_name()`);
    // NOTE: update_updated_at() and normalize_entry_name() are left intact
    // because they may be used by other parts of the system.

    // -- Drop indexes (tables cascade-drop their indexes, but be explicit)
    // user_recent_selections
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recent_user_dir`);
    // directory_import_templates
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_import_templates_directory`);
    // directory_import_jobs
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_import_jobs_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_import_jobs_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_import_jobs_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_import_jobs_directory`);
    // directory_webhook_dead_letters
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_dead_letters_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_dead_letters_webhook`);
    // directory_webhook_deliveries
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_deliveries_dead`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_deliveries_pending`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_deliveries_event`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_deliveries_webhook`);
    // directory_webhooks
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_webhooks_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_webhooks_directory`);
    // directory_events
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_events_unprocessed`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_events_batch`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_events_type_time`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_events_directory`);
    // directory_permissions
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_permissions_org`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_permissions_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_permissions_directory_role`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_permissions_directory`);
    // directory_entry_audit
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_audit_action`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_audit_changed_by`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_audit_entry_time`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dir_audit_entry`);
    // directory_sync_logs
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sync_logs_started`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sync_logs_source`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sync_logs_directory`);
    // directory_sources
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sources_active_schedule`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sources_directory`);
    // directory_entries
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_translations`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_data`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_tags`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_normalized_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_search_vector`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_normalized_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_origin`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_external_key`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_parent`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_directory_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_entries_directory`);
    // directory_fields
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fields_ref`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fields_directory_order`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fields_directory`);
    // directories
    await queryRunner.query(`DROP INDEX IF EXISTS idx_directories_deleted`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_directories_scope_org`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_directories_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_directories_slug_active`);

    // -- Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS directory_stats CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_recent_selections CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_import_templates CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_import_jobs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_webhook_dead_letters CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_webhook_deliveries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_webhooks CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_permissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_entry_audit CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_sync_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_sources CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_entries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directory_fields CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS directories CASCADE`);

    // -- Drop enum types (directory-specific only)
    await queryRunner.query(`DROP TYPE IF EXISTS directory_import_mode`);
    await queryRunner.query(`DROP TYPE IF EXISTS directory_import_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS directory_delivery_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS directory_event_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS directory_audit_action`);
    await queryRunner.query(`DROP TYPE IF EXISTS sync_log_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS sync_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS source_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS entry_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS entry_origin`);
    await queryRunner.query(`DROP TYPE IF EXISTS field_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS directory_scope`);
    await queryRunner.query(`DROP TYPE IF EXISTS directory_type`);

    // NOTE: Extensions (uuid-ossp, unaccent, pg_trgm) and shared functions
    // (update_updated_at, normalize_entry_name) are intentionally NOT dropped
    // because they may be used by other migrations and modules.
  }
}
