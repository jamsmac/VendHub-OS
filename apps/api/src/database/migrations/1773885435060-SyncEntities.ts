import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncEntities1773885435060 implements MigrationInterface {
  name = "SyncEntities1773885435060";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP CONSTRAINT "FK_2cc09ed3ffb74b669e0b843b2c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP CONSTRAINT "FK_64385b800e675d22928d1e1cecf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" DROP CONSTRAINT "FK_0a0d83baed7a608f036a16dcfec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP CONSTRAINT "FK_b83b57c12df8839bf64cd13e726"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP CONSTRAINT "FK_9300d9ae06520676d0f616e1cd2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP CONSTRAINT "FK_5ec76b6935875f4c6ced106bb39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "fk_invites_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "fk_invites_used_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP CONSTRAINT "FK_d3bd929b40dbef1d393e90cfcc9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT "FK_e3653640e4f62aa511fe43b6f84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT "FK_4b8f0ccb5926cfeabea7c18b8e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" DROP CONSTRAINT "FK_689674ce1054698475d2150c947"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "FK_73843addc463ef238567f6f1109"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "FK_320cc93480d7bb25a4a984599ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "FK_c755e3741cd46fc5ae3ef06592c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "FK_36b4a912357ad1342b735d4d4c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e73d92cf352ad7b17b08c615cd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e59fa4cd002abcf4ea11e9fea"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9f1cfab59f911e75a484420078"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_users_email_unique"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_user_sessions_token_hint"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b54c5a344f4c1c68c41de391b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0c30b2278a5d31e23fcaee4887"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_tp_trip_recorded"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_tp_trip_filtered"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ts_machine_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ts_started_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ts_trip_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ta_trip_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ta_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ta_resolved"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_tasks_created_by_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8e5e23ee6fccba37f99df331d1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3197969cb5ed9b2a00252a3c9e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d4bbd861731298b2b1488683d4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ea9ba3dfb39050f831ee3be40d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_966cbc720d258257e0b2e25461"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a6171a9597c533488dc7e29298"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_99fca4a3a4a93c26a756c5aca5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f68e345c05e8166ff9deea1ab"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7421efc125d95e413657efa3c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_71fef71b47bf988fa899406acb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_64385b800e675d22928d1e1cec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b6c5373c29f8eb0e1b41056e5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_73843addc463ef238567f6f110"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_784e5994d6c60de63f900e9c0e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_60c250875614c743993278049d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_899c2496e42b9342f8b9ab86b1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6d79d79646c5b036eccd98c51f"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_permissions_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_permissions_resource_action"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef494681de3ea6734825e88042"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ph_organization_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ph_supplier_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ph_product_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ph_warehouse_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ph_purchase_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ph_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ph_invoice_number"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sob_organization_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sob_product_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sob_warehouse_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sob_balance_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_sob_is_applied"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4dc0b6ac9b5cdf5034bb3395a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_867b91108d721aded509360512"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c61f9ea6b50033a3e63ebf5c4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aa827a703f547f650ae603ef50"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_20365ed7562812826af747998a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_70bf0cfdc68926b55cbac67138"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_005371020edbeff27e9f10925d"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_invites_code"`);
    await queryRunner.query(`DROP INDEX "public"."idx_invites_org_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invites_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invites_org_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invites_used_by_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_invites_organization_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_789d1669e6dcec609a539d8a1c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d3bd929b40dbef1d393e90cfcc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e3653640e4f62aa511fe43b6f8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b8f0ccb5926cfeabea7c18b8e"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_daily_stats_org_date"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_analytics_snapshot_composite"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f0e3007d5d0f3d4234444bdb2f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e74aaed2d9b76fb9b2ea8f4641"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aa5f218fc445c6f98519e37b60"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4a270959307c2d584b4f5b1421"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_40dd3757b510c58f0597a8eba5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_25f0b25327a0bc759c21bbcdce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_inventory" DROP CONSTRAINT "chk_warehouse_current_qty"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_inventory" DROP CONSTRAINT "chk_warehouse_reserved_qty"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_inventory" DROP CONSTRAINT "chk_operator_current_qty"`,
    );
    await queryRunner.query(
      `ALTER TABLE "operator_inventory" DROP CONSTRAINT "chk_operator_reserved_qty"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_inventory" DROP CONSTRAINT "chk_machine_current_qty"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP CONSTRAINT "UQ_939a107ba7471a73cbc2d0580f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP CONSTRAINT "UQ_ef494681de3ea6734825e880429"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "UQ_a103993b75768d942744e4b3b40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "UQ_user_achievement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "aisle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "total_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "used_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "capacity_unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "min_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "max_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "status"`,
    );
    await queryRunner.query(`DROP TYPE "public"."warehouse_zones_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."warehouse_zones_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."warehouse_zones_status_enum" AS ENUM('active', 'inactive', 'maintenance', 'full')`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "current_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "storage_condition"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."warehouse_zones_storage_condition_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."warehouse_zones_storage_condition_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."warehouse_zones_storage_condition_enum" AS ENUM('ambient', 'cool', 'refrigerated', 'frozen', 'dry', 'climate_controlled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "temperature_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "floor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "allowed_categories"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "excluded_categories"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "is_pickable"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "pick_priority"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "fifo_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "method"`,
    );
    await queryRunner.query(`DROP TYPE "public"."two_factor_auth_method_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."two_factor_auth_method_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."two_factor_auth_method_enum" AS ENUM('totp', 'sms', 'email', 'backup_codes')`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "is_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "is_verified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "phone_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "backup_codes_used"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "enabled_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP COLUMN "request_ip"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP COLUMN "request_user_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "is_success"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "user_email"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "user_name"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "user_role"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "entity_type"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "entity_id"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "entity_name"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "action"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."audit_logs_action_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('create', 'update', 'delete', 'soft_delete', 'restore', 'login', 'logout', 'login_failed', 'password_change', 'password_reset', 'permission_change', 'settings_change', 'export', 'import', 'bulk_update', 'bulk_delete', 'api_call', 'webhook_received', 'payment_processed', 'refund_issued', 'report_generated', 'notification_sent', 'task_assigned', 'task_completed', 'machine_status_change', 'inventory_adjustment', 'fiscal_operation')`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "category"`);
    await queryRunner.query(`DROP TYPE "public"."audit_logs_category_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."audit_logs_category_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."audit_logs_category_enum" AS ENUM('authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security', 'compliance', 'financial', 'operational', 'integration')`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "old_values"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "new_values"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "changes"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "affected_fields"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "context"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "device_info"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "geo_location"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "tags"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "error_stack"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "retention_days"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "totp_secret_iv"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "totp_secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "sms_phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "email_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "used_backup_codes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "position"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "widget_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."dashboard_widgets_widget_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."dashboard_widgets_widget_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_widget_type_enum" AS ENUM('sales_chart', 'revenue_chart', 'top_machines', 'top_products', 'machine_status', 'stock_levels', 'tasks_summary', 'incidents_map', 'kpi_metric', 'custom_chart')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "time_range"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."dashboard_widgets_time_range_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."dashboard_widgets_time_range_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_time_range_enum" AS ENUM('today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_year', 'custom')`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "UQ_a53a83849f95cbcf3fbcf32fd0a"`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "code"`);
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referrer_rewarded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referred_rewarded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "completed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP COLUMN "started_at"`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "name_uz"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "condition_metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "bonus_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "display_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "total_unlocked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "current_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "target_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "is_unlocked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "claimed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "points_claimed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "progress_details"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "utm_campaign"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referral_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "activation_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "activation_order_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "activated_at"`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "metadata"`);
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referrer_reward_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referred_reward_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referrer_reward_paid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referred_reward_paid"`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "source"`);
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "warehouse_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "area_sqm"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "current_occupancy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN "device_id"`);
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "contractor_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "counterparty_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "title_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "dashboard_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "position_x"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "definition_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "filters"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "period_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."dashboard_widgets_period_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."dashboard_widgets_period_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_period_type_enum" AS ENUM('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year', 'last_7_days', 'last_30_days', 'last_90_days', 'custom')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "chart_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "kpi_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "refresh_interval_seconds"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "last_refresh_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "cached_data"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "cache_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "position_y"`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "title"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "title_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "conditions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "points_reward"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "sort_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "points_awarded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "warehouse_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "area_sqm" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "capacity" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "current_occupancy" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "totp_secret" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "totp_secret_iv" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "sms_phone" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "email_address" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "used_backup_codes" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "user_email" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "user_name" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "user_role" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "entity_type" character varying(100) NOT NULL DEFAULT 'unknown'`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "entity_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "entity_name" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "action" "public"."audit_logs_action_enum" NOT NULL DEFAULT 'create'`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "category" "public"."audit_logs_category_enum" NOT NULL DEFAULT 'data_modification'`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "old_values" jsonb`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "new_values" jsonb`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "changes" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "affected_fields" text array`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "context" jsonb`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "device_info" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "geo_location" jsonb`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "tags" text array`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD "error_stack" text`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "retention_days" integer NOT NULL DEFAULT '365'`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD "expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "method" "public"."two_factor_auth_method_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "is_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "is_verified" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "secret" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "phone_number" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "email" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "backup_codes_used" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "enabled_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "dashboard_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "title_uz" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "position_x" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "position_y" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "definition_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "filters" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "period_type" "public"."dashboard_widgets_period_type_enum" NOT NULL DEFAULT 'this_month'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "chart_config" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "kpi_config" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "refresh_interval_seconds" integer NOT NULL DEFAULT '300'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "last_refresh_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "cached_data" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "cache_expires_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referral_code" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referrer_reward_points" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referred_reward_points" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referrer_reward_paid" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referred_reward_paid" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "activation_order_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "activation_order_amount" numeric(15,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "activated_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "source" character varying(20) NOT NULL DEFAULT 'code'`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "utm_campaign" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" ADD "metadata" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_id" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ADD "started_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "title" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "title_uz" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "conditions" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "points_reward" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "sort_order" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "organization_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "points_awarded" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "code" character varying(8) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "UQ_a53a83849f95cbcf3fbcf32fd0a" UNIQUE ("code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referrer_rewarded" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "referred_rewarded" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD "completed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "organization_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "status" "public"."warehouse_zones_status_enum" NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "storage_condition" "public"."warehouse_zones_storage_condition_enum" NOT NULL DEFAULT 'ambient'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "floor" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "aisle" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "total_capacity" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "used_capacity" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "capacity_unit" character varying(20) NOT NULL DEFAULT 'units'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "min_temperature" numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "max_temperature" numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "current_temperature" numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "temperature_updated_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "allowed_categories" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "excluded_categories" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "is_pickable" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "pick_priority" integer NOT NULL DEFAULT '100'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "fifo_enabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "counterparty_id" uuid`,
    );
    await queryRunner.query(
      `UPDATE "contracts" SET "counterparty_id" = (SELECT id FROM "counterparties" LIMIT 1) WHERE "counterparty_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "counterparty_id" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "contracts" ADD "contractor_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "user_id" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "widget_type" "public"."dashboard_widgets_widget_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "time_range" "public"."dashboard_widgets_time_range_enum" NOT NULL DEFAULT 'last_7_days'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "position" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "config" jsonb NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "metadata" jsonb NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "name_uz" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "condition_metadata" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "bonus_points" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "image_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "display_order" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "total_unlocked" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "current_value" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "target_value" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "is_unlocked" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "claimed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "points_claimed" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD "progress_details" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_logs" ALTER COLUMN "overtime_multiplier" SET DEFAULT '1.5'`,
    );
    await queryRunner.query(`ALTER TABLE "warehouse_zones" DROP COLUMN "code"`);
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "code" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."warehouse_zones_zone_type_enum" RENAME TO "warehouse_zones_zone_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."warehouse_zones_zone_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."warehouse_zones_zone_type_enum" AS ENUM('receiving', 'storage', 'picking', 'packing', 'shipping', 'quarantine', 'returns')`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "zone_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "zone_type" TYPE "public"."warehouse_zones_zone_type_enum" USING "zone_type"::"text"::"public"."warehouse_zones_zone_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."warehouse_zones_zone_type_enum_old"`,
    );
    await queryRunner.query(
      `UPDATE "organizations" SET "name" = 'Unknown' WHERE "name" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "name" SET NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "organizations" SET "slug" = 'unknown' WHERE "slug" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ALTER COLUMN "slug" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_e9658e959c490b0a634dfc54783"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ALTER COLUMN "user_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP COLUMN "refresh_token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "refresh_token_hash" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ALTER COLUMN "refresh_token_hint" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ALTER COLUMN "last_activity_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ALTER COLUMN "last_activity_at" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP COLUMN "revoked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "revoked_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP COLUMN "revoked_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "revoked_reason" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ALTER COLUMN "user_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP CONSTRAINT "UQ_64385b800e675d22928d1e1cecf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "backup_codes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "backup_codes" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "locked_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "locked_until" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "last_used_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ALTER COLUMN "metadata" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ALTER COLUMN "metadata" DROP DEFAULT`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab673f0e63eac966762155508e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "UQ_ab673f0e63eac966762155508ee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP COLUMN "token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD "token" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "machines" SET "machine_number" = 'M-' || LPAD(id::text, 4, '0') WHERE "machine_number" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "machine_number" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "name" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."machine_type_enum_old" RENAME TO "machine_type_enum_old_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."machines_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."machines_type_enum" AS ENUM('coffee', 'snack', 'drink', 'combo', 'fresh', 'ice_cream', 'water')`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "type" TYPE text USING "type"::text`,
    );
    await queryRunner.query(
      `UPDATE "machines" SET "type" = 'drink' WHERE "type" = 'beverage'`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "type" TYPE "public"."machines_type_enum" USING "type"::"public"."machines_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machines" ALTER COLUMN "type" SET DEFAULT 'coffee'`,
    );
    await queryRunner.query(`DROP TYPE "public"."machine_type_enum_old_old"`);
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "sku" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "name" SET NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "tasks" SET "type_code" = 'refill' WHERE "type_code" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "type_code" SET NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "tasks" SET "created_by_user_id" = (SELECT id FROM "users" LIMIT 1) WHERE "created_by_user_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "created_by_user_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "backup_codes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "backup_codes" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "last_used_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "locked_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "locked_until" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "title" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."dashboard_widgets_chart_type_enum" RENAME TO "dashboard_widgets_chart_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_chart_type_enum" AS ENUM('line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'heatmap', 'table', 'kpi', 'map', 'funnel', 'gauge')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" TYPE "public"."dashboard_widgets_chart_type_enum" USING "chart_type"::"text"::"public"."dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" SET DEFAULT 'kpi'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."dashboard_widgets_chart_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" SET DEFAULT 'kpi'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "width" SET DEFAULT '4'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "height" SET DEFAULT '2'`,
    );
    await queryRunner.query(
      `ALTER TABLE "analytics_snapshots" ALTER COLUMN "average_transaction_value" TYPE numeric(15,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "analytics_snapshots" ALTER COLUMN "profit_margin" TYPE numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "average_sale_amount" TYPE numeric(15,2)`,
    );
    await queryRunner.query(
      `UPDATE "daily_stats" SET "top_products" = '[]' WHERE "top_products" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "top_products" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "top_products" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `UPDATE "daily_stats" SET "top_machines" = '[]' WHERE "top_machines" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "top_machines" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "top_machines" SET DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN "last_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_updated_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN "last_full_rebuild_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_full_rebuild_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `UPDATE "daily_stats" SET "metadata" = '{}' WHERE "metadata" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "metadata" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_507a2818bf5524662b068c2e81c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "referred_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "UQ_507a2818bf5524662b068c2e81c" UNIQUE ("referred_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "reconciliation_runs" ALTER COLUMN "amount_tolerance" SET DEFAULT '0.01'`,
    );
    await queryRunner.query(
      `UPDATE "permissions" p SET "action" = actions.action FROM (SELECT id, (ARRAY['create','read','update','delete','manage'])[(ROW_NUMBER() OVER (PARTITION BY resource ORDER BY id))::int] as action FROM "permissions" WHERE "action" IS NULL) actions WHERE p.id = actions.id`,
    );
    await queryRunner.query(
      `UPDATE "permissions" SET "name" = "resource" || ':' || "action" WHERE "name" IS NULL`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE id NOT IN (SELECT MIN(id::text)::uuid FROM "permissions" GROUP BY "resource", "action")`,
    );
    await queryRunner.query(
      `DELETE FROM "permissions" WHERE id NOT IN (SELECT MIN(id::text)::uuid FROM "permissions" GROUP BY "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "name" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ALTER COLUMN "action" SET NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_639c0f1d38d97d778122d4f299"`,
    );
    await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN "token"`);
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "token" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD CONSTRAINT "UQ_639c0f1d38d97d778122d4f2998" UNIQUE ("token")`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN "device_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_type" "public"."fcm_tokens_device_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN "device_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_name" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."machine_access_role_enum_old" RENAME TO "machine_access_role_enum_old_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."machine_access_role_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."machine_access_role_enum" AS ENUM('full', 'refill', 'collection', 'maintenance', 'view')`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_access" ALTER COLUMN "role" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_access" ALTER COLUMN "role" TYPE "public"."machine_access_role_enum" USING "role"::"text"::"public"."machine_access_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "machine_access" ALTER COLUMN "role" SET DEFAULT 'view'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."machine_access_role_enum_old_old"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_285706a79624c3a49e7fc066c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cbf20fadedfa0fe481b91b2d11"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."quests_period_enum" RENAME TO "quests_period_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_period_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."quest_period_enum" AS ENUM('daily', 'weekly', 'monthly', 'one_time', 'special')`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "period" TYPE "public"."quest_period_enum" USING "period"::"text"::"public"."quest_period_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."quests_period_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."quests_type_enum" RENAME TO "quests_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_type_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."quest_type_enum" AS ENUM('order_count', 'order_amount', 'order_single', 'order_category', 'order_product', 'order_time', 'order_machine', 'referral', 'review', 'share', 'visit', 'login_streak', 'profile_complete', 'first_order', 'payment_type', 'spend_points', 'loyal_customer', 'collector')`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "type" TYPE "public"."quest_type_enum" USING "type"::"text"::"public"."quest_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."quests_type_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."quests_difficulty_enum" RENAME TO "quests_difficulty_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."quest_difficulty_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quest_difficulty_enum" AS ENUM('easy', 'medium', 'hard', 'legendary')`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "difficulty" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "difficulty" TYPE "public"."quest_difficulty_enum" USING "difficulty"::"text"::"public"."quest_difficulty_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "difficulty" SET DEFAULT 'medium'`,
    );
    await queryRunner.query(`DROP TYPE "public"."quests_difficulty_enum_old"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_121d7826393316d089f4cad4d6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d053a241fd87121aeb284fa35"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."user_quests_status_enum" RENAME TO "user_quests_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."quest_status_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."quest_status_enum" AS ENUM('available', 'in_progress', 'completed', 'claimed', 'expired')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ALTER COLUMN "status" TYPE "public"."quest_status_enum" USING "status"::"text"::"public"."quest_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ALTER COLUMN "status" SET DEFAULT 'in_progress'`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_quests_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ALTER COLUMN "organization_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "description_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description_uz" text`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "icon"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "icon" character varying(100) NOT NULL DEFAULT 'trophy'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "category"`,
    );
    await queryRunner.query(`DROP TYPE "public"."achievements_category_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."achievements_category_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_category_enum" AS ENUM('beginner', 'explorer', 'loyal', 'social', 'collector', 'special')`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "category" character varying(50) NOT NULL DEFAULT 'beginner'`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "rarity"`);
    await queryRunner.query(`DROP TYPE "public"."achievements_rarity_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."achievements_rarity_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_rarity_enum" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary')`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "rarity" character varying(50) NOT NULL DEFAULT 'common'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "condition_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."achievements_condition_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."achievements_condition_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_condition_type_enum" AS ENUM('total_orders', 'total_spent', 'total_points_earned', 'streak_days', 'unique_machines', 'unique_products', 'referrals_count', 'reviews_count', 'quests_completed', 'level_reached', 'first_order', 'night_order', 'weekend_order')`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "condition_type" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ALTER COLUMN "unlocked_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ALTER COLUMN "unlocked_at" SET DEFAULT NOW()`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."referrals_status_enum" RENAME TO "referrals_status_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."referrals_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."referrals_status_enum" AS ENUM('pending', 'completed', 'expired', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" TYPE "public"."referrals_status_enum" USING "status"::"text"::"public"."referrals_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."referrals_status_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."invite_status_enum" RENAME TO "invite_status_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."invites_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invites_status_enum" AS ENUM('active', 'used', 'expired', 'revoked')`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ALTER COLUMN "status" TYPE "public"."invites_status_enum" USING "status"::"text"::"public"."invites_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ALTER COLUMN "status" SET DEFAULT 'active'`,
    );
    await queryRunner.query(`DROP TYPE "public"."invite_status_enum_old"`);
    await queryRunner.query(`ALTER TABLE "warehouse_zones" DROP COLUMN "code"`);
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "code" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "metadata" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "metadata" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP CONSTRAINT "UQ_639c0f1d38d97d778122d4f2998"`,
    );
    await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN "token"`);
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "token" character varying(500) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN "device_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_type" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN "device_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "commission_fixed_period"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "commission_fixed_period" "public"."contracts_commission_fixed_period_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "payment_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "payment_type" "public"."contracts_payment_type_enum" NOT NULL DEFAULT 'postpayment'`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ALTER COLUMN "contract_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" DROP COLUMN "commission_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."commission_calculations_commission_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."commission_calculations_commission_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."commission_calculations_commission_type_enum" AS ENUM('percentage', 'fixed', 'tiered', 'hybrid')`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ADD "commission_type" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."contracts_status_enum" RENAME TO "contracts_status_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."contracts_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contracts_status_enum" AS ENUM('draft', 'pending_approval', 'active', 'suspended', 'expiring_soon', 'expired', 'terminated', 'renewed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" TYPE "public"."contracts_status_enum" USING "status"::"text"::"public"."contracts_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."contracts_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "commission_fixed_period"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "commission_fixed_period" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "payment_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "payment_type" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ALTER COLUMN "transaction_count" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" DROP COLUMN "commission_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ADD "commission_type" "public"."commission_calculations_commission_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN "last_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN "last_full_rebuild_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_full_rebuild_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "title" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."dashboard_widgets_chart_type_enum" RENAME TO "dashboard_widgets_chart_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."dashboard_widgets_chart_type_enum" AS ENUM('kpi', 'line', 'bar', 'pie', 'area', 'donut', 'heatmap', 'scatter')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ALTER COLUMN "chart_type" TYPE "public"."dashboard_widgets_chart_type_enum" USING "chart_type"::"text"::"public"."dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."dashboard_widgets_chart_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description" character varying(500) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "description_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description_uz" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "condition_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "condition_type" "public"."achievements_condition_type_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "icon"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "icon" character varying(10) NOT NULL DEFAULT '🏆'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "category" "public"."achievements_category_enum" NOT NULL DEFAULT 'beginner'`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "rarity"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "rarity" "public"."achievements_rarity_enum" NOT NULL DEFAULT 'common'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_789d1669e6dcec609a539d8a1c" ON "warehouse_zones" ("zone_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d3bd929b40dbef1d393e90cfcc" ON "warehouse_zones" ("warehouse_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_64385b800e675d22928d1e1cec" ON "two_factor_auth" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ab673f0e63eac966762155508e" ON "password_reset_tokens" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0ac4d4b745bc6775101f5abb75" ON "machines" ("organization_id") `,
    );
    await queryRunner.query(
      `UPDATE "products" SET "sku" = "sku" || '-' || sub.rn FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY sku ORDER BY created_at) as rn FROM "products" WHERE "deleted_at" IS NULL AND "sku" IN (SELECT "sku" FROM "products" WHERE "deleted_at" IS NULL GROUP BY "sku" HAVING count(*) > 1)) sub WHERE "products".id = sub.id`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3519c4e06d93d6936db6a900ca" ON "products" ("sku") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d404aa7aa4a0404eafd184091" ON "products" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_932b7ae90148e482bc27b0a6d6" ON "tasks" ("created_by_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_76d3e56379fde9e047d915006a" ON "tasks" ("organization_id", "type_code", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ea9ba3dfb39050f831ee3be40d" ON "audit_logs" ("entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_966cbc720d258257e0b2e25461" ON "audit_logs" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a6171a9597c533488dc7e29298" ON "audit_logs" ("category", "severity") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99fca4a3a4a93c26a756c5aca5" ON "audit_logs" ("action", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f68e345c05e8166ff9deea1ab" ON "audit_logs" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON "audit_logs" ("entity_type", "entity_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71fef71b47bf988fa899406acb" ON "audit_logs" ("organization_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8e5e23ee6fccba37f99df331d1" ON "audit_logs" ("ip_address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3197969cb5ed9b2a00252a3c9e" ON "audit_logs" ("severity") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d4bbd861731298b2b1488683d4" ON "audit_logs" ("event_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5dc2dc878464db2eef604e4a02" ON "dashboard_widgets" ("organization_id", "is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3c2cca670ae9ad1eac71f5175" ON "dashboard_widgets" ("organization_id", "dashboard_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_analytics_snapshot_composite" ON "analytics_snapshots" ("organization_id", "snapshot_type", "snapshot_date", "machine_id", "location_id", "product_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f0e3007d5d0f3d4234444bdb2f" ON "analytics_snapshots" ("machine_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_daily_stats_org_date" ON "daily_stats" ("organization_id", "stat_date") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_70bf0cfdc68926b55cbac67138" ON "referrals" ("organization_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_005371020edbeff27e9f10925d" ON "referrals" ("referrer_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7331684c0c5b063803a425001a" ON "permissions" ("resource", "action") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_48ce552495d14eae9b187bb671" ON "permissions" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_285706a79624c3a49e7fc066c8" ON "quests" ("period", "starts_at", "ends_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cbf20fadedfa0fe481b91b2d11" ON "quests" ("organization_id", "period", "is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4dc0b6ac9b5cdf5034bb3395a" ON "user_quests" ("completed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_121d7826393316d089f4cad4d6" ON "user_quests" ("quest_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d053a241fd87121aeb284fa35" ON "user_quests" ("user_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_639c0f1d38d97d778122d4f299" ON "fcm_tokens" ("token") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ef494681de3ea6734825e88042" ON "user_quests" ("user_id", "quest_id", "period_start") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa5f218fc445c6f98519e37b60" ON "achievements" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e74aaed2d9b76fb9b2ea8f4641" ON "achievements" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4a270959307c2d584b4f5b1421" ON "achievements" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_40dd3757b510c58f0597a8eba5" ON "user_achievements" ("unlocked_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_25f0b25327a0bc759c21bbcdce" ON "user_achievements" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d79d79646c5b036eccd98c51f" ON "referrals" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_33fd8a248db1cd832baa8aa25b" ON "invites" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e73d92cf352ad7b17b08c615cd" ON "warehouse_zones" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1e59fa4cd002abcf4ea11e9fea" ON "warehouse_zones" ("organization_id", "zone_type") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9f1cfab59f911e75a484420078" ON "warehouse_zones" ("organization_id", "code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b8f0ccb5926cfeabea7c18b8e" ON "contracts" ("counterparty_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3653640e4f62aa511fe43b6f8" ON "contracts" ("contractor_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_899c2496e42b9342f8b9ab86b1" ON "daily_stats" ("last_updated_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b6c5373c29f8eb0e1b41056e5" ON "dashboard_widgets" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_73843addc463ef238567f6f110" ON "dashboard_widgets" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_784e5994d6c60de63f900e9c0e" ON "analytics_snapshots" ("location_id", "snapshot_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60c250875614c743993278049d" ON "analytics_snapshots" ("machine_id", "snapshot_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_867b91108d721aded509360512" ON "achievements" ("condition_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c61f9ea6b50033a3e63ebf5c4" ON "achievements" ("category", "rarity") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa827a703f547f650ae603ef50" ON "achievements" ("organization_id", "is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_20365ed7562812826af747998a" ON "user_achievements" ("user_id", "unlocked_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ADD CONSTRAINT "UQ_ef494681de3ea6734825e880429" UNIQUE ("user_id", "quest_id", "period_start")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "UQ_user_achievement" UNIQUE ("user_id", "achievement_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD CONSTRAINT "UQ_939a107ba7471a73cbc2d0580f3" UNIQUE ("stat_date", "organization_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "UQ_a103993b75768d942744e4b3b40" UNIQUE ("user_id", "achievement_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD CONSTRAINT "FK_d3bd929b40dbef1d393e90cfcc9" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD CONSTRAINT "FK_64385b800e675d22928d1e1cecf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_932b7ae90148e482bc27b0a6d65" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "FK_73843addc463ef238567f6f1109" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "FK_320cc93480d7bb25a4a984599ba" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "FK_507a2818bf5524662b068c2e81c" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ADD CONSTRAINT "FK_0a0d83baed7a608f036a16dcfec" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ADD CONSTRAINT "FK_b83b57c12df8839bf64cd13e726" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ADD CONSTRAINT "FK_9300d9ae06520676d0f616e1cd2" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_c755e3741cd46fc5ae3ef06592c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_36b4a912357ad1342b735d4d4c8" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "FK_908b1dec8c6907c99a381e5c580" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "FK_51bac8e59ded3fda54dec66526b" FOREIGN KEY ("used_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD CONSTRAINT "FK_2cc09ed3ffb74b669e0b843b2c2" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "FK_4b8f0ccb5926cfeabea7c18b8e0" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ADD CONSTRAINT "FK_689674ce1054698475d2150c947" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "FK_e3653640e4f62aa511fe43b6f84" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD CONSTRAINT "FK_5ec76b6935875f4c6ced106bb39" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP CONSTRAINT "FK_5ec76b6935875f4c6ced106bb39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT "FK_e3653640e4f62aa511fe43b6f84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" DROP CONSTRAINT "FK_689674ce1054698475d2150c947"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP CONSTRAINT "FK_4b8f0ccb5926cfeabea7c18b8e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP CONSTRAINT "FK_2cc09ed3ffb74b669e0b843b2c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "FK_51bac8e59ded3fda54dec66526b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "FK_908b1dec8c6907c99a381e5c580"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "FK_36b4a912357ad1342b735d4d4c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "FK_c755e3741cd46fc5ae3ef06592c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP CONSTRAINT "FK_9300d9ae06520676d0f616e1cd2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP CONSTRAINT "FK_b83b57c12df8839bf64cd13e726"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" DROP CONSTRAINT "FK_0a0d83baed7a608f036a16dcfec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "FK_507a2818bf5524662b068c2e81c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "FK_320cc93480d7bb25a4a984599ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "FK_73843addc463ef238567f6f1109"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_932b7ae90148e482bc27b0a6d65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP CONSTRAINT "FK_64385b800e675d22928d1e1cecf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_e9658e959c490b0a634dfc54783"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP CONSTRAINT "FK_d3bd929b40dbef1d393e90cfcc9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "UQ_a103993b75768d942744e4b3b40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP CONSTRAINT "UQ_939a107ba7471a73cbc2d0580f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP CONSTRAINT "UQ_user_achievement"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP CONSTRAINT "UQ_ef494681de3ea6734825e880429"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_20365ed7562812826af747998a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aa827a703f547f650ae603ef50"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c61f9ea6b50033a3e63ebf5c4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_867b91108d721aded509360512"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_60c250875614c743993278049d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_784e5994d6c60de63f900e9c0e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_73843addc463ef238567f6f110"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b6c5373c29f8eb0e1b41056e5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_899c2496e42b9342f8b9ab86b1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e3653640e4f62aa511fe43b6f8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b8f0ccb5926cfeabea7c18b8e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9f1cfab59f911e75a484420078"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e59fa4cd002abcf4ea11e9fea"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e73d92cf352ad7b17b08c615cd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_33fd8a248db1cd832baa8aa25b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6d79d79646c5b036eccd98c51f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_25f0b25327a0bc759c21bbcdce"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_40dd3757b510c58f0597a8eba5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4a270959307c2d584b4f5b1421"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e74aaed2d9b76fb9b2ea8f4641"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aa5f218fc445c6f98519e37b60"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef494681de3ea6734825e88042"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_639c0f1d38d97d778122d4f299"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d053a241fd87121aeb284fa35"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_121d7826393316d089f4cad4d6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4dc0b6ac9b5cdf5034bb3395a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cbf20fadedfa0fe481b91b2d11"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_285706a79624c3a49e7fc066c8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_48ce552495d14eae9b187bb671"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7331684c0c5b063803a425001a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_005371020edbeff27e9f10925d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_70bf0cfdc68926b55cbac67138"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_daily_stats_org_date"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f0e3007d5d0f3d4234444bdb2f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_analytics_snapshot_composite"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f3c2cca670ae9ad1eac71f5175"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5dc2dc878464db2eef604e4a02"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d4bbd861731298b2b1488683d4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3197969cb5ed9b2a00252a3c9e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8e5e23ee6fccba37f99df331d1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_71fef71b47bf988fa899406acb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7421efc125d95e413657efa3c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2f68e345c05e8166ff9deea1ab"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_99fca4a3a4a93c26a756c5aca5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a6171a9597c533488dc7e29298"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_966cbc720d258257e0b2e25461"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ea9ba3dfb39050f831ee3be40d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_76d3e56379fde9e047d915006a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_932b7ae90148e482bc27b0a6d6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2d404aa7aa4a0404eafd184091"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3519c4e06d93d6936db6a900ca"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0ac4d4b745bc6775101f5abb75"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab673f0e63eac966762155508e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_64385b800e675d22928d1e1cec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d3bd929b40dbef1d393e90cfcc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_789d1669e6dcec609a539d8a1c"`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "rarity"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "rarity" character varying(50) NOT NULL DEFAULT 'common'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "category" character varying(50) NOT NULL DEFAULT 'beginner'`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "icon"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "icon" character varying(100) NOT NULL DEFAULT 'trophy'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "condition_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "condition_type" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "description_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description_uz" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "description"`,
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
      `DROP TYPE "public"."dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."dashboard_widgets_chart_type_enum_old" RENAME TO "dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "title" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN "last_full_rebuild_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_full_rebuild_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN "last_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_updated_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" DROP COLUMN "commission_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ADD "commission_type" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ALTER COLUMN "transaction_count" SET DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "payment_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "pg_catalog"."varchar" AS ENUM('prepayment', 'postpayment', 'on_delivery')`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "payment_type" "public"."contracts_payment_type_enum" NOT NULL DEFAULT 'postpayment'`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "commission_fixed_period"`,
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
    await queryRunner.query(`DROP TYPE "public"."contracts_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."contracts_status_enum_old" RENAME TO "contracts_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" DROP COLUMN "commission_type"`,
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
      `ALTER TABLE "contracts" DROP COLUMN "payment_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "payment_type" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "commission_fixed_period"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD "commission_fixed_period" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN "device_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_name" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN "device_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "pg_catalog"."varchar" AS ENUM('ios', 'android', 'web')`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_type" "public"."fcm_tokens_device_type_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN "token"`);
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "token" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD CONSTRAINT "UQ_639c0f1d38d97d778122d4f2998" UNIQUE ("token")`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ALTER COLUMN "metadata" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "warehouse_zones" DROP COLUMN "code"`);
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
    await queryRunner.query(`DROP TYPE "public"."invites_status_enum"`);
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
    await queryRunner.query(`DROP TYPE "public"."referrals_status_enum"`);
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
      `ALTER TABLE "achievements" DROP COLUMN "condition_type"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_condition_type_enum" AS ENUM('early_bird', 'first_order', 'loyalty_level', 'night_owl', 'order_amount', 'order_count', 'promo_used', 'quest_completed', 'referral_count', 'review_count', 'streak_days', 'unique_machines', 'unique_products', 'weekend_warrior')`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "condition_type" "public"."achievements_condition_type_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "rarity"`);
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_rarity_enum" AS ENUM('common', 'epic', 'legendary', 'rare', 'uncommon')`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "rarity" "public"."achievements_rarity_enum" NOT NULL DEFAULT 'common'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "category"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."achievements_category_enum" AS ENUM('beginner', 'collector', 'explorer', 'loyal', 'social', 'special')`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "category" "public"."achievements_category_enum" NOT NULL DEFAULT 'beginner'`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "icon"`);
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "icon" character varying(10) NOT NULL DEFAULT '🏆'`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "description_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD "description_uz" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "description"`,
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
    await queryRunner.query(`DROP TYPE "public"."quest_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_quests_status_enum_old" RENAME TO "user_quests_status_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d053a241fd87121aeb284fa35" ON "user_quests" ("status", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_121d7826393316d089f4cad4d6" ON "user_quests" ("quest_id", "status") `,
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
    await queryRunner.query(`DROP TYPE "public"."quest_difficulty_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."quests_difficulty_enum_old" RENAME TO "quests_difficulty_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quests_type_enum_old" AS ENUM('collector', 'first_order', 'login_streak', 'loyal_customer', 'order_amount', 'order_category', 'order_count', 'order_machine', 'order_product', 'order_single', 'order_time', 'payment_type', 'profile_complete', 'referral', 'review', 'share', 'spend_points', 'visit')`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "type" TYPE "public"."quests_type_enum_old" USING "type"::"text"::"public"."quests_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."quest_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."quests_type_enum_old" RENAME TO "quests_type_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quests_period_enum_old" AS ENUM('daily', 'monthly', 'one_time', 'special', 'weekly')`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ALTER COLUMN "period" TYPE "public"."quests_period_enum_old" USING "period"::"text"::"public"."quests_period_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."quest_period_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."quests_period_enum_old" RENAME TO "quests_period_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cbf20fadedfa0fe481b91b2d11" ON "quests" ("is_active", "organization_id", "period") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_285706a79624c3a49e7fc066c8" ON "quests" ("ends_at", "period", "starts_at") `,
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
    await queryRunner.query(`DROP TYPE "public"."machine_access_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."machine_access_role_enum_old_old" RENAME TO "machine_access_role_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN "device_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP COLUMN "device_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "device_type" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" DROP CONSTRAINT "UQ_639c0f1d38d97d778122d4f2998"`,
    );
    await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN "token"`);
    await queryRunner.query(
      `ALTER TABLE "fcm_tokens" ADD "token" character varying(500) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_639c0f1d38d97d778122d4f299" ON "fcm_tokens" ("token") `,
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
      `ALTER TABLE "referrals" DROP CONSTRAINT "UQ_507a2818bf5524662b068c2e81c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "referred_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "FK_507a2818bf5524662b068c2e81c" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "metadata" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ALTER COLUMN "metadata" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN "last_full_rebuild_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD "last_full_rebuild_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" DROP COLUMN "last_updated_at"`,
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
      `DROP TYPE "public"."dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."dashboard_widgets_chart_type_enum_old" RENAME TO "dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD "title" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "locked_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "locked_until" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "last_used_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "backup_codes"`,
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
    await queryRunner.query(`DROP TYPE "public"."machines_type_enum"`);
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
      `ALTER TABLE "password_reset_tokens" DROP COLUMN "token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD "token" uuid NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "UQ_ab673f0e63eac966762155508ee" UNIQUE ("token")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ab673f0e63eac966762155508e" ON "password_reset_tokens" ("token") `,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ALTER COLUMN "metadata" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ALTER COLUMN "metadata" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "last_used_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "last_used_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "locked_until"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "locked_until" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "backup_codes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD "backup_codes" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD CONSTRAINT "UQ_64385b800e675d22928d1e1cecf" UNIQUE ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ALTER COLUMN "user_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP COLUMN "revoked_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "revoked_reason" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" DROP COLUMN "revoked_at"`,
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
      `ALTER TABLE "user_sessions" DROP COLUMN "refresh_token_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "refresh_token_hash" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ALTER COLUMN "user_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`,
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
      `DROP TYPE "public"."warehouse_zones_zone_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."warehouse_zones_zone_type_enum_old" RENAME TO "warehouse_zones_zone_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "warehouse_zones" DROP COLUMN "code"`);
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD "code" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_logs" ALTER COLUMN "overtime_multiplier" SET DEFAULT 1.5`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "progress_details"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "points_claimed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "claimed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "is_unlocked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "target_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "current_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "total_unlocked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "display_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "image_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "bonus_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "condition_metadata"`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "name_uz"`);
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "position"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "time_range"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "widget_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "contractor_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" DROP COLUMN "counterparty_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "fifo_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "pick_priority"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "is_pickable"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "excluded_categories"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "allowed_categories"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "temperature_updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "current_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "max_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "min_temperature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "capacity_unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "used_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "total_capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "aisle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "floor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "storage_condition"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "completed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referred_rewarded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referrer_rewarded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "UQ_a53a83849f95cbcf3fbcf32fd0a"`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "code"`);
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "points_awarded"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "sort_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "points_reward"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "conditions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" DROP COLUMN "title_uz"`,
    );
    await queryRunner.query(`ALTER TABLE "achievements" DROP COLUMN "title"`);
    await queryRunner.query(
      `ALTER TABLE "user_quests" DROP COLUMN "started_at"`,
    );
    await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP COLUMN "device_id"`);
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "metadata"`);
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "utm_campaign"`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "source"`);
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "activated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "activation_order_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "activation_order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referred_reward_paid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referrer_reward_paid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referred_reward_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referrer_reward_points"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP COLUMN "referral_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "cache_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "cached_data"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "last_refresh_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "refresh_interval_seconds"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "kpi_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "chart_config"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "period_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "filters"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "definition_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "position_y"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "position_x"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "title_uz"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" DROP COLUMN "dashboard_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "enabled_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "backup_codes_used"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "phone_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "is_verified"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "is_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "retention_days"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "error_stack"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "tags"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "geo_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "device_info"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "context"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "affected_fields"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "changes"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "new_values"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "old_values"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "category"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "action"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "entity_name"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "entity_id"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "entity_type"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "user_role"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "user_name"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN "user_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "used_backup_codes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "email_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "sms_phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "totp_secret_iv"`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" DROP COLUMN "totp_secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "current_occupancy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "capacity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "area_sqm"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" DROP COLUMN "warehouse_id"`,
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
      `ALTER TABLE "referrals" ADD CONSTRAINT "UQ_a53a83849f95cbcf3fbcf32fd0a" UNIQUE ("code")`,
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
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "UQ_user_achievement" UNIQUE ("user_id", "achievement_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "UQ_a103993b75768d942744e4b3b40" UNIQUE ("user_id", "achievement_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ADD CONSTRAINT "UQ_ef494681de3ea6734825e880429" UNIQUE ("user_id", "quest_id", "period_start")`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_stats" ADD CONSTRAINT "UQ_939a107ba7471a73cbc2d0580f3" UNIQUE ("organization_id", "stat_date")`,
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
      `CREATE INDEX "IDX_25f0b25327a0bc759c21bbcdce" ON "user_achievements" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_40dd3757b510c58f0597a8eba5" ON "user_achievements" ("unlocked_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4a270959307c2d584b4f5b1421" ON "achievements" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa5f218fc445c6f98519e37b60" ON "achievements" ("sort_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e74aaed2d9b76fb9b2ea8f4641" ON "achievements" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f0e3007d5d0f3d4234444bdb2f" ON "analytics_snapshots" ("machine_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_analytics_snapshot_composite" ON "analytics_snapshots" ("location_id", "machine_id", "organization_id", "product_id", "snapshot_date", "snapshot_type") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_daily_stats_org_date" ON "daily_stats" ("organization_id", "stat_date") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b8f0ccb5926cfeabea7c18b8e" ON "contracts" ("counterparty_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3653640e4f62aa511fe43b6f8" ON "contracts" ("contractor_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d3bd929b40dbef1d393e90cfcc" ON "warehouse_zones" ("warehouse_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_789d1669e6dcec609a539d8a1c" ON "warehouse_zones" ("zone_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invites_organization_id" ON "invites" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invites_used_by_id" ON "invites" ("used_by_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invites_org_status" ON "invites" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_invites_code" ON "invites" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_invites_org_status" ON "invites" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_invites_code" ON "invites" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_005371020edbeff27e9f10925d" ON "referrals" ("referrer_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_70bf0cfdc68926b55cbac67138" ON "referrals" ("created_at", "organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_20365ed7562812826af747998a" ON "user_achievements" ("unlocked_at", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa827a703f547f650ae603ef50" ON "achievements" ("is_active", "organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c61f9ea6b50033a3e63ebf5c4" ON "achievements" ("category", "rarity") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_867b91108d721aded509360512" ON "achievements" ("condition_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4dc0b6ac9b5cdf5034bb3395a" ON "user_quests" ("completed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sob_is_applied" ON "stock_opening_balances" ("is_applied") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sob_balance_date" ON "stock_opening_balances" ("balance_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sob_warehouse_id" ON "stock_opening_balances" ("warehouse_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sob_product_id" ON "stock_opening_balances" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sob_organization_id" ON "stock_opening_balances" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ph_invoice_number" ON "purchase_history" ("invoice_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ph_status" ON "purchase_history" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ph_purchase_date" ON "purchase_history" ("purchase_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ph_warehouse_id" ON "purchase_history" ("warehouse_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ph_product_id" ON "purchase_history" ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ph_supplier_id" ON "purchase_history" ("supplier_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ph_organization_id" ON "purchase_history" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ef494681de3ea6734825e88042" ON "user_quests" ("period_start", "quest_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_permissions_resource_action" ON "permissions" ("action", "resource") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_permissions_name" ON "permissions" ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d79d79646c5b036eccd98c51f" ON "referrals" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_899c2496e42b9342f8b9ab86b1" ON "daily_stats" ("last_updated_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60c250875614c743993278049d" ON "analytics_snapshots" ("machine_id", "snapshot_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_784e5994d6c60de63f900e9c0e" ON "analytics_snapshots" ("location_id", "snapshot_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_73843addc463ef238567f6f110" ON "dashboard_widgets" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b6c5373c29f8eb0e1b41056e5" ON "dashboard_widgets" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_64385b800e675d22928d1e1cec" ON "two_factor_auth" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71fef71b47bf988fa899406acb" ON "audit_logs" ("created_at", "organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON "audit_logs" ("entity_id", "entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2f68e345c05e8166ff9deea1ab" ON "audit_logs" ("created_at", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99fca4a3a4a93c26a756c5aca5" ON "audit_logs" ("action", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a6171a9597c533488dc7e29298" ON "audit_logs" ("category", "severity") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_966cbc720d258257e0b2e25461" ON "audit_logs" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ea9ba3dfb39050f831ee3be40d" ON "audit_logs" ("entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d4bbd861731298b2b1488683d4" ON "audit_logs" ("event_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3197969cb5ed9b2a00252a3c9e" ON "audit_logs" ("severity") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8e5e23ee6fccba37f99df331d1" ON "audit_logs" ("ip_address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tasks_created_by_user_id" ON "tasks" ("created_by_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ta_resolved" ON "trip_anomalies" ("resolved") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ta_type" ON "trip_anomalies" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ta_trip_id" ON "trip_anomalies" ("trip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ts_trip_id" ON "trip_stops" ("trip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ts_started_at" ON "trip_stops" ("started_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ts_machine_id" ON "trip_stops" ("machine_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tp_trip_filtered" ON "trip_points" ("is_filtered", "trip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tp_trip_recorded" ON "trip_points" ("recorded_at", "trip_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0c30b2278a5d31e23fcaee4887" ON "user_sessions" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b54c5a344f4c1c68c41de391b" ON "user_sessions" ("last_used_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_sessions_token_hint" ON "user_sessions" ("refresh_token_hint") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_users_email_unique" ON "users" ("email") WHERE (email IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9f1cfab59f911e75a484420078" ON "warehouse_zones" ("code", "organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1e59fa4cd002abcf4ea11e9fea" ON "warehouse_zones" ("organization_id", "zone_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e73d92cf352ad7b17b08c615cd" ON "warehouse_zones" ("organization_id", "status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_36b4a912357ad1342b735d4d4c8" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_achievements" ADD CONSTRAINT "FK_c755e3741cd46fc5ae3ef06592c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "FK_320cc93480d7bb25a4a984599ba" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "FK_73843addc463ef238567f6f1109" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_calculations" ADD CONSTRAINT "FK_689674ce1054698475d2150c947" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "FK_4b8f0ccb5926cfeabea7c18b8e0" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "FK_e3653640e4f62aa511fe43b6f84" FOREIGN KEY ("contractor_id") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD CONSTRAINT "FK_d3bd929b40dbef1d393e90cfcc9" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "fk_invites_used_by" FOREIGN KEY ("used_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "fk_invites_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "achievements" ADD CONSTRAINT "FK_5ec76b6935875f4c6ced106bb39" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ADD CONSTRAINT "FK_9300d9ae06520676d0f616e1cd2" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_quests" ADD CONSTRAINT "FK_b83b57c12df8839bf64cd13e726" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quests" ADD CONSTRAINT "FK_0a0d83baed7a608f036a16dcfec" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "two_factor_auth" ADD CONSTRAINT "FK_64385b800e675d22928d1e1cecf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouse_zones" ADD CONSTRAINT "FK_2cc09ed3ffb74b669e0b843b2c2" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
