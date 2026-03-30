import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncEntities1773885435060 implements MigrationInterface {
  name = "SyncEntities1773885435060";

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP CONSTRAINT IF EXISTS "FK_2cc09ed3ffb74b669e0b843b2c2"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP CONSTRAINT IF EXISTS "FK_64385b800e675d22928d1e1cecf"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "quests" DROP CONSTRAINT IF EXISTS "FK_0a0d83baed7a608f036a16dcfec"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_quests" DROP CONSTRAINT IF EXISTS "FK_b83b57c12df8839bf64cd13e726"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_quests" DROP CONSTRAINT IF EXISTS "FK_9300d9ae06520676d0f616e1cd2"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP CONSTRAINT IF EXISTS "FK_5ec76b6935875f4c6ced106bb39"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "invites" DROP CONSTRAINT IF EXISTS "fk_invites_organization"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "invites" DROP CONSTRAINT IF EXISTS "fk_invites_used_by"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP CONSTRAINT IF EXISTS "FK_d3bd929b40dbef1d393e90cfcc9"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "FK_e3653640e4f62aa511fe43b6f84"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "FK_4b8f0ccb5926cfeabea7c18b8e0"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "commission_calculations" DROP CONSTRAINT IF EXISTS "FK_689674ce1054698475d2150c947"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT IF EXISTS "FK_73843addc463ef238567f6f1109"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT IF EXISTS "FK_320cc93480d7bb25a4a984599ba"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "FK_c755e3741cd46fc5ae3ef06592c"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "FK_36b4a912357ad1342b735d4d4c8"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_e73d92cf352ad7b17b08c615cd"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_1e59fa4cd002abcf4ea11e9fea"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_9f1cfab59f911e75a484420078"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_users_email_unique"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."idx_user_sessions_token_hint"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_3b54c5a344f4c1c68c41de391b"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_0c30b2278a5d31e23fcaee4887"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_tp_trip_recorded"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_tp_trip_filtered"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ts_machine_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ts_started_at"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ts_trip_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ta_trip_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ta_type"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ta_resolved"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_tasks_created_by_user_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_8e5e23ee6fccba37f99df331d1"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_3197969cb5ed9b2a00252a3c9e"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_d4bbd861731298b2b1488683d4"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_ea9ba3dfb39050f831ee3be40d"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_cee5459245f652b75eb2759b4c"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_966cbc720d258257e0b2e25461"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_a6171a9597c533488dc7e29298"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_99fca4a3a4a93c26a756c5aca5"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_2f68e345c05e8166ff9deea1ab"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_7421efc125d95e413657efa3c6"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_71fef71b47bf988fa899406acb"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_64385b800e675d22928d1e1cec"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_3b6c5373c29f8eb0e1b41056e5"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_73843addc463ef238567f6f110"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_784e5994d6c60de63f900e9c0e"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_60c250875614c743993278049d"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_899c2496e42b9342f8b9ab86b1"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_6d79d79646c5b036eccd98c51f"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_permissions_name"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_permissions_resource_action"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_ef494681de3ea6734825e88042"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ph_organization_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ph_supplier_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ph_product_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ph_warehouse_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ph_purchase_date"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ph_status"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ph_invoice_number"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_sob_organization_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_sob_product_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_sob_warehouse_id"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_sob_balance_date"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_sob_is_applied"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_e4dc0b6ac9b5cdf5034bb3395a"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_867b91108d721aded509360512"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_4c61f9ea6b50033a3e63ebf5c4"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_aa827a703f547f650ae603ef50"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_20365ed7562812826af747998a"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_70bf0cfdc68926b55cbac67138"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_005371020edbeff27e9f10925d"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_invites_code"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_invites_org_status"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_invites_code"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_invites_org_status"`);
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_invites_used_by_id"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_invites_organization_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_789d1669e6dcec609a539d8a1c"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_d3bd929b40dbef1d393e90cfcc"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_e3653640e4f62aa511fe43b6f8"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_4b8f0ccb5926cfeabea7c18b8e"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_daily_stats_org_date"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."UQ_analytics_snapshot_composite"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_f0e3007d5d0f3d4234444bdb2f"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_e74aaed2d9b76fb9b2ea8f4641"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_aa5f218fc445c6f98519e37b60"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_4a270959307c2d584b4f5b1421"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_40dd3757b510c58f0597a8eba5"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_25f0b25327a0bc759c21bbcdce"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_inventory" DROP CONSTRAINT IF EXISTS "chk_warehouse_current_qty"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_inventory" DROP CONSTRAINT IF EXISTS "chk_warehouse_reserved_qty"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "operator_inventory" DROP CONSTRAINT IF EXISTS "chk_operator_current_qty"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "operator_inventory" DROP CONSTRAINT IF EXISTS "chk_operator_reserved_qty"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machine_inventory" DROP CONSTRAINT IF EXISTS "chk_machine_current_qty"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" DROP CONSTRAINT IF EXISTS "UQ_939a107ba7471a73cbc2d0580f3"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_quests" DROP CONSTRAINT IF EXISTS "UQ_ef494681de3ea6734825e880429"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "UQ_a103993b75768d942744e4b3b40"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "UQ_user_achievement"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "aisle"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "total_capacity"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "used_capacity"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "capacity_unit"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "min_temperature"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "max_temperature"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "organization_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "status"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."warehouse_zones_status_enum"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."warehouse_zones_status_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."warehouse_zones_status_enum" AS ENUM('active', 'inactive', 'maintenance', 'full')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "current_temperature"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "storage_condition"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."warehouse_zones_storage_condition_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."warehouse_zones_storage_condition_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."warehouse_zones_storage_condition_enum" AS ENUM('ambient', 'cool', 'refrigerated', 'frozen', 'dry', 'climate_controlled')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "temperature_updated_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "floor"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "allowed_categories"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "excluded_categories"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "is_pickable"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "pick_priority"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "fifo_enabled"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "method"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."two_factor_auth_method_enum"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."two_factor_auth_method_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."two_factor_auth_method_enum" AS ENUM('totp', 'sms', 'email', 'backup_codes')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "is_enabled"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "secret"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "is_verified"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "email"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "phone_number"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "backup_codes_used"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "enabled_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "password_reset_tokens" DROP COLUMN IF EXISTS "request_ip"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "password_reset_tokens" DROP COLUMN IF EXISTS "request_user_agent"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "is_success"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "user_email"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "user_name"`);
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "user_role"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "entity_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "entity_id"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "entity_name"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "action"`);
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."audit_logs_action_enum"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."audit_logs_action_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('create', 'update', 'delete', 'soft_delete', 'restore', 'login', 'logout', 'login_failed', 'password_change', 'password_reset', 'permission_change', 'settings_change', 'export', 'import', 'bulk_update', 'bulk_delete', 'api_call', 'webhook_received', 'payment_processed', 'refund_issued', 'report_generated', 'notification_sent', 'task_assigned', 'task_completed', 'machine_status_change', 'inventory_adjustment', 'fiscal_operation')`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "category"`);
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."audit_logs_category_enum"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."audit_logs_category_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."audit_logs_category_enum" AS ENUM('authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security', 'compliance', 'financial', 'operational', 'integration')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "old_values"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "new_values"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "changes"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "affected_fields"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "context"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "device_info"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "geo_location"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "tags"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "error_stack"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "expires_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "retention_days"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "totp_secret_iv"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "totp_secret"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "sms_phone"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "email_address"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "used_backup_codes"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "position"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "config"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "metadata"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "user_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "widget_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_widget_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_widget_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."dashboard_widgets_widget_type_enum" AS ENUM('sales_chart', 'revenue_chart', 'top_machines', 'top_products', 'machine_status', 'stock_levels', 'tasks_summary', 'incidents_map', 'kpi_metric', 'custom_chart')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "time_range"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_time_range_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_time_range_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."dashboard_widgets_time_range_enum" AS ENUM('today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_year', 'custom')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "UQ_a53a83849f95cbcf3fbcf32fd0a"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN IF EXISTS "code"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referrer_rewarded"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referred_rewarded"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "completed_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_quests" DROP COLUMN IF EXISTS "started_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "name"`);
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "name_uz"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "condition_metadata"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "bonus_points"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "image_url"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "display_order"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "total_unlocked"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "current_value"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "target_value"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "is_unlocked"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "claimed_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "points_claimed"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "progress_details"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "utm_campaign"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referral_code"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "activation_order_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "activation_order_amount"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "activated_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN IF EXISTS "metadata"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referrer_reward_points"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referred_reward_points"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referrer_reward_paid"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referred_reward_paid"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN IF EXISTS "source"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "warehouse_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "area_sqm"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "capacity"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "current_occupancy"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "is_active"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_id"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "contractor_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "counterparty_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "title_uz"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "dashboard_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "position_x"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "definition_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "filters"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "period_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_period_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_period_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."dashboard_widgets_period_type_enum" AS ENUM('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year', 'last_7_days', 'last_30_days', 'last_90_days', 'custom')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "chart_config"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "kpi_config"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "refresh_interval_seconds"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "last_refresh_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "cached_data"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "cache_expires_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "is_active"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "position_y"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "title"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "title_uz"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "conditions"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "points_reward"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "sort_order"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "organization_id"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "points_awarded"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "warehouse_id" uuid NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "area_sqm" numeric(10,2)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "capacity" integer`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "current_occupancy" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "is_active" boolean NOT NULL DEFAULT true`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "totp_secret" character varying`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "totp_secret_iv" character varying`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "sms_phone" character varying`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "email_address" character varying`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "used_backup_codes" text`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "user_email" character varying(255)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "user_name" character varying(255)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "user_role" character varying(50)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "entity_type" character varying(100) NOT NULL DEFAULT 'unknown'`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "entity_id" uuid`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "entity_name" character varying(255)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "action" "public"."audit_logs_action_enum" NOT NULL DEFAULT 'create'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "category" "public"."audit_logs_category_enum" NOT NULL DEFAULT 'data_modification'`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "old_values" jsonb`);
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "new_values" jsonb`);
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "changes" jsonb`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "affected_fields" text array`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "context" jsonb`);
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "device_info" jsonb`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "geo_location" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "tags" text array`);
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "audit_logs" ADD "error_stack" text`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "retention_days" integer NOT NULL DEFAULT '365'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ADD "expires_at" TIMESTAMP WITH TIME ZONE`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "method" "public"."two_factor_auth_method_enum" NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "is_enabled" boolean NOT NULL DEFAULT false`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "is_verified" boolean NOT NULL DEFAULT false`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "secret" character varying(500)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "phone_number" character varying(50)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "email" character varying(200)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "backup_codes_used" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "enabled_at" TIMESTAMP WITH TIME ZONE`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "dashboard_id" uuid`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "title_uz" character varying(100)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "position_x" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "position_y" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "definition_id" uuid`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "filters" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "period_type" "public"."dashboard_widgets_period_type_enum" NOT NULL DEFAULT 'this_month'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "chart_config" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "kpi_config" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "refresh_interval_seconds" integer NOT NULL DEFAULT '300'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "last_refresh_at" TIMESTAMP`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "cached_data" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "cache_expires_at" TIMESTAMP`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "is_active" boolean NOT NULL DEFAULT true`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "referral_code" character varying(20) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "referrer_reward_points" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "referred_reward_points" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "referrer_reward_paid" boolean NOT NULL DEFAULT false`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "referred_reward_paid" boolean NOT NULL DEFAULT false`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "activation_order_id" character varying`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "activation_order_amount" numeric(15,2)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "activated_at" TIMESTAMP`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "source" character varying(20) NOT NULL DEFAULT 'code'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "utm_campaign" character varying`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "referrals" ADD "metadata" jsonb`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" ADD "device_id" character varying(200)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_quests" ADD "started_at" TIMESTAMP NOT NULL DEFAULT now()`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "title" character varying(255) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "title_uz" character varying(255)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "conditions" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "points_reward" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "sort_order" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ADD "organization_id" uuid NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ADD "points_awarded" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "code" character varying(8) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "referrals" ADD CONSTRAINT "UQ_a53a83849f95cbcf3fbcf32fd0a" UNIQUE ("code"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "referrer_rewarded" boolean NOT NULL DEFAULT false`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "referred_rewarded" boolean NOT NULL DEFAULT false`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ADD "completed_at" TIMESTAMP WITH TIME ZONE`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "organization_id" uuid NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "status" "public"."warehouse_zones_status_enum" NOT NULL DEFAULT 'active'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "storage_condition" "public"."warehouse_zones_storage_condition_enum" NOT NULL DEFAULT 'ambient'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "floor" integer NOT NULL DEFAULT '1'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "aisle" character varying(20)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "total_capacity" numeric(10,2)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "used_capacity" numeric(10,2) NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "capacity_unit" character varying(20) NOT NULL DEFAULT 'units'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "min_temperature" numeric(5,2)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "max_temperature" numeric(5,2)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "current_temperature" numeric(5,2)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "temperature_updated_at" TIMESTAMP WITH TIME ZONE`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "allowed_categories" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "excluded_categories" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "is_pickable" boolean NOT NULL DEFAULT true`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "pick_priority" integer NOT NULL DEFAULT '100'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "fifo_enabled" boolean NOT NULL DEFAULT true`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" ADD "counterparty_id" uuid`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "contracts" SET "counterparty_id" = (SELECT id FROM "counterparties" LIMIT 1) WHERE "counterparty_id" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" ALTER COLUMN "counterparty_id" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "contracts" ADD "contractor_id" uuid`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "user_id" uuid NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "widget_type" "public"."dashboard_widgets_widget_type_enum" NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "time_range" "public"."dashboard_widgets_time_range_enum" NOT NULL DEFAULT 'last_7_days'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "position" integer NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "config" jsonb NOT NULL DEFAULT '{}'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "metadata" jsonb NOT NULL DEFAULT '{}'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "name" character varying(100) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "name_uz" character varying(100)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "condition_metadata" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "bonus_points" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "image_url" character varying`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "display_order" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "total_unlocked" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ADD "current_value" integer NOT NULL DEFAULT '0'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ADD "target_value" integer NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ADD "is_unlocked" boolean NOT NULL DEFAULT false`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ADD "claimed_at" TIMESTAMP WITH TIME ZONE`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ADD "points_claimed" integer`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ADD "progress_details" jsonb`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "work_logs" ALTER COLUMN "overtime_multiplier" SET DEFAULT '1.5'`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "code"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "code" character varying(50) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."warehouse_zones_zone_type_enum" RENAME TO "warehouse_zones_zone_type_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."warehouse_zones_zone_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."warehouse_zones_zone_type_enum" AS ENUM('receiving', 'storage', 'picking', 'packing', 'shipping', 'quarantine', 'returns')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ALTER COLUMN "zone_type" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ALTER COLUMN "zone_type" TYPE "public"."warehouse_zones_zone_type_enum" USING "zone_type"::"text"::"public"."warehouse_zones_zone_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."warehouse_zones_zone_type_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "organizations" SET "name" = 'Unknown' WHERE "name" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "organizations" ALTER COLUMN "name" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "organizations" SET "slug" = 'unknown' WHERE "slug" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "organizations" ALTER COLUMN "slug" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" DROP CONSTRAINT IF EXISTS "FK_e9658e959c490b0a634dfc54783"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" ALTER COLUMN "user_id" DROP NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" DROP COLUMN IF EXISTS "refresh_token_hash"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" ADD "refresh_token_hash" character varying NOT NULL DEFAULT ''`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" ALTER COLUMN "refresh_token_hint" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" ALTER COLUMN "last_activity_at" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" ALTER COLUMN "last_activity_at" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" DROP COLUMN IF EXISTS "revoked_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" ADD "revoked_at" TIMESTAMP`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" DROP COLUMN IF EXISTS "revoked_reason"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_sessions" ADD "revoked_reason" character varying`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ALTER COLUMN "user_id" DROP NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP CONSTRAINT IF EXISTS "UQ_64385b800e675d22928d1e1cecf"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "backup_codes"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "backup_codes" text`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "locked_until"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "locked_until" TIMESTAMP`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "last_used_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "last_used_at" TIMESTAMP`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ALTER COLUMN "metadata" DROP NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ALTER COLUMN "metadata" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_ab673f0e63eac966762155508e"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT IF EXISTS "UQ_ab673f0e63eac966762155508ee"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "password_reset_tokens" DROP COLUMN IF EXISTS "token"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "password_reset_tokens" ADD "token" character varying NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machines" ALTER COLUMN "organization_id" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "machines" SET "machine_number" = 'M-' || LPAD(id::text, 4, '0') WHERE "machine_number" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machines" ALTER COLUMN "machine_number" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machines" ALTER COLUMN "name" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."machine_type_enum_old" RENAME TO "machine_type_enum_old_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."machines_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."machines_type_enum" AS ENUM('coffee', 'snack', 'drink', 'combo', 'fresh', 'ice_cream', 'water')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machines" ALTER COLUMN "type" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machines" ALTER COLUMN "type" TYPE text USING "type"::text`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "machines" SET "type" = 'drink' WHERE "type" = 'beverage'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machines" ALTER COLUMN "type" TYPE "public"."machines_type_enum" USING "type"::"public"."machines_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machines" ALTER COLUMN "type" SET DEFAULT 'coffee'`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."machine_type_enum_old_old"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "products" ALTER COLUMN "organization_id" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "products" ALTER COLUMN "sku" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "products" ALTER COLUMN "name" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "tasks" SET "type_code" = 'refill' WHERE "type_code" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "tasks" ALTER COLUMN "type_code" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "tasks" SET "created_by_user_id" = (SELECT id FROM "users" LIMIT 1) WHERE "created_by_user_id" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "tasks" ALTER COLUMN "created_by_user_id" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" DROP NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "backup_codes"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "backup_codes" jsonb NOT NULL DEFAULT '[]'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "last_used_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "last_used_at" TIMESTAMP WITH TIME ZONE`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "locked_until"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "two_factor_auth" ADD "locked_until" TIMESTAMP WITH TIME ZONE`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "title"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "title" character varying(100) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."dashboard_widgets_chart_type_enum" RENAME TO "dashboard_widgets_chart_type_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_chart_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."dashboard_widgets_chart_type_enum" AS ENUM('line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'heatmap', 'table', 'kpi', 'map', 'funnel', 'gauge')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" TYPE "public"."dashboard_widgets_chart_type_enum" USING "chart_type"::"text"::"public"."dashboard_widgets_chart_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" SET DEFAULT 'kpi'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_chart_type_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" SET DEFAULT 'kpi'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ALTER COLUMN "width" SET DEFAULT '4'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ALTER COLUMN "height" SET DEFAULT '2'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "analytics_snapshots" ALTER COLUMN "average_transaction_value" TYPE numeric(15,2)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "analytics_snapshots" ALTER COLUMN "profit_margin" TYPE numeric(5,2)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ALTER COLUMN "average_sale_amount" TYPE numeric(15,2)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "daily_stats" SET "top_products" = '[]' WHERE "top_products" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ALTER COLUMN "top_products" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ALTER COLUMN "top_products" SET DEFAULT '[]'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "daily_stats" SET "top_machines" = '[]' WHERE "top_machines" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ALTER COLUMN "top_machines" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ALTER COLUMN "top_machines" SET DEFAULT '[]'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "last_updated_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ADD "last_updated_at" TIMESTAMP`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "last_full_rebuild_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ADD "last_full_rebuild_at" TIMESTAMP`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "daily_stats" SET "metadata" = '{}' WHERE "metadata" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ALTER COLUMN "metadata" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "FK_507a2818bf5524662b068c2e81c"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ALTER COLUMN "referred_id" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "referrals" ADD CONSTRAINT "UQ_507a2818bf5524662b068c2e81c" UNIQUE ("referred_id"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "reconciliation_runs" ALTER COLUMN "amount_tolerance" SET DEFAULT '0.01'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "permissions" p SET "action" = actions.action FROM (SELECT id, (ARRAY['create','read','update','delete','manage'])[(ROW_NUMBER() OVER (PARTITION BY resource ORDER BY id))::int] as action FROM "permissions" WHERE "action" IS NULL) actions WHERE p.id = actions.id`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "permissions" SET "name" = "resource" || ':' || "action" WHERE "name" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DELETE FROM "permissions" WHERE id NOT IN (SELECT MIN(id::text)::uuid FROM "permissions" GROUP BY "resource", "action")`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DELETE FROM "permissions" WHERE id NOT IN (SELECT MIN(id::text)::uuid FROM "permissions" GROUP BY "name")`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "permissions" ALTER COLUMN "name" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "permissions" ALTER COLUMN "action" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_639c0f1d38d97d778122d4f299"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "token"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" ADD "token" text NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "fcm_tokens" ADD CONSTRAINT "UQ_639c0f1d38d97d778122d4f2998" UNIQUE ("token"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" ADD "device_type" "public"."fcm_tokens_device_type_enum" NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_name"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" ADD "device_name" character varying(200)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."machine_access_role_enum_old" RENAME TO "machine_access_role_enum_old_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."machine_access_role_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."machine_access_role_enum" AS ENUM('full', 'refill', 'collection', 'maintenance', 'view')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machine_access" ALTER COLUMN "role" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machine_access" ALTER COLUMN "role" TYPE "public"."machine_access_role_enum" USING "role"::"text"::"public"."machine_access_role_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "machine_access" ALTER COLUMN "role" SET DEFAULT 'view'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."machine_access_role_enum_old_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_285706a79624c3a49e7fc066c8"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_cbf20fadedfa0fe481b91b2d11"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."quests_period_enum" RENAME TO "quests_period_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_period_enum"`);
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."quest_period_enum" AS ENUM('daily', 'weekly', 'monthly', 'one_time', 'special')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "quests" ALTER COLUMN "period" TYPE "public"."quest_period_enum" USING "period"::"text"::"public"."quest_period_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."quests_period_enum_old"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."quests_type_enum" RENAME TO "quests_type_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_type_enum"`);
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."quest_type_enum" AS ENUM('order_count', 'order_amount', 'order_single', 'order_category', 'order_product', 'order_time', 'order_machine', 'referral', 'review', 'share', 'visit', 'login_streak', 'profile_complete', 'first_order', 'payment_type', 'spend_points', 'loyal_customer', 'collector')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "quests" ALTER COLUMN "type" TYPE "public"."quest_type_enum" USING "type"::"text"::"public"."quest_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."quests_type_enum_old"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."quests_difficulty_enum" RENAME TO "quests_difficulty_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."quest_difficulty_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."quest_difficulty_enum" AS ENUM('easy', 'medium', 'hard', 'legendary')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "quests" ALTER COLUMN "difficulty" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "quests" ALTER COLUMN "difficulty" TYPE "public"."quest_difficulty_enum" USING "difficulty"::"text"::"public"."quest_difficulty_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "quests" ALTER COLUMN "difficulty" SET DEFAULT 'medium'`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."quests_difficulty_enum_old"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_121d7826393316d089f4cad4d6"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "public"."IDX_9d053a241fd87121aeb284fa35"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."user_quests_status_enum" RENAME TO "user_quests_status_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_status_enum"`);
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."quest_status_enum" AS ENUM('available', 'in_progress', 'completed', 'claimed', 'expired')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_quests" ALTER COLUMN "status" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_quests" ALTER COLUMN "status" TYPE "public"."quest_status_enum" USING "status"::"text"::"public"."quest_status_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_quests" ALTER COLUMN "status" SET DEFAULT 'in_progress'`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_quests_status_enum_old"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ALTER COLUMN "organization_id" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "description" text NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description_uz"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "description_uz" text`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "icon"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "icon" character varying(100) NOT NULL DEFAULT 'trophy'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "category"`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."achievements_category_enum"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."achievements_category_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."achievements_category_enum" AS ENUM('beginner', 'explorer', 'loyal', 'social', 'collector', 'special')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "category" character varying(50) NOT NULL DEFAULT 'beginner'`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "rarity"`);
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."achievements_rarity_enum"`);
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."achievements_rarity_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."achievements_rarity_enum" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "rarity" character varying(50) NOT NULL DEFAULT 'common'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "condition_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."achievements_condition_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."achievements_condition_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."achievements_condition_type_enum" AS ENUM('total_orders', 'total_spent', 'total_points_earned', 'streak_days', 'unique_machines', 'unique_products', 'referrals_count', 'reviews_count', 'quests_completed', 'level_reached', 'first_order', 'night_order', 'weekend_order')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "condition_type" character varying(50) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ALTER COLUMN "unlocked_at" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "user_achievements" ALTER COLUMN "unlocked_at" SET DEFAULT NOW()`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."referrals_status_enum" RENAME TO "referrals_status_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."referrals_status_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."referrals_status_enum" AS ENUM('pending', 'completed', 'expired', 'cancelled')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ALTER COLUMN "status" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ALTER COLUMN "status" TYPE "public"."referrals_status_enum" USING "status"::"text"::"public"."referrals_status_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'pending'`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."referrals_status_enum_old"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."invite_status_enum" RENAME TO "invite_status_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."invites_status_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."invites_status_enum" AS ENUM('active', 'used', 'expired', 'revoked')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "invites" ALTER COLUMN "status" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "invites" ALTER COLUMN "status" TYPE "public"."invites_status_enum" USING "status"::"text"::"public"."invites_status_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "invites" ALTER COLUMN "status" SET DEFAULT 'active'`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."invite_status_enum_old"`);
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "code"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ADD "code" character varying(20) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ALTER COLUMN "metadata" DROP NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "warehouse_zones" ALTER COLUMN "metadata" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" DROP CONSTRAINT IF EXISTS "UQ_639c0f1d38d97d778122d4f2998"`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "token"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" ADD "token" character varying(500) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" ADD "device_type" character varying(50)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_name"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "fcm_tokens" ADD "device_name" character varying(100)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "commission_fixed_period"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" ADD "commission_fixed_period" "public"."contracts_commission_fixed_period_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "payment_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" ADD "payment_type" "public"."contracts_payment_type_enum" NOT NULL DEFAULT 'postpayment'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "commission_calculations" ALTER COLUMN "contract_id" SET NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "commission_calculations" DROP COLUMN IF EXISTS "commission_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."commission_calculations_commission_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."commission_calculations_commission_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."commission_calculations_commission_type_enum" AS ENUM('percentage', 'fixed', 'tiered', 'hybrid')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "commission_calculations" ADD "commission_type" character varying(20) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."contracts_status_enum" RENAME TO "contracts_status_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."contracts_status_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."contracts_status_enum" AS ENUM('draft', 'pending_approval', 'active', 'suspended', 'expiring_soon', 'expired', 'terminated', 'renewed')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" ALTER COLUMN "status" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" ALTER COLUMN "status" TYPE "public"."contracts_status_enum" USING "status"::"text"::"public"."contracts_status_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" ALTER COLUMN "status" SET DEFAULT 'draft'`,
      );
    } catch {}
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "public"."contracts_status_enum_old"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "commission_fixed_period"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" ADD "commission_fixed_period" character varying(20)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "payment_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "contracts" ADD "payment_type" character varying(50)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "commission_calculations" ALTER COLUMN "transaction_count" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "commission_calculations" DROP COLUMN IF EXISTS "commission_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "commission_calculations" ADD "commission_type" "public"."commission_calculations_commission_type_enum" NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "last_updated_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ADD "last_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "last_full_rebuild_at"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "daily_stats" ADD "last_full_rebuild_at" TIMESTAMP WITH TIME ZONE`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "title"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ADD "title" character varying(255) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" DROP DEFAULT`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TYPE "public"."dashboard_widgets_chart_type_enum" RENAME TO "dashboard_widgets_chart_type_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_chart_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE TYPE "public"."dashboard_widgets_chart_type_enum" AS ENUM('kpi', 'line', 'bar', 'pie', 'area', 'donut', 'heatmap', 'scatter')`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" TYPE "public"."dashboard_widgets_chart_type_enum" USING "chart_type"::"text"::"public"."dashboard_widgets_chart_type_enum"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DROP TYPE IF EXISTS "public"."dashboard_widgets_chart_type_enum_old"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "description" character varying(500) NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description_uz"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "description_uz" character varying(500)`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "condition_type"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "condition_type" "public"."achievements_condition_type_enum" NOT NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "icon"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "icon" character varying(10) NOT NULL DEFAULT '🏆'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "category"`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "category" "public"."achievements_category_enum" NOT NULL DEFAULT 'beginner'`,
      );
    } catch {}
    try {
      await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "rarity"`);
    } catch {}
    try {
      await queryRunner.query(
        `ALTER TABLE "achievements" ADD "rarity" "public"."achievements_rarity_enum" NOT NULL DEFAULT 'common'`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_789d1669e6dcec609a539d8a1c" ON "warehouse_zones" ("zone_type") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_d3bd929b40dbef1d393e90cfcc" ON "warehouse_zones" ("warehouse_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_64385b800e675d22928d1e1cec" ON "two_factor_auth" ("user_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ab673f0e63eac966762155508e" ON "password_reset_tokens" ("token") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_0ac4d4b745bc6775101f5abb75" ON "machines" ("organization_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `UPDATE "products" SET "sku" = "sku" || '-' || sub.rn FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY sku ORDER BY created_at) as rn FROM "products" WHERE "deleted_at" IS NULL AND "sku" IN (SELECT "sku" FROM "products" WHERE "deleted_at" IS NULL GROUP BY "sku" HAVING count(*) > 1)) sub WHERE "products".id = sub.id`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_3519c4e06d93d6936db6a900ca" ON "products" ("sku") WHERE "deleted_at" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_2d404aa7aa4a0404eafd184091" ON "products" ("organization_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_932b7ae90148e482bc27b0a6d6" ON "tasks" ("created_by_user_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_76d3e56379fde9e047d915006a" ON "tasks" ("organization_id", "type_code", "status") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_ea9ba3dfb39050f831ee3be40d" ON "audit_logs" ("entity_type") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_966cbc720d258257e0b2e25461" ON "audit_logs" ("expires_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_a6171a9597c533488dc7e29298" ON "audit_logs" ("category", "severity") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_99fca4a3a4a93c26a756c5aca5" ON "audit_logs" ("action", "created_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_2f68e345c05e8166ff9deea1ab" ON "audit_logs" ("user_id", "created_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_7421efc125d95e413657efa3c6" ON "audit_logs" ("entity_type", "entity_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_71fef71b47bf988fa899406acb" ON "audit_logs" ("organization_id", "created_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_8e5e23ee6fccba37f99df331d1" ON "audit_logs" ("ip_address") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_3197969cb5ed9b2a00252a3c9e" ON "audit_logs" ("severity") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_d4bbd861731298b2b1488683d4" ON "audit_logs" ("event_type") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_5dc2dc878464db2eef604e4a02" ON "dashboard_widgets" ("organization_id", "is_active") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_f3c2cca670ae9ad1eac71f5175" ON "dashboard_widgets" ("organization_id", "dashboard_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_analytics_snapshot_composite" ON "analytics_snapshots" ("organization_id", "snapshot_type", "snapshot_date", "machine_id", "location_id", "product_id") WHERE "deleted_at" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_f0e3007d5d0f3d4234444bdb2f" ON "analytics_snapshots" ("machine_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_daily_stats_org_date" ON "daily_stats" ("organization_id", "stat_date") WHERE "deleted_at" IS NULL`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_70bf0cfdc68926b55cbac67138" ON "referrals" ("organization_id", "created_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_005371020edbeff27e9f10925d" ON "referrals" ("referrer_id", "status") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_7331684c0c5b063803a425001a" ON "permissions" ("resource", "action") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_48ce552495d14eae9b187bb671" ON "permissions" ("name") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_285706a79624c3a49e7fc066c8" ON "quests" ("period", "starts_at", "ends_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_cbf20fadedfa0fe481b91b2d11" ON "quests" ("organization_id", "period", "is_active") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_e4dc0b6ac9b5cdf5034bb3395a" ON "user_quests" ("completed_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_121d7826393316d089f4cad4d6" ON "user_quests" ("quest_id", "status") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_9d053a241fd87121aeb284fa35" ON "user_quests" ("user_id", "status") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_639c0f1d38d97d778122d4f299" ON "fcm_tokens" ("token") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ef494681de3ea6734825e88042" ON "user_quests" ("user_id", "quest_id", "period_start") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_aa5f218fc445c6f98519e37b60" ON "achievements" ("sort_order") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_e74aaed2d9b76fb9b2ea8f4641" ON "achievements" ("is_active") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_4a270959307c2d584b4f5b1421" ON "achievements" ("category") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_40dd3757b510c58f0597a8eba5" ON "user_achievements" ("unlocked_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_25f0b25327a0bc759c21bbcdce" ON "user_achievements" ("organization_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_6d79d79646c5b036eccd98c51f" ON "referrals" ("organization_id", "status") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_33fd8a248db1cd832baa8aa25b" ON "invites" ("code") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_e73d92cf352ad7b17b08c615cd" ON "warehouse_zones" ("organization_id", "status") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_1e59fa4cd002abcf4ea11e9fea" ON "warehouse_zones" ("organization_id", "zone_type") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_9f1cfab59f911e75a484420078" ON "warehouse_zones" ("organization_id", "code") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_4b8f0ccb5926cfeabea7c18b8e" ON "contracts" ("counterparty_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_e3653640e4f62aa511fe43b6f8" ON "contracts" ("contractor_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_899c2496e42b9342f8b9ab86b1" ON "daily_stats" ("last_updated_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_3b6c5373c29f8eb0e1b41056e5" ON "dashboard_widgets" ("user_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_73843addc463ef238567f6f110" ON "dashboard_widgets" ("organization_id") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_784e5994d6c60de63f900e9c0e" ON "analytics_snapshots" ("location_id", "snapshot_date") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_60c250875614c743993278049d" ON "analytics_snapshots" ("machine_id", "snapshot_date") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_867b91108d721aded509360512" ON "achievements" ("condition_type") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_4c61f9ea6b50033a3e63ebf5c4" ON "achievements" ("category", "rarity") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_aa827a703f547f650ae603ef50" ON "achievements" ("organization_id", "is_active") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_20365ed7562812826af747998a" ON "user_achievements" ("user_id", "unlocked_at") `,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "user_quests" ADD CONSTRAINT "UQ_ef494681de3ea6734825e880429" UNIQUE ("user_id", "quest_id", "period_start"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "user_achievements" ADD CONSTRAINT "UQ_user_achievement" UNIQUE ("user_id", "achievement_id"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "daily_stats" ADD CONSTRAINT "UQ_939a107ba7471a73cbc2d0580f3" UNIQUE ("stat_date", "organization_id"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "user_achievements" ADD CONSTRAINT "UQ_a103993b75768d942744e4b3b40" UNIQUE ("user_id", "achievement_id"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "warehouse_zones" ADD CONSTRAINT "FK_d3bd929b40dbef1d393e90cfcc9" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "two_factor_auth" ADD CONSTRAINT "FK_64385b800e675d22928d1e1cecf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "tasks" ADD CONSTRAINT "FK_932b7ae90148e482bc27b0a6d65" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "FK_73843addc463ef238567f6f1109" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "FK_320cc93480d7bb25a4a984599ba" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "referrals" ADD CONSTRAINT "FK_507a2818bf5524662b068c2e81c" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "quests" ADD CONSTRAINT "FK_0a0d83baed7a608f036a16dcfec" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "user_quests" ADD CONSTRAINT "FK_b83b57c12df8839bf64cd13e726" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "user_quests" ADD CONSTRAINT "FK_9300d9ae06520676d0f616e1cd2" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_c755e3741cd46fc5ae3ef06592c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_36b4a912357ad1342b735d4d4c8" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "invites" ADD CONSTRAINT "FK_908b1dec8c6907c99a381e5c580" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "invites" ADD CONSTRAINT "FK_51bac8e59ded3fda54dec66526b" FOREIGN KEY ("used_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "warehouse_zones" ADD CONSTRAINT "FK_2cc09ed3ffb74b669e0b843b2c2" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "contracts" ADD CONSTRAINT "FK_4b8f0ccb5926cfeabea7c18b8e0" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "commission_calculations" ADD CONSTRAINT "FK_689674ce1054698475d2150c947" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "contracts" ADD CONSTRAINT "FK_e3653640e4f62aa511fe43b6f84" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
    try {
      await queryRunner.query(
        `DO $$ BEGIN ALTER TABLE "achievements" ADD CONSTRAINT "FK_5ec76b6935875f4c6ced106bb39" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
      );
    } catch {}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP CONSTRAINT IF EXISTS "FK_5ec76b6935875f4c6ced106bb39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "FK_e3653640e4f62aa511fe43b6f84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" DROP CONSTRAINT IF EXISTS "FK_689674ce1054698475d2150c947"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "FK_4b8f0ccb5926cfeabea7c18b8e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP CONSTRAINT IF EXISTS "FK_2cc09ed3ffb74b669e0b843b2c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT IF EXISTS "FK_51bac8e59ded3fda54dec66526b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT IF EXISTS "FK_908b1dec8c6907c99a381e5c580"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "FK_36b4a912357ad1342b735d4d4c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "FK_c755e3741cd46fc5ae3ef06592c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP CONSTRAINT IF EXISTS "FK_9300d9ae06520676d0f616e1cd2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP CONSTRAINT IF EXISTS "FK_b83b57c12df8839bf64cd13e726"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" DROP CONSTRAINT IF EXISTS "FK_0a0d83baed7a608f036a16dcfec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "FK_507a2818bf5524662b068c2e81c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT IF EXISTS "FK_320cc93480d7bb25a4a984599ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT IF EXISTS "FK_73843addc463ef238567f6f1109"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "FK_932b7ae90148e482bc27b0a6d65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP CONSTRAINT IF EXISTS "FK_64385b800e675d22928d1e1cecf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP CONSTRAINT IF EXISTS "FK_e9658e959c490b0a634dfc54783"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP CONSTRAINT IF EXISTS "FK_d3bd929b40dbef1d393e90cfcc9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "UQ_a103993b75768d942744e4b3b40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP CONSTRAINT IF EXISTS "UQ_939a107ba7471a73cbc2d0580f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "UQ_user_achievement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP CONSTRAINT IF EXISTS "UQ_ef494681de3ea6734825e880429"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_20365ed7562812826af747998a"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_aa827a703f547f650ae603ef50"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_4c61f9ea6b50033a3e63ebf5c4"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_867b91108d721aded509360512"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_60c250875614c743993278049d"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_784e5994d6c60de63f900e9c0e"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_73843addc463ef238567f6f110"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_3b6c5373c29f8eb0e1b41056e5"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_899c2496e42b9342f8b9ab86b1"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e3653640e4f62aa511fe43b6f8"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_4b8f0ccb5926cfeabea7c18b8e"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_9f1cfab59f911e75a484420078"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_1e59fa4cd002abcf4ea11e9fea"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e73d92cf352ad7b17b08c615cd"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_33fd8a248db1cd832baa8aa25b"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_6d79d79646c5b036eccd98c51f"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_25f0b25327a0bc759c21bbcdce"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_40dd3757b510c58f0597a8eba5"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_4a270959307c2d584b4f5b1421"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e74aaed2d9b76fb9b2ea8f4641"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_aa5f218fc445c6f98519e37b60"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_ef494681de3ea6734825e88042"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_639c0f1d38d97d778122d4f299"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_9d053a241fd87121aeb284fa35"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_121d7826393316d089f4cad4d6"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e4dc0b6ac9b5cdf5034bb3395a"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_cbf20fadedfa0fe481b91b2d11"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_285706a79624c3a49e7fc066c8"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_48ce552495d14eae9b187bb671"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_7331684c0c5b063803a425001a"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_005371020edbeff27e9f10925d"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_70bf0cfdc68926b55cbac67138"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_daily_stats_org_date"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_f0e3007d5d0f3d4234444bdb2f"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_analytics_snapshot_composite"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_f3c2cca670ae9ad1eac71f5175"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_5dc2dc878464db2eef604e4a02"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_d4bbd861731298b2b1488683d4"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_3197969cb5ed9b2a00252a3c9e"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_8e5e23ee6fccba37f99df331d1"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_71fef71b47bf988fa899406acb"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_7421efc125d95e413657efa3c6"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_2f68e345c05e8166ff9deea1ab"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_99fca4a3a4a93c26a756c5aca5"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_a6171a9597c533488dc7e29298"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_966cbc720d258257e0b2e25461"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_cee5459245f652b75eb2759b4c"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_ea9ba3dfb39050f831ee3be40d"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_76d3e56379fde9e047d915006a"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_932b7ae90148e482bc27b0a6d6"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_2d404aa7aa4a0404eafd184091"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_3519c4e06d93d6936db6a900ca"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_0ac4d4b745bc6775101f5abb75"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_ab673f0e63eac966762155508e"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_64385b800e675d22928d1e1cec"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_d3bd929b40dbef1d393e90cfcc"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_789d1669e6dcec609a539d8a1c"`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "rarity"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "rarity" character varying(50) NOT NULL DEFAULT 'common'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "category" character varying(50) NOT NULL DEFAULT 'beginner'`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "icon"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "icon" character varying(100) NOT NULL DEFAULT 'trophy'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "condition_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "condition_type" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description_uz" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description" text NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_chart_type_enum_old" AS ENUM('area', 'bar', 'donut', 'heatmap', 'line', 'pie', 'scatter')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" TYPE "public"."dashboard_widgets_chart_type_enum_old" USING "chart_type"::"text"::"public"."dashboard_widgets_chart_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."dashboard_widgets_chart_type_enum_old" RENAME TO "dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "title" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "last_full_rebuild_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_full_rebuild_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "last_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_updated_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" DROP COLUMN IF EXISTS "commission_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ADD "commission_type" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ALTER COLUMN "transaction_count" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "payment_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "pg_catalog"."varchar" AS ENUM('prepayment', 'postpayment', 'on_delivery')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "payment_type" "public"."contracts_payment_type_enum" NOT NULL DEFAULT 'postpayment'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "commission_fixed_period"`,
    );
    await queryRunner.query(
      `CREATE TYPE "pg_catalog"."varchar" AS ENUM('daily', 'weekly', 'monthly', 'quarterly')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "commission_fixed_period" "public"."contracts_commission_fixed_period_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contracts_status_enum_old" AS ENUM('active', 'draft', 'expired', 'suspended', 'terminated')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" TYPE "public"."contracts_status_enum_old" USING "status"::"text"::"public"."contracts_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."contracts_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."contracts_status_enum_old" RENAME TO "contracts_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" DROP COLUMN IF EXISTS "commission_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."commission_calculations_commission_type_enum" AS ENUM('fixed', 'hybrid', 'percentage', 'tiered')`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ADD "commission_type" "public"."commission_calculations_commission_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ALTER COLUMN "contract_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "payment_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "payment_type" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "commission_fixed_period"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "commission_fixed_period" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_name" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "pg_catalog"."varchar" AS ENUM('ios', 'android', 'web')`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_type" "public"."fcm_tokens_device_type_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "token"`);
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "token" text NOT NULL`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "fcm_tokens" ADD CONSTRAINT "UQ_639c0f1d38d97d778122d4f2998" UNIQUE ("token"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "metadata" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "code"`);
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "code" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invite_status_enum_old" AS ENUM('active', 'expired', 'revoked', 'used')`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ALTER COLUMN "status" TYPE "public"."invite_status_enum_old" USING "status"::"text"::"public"."invite_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."invites_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."invite_status_enum_old" RENAME TO "invite_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."referrals_status_enum_old" AS ENUM('activated', 'cancelled', 'pending', 'rewarded')`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" TYPE "public"."referrals_status_enum_old" USING "status"::"text"::"public"."referrals_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."referrals_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."referrals_status_enum_old" RENAME TO "referrals_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ALTER COLUMN "unlocked_at" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ALTER COLUMN "unlocked_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "condition_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_condition_type_enum" AS ENUM('early_bird', 'first_order', 'loyalty_level', 'night_owl', 'order_amount', 'order_count', 'promo_used', 'quest_completed', 'referral_count', 'review_count', 'streak_days', 'unique_machines', 'unique_products', 'weekend_warrior')`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "condition_type" "public"."achievements_condition_type_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "rarity"`);
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_rarity_enum" AS ENUM('common', 'epic', 'legendary', 'rare', 'uncommon')`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "rarity" "public"."achievements_rarity_enum" NOT NULL DEFAULT 'common'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "category"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_category_enum" AS ENUM('beginner', 'collector', 'explorer', 'loyal', 'social', 'special')`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "category" "public"."achievements_category_enum" NOT NULL DEFAULT 'beginner'`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "icon"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "icon" character varying(10) NOT NULL DEFAULT '🏆'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description_uz" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description" character varying(500) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ALTER COLUMN "organization_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_quests_status_enum_old" AS ENUM('available', 'claimed', 'completed', 'expired', 'in_progress')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ALTER COLUMN "status" TYPE "public"."user_quests_status_enum_old" USING "status"::"text"::"public"."user_quests_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ALTER COLUMN "status" SET DEFAULT 'in_progress'`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_quests_status_enum_old" RENAME TO "user_quests_status_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_9d053a241fd87121aeb284fa35" ON "user_quests" ("status", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_121d7826393316d089f4cad4d6" ON "user_quests" ("quest_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quests_difficulty_enum_old" AS ENUM('easy', 'hard', 'legendary', 'medium')`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "difficulty" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "difficulty" TYPE "public"."quests_difficulty_enum_old" USING "difficulty"::"text"::"public"."quests_difficulty_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "difficulty" SET DEFAULT 'medium'`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_difficulty_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."quests_difficulty_enum_old" RENAME TO "quests_difficulty_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quests_type_enum_old" AS ENUM('collector', 'first_order', 'login_streak', 'loyal_customer', 'order_amount', 'order_category', 'order_count', 'order_machine', 'order_product', 'order_single', 'order_time', 'payment_type', 'profile_complete', 'referral', 'review', 'share', 'spend_points', 'visit')`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "type" TYPE "public"."quests_type_enum_old" USING "type"::"text"::"public"."quests_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."quests_type_enum_old" RENAME TO "quests_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quests_period_enum_old" AS ENUM('daily', 'monthly', 'one_time', 'special', 'weekly')`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "period" TYPE "public"."quests_period_enum_old" USING "period"::"text"::"public"."quests_period_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_period_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."quests_period_enum_old" RENAME TO "quests_period_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cbf20fadedfa0fe481b91b2d11" ON "quests" ("is_active", "organization_id", "period") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_285706a79624c3a49e7fc066c8" ON "quests" ("ends_at", "period", "starts_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."machine_access_role_enum_old_old" AS ENUM('collection', 'full', 'maintenance', 'refill', 'view')`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_access" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_access" ALTER COLUMN "role" TYPE "public"."machine_access_role_enum_old_old" USING "role"::"text"::"public"."machine_access_role_enum_old_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_access" ALTER COLUMN "role" SET DEFAULT 'view'`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."machine_access_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."machine_access_role_enum_old_old" RENAME TO "machine_access_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_type" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP CONSTRAINT IF EXISTS "UQ_639c0f1d38d97d778122d4f2998"`,
    );
    await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "token"`);
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "token" character varying(500) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_639c0f1d38d97d778122d4f299" ON "fcm_tokens" ("token") `,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "action" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "name" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "reconciliation_runs" ALTER COLUMN "amount_tolerance" SET DEFAULT 0.01`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "UQ_507a2818bf5524662b068c2e81c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "referred_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "referrals" ADD CONSTRAINT "FK_507a2818bf5524662b068c2e81c" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "metadata" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "metadata" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "last_full_rebuild_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_full_rebuild_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN IF EXISTS "last_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "top_machines" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "top_machines" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "top_products" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "top_products" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "average_sale_amount" TYPE numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "analytics_snapshots" ALTER COLUMN "profit_margin" TYPE numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "analytics_snapshots" ALTER COLUMN "average_transaction_value" TYPE numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "height" SET DEFAULT '4'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "width" SET DEFAULT '6'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_chart_type_enum_old" AS ENUM('area', 'bar', 'donut', 'heatmap', 'line', 'pie', 'scatter')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" TYPE "public"."dashboard_widgets_chart_type_enum_old" USING "chart_type"::"text"::"public"."dashboard_widgets_chart_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."dashboard_widgets_chart_type_enum_old" RENAME TO "dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "title" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "locked_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "locked_until" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "last_used_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "backup_codes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "backup_codes" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "created_by_user_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "type_code" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "name" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "sku" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "organization_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."machine_type_enum_old_old" AS ENUM('beverage', 'car_wash', 'coffee', 'combo', 'cosmetics', 'electronics', 'fresh_food', 'frozen', 'healthy', 'hot_food', 'ice_cream', 'laundry', 'locker', 'other', 'pharmacy', 'pizza', 'snack', 'water')`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "type" TYPE "public"."machine_type_enum_old_old" USING "type"::"text"::"public"."machine_type_enum_old_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "type" SET DEFAULT 'coffee'`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."machines_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."machine_type_enum_old_old" RENAME TO "machine_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "name" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "machine_number" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "organization_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP COLUMN IF EXISTS "token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD "token" uuid NOT NULL`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "UQ_ab673f0e63eac966762155508ee" UNIQUE ("token"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ab673f0e63eac966762155508e" ON "password_reset_tokens" ("token") `,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ALTER COLUMN "metadata" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "last_used_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "locked_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "locked_until" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "backup_codes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "backup_codes" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "two_factor_auth" ADD CONSTRAINT "UQ_64385b800e675d22928d1e1cecf" UNIQUE ("user_id"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ALTER COLUMN "user_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP COLUMN IF EXISTS "revoked_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "revoked_reason" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP COLUMN IF EXISTS "revoked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "revoked_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ALTER COLUMN "last_activity_at" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ALTER COLUMN "last_activity_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ALTER COLUMN "refresh_token_hint" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP COLUMN IF EXISTS "refresh_token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "refresh_token_hash" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ALTER COLUMN "user_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_97672ac88f789774dd47f7c8be3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "slug" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "name" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."warehouse_zones_zone_type_enum_old" AS ENUM('cold', 'damaged', 'frozen', 'hazardous', 'picking', 'quarantine', 'receiving', 'returns', 'shipping', 'storage')`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "zone_type" TYPE "public"."warehouse_zones_zone_type_enum_old" USING "zone_type"::"text"::"public"."warehouse_zones_zone_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "zone_type" SET DEFAULT 'storage'`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."warehouse_zones_zone_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."warehouse_zones_zone_type_enum_old" RENAME TO "warehouse_zones_zone_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "code"`);
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "code" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_logs" ALTER COLUMN "overtime_multiplier" SET DEFAULT 1.5`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "progress_details"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "points_claimed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "claimed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "is_unlocked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "target_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "current_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "total_unlocked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "display_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "bonus_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "condition_metadata"`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "name_uz"`);
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "name"`);
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "position"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "time_range"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "widget_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "contractor_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN IF EXISTS "counterparty_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "fifo_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "pick_priority"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "is_pickable"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "excluded_categories"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "allowed_categories"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "temperature_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "current_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "max_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "min_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "capacity_unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "used_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "total_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "aisle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "floor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "storage_condition"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "completed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referred_rewarded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referrer_rewarded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "UQ_a53a83849f95cbcf3fbcf32fd0a"`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN IF EXISTS "code"`);
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "points_awarded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN IF EXISTS "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "sort_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "points_reward"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "conditions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN IF EXISTS "title_uz"`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN IF EXISTS "title"`);
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP COLUMN IF EXISTS "started_at"`,
    );
    await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN IF EXISTS "device_id"`);
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN IF EXISTS "metadata"`);
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "utm_campaign"`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN IF EXISTS "source"`);
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "activated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "activation_order_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "activation_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referred_reward_paid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referrer_reward_paid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referred_reward_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referrer_reward_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referral_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "cache_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "cached_data"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "last_refresh_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "refresh_interval_seconds"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "kpi_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "chart_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "period_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "filters"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "definition_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "position_y"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "position_x"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "title_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN IF EXISTS "dashboard_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "enabled_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "backup_codes_used"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "phone_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "is_verified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "is_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "retention_days"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "error_stack"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "tags"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "geo_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "device_info"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "context"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "affected_fields"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "changes"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "new_values"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "old_values"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "category"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "action"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "entity_name"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "entity_id"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "entity_type"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "user_role"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "user_name"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "user_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "used_backup_codes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "email_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "sms_phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "totp_secret_iv"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN IF EXISTS "totp_secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "current_occupancy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "area_sqm"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN IF EXISTS "warehouse_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "points_awarded" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "organization_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "sort_order" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "points_reward" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "conditions" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "title_uz" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "title" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "position_y" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "cache_expires_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "cached_data" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "last_refresh_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "refresh_interval_seconds" integer NOT NULL DEFAULT '300'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "kpi_config" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "chart_config" jsonb`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_period_type_enum" AS ENUM('custom', 'last_30_days', 'last_7_days', 'last_90_days', 'last_month', 'last_quarter', 'last_week', 'last_year', 'this_month', 'this_quarter', 'this_week', 'this_year', 'today', 'yesterday')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "period_type" "public"."dashboard_widgets_period_type_enum" NOT NULL DEFAULT 'this_month'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "filters" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "definition_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "position_x" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "dashboard_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "title_uz" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "counterparty_id" uuid NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "contracts" ADD "contractor_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_id" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "current_occupancy" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "capacity" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "area_sqm" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "warehouse_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "source" character varying(20) NOT NULL DEFAULT 'code'`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referred_reward_paid" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referrer_reward_paid" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referred_reward_points" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referrer_reward_points" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" ADD "metadata" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "activated_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "activation_order_amount" numeric(15,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "activation_order_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referral_code" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "utm_campaign" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "progress_details" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "points_claimed" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "claimed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "is_unlocked" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "target_value" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "current_value" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "total_unlocked" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "display_order" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "image_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "bonus_points" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "condition_metadata" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "name_uz" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ADD "started_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "completed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referred_rewarded" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referrer_rewarded" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "code" character varying(8) NOT NULL`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "referrals" ADD CONSTRAINT "UQ_a53a83849f95cbcf3fbcf32fd0a" UNIQUE ("code"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_time_range_enum" AS ENUM('custom', 'last_30_days', 'last_7_days', 'last_month', 'this_month', 'this_year', 'today', 'yesterday')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "time_range" "public"."dashboard_widgets_time_range_enum" NOT NULL DEFAULT 'last_7_days'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_widget_type_enum" AS ENUM('custom_chart', 'incidents_map', 'kpi_metric', 'machine_status', 'revenue_chart', 'sales_chart', 'stock_levels', 'tasks_summary', 'top_machines', 'top_products')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "widget_type" "public"."dashboard_widgets_widget_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "user_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "metadata" jsonb NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "config" jsonb NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "position" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "used_backup_codes" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "email_address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "sms_phone" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "totp_secret" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "totp_secret_iv" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "retention_days" integer NOT NULL DEFAULT '365'`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "error_stack" text`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "tags" text array`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "geo_location" jsonb`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "device_info" jsonb`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "context" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "affected_fields" text array`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "changes" jsonb`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "new_values" jsonb`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "old_values" jsonb`);
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_category_enum" AS ENUM('authentication', 'authorization', 'compliance', 'data_access', 'data_modification', 'financial', 'integration', 'operational', 'security', 'system')`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "category" "public"."audit_logs_category_enum" NOT NULL DEFAULT 'data_modification'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('api_call', 'bulk_delete', 'bulk_update', 'create', 'delete', 'export', 'fiscal_operation', 'import', 'inventory_adjustment', 'login', 'login_failed', 'logout', 'machine_status_change', 'notification_sent', 'password_change', 'password_reset', 'payment_processed', 'permission_change', 'refund_issued', 'report_generated', 'restore', 'settings_change', 'soft_delete', 'task_assigned', 'task_completed', 'update', 'webhook_received')`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "action" "public"."audit_logs_action_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "entity_name" character varying(255)`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "entity_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "entity_type" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "user_role" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "user_name" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "user_email" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "is_success" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD "request_user_agent" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD "request_ip" inet`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "enabled_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "backup_codes_used" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "phone_number" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "email" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "is_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "secret" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "is_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."two_factor_auth_method_enum" AS ENUM('backup_codes', 'email', 'sms', 'totp')`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "method" "public"."two_factor_auth_method_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "fifo_enabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "pick_priority" integer NOT NULL DEFAULT '100'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "is_pickable" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "excluded_categories" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "allowed_categories" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "floor" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "temperature_updated_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."warehouse_zones_storage_condition_enum" AS ENUM('ambient', 'climate_controlled', 'cool', 'dry', 'frozen', 'refrigerated')`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "storage_condition" "public"."warehouse_zones_storage_condition_enum" NOT NULL DEFAULT 'ambient'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "current_temperature" numeric(5,2)`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."warehouse_zones_status_enum" AS ENUM('active', 'full', 'inactive', 'maintenance')`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "status" "public"."warehouse_zones_status_enum" NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "organization_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "max_temperature" numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "min_temperature" numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "capacity_unit" character varying(20) NOT NULL DEFAULT 'units'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "used_capacity" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "total_capacity" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "aisle" character varying(20)`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "user_achievements" ADD CONSTRAINT "UQ_user_achievement" UNIQUE ("user_id", "achievement_id"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "user_achievements" ADD CONSTRAINT "UQ_a103993b75768d942744e4b3b40" UNIQUE ("user_id", "achievement_id"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "user_quests" ADD CONSTRAINT "UQ_ef494681de3ea6734825e880429" UNIQUE ("user_id", "quest_id", "period_start"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "daily_stats" ADD CONSTRAINT "UQ_939a107ba7471a73cbc2d0580f3" UNIQUE ("organization_id", "stat_date"); EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_inventory" ADD CONSTRAINT "chk_machine_current_qty" CHECK ((current_quantity >= (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_inventory" ADD CONSTRAINT "chk_operator_reserved_qty" CHECK ((reserved_quantity >= (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_inventory" ADD CONSTRAINT "chk_operator_current_qty" CHECK ((current_quantity >= (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "chk_warehouse_reserved_qty" CHECK ((reserved_quantity >= (0)::numeric))`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "chk_warehouse_current_qty" CHECK ((current_quantity >= (0)::numeric))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_25f0b25327a0bc759c21bbcdce" ON "user_achievements" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_40dd3757b510c58f0597a8eba5" ON "user_achievements" ("unlocked_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_4a270959307c2d584b4f5b1421" ON "achievements" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_aa5f218fc445c6f98519e37b60" ON "achievements" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e74aaed2d9b76fb9b2ea8f4641" ON "achievements" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f0e3007d5d0f3d4234444bdb2f" ON "analytics_snapshots" ("machine_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_analytics_snapshot_composite" ON "analytics_snapshots" ("location_id", "machine_id", "organization_id", "product_id", "snapshot_date", "snapshot_type") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_daily_stats_org_date" ON "daily_stats" ("organization_id", "stat_date") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_4b8f0ccb5926cfeabea7c18b8e" ON "contracts" ("counterparty_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e3653640e4f62aa511fe43b6f8" ON "contracts" ("contractor_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d3bd929b40dbef1d393e90cfcc" ON "warehouse_zones" ("warehouse_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_789d1669e6dcec609a539d8a1c" ON "warehouse_zones" ("zone_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invites_organization_id" ON "invites" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invites_used_by_id" ON "invites" ("used_by_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invites_org_status" ON "invites" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invites_code" ON "invites" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_invites_org_status" ON "invites" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_invites_code" ON "invites" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_005371020edbeff27e9f10925d" ON "referrals" ("referrer_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_70bf0cfdc68926b55cbac67138" ON "referrals" ("created_at", "organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_20365ed7562812826af747998a" ON "user_achievements" ("unlocked_at", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_aa827a703f547f650ae603ef50" ON "achievements" ("is_active", "organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_4c61f9ea6b50033a3e63ebf5c4" ON "achievements" ("category", "rarity") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_867b91108d721aded509360512" ON "achievements" ("condition_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e4dc0b6ac9b5cdf5034bb3395a" ON "user_quests" ("completed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_is_applied" ON "stock_opening_balances" ("is_applied") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_balance_date" ON "stock_opening_balances" ("balance_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_warehouse_id" ON "stock_opening_balances" ("warehouse_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_product_id" ON "stock_opening_balances" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sob_organization_id" ON "stock_opening_balances" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_invoice_number" ON "purchase_history" ("invoice_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_status" ON "purchase_history" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_purchase_date" ON "purchase_history" ("purchase_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_warehouse_id" ON "purchase_history" ("warehouse_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_product_id" ON "purchase_history" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_supplier_id" ON "purchase_history" ("supplier_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ph_organization_id" ON "purchase_history" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ef494681de3ea6734825e88042" ON "user_quests" ("period_start", "quest_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_permissions_resource_action" ON "permissions" ("action", "resource") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_permissions_name" ON "permissions" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_6d79d79646c5b036eccd98c51f" ON "referrals" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_899c2496e42b9342f8b9ab86b1" ON "daily_stats" ("last_updated_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_60c250875614c743993278049d" ON "analytics_snapshots" ("machine_id", "snapshot_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_784e5994d6c60de63f900e9c0e" ON "analytics_snapshots" ("location_id", "snapshot_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_73843addc463ef238567f6f110" ON "dashboard_widgets" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3b6c5373c29f8eb0e1b41056e5" ON "dashboard_widgets" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_64385b800e675d22928d1e1cec" ON "two_factor_auth" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_71fef71b47bf988fa899406acb" ON "audit_logs" ("created_at", "organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_7421efc125d95e413657efa3c6" ON "audit_logs" ("entity_id", "entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_2f68e345c05e8166ff9deea1ab" ON "audit_logs" ("created_at", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_99fca4a3a4a93c26a756c5aca5" ON "audit_logs" ("action", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_a6171a9597c533488dc7e29298" ON "audit_logs" ("category", "severity") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_966cbc720d258257e0b2e25461" ON "audit_logs" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ea9ba3dfb39050f831ee3be40d" ON "audit_logs" ("entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d4bbd861731298b2b1488683d4" ON "audit_logs" ("event_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3197969cb5ed9b2a00252a3c9e" ON "audit_logs" ("severity") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_8e5e23ee6fccba37f99df331d1" ON "audit_logs" ("ip_address") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tasks_created_by_user_id" ON "tasks" ("created_by_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ta_resolved" ON "trip_anomalies" ("resolved") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ta_type" ON "trip_anomalies" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ta_trip_id" ON "trip_anomalies" ("trip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ts_trip_id" ON "trip_stops" ("trip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ts_started_at" ON "trip_stops" ("started_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ts_machine_id" ON "trip_stops" ("machine_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tp_trip_filtered" ON "trip_points" ("is_filtered", "trip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tp_trip_recorded" ON "trip_points" ("recorded_at", "trip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_0c30b2278a5d31e23fcaee4887" ON "user_sessions" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_3b54c5a344f4c1c68c41de391b" ON "user_sessions" ("last_used_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_user_sessions_token_hint" ON "user_sessions" ("refresh_token_hint") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email_unique" ON "users" ("email") WHERE (email IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_9f1cfab59f911e75a484420078" ON "warehouse_zones" ("code", "organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_1e59fa4cd002abcf4ea11e9fea" ON "warehouse_zones" ("organization_id", "zone_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_e73d92cf352ad7b17b08c615cd" ON "warehouse_zones" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_36b4a912357ad1342b735d4d4c8" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_c755e3741cd46fc5ae3ef06592c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "FK_320cc93480d7bb25a4a984599ba" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "FK_73843addc463ef238567f6f1109" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "commission_calculations" ADD CONSTRAINT "FK_689674ce1054698475d2150c947" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "contracts" ADD CONSTRAINT "FK_4b8f0ccb5926cfeabea7c18b8e0" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "contracts" ADD CONSTRAINT "FK_e3653640e4f62aa511fe43b6f84" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "warehouse_zones" ADD CONSTRAINT "FK_d3bd929b40dbef1d393e90cfcc9" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "invites" ADD CONSTRAINT "fk_invites_used_by" FOREIGN KEY ("used_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "invites" ADD CONSTRAINT "fk_invites_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "achievements" ADD CONSTRAINT "FK_5ec76b6935875f4c6ced106bb39" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "user_quests" ADD CONSTRAINT "FK_9300d9ae06520676d0f616e1cd2" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "user_quests" ADD CONSTRAINT "FK_b83b57c12df8839bf64cd13e726" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "quests" ADD CONSTRAINT "FK_0a0d83baed7a608f036a16dcfec" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "two_factor_auth" ADD CONSTRAINT "FK_64385b800e675d22928d1e1cecf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "warehouse_zones" ADD CONSTRAINT "FK_2cc09ed3ffb74b669e0b843b2c2" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$`,
    );
  }
}
