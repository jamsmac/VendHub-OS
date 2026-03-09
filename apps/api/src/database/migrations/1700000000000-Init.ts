import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Squashed init migration — creates the entire VendHub OS schema.
 * Replaces 57 incremental migrations that had enum/index duplication issues.
 */
export class Init1700000000000 implements MigrationInterface {
  name = "Init1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Idempotency guard ──
    // This squashed migration is NOT re-runnable (280 CREATE TYPE + 221 CREATE TABLE
    // without IF NOT EXISTS). If the schema already exists, skip entirely.
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations') AS exists`,
    );
    if (exists) {
      console.log(
        "Init1700000000000: schema already exists — skipping (idempotency guard).",
      );
      return;
    }

    // ── Extensions (1) ──
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;`,
    );

    // ── Enum Types (280) ──
    await queryRunner.query(`-- Name: access_control_logs_access_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.access_control_logs_access_type_enum AS ENUM (
    'read',
    'write',
    'delete',
    'execute'
);`);
    await queryRunner.query(`-- Name: access_control_logs_decision_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.access_control_logs_decision_enum AS ENUM (
    'allow',
    'deny'
);`);
    await queryRunner.query(`-- Name: access_requests_source_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.access_requests_source_enum AS ENUM (
    'telegram',
    'web',
    'manual'
);`);
    await queryRunner.query(`-- Name: access_requests_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.access_requests_status_enum AS ENUM (
    'new',
    'approved',
    'rejected'
);`);
    await queryRunner.query(`-- Name: access_template_rows_role_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.access_template_rows_role_enum AS ENUM (
    'full',
    'refill',
    'collection',
    'maintenance',
    'view'
);`);
    await queryRunner.query(`-- Name: achievements_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.achievements_category_enum AS ENUM (
    'beginner',
    'explorer',
    'loyal',
    'social',
    'collector',
    'special'
);`);
    await queryRunner.query(`-- Name: achievements_condition_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.achievements_condition_type_enum AS ENUM (
    'order_count',
    'order_amount',
    'streak_days',
    'unique_products',
    'unique_machines',
    'referral_count',
    'quest_completed',
    'loyalty_level',
    'first_order',
    'review_count',
    'early_bird',
    'night_owl',
    'weekend_warrior',
    'promo_used'
);`);
    await queryRunner.query(`-- Name: achievements_rarity_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.achievements_rarity_enum AS ENUM (
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary'
);`);
    await queryRunner.query(`-- Name: agent_progress_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.agent_progress_category_enum AS ENUM (
    'analysis',
    'code_generation',
    'testing',
    'fix',
    'documentation',
    'refactoring',
    'other'
);`);
    await queryRunner.query(`-- Name: agent_progress_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.agent_progress_status_enum AS ENUM (
    'started',
    'in_progress',
    'completed',
    'failed',
    'blocked'
);`);
    await queryRunner.query(`-- Name: agent_sessions_agent_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.agent_sessions_agent_type_enum AS ENUM (
    'claude_code',
    'gemini_cli',
    'cursor',
    'opencode',
    'custom'
);`);
    await queryRunner.query(`-- Name: agent_sessions_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.agent_sessions_status_enum AS ENUM (
    'running',
    'waiting',
    'idle',
    'error',
    'completed'
);`);
    await queryRunner.query(`-- Name: alert_history_severity_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.alert_history_severity_enum AS ENUM (
    'info',
    'warning',
    'critical'
);`);
    await queryRunner.query(`-- Name: alert_history_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.alert_history_status_enum AS ENUM (
    'active',
    'acknowledged',
    'resolved',
    'escalated',
    'expired',
    'dismissed'
);`);
    await queryRunner.query(`-- Name: alert_rules_condition_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.alert_rules_condition_enum AS ENUM (
    'greater_than',
    'less_than',
    'equals',
    'not_equals',
    'between'
);`);
    await queryRunner.query(`-- Name: alert_rules_metric_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.alert_rules_metric_enum AS ENUM (
    'temperature',
    'humidity',
    'stock_level',
    'cash_level',
    'sales_drop',
    'offline_duration',
    'error_count',
    'maintenance_overdue',
    'collection_overdue',
    'custom'
);`);
    await queryRunner.query(`-- Name: alert_rules_severity_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.alert_rules_severity_enum AS ENUM (
    'info',
    'warning',
    'critical'
);`);
    await queryRunner.query(`-- Name: analytics_snapshots_snapshot_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.analytics_snapshots_snapshot_type_enum AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'yearly'
);`);
    await queryRunner.query(`-- Name: api_keys_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.api_keys_status_enum AS ENUM (
    'active',
    'inactive',
    'revoked',
    'expired'
);`);
    await queryRunner.query(`-- Name: attendances_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.attendances_status_enum AS ENUM (
    'present',
    'absent',
    'late',
    'half_day',
    'on_leave'
);`);
    await queryRunner.query(`-- Name: audit_alerts_actions_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.audit_alerts_actions_enum AS ENUM (
    'create',
    'update',
    'delete',
    'soft_delete',
    'restore',
    'login',
    'logout',
    'login_failed',
    'password_change',
    'password_reset',
    'permission_change',
    'settings_change',
    'export',
    'import',
    'bulk_update',
    'bulk_delete',
    'api_call',
    'webhook_received',
    'payment_processed',
    'refund_issued',
    'report_generated',
    'notification_sent',
    'task_assigned',
    'task_completed',
    'machine_status_change',
    'inventory_adjustment',
    'fiscal_operation'
);`);
    await queryRunner.query(`-- Name: audit_alerts_categories_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.audit_alerts_categories_enum AS ENUM (
    'authentication',
    'authorization',
    'data_access',
    'data_modification',
    'system',
    'security',
    'compliance',
    'financial',
    'operational',
    'integration'
);`);
    await queryRunner.query(`-- Name: audit_alerts_severities_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.audit_alerts_severities_enum AS ENUM (
    'debug',
    'info',
    'warning',
    'error',
    'critical'
);`);
    await queryRunner.query(`-- Name: audit_logs_action_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.audit_logs_action_enum AS ENUM (
    'create',
    'update',
    'delete',
    'soft_delete',
    'restore',
    'login',
    'logout',
    'login_failed',
    'password_change',
    'password_reset',
    'permission_change',
    'settings_change',
    'export',
    'import',
    'bulk_update',
    'bulk_delete',
    'api_call',
    'webhook_received',
    'payment_processed',
    'refund_issued',
    'report_generated',
    'notification_sent',
    'task_assigned',
    'task_completed',
    'machine_status_change',
    'inventory_adjustment',
    'fiscal_operation'
);`);
    await queryRunner.query(`-- Name: audit_logs_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.audit_logs_category_enum AS ENUM (
    'authentication',
    'authorization',
    'data_access',
    'data_modification',
    'system',
    'security',
    'compliance',
    'financial',
    'operational',
    'integration'
);`);
    await queryRunner.query(`-- Name: audit_logs_event_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.audit_logs_event_type_enum AS ENUM (
    'login_success',
    'login_failed',
    'logout',
    'token_refresh',
    'password_changed',
    'password_reset_requested',
    'password_reset_completed',
    '2fa_enabled',
    '2fa_disabled',
    '2fa_verified',
    '2fa_failed',
    'account_created',
    'account_updated',
    'account_blocked',
    'account_unblocked',
    'account_deleted',
    'role_assigned',
    'role_removed',
    'permission_changed',
    'access_request_created',
    'access_request_approved',
    'access_request_rejected',
    'brute_force_detected',
    'ip_blocked',
    'suspicious_activity',
    'session_created',
    'session_terminated',
    'session_expired',
    'transaction_created',
    'transaction_deleted',
    'transaction_updated',
    'refund_issued',
    'collection_recorded',
    'data_exported',
    'data_imported',
    'bulk_operation'
);`);
    await queryRunner.query(`-- Name: audit_logs_severity_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.audit_logs_severity_enum AS ENUM (
    'debug',
    'info',
    'warning',
    'error',
    'critical'
);`);
    await queryRunner.query(`-- Name: billing_payments_payment_method_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.billing_payments_payment_method_enum AS ENUM (
    'cash',
    'bank_transfer',
    'card',
    'online'
);`);
    await queryRunner.query(`-- Name: billing_payments_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.billing_payments_status_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);`);
    await queryRunner.query(`-- Name: client_loyalty_ledger_reason_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.client_loyalty_ledger_reason_enum AS ENUM (
    'ORDER_EARNED',
    'ORDER_REDEEMED',
    'ORDER_REFUND',
    'REFERRAL_BONUS',
    'PROMO_BONUS',
    'MANUAL_ADJUSTMENT',
    'EXPIRATION'
);`);
    await queryRunner.query(`-- Name: client_orders_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.client_orders_status_enum AS ENUM (
    'PENDING',
    'PAID',
    'DISPENSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REFUNDED'
);`);
    await queryRunner.query(`-- Name: client_payments_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.client_payments_status_enum AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED',
    'REFUNDED'
);`);
    await queryRunner.query(`-- Name: client_wallet_ledger_transaction_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.client_wallet_ledger_transaction_type_enum AS ENUM (
    'TOP_UP',
    'PURCHASE',
    'REFUND',
    'MANUAL_ADJUSTMENT',
    'BONUS'
);`);
    await queryRunner.query(`-- Name: collections_source_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.collections_source_enum AS ENUM (
    'realtime',
    'manual_history',
    'excel_import'
);`);
    await queryRunner.query(`-- Name: collections_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.collections_status_enum AS ENUM (
    'collected',
    'received',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: commission_calculations_commission_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.commission_calculations_commission_type_enum AS ENUM (
    'percentage',
    'fixed',
    'tiered',
    'hybrid'
);`);
    await queryRunner.query(`-- Name: commission_calculations_payment_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.commission_calculations_payment_status_enum AS ENUM (
    'pending',
    'paid',
    'overdue',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: commissions_commission_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.commissions_commission_type_enum AS ENUM (
    'percentage',
    'fixed',
    'tiered',
    'hybrid'
);`);
    await queryRunner.query(`-- Name: commissions_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.commissions_status_enum AS ENUM (
    'pending',
    'calculated',
    'paid',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: complaint_actions_action_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaint_actions_action_type_enum AS ENUM (
    'created',
    'status_changed',
    'assigned',
    'escalated',
    'comment_added',
    'customer_contacted',
    'customer_replied',
    'refund_initiated',
    'refund_completed',
    'product_replaced',
    'machine_serviced',
    'attachment_added',
    'merged',
    'split',
    'reopened'
);`);
    await queryRunner.query(`-- Name: complaint_comments_author_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaint_comments_author_type_enum AS ENUM (
    'staff',
    'customer',
    'system'
);`);
    await queryRunner.query(`-- Name: complaint_refunds_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaint_refunds_status_enum AS ENUM (
    'pending',
    'approved',
    'processing',
    'completed',
    'rejected',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: complaint_refunds_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaint_refunds_type_enum AS ENUM (
    'full',
    'partial',
    'product_replacement',
    'credit',
    'compensation'
);`);
    await queryRunner.query(`-- Name: complaint_templates_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaint_templates_category_enum AS ENUM (
    'machine_not_working',
    'machine_error',
    'payment_failed',
    'card_not_accepted',
    'cash_not_accepted',
    'no_change',
    'product_not_dispensed',
    'product_stuck',
    'wrong_product',
    'product_expired',
    'product_damaged',
    'product_quality',
    'product_out_of_stock',
    'refund_request',
    'double_charge',
    'charge_without_product',
    'machine_dirty',
    'hygiene_issue',
    'safety_concern',
    'suggestion',
    'product_request',
    'price_feedback',
    'other'
);`);
    await queryRunner.query(`-- Name: complaint_templates_template_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaint_templates_template_type_enum AS ENUM (
    'response',
    'resolution',
    'escalation',
    'follow_up'
);`);
    await queryRunner.query(`-- Name: complaints_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaints_category_enum AS ENUM (
    'machine_not_working',
    'machine_error',
    'payment_failed',
    'card_not_accepted',
    'cash_not_accepted',
    'no_change',
    'product_not_dispensed',
    'product_stuck',
    'wrong_product',
    'product_expired',
    'product_damaged',
    'product_quality',
    'product_out_of_stock',
    'refund_request',
    'double_charge',
    'charge_without_product',
    'machine_dirty',
    'hygiene_issue',
    'safety_concern',
    'suggestion',
    'product_request',
    'price_feedback',
    'other'
);`);
    await queryRunner.query(`-- Name: complaints_priority_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaints_priority_enum AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);`);
    await queryRunner.query(`-- Name: complaints_source_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaints_source_enum AS ENUM (
    'qr_code',
    'mobile_app',
    'web_portal',
    'telegram_bot',
    'phone_call',
    'email',
    'social_media',
    'location_contact',
    'internal'
);`);
    await queryRunner.query(`-- Name: complaints_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.complaints_status_enum AS ENUM (
    'new',
    'pending',
    'in_progress',
    'assigned',
    'investigating',
    'awaiting_customer',
    'awaiting_parts',
    'resolved',
    'closed',
    'rejected',
    'duplicate',
    'escalated',
    'reopened'
);`);
    await queryRunner.query(`-- Name: component_maintenance_maintenance_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.component_maintenance_maintenance_type_enum AS ENUM (
    'cleaning',
    'lubrication',
    'calibration',
    'repair',
    'replacement',
    'inspection',
    'software_update',
    'preventive',
    'other'
);`);
    await queryRunner.query(`-- Name: component_movements_from_location_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.component_movements_from_location_type_enum AS ENUM (
    'machine',
    'warehouse',
    'washing',
    'drying',
    'repair'
);`);
    await queryRunner.query(`-- Name: component_movements_movement_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.component_movements_movement_type_enum AS ENUM (
    'install',
    'remove',
    'send_to_wash',
    'return_from_wash',
    'send_to_drying',
    'return_from_drying',
    'move_to_warehouse',
    'move_to_machine',
    'send_to_repair',
    'return_from_repair'
);`);
    await queryRunner.query(`-- Name: component_movements_to_location_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.component_movements_to_location_type_enum AS ENUM (
    'machine',
    'warehouse',
    'washing',
    'drying',
    'repair'
);`);
    await queryRunner.query(`-- Name: containers_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.containers_status_enum AS ENUM (
    'active',
    'empty',
    'maintenance'
);`);
    await queryRunner.query(`-- Name: contractor_invoices_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.contractor_invoices_status_enum AS ENUM (
    'pending',
    'approved',
    'paid',
    'overdue',
    'cancelled',
    'disputed'
);`);
    await queryRunner.query(`-- Name: contractors_service_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.contractors_service_type_enum AS ENUM (
    'maintenance',
    'cleaning',
    'delivery',
    'repair',
    'security',
    'installation',
    'consulting',
    'location_owner',
    'supplier',
    'other'
);`);
    await queryRunner.query(`-- Name: contractors_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.contractors_type_enum AS ENUM (
    'client',
    'supplier',
    'partner',
    'location_owner'
);`);
    await queryRunner.query(`-- Name: contracts_commission_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.contracts_commission_type_enum AS ENUM (
    'percentage',
    'fixed',
    'tiered',
    'hybrid'
);`);
    await queryRunner.query(`-- Name: contracts_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.contracts_status_enum AS ENUM (
    'draft',
    'pending_approval',
    'active',
    'suspended',
    'expiring_soon',
    'expired',
    'terminated',
    'renewed'
);`);
    await queryRunner.query(`-- Name: counterparties_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.counterparties_type_enum AS ENUM (
    'client',
    'supplier',
    'partner',
    'location_owner'
);`);
    await queryRunner.query(`-- Name: custom_reports_format_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.custom_reports_format_enum AS ENUM (
    'pdf',
    'excel',
    'csv',
    'json'
);`);
    await queryRunner.query(`-- Name: custom_reports_report_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.custom_reports_report_type_enum AS ENUM (
    'sales',
    'financial',
    'inventory',
    'machines',
    'tasks',
    'custom'
);`);
    await queryRunner.query(`-- Name: custom_reports_schedule_frequency_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.custom_reports_schedule_frequency_enum AS ENUM (
    'once',
    'daily',
    'weekly',
    'monthly'
);`);
    await queryRunner.query(`-- Name: dashboard_widgets_chart_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.dashboard_widgets_chart_type_enum AS ENUM (
    'line',
    'bar',
    'pie',
    'area',
    'donut',
    'heatmap',
    'scatter'
);`);
    await queryRunner.query(`-- Name: dashboard_widgets_period_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.dashboard_widgets_period_type_enum AS ENUM (
    'today',
    'yesterday',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
    'this_year',
    'last_year',
    'last_7_days',
    'last_30_days',
    'last_90_days',
    'custom'
);`);
    await queryRunner.query(`-- Name: dashboard_widgets_time_range_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.dashboard_widgets_time_range_enum AS ENUM (
    'today',
    'yesterday',
    'last_7_days',
    'last_30_days',
    'this_month',
    'last_month',
    'this_year',
    'custom'
);`);
    await queryRunner.query(`-- Name: dashboard_widgets_widget_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.dashboard_widgets_widget_type_enum AS ENUM (
    'sales_chart',
    'revenue_chart',
    'top_machines',
    'top_products',
    'machine_status',
    'stock_levels',
    'tasks_summary',
    'incidents_map',
    'kpi_metric',
    'custom_chart'
);`);
    await queryRunner.query(`-- Name: dashboards_default_period_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.dashboards_default_period_enum AS ENUM (
    'today',
    'yesterday',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
    'this_year',
    'last_year',
    'last_7_days',
    'last_30_days',
    'last_90_days',
    'custom'
);`);
    await queryRunner.query(`-- Name: data_encryption_algorithm_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.data_encryption_algorithm_enum AS ENUM (
    'aes-256-gcm',
    'aes-256-cbc'
);`);
    await queryRunner.query(`-- Name: data_encryption_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.data_encryption_status_enum AS ENUM (
    'active',
    'rotated',
    'compromised',
    'expired'
);`);
    await queryRunner.query(`-- Name: directory_audit_action; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.directory_audit_action AS ENUM (
    'CREATE',
    'UPDATE',
    'ARCHIVE',
    'RESTORE',
    'SYNC',
    'APPROVE',
    'REJECT'
);`);
    await queryRunner.query(`-- Name: directory_scope; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.directory_scope AS ENUM (
    'HQ',
    'ORGANIZATION',
    'LOCATION'
);`);
    await queryRunner.query(`-- Name: directory_type; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.directory_type AS ENUM (
    'MANUAL',
    'EXTERNAL',
    'PARAM',
    'TEMPLATE'
);`);
    await queryRunner.query(`-- Name: employees_employee_role_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.employees_employee_role_enum AS ENUM (
    'operator',
    'technician',
    'warehouse',
    'driver',
    'manager',
    'accountant',
    'supervisor'
);`);
    await queryRunner.query(`-- Name: employees_employment_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.employees_employment_type_enum AS ENUM (
    'full_time',
    'part_time',
    'contract',
    'intern',
    'temporary'
);`);
    await queryRunner.query(`-- Name: employees_salary_frequency_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.employees_salary_frequency_enum AS ENUM (
    'hourly',
    'daily',
    'weekly',
    'biweekly',
    'monthly'
);`);
    await queryRunner.query(`-- Name: employees_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.employees_status_enum AS ENUM (
    'active',
    'on_leave',
    'suspended',
    'terminated'
);`);
    await queryRunner.query(`-- Name: entry_origin; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.entry_origin AS ENUM (
    'OFFICIAL',
    'LOCAL'
);`);
    await queryRunner.query(`-- Name: entry_status; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.entry_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'ACTIVE',
    'DEPRECATED',
    'ARCHIVED'
);`);
    await queryRunner.query(`-- Name: equipment_components_component_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.equipment_components_component_status_enum AS ENUM (
    'new',
    'installed',
    'in_use',
    'needs_maintenance',
    'in_repair',
    'repaired',
    'decommissioned',
    'disposed'
);`);
    await queryRunner.query(`-- Name: equipment_components_component_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.equipment_components_component_type_enum AS ENUM (
    'hopper',
    'grinder',
    'brew_unit',
    'mixer',
    'pump',
    'heater',
    'dispenser',
    'compressor',
    'board',
    'motor',
    'valve',
    'sensor',
    'filter',
    'tank',
    'conveyor',
    'display',
    'card_reader',
    'other'
);`);
    await queryRunner.query(`-- Name: equipment_components_current_location_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.equipment_components_current_location_type_enum AS ENUM (
    'machine',
    'warehouse',
    'washing',
    'drying',
    'repair'
);`);
    await queryRunner.query(`-- Name: favorites_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.favorites_type_enum AS ENUM (
    'product',
    'machine'
);`);
    await queryRunner.query(`-- Name: field_type; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.field_type AS ENUM (
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
);`);
    await queryRunner.query(`-- Name: fiscal_devices_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.fiscal_devices_status_enum AS ENUM (
    'active',
    'inactive',
    'maintenance',
    'error'
);`);
    await queryRunner.query(`-- Name: fiscal_queue_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.fiscal_queue_status_enum AS ENUM (
    'pending',
    'processing',
    'success',
    'failed',
    'retry'
);`);
    await queryRunner.query(`-- Name: fiscal_receipts_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.fiscal_receipts_status_enum AS ENUM (
    'pending',
    'processing',
    'success',
    'failed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: fiscal_receipts_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.fiscal_receipts_type_enum AS ENUM (
    'sale',
    'refund'
);`);
    await queryRunner.query(`-- Name: fiscal_shifts_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.fiscal_shifts_status_enum AS ENUM (
    'open',
    'closed'
);`);
    await queryRunner.query(`-- Name: generated_reports_period_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.generated_reports_period_type_enum AS ENUM (
    'today',
    'yesterday',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
    'this_year',
    'last_year',
    'last_7_days',
    'last_30_days',
    'last_90_days',
    'custom'
);`);
    await queryRunner.query(`-- Name: generated_reports_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.generated_reports_status_enum AS ENUM (
    'draft',
    'scheduled',
    'generating',
    'completed',
    'failed',
    'cancelled',
    'expired'
);`);
    await queryRunner.query(`-- Name: generated_reports_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.generated_reports_type_enum AS ENUM (
    'sales_summary',
    'sales_by_machine',
    'sales_by_product',
    'sales_by_location',
    'sales_by_period',
    'sales_trend',
    'machine_performance',
    'machine_uptime',
    'machine_errors',
    'machine_maintenance',
    'inventory_levels',
    'inventory_movement',
    'inventory_expiry',
    'stock_out',
    'revenue_report',
    'collection_report',
    'profit_loss',
    'commission_report',
    'contract_payments',
    'task_report',
    'operator_performance',
    'route_efficiency',
    'complaint_report',
    'complaint_sla',
    'customer_satisfaction',
    'location_performance',
    'location_comparison',
    'custom',
    'dashboard'
);`);
    await queryRunner.query(`-- Name: hw_imported_sales_import_source_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.hw_imported_sales_import_source_enum AS ENUM (
    'excel',
    'csv',
    'api'
);`);
    await queryRunner.query(`-- Name: import_audit_logs_action_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.import_audit_logs_action_type_enum AS ENUM (
    'insert',
    'update',
    'merge',
    'skip',
    'delete',
    'restore'
);`);
    await queryRunner.query(`-- Name: import_jobs_import_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.import_jobs_import_type_enum AS ENUM (
    'products',
    'machines',
    'users',
    'employees',
    'transactions',
    'sales',
    'inventory',
    'customers',
    'prices',
    'categories',
    'locations',
    'contractors'
);`);
    await queryRunner.query(`-- Name: import_jobs_source_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.import_jobs_source_enum AS ENUM (
    'csv',
    'excel',
    'json',
    'api',
    'legacy_system'
);`);
    await queryRunner.query(`-- Name: import_jobs_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.import_jobs_status_enum AS ENUM (
    'pending',
    'validating',
    'validation_failed',
    'processing',
    'completed',
    'completed_with_errors',
    'failed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: import_sessions_approval_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.import_sessions_approval_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'auto_approved'
);`);
    await queryRunner.query(`-- Name: import_sessions_domain_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.import_sessions_domain_enum AS ENUM (
    'products',
    'machines',
    'users',
    'employees',
    'transactions',
    'sales',
    'inventory',
    'customers',
    'prices',
    'categories',
    'locations',
    'contractors',
    'recipes',
    'planograms',
    'contracts'
);`);
    await queryRunner.query(`-- Name: import_sessions_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.import_sessions_status_enum AS ENUM (
    'uploaded',
    'classifying',
    'classified',
    'mapping',
    'mapped',
    'validating',
    'validated',
    'validation_failed',
    'awaiting_approval',
    'approved',
    'rejected',
    'executing',
    'completed',
    'completed_with_errors',
    'failed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: import_templates_import_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.import_templates_import_type_enum AS ENUM (
    'products',
    'machines',
    'users',
    'employees',
    'transactions',
    'sales',
    'inventory',
    'customers',
    'prices',
    'categories',
    'locations',
    'contractors'
);`);
    await queryRunner.query(`-- Name: import_templates_source_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.import_templates_source_enum AS ENUM (
    'csv',
    'excel',
    'json',
    'api',
    'legacy_system'
);`);
    await queryRunner.query(`-- Name: incidents_priority_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.incidents_priority_enum AS ENUM (
    'low',
    'medium',
    'high'
);`);
    await queryRunner.query(`-- Name: incidents_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.incidents_status_enum AS ENUM (
    'reported',
    'investigating',
    'resolved',
    'closed'
);`);
    await queryRunner.query(`-- Name: incidents_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.incidents_type_enum AS ENUM (
    'vandalism',
    'theft',
    'water_damage',
    'power_failure',
    'network_failure',
    'mechanical_failure',
    'other'
);`);
    await queryRunner.query(`-- Name: ingredient_batches_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.ingredient_batches_status_enum AS ENUM (
    'in_stock',
    'depleted',
    'expired',
    'returned',
    'reserved'
);`);
    await queryRunner.query(`-- Name: ingredient_batches_unit_of_measure_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.ingredient_batches_unit_of_measure_enum AS ENUM (
    'g',
    'kg',
    'ml',
    'l',
    'pcs',
    'pack',
    'box',
    'portion',
    'cup'
);`);
    await queryRunner.query(`-- Name: integration_templates_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.integration_templates_category_enum AS ENUM (
    'payment',
    'fiscal',
    'sms',
    'email',
    'push',
    'analytics',
    'crm',
    'erp',
    'delivery',
    'loyalty',
    'custom'
);`);
    await queryRunner.query(`-- Name: integrations_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.integrations_category_enum AS ENUM (
    'payment',
    'fiscal',
    'sms',
    'email',
    'push',
    'analytics',
    'crm',
    'erp',
    'delivery',
    'loyalty',
    'custom'
);`);
    await queryRunner.query(`-- Name: integrations_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.integrations_status_enum AS ENUM (
    'draft',
    'configuring',
    'testing',
    'active',
    'paused',
    'error',
    'deprecated'
);`);
    await queryRunner.query(`-- Name: inventory_adjustments_adjustment_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.inventory_adjustments_adjustment_type_enum AS ENUM (
    'stocktake',
    'correction',
    'damage',
    'expiry',
    'theft',
    'other'
);`);
    await queryRunner.query(`-- Name: inventory_difference_thresholds_severity_level_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.inventory_difference_thresholds_severity_level_enum AS ENUM (
    'INFO',
    'WARNING',
    'CRITICAL'
);`);
    await queryRunner.query(`-- Name: inventory_difference_thresholds_threshold_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.inventory_difference_thresholds_threshold_type_enum AS ENUM (
    'NOMENCLATURE',
    'CATEGORY',
    'LOCATION',
    'MACHINE',
    'OPERATOR',
    'GLOBAL'
);`);
    await queryRunner.query(`-- Name: inventory_movements_movement_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.inventory_movements_movement_type_enum AS ENUM (
    'warehouse_in',
    'warehouse_out',
    'warehouse_to_operator',
    'operator_to_warehouse',
    'operator_to_machine',
    'machine_to_operator',
    'machine_sale',
    'adjustment',
    'write_off',
    'warehouse_reservation',
    'warehouse_reservation_release',
    'operator_reservation',
    'operator_reservation_release'
);`);
    await queryRunner.query(`-- Name: inventory_reservations_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.inventory_reservations_status_enum AS ENUM (
    'pending',
    'confirmed',
    'partially_fulfilled',
    'fulfilled',
    'cancelled',
    'expired'
);`);
    await queryRunner.query(`-- Name: invoices_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.invoices_status_enum AS ENUM (
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled',
    'partially_paid'
);`);
    await queryRunner.query(`-- Name: leave_requests_leave_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.leave_requests_leave_type_enum AS ENUM (
    'annual',
    'sick',
    'unpaid',
    'maternity',
    'paternity',
    'bereavement',
    'emergency',
    'compensatory',
    'study',
    'other'
);`);
    await queryRunner.query(`-- Name: leave_requests_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.leave_requests_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: location_contract_payments_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.location_contract_payments_status_enum AS ENUM (
    'pending',
    'partial',
    'paid',
    'overdue',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: location_contracts_payment_frequency_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.location_contracts_payment_frequency_enum AS ENUM (
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'annually'
);`);
    await queryRunner.query(`-- Name: location_contracts_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.location_contracts_status_enum AS ENUM (
    'draft',
    'pending_approval',
    'active',
    'suspended',
    'expiring_soon',
    'expired',
    'terminated',
    'renewed'
);`);
    await queryRunner.query(`-- Name: location_contracts_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.location_contracts_type_enum AS ENUM (
    'franchise',
    'partnership',
    'lease',
    'service',
    'rent',
    'revenue_share',
    'hybrid',
    'free',
    'commission'
);`);
    await queryRunner.query(`-- Name: location_events_event_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.location_events_event_type_enum AS ENUM (
    'created',
    'status_changed',
    'activated',
    'suspended',
    'closed',
    'contract_signed',
    'contract_renewed',
    'contract_terminated',
    'contract_payment',
    'machine_installed',
    'machine_removed',
    'machine_replaced',
    'complaint_received',
    'incident_reported',
    'inspection_completed',
    'contact_updated',
    'meeting_scheduled',
    'negotiation',
    'note_added',
    'document_uploaded',
    'photo_uploaded'
);`);
    await queryRunner.query(`-- Name: location_notes_note_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.location_notes_note_type_enum AS ENUM (
    'general',
    'important',
    'warning',
    'contact',
    'meeting',
    'todo'
);`);
    await queryRunner.query(`-- Name: location_visits_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.location_visits_status_enum AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: location_visits_visit_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.location_visits_visit_type_enum AS ENUM (
    'routine',
    'service',
    'inspection',
    'meeting',
    'installation',
    'collection',
    'complaint'
);`);
    await queryRunner.query(`-- Name: location_zones_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.location_zones_type_enum AS ENUM (
    'entrance',
    'lobby',
    'food_court',
    'hallway',
    'floor',
    'department',
    'waiting_area',
    'rest_area',
    'outdoor',
    'other'
);`);
    await queryRunner.query(`-- Name: locations_contract_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.locations_contract_type_enum AS ENUM (
    'franchise',
    'partnership',
    'lease',
    'service',
    'rent',
    'revenue_share',
    'hybrid',
    'free',
    'commission'
);`);
    await queryRunner.query(`-- Name: locations_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.locations_status_enum AS ENUM (
    'prospecting',
    'contract_pending',
    'active',
    'suspended',
    'closing',
    'closed'
);`);
    await queryRunner.query(`-- Name: locations_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.locations_type_enum AS ENUM (
    'shopping_center',
    'supermarket',
    'business_center',
    'office',
    'university',
    'school',
    'college',
    'hospital',
    'clinic',
    'pharmacy',
    'fitness',
    'gym',
    'cinema',
    'entertainment',
    'metro_station',
    'bus_station',
    'train_station',
    'airport',
    'gas_station',
    'hotel',
    'hostel',
    'residential',
    'dormitory',
    'factory',
    'warehouse',
    'industrial',
    'government',
    'police',
    'military',
    'park',
    'street',
    'other'
);`);
    await queryRunner.query(`-- Name: loyalty_promo_codes_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.loyalty_promo_codes_type_enum AS ENUM (
    'points_bonus',
    'discount_percent',
    'discount_fixed',
    'free_item'
);`);
    await queryRunner.query(`-- Name: machine_access_role_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machine_access_role_enum AS ENUM (
    'full',
    'refill',
    'collection',
    'maintenance',
    'view'
);`);
    await queryRunner.query(`-- Name: machine_components_component_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machine_components_component_type_enum AS ENUM (
    'hopper',
    'grinder',
    'brew_unit',
    'mixer',
    'pump',
    'heater',
    'dispenser',
    'compressor',
    'board',
    'motor',
    'other'
);`);
    await queryRunner.query(`-- Name: machine_components_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machine_components_status_enum AS ENUM (
    'installed',
    'removed',
    'in_repair',
    'disposed'
);`);
    await queryRunner.query(`-- Name: machine_error_logs_severity_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machine_error_logs_severity_enum AS ENUM (
    'info',
    'warning',
    'error',
    'critical'
);`);
    await queryRunner.query(`-- Name: machine_location_history_reason_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machine_location_history_reason_enum AS ENUM (
    'installation',
    'relocation',
    'removal',
    'maintenance',
    'contract_change',
    'other'
);`);
    await queryRunner.query(`-- Name: machine_location_syncs_sync_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machine_location_syncs_sync_status_enum AS ENUM (
    'active',
    'paused',
    'disabled',
    'error'
);`);
    await queryRunner.query(`-- Name: machine_maintenance_schedules_maintenance_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machine_maintenance_schedules_maintenance_type_enum AS ENUM (
    'cleaning',
    'inspection',
    'calibration',
    'parts_replacement',
    'software_update',
    'full_service'
);`);
    await queryRunner.query(`-- Name: machine_maintenance_schedules_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machine_maintenance_schedules_status_enum AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'skipped',
    'overdue'
);`);
    await queryRunner.query(`-- Name: machines_connection_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machines_connection_status_enum AS ENUM (
    'online',
    'offline',
    'unstable',
    'unknown'
);`);
    await queryRunner.query(`-- Name: machines_depreciation_method_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machines_depreciation_method_enum AS ENUM (
    'linear',
    'declining',
    'units_of_production'
);`);
    await queryRunner.query(`-- Name: machines_disposal_reason_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machines_disposal_reason_enum AS ENUM (
    'obsolete',
    'damaged',
    'sold',
    'written_off',
    'other'
);`);
    await queryRunner.query(`-- Name: machines_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machines_status_enum AS ENUM (
    'active',
    'low_stock',
    'error',
    'maintenance',
    'offline',
    'disabled'
);`);
    await queryRunner.query(`-- Name: machines_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.machines_type_enum AS ENUM (
    'coffee',
    'snack',
    'drink',
    'combo',
    'fresh',
    'ice_cream',
    'water'
);`);
    await queryRunner.query(`-- Name: maintenance_requests_maintenance_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.maintenance_requests_maintenance_type_enum AS ENUM (
    'preventive',
    'corrective',
    'predictive',
    'emergency',
    'inspection',
    'calibration',
    'cleaning',
    'upgrade'
);`);
    await queryRunner.query(`-- Name: maintenance_requests_priority_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.maintenance_requests_priority_enum AS ENUM (
    'low',
    'normal',
    'high',
    'critical'
);`);
    await queryRunner.query(`-- Name: maintenance_requests_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.maintenance_requests_status_enum AS ENUM (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'scheduled',
    'in_progress',
    'awaiting_parts',
    'completed',
    'verified',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: maintenance_schedules_maintenance_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.maintenance_schedules_maintenance_type_enum AS ENUM (
    'preventive',
    'corrective',
    'predictive',
    'emergency',
    'inspection',
    'calibration',
    'cleaning',
    'upgrade'
);`);
    await queryRunner.query(`-- Name: maintenance_work_logs_work_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.maintenance_work_logs_work_type_enum AS ENUM (
    'diagnosis',
    'repair',
    'replacement',
    'cleaning',
    'calibration',
    'testing',
    'other'
);`);
    await queryRunner.query(`-- Name: material_request_history_from_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.material_request_history_from_status_enum AS ENUM (
    'draft',
    'new',
    'approved',
    'rejected',
    'sent',
    'pending_payment',
    'paid',
    'partially_paid',
    'delivered',
    'completed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: material_request_history_to_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.material_request_history_to_status_enum AS ENUM (
    'draft',
    'new',
    'approved',
    'rejected',
    'sent',
    'pending_payment',
    'paid',
    'partially_paid',
    'delivered',
    'completed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: material_requests_priority_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.material_requests_priority_enum AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);`);
    await queryRunner.query(`-- Name: material_requests_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.material_requests_status_enum AS ENUM (
    'draft',
    'new',
    'approved',
    'rejected',
    'sent',
    'pending_payment',
    'paid',
    'partially_paid',
    'delivered',
    'completed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: materials_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.materials_category_enum AS ENUM (
    'ingredients',
    'consumables',
    'cleaning',
    'spare_parts',
    'packaging',
    'other'
);`);
    await queryRunner.query(`-- Name: notification_campaigns_audience_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_campaigns_audience_type_enum AS ENUM (
    'all',
    'roles',
    'users',
    'filter'
);`);
    await queryRunner.query(`-- Name: notification_campaigns_channels_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_campaigns_channels_enum AS ENUM (
    'push',
    'email',
    'sms',
    'telegram',
    'whatsapp',
    'in_app',
    'webhook',
    'slack'
);`);
    await queryRunner.query(`-- Name: notification_campaigns_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_campaigns_status_enum AS ENUM (
    'draft',
    'scheduled',
    'in_progress',
    'completed',
    'paused',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: notification_logs_channel_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_logs_channel_enum AS ENUM (
    'push',
    'email',
    'sms',
    'telegram',
    'whatsapp',
    'in_app',
    'webhook',
    'slack'
);`);
    await queryRunner.query(`-- Name: notification_logs_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_logs_status_enum AS ENUM (
    'pending',
    'queued',
    'sending',
    'sent',
    'delivered',
    'read',
    'failed',
    'cancelled',
    'expired'
);`);
    await queryRunner.query(`-- Name: notification_queue_channel_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_queue_channel_enum AS ENUM (
    'push',
    'email',
    'sms',
    'telegram',
    'whatsapp',
    'in_app',
    'webhook',
    'slack'
);`);
    await queryRunner.query(`-- Name: notification_queue_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_queue_status_enum AS ENUM (
    'pending',
    'queued',
    'sending',
    'sent',
    'delivered',
    'read',
    'failed',
    'cancelled',
    'expired'
);`);
    await queryRunner.query(`-- Name: notification_rules_channels_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_rules_channels_enum AS ENUM (
    'push',
    'email',
    'sms',
    'telegram',
    'whatsapp',
    'in_app',
    'webhook',
    'slack'
);`);
    await queryRunner.query(`-- Name: notification_rules_event_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_rules_event_category_enum AS ENUM (
    'machine',
    'task',
    'complaint',
    'inventory',
    'transaction',
    'user',
    'contract',
    'system',
    'report'
);`);
    await queryRunner.query(`-- Name: notification_rules_notification_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_rules_notification_type_enum AS ENUM (
    'system',
    'announcement',
    'maintenance',
    'machine_alert',
    'machine_error',
    'machine_offline',
    'machine_low_stock',
    'machine_out_of_stock',
    'machine_temperature',
    'task_assigned',
    'task_updated',
    'task_completed',
    'task_overdue',
    'task_reminder',
    'complaint_new',
    'complaint_assigned',
    'complaint_updated',
    'complaint_resolved',
    'complaint_sla_warning',
    'inventory_low',
    'inventory_expiring',
    'inventory_transfer',
    'transaction_alert',
    'collection_due',
    'collection_completed',
    'payment_received',
    'revenue_milestone',
    'user_login',
    'user_invited',
    'password_changed',
    'role_changed',
    'contract_expiring',
    'contract_expired',
    'contract_payment_due',
    'report_ready',
    'report_scheduled',
    'custom'
);`);
    await queryRunner.query(`-- Name: notification_rules_priority_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_rules_priority_enum AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);`);
    await queryRunner.query(`-- Name: notification_rules_recipient_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_rules_recipient_type_enum AS ENUM (
    'specific_users',
    'role',
    'assignee',
    'manager',
    'all'
);`);
    await queryRunner.query(`-- Name: notification_templates_default_channels_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_templates_default_channels_enum AS ENUM (
    'push',
    'email',
    'sms',
    'telegram',
    'whatsapp',
    'in_app',
    'webhook',
    'slack'
);`);
    await queryRunner.query(`-- Name: notification_templates_default_priority_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_templates_default_priority_enum AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);`);
    await queryRunner.query(`-- Name: notification_templates_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notification_templates_type_enum AS ENUM (
    'system',
    'announcement',
    'maintenance',
    'machine_alert',
    'machine_error',
    'machine_offline',
    'machine_low_stock',
    'machine_out_of_stock',
    'machine_temperature',
    'task_assigned',
    'task_updated',
    'task_completed',
    'task_overdue',
    'task_reminder',
    'complaint_new',
    'complaint_assigned',
    'complaint_updated',
    'complaint_resolved',
    'complaint_sla_warning',
    'inventory_low',
    'inventory_expiring',
    'inventory_transfer',
    'transaction_alert',
    'collection_due',
    'collection_completed',
    'payment_received',
    'revenue_milestone',
    'user_login',
    'user_invited',
    'password_changed',
    'role_changed',
    'contract_expiring',
    'contract_expired',
    'contract_payment_due',
    'report_ready',
    'report_scheduled',
    'custom'
);`);
    await queryRunner.query(`-- Name: notifications_channels_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notifications_channels_enum AS ENUM (
    'push',
    'email',
    'sms',
    'telegram',
    'whatsapp',
    'in_app',
    'webhook',
    'slack'
);`);
    await queryRunner.query(`-- Name: notifications_event_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notifications_event_category_enum AS ENUM (
    'machine',
    'task',
    'complaint',
    'inventory',
    'transaction',
    'user',
    'contract',
    'system',
    'report'
);`);
    await queryRunner.query(`-- Name: notifications_priority_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notifications_priority_enum AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);`);
    await queryRunner.query(`-- Name: notifications_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notifications_status_enum AS ENUM (
    'pending',
    'queued',
    'sending',
    'sent',
    'delivered',
    'read',
    'failed',
    'cancelled',
    'expired'
);`);
    await queryRunner.query(`-- Name: notifications_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.notifications_type_enum AS ENUM (
    'system',
    'announcement',
    'maintenance',
    'machine_alert',
    'machine_error',
    'machine_offline',
    'machine_low_stock',
    'machine_out_of_stock',
    'machine_temperature',
    'task_assigned',
    'task_updated',
    'task_completed',
    'task_overdue',
    'task_reminder',
    'complaint_new',
    'complaint_assigned',
    'complaint_updated',
    'complaint_resolved',
    'complaint_sla_warning',
    'inventory_low',
    'inventory_expiring',
    'inventory_transfer',
    'transaction_alert',
    'collection_due',
    'collection_completed',
    'payment_received',
    'revenue_milestone',
    'user_login',
    'user_invited',
    'password_changed',
    'role_changed',
    'contract_expiring',
    'contract_expired',
    'contract_payment_due',
    'report_ready',
    'report_scheduled',
    'custom'
);`);
    await queryRunner.query(`-- Name: orders_payment_method_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.orders_payment_method_enum AS ENUM (
    'cash',
    'card',
    'payme',
    'click',
    'qr',
    'uzcard',
    'humo',
    'visa',
    'mastercard',
    'nfc',
    'uzum',
    'telegram',
    'bonus',
    'mixed'
);`);
    await queryRunner.query(`-- Name: orders_payment_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.orders_payment_status_enum AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded',
    'partially_refunded'
);`);
    await queryRunner.query(`-- Name: orders_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.orders_status_enum AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'completed',
    'cancelled',
    'refunded'
);`);
    await queryRunner.query(`-- Name: organization_audit_logs_action_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.organization_audit_logs_action_enum AS ENUM (
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'invite',
    'role_change',
    'settings_change',
    'subscription_change',
    'api_key_create',
    'api_key_revoke'
);`);
    await queryRunner.query(`-- Name: organization_contracts_commission_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.organization_contracts_commission_type_enum AS ENUM (
    'percentage',
    'fixed',
    'tiered',
    'hybrid'
);`);
    await queryRunner.query(`-- Name: organization_contracts_contract_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.organization_contracts_contract_type_enum AS ENUM (
    'franchise',
    'partnership',
    'lease',
    'service',
    'rent',
    'revenue_share',
    'hybrid',
    'free',
    'commission'
);`);
    await queryRunner.query(`-- Name: organization_contracts_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.organization_contracts_status_enum AS ENUM (
    'draft',
    'pending_approval',
    'active',
    'suspended',
    'expiring_soon',
    'expired',
    'terminated',
    'renewed'
);`);
    await queryRunner.query(`-- Name: organization_invitations_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.organization_invitations_status_enum AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: organizations_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.organizations_status_enum AS ENUM (
    'active',
    'pending',
    'suspended',
    'terminated'
);`);
    await queryRunner.query(`-- Name: organizations_subscription_tier_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.organizations_subscription_tier_enum AS ENUM (
    'free',
    'starter',
    'professional',
    'enterprise',
    'custom'
);`);
    await queryRunner.query(`-- Name: organizations_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.organizations_type_enum AS ENUM (
    'headquarters',
    'franchise',
    'branch',
    'operator',
    'partner'
);`);
    await queryRunner.query(`-- Name: payment_providers_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.payment_providers_type_enum AS ENUM (
    'card',
    'qr',
    'nfc',
    'cash',
    'telegram',
    'bank_transfer'
);`);
    await queryRunner.query(`-- Name: payment_refunds_reason_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.payment_refunds_reason_enum AS ENUM (
    'customer_request',
    'machine_error',
    'product_unavailable',
    'duplicate',
    'other'
);`);
    await queryRunner.query(`-- Name: payment_refunds_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.payment_refunds_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);`);
    await queryRunner.query(`-- Name: payment_transactions_provider_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.payment_transactions_provider_enum AS ENUM (
    'payme',
    'click',
    'uzum',
    'telegram_stars',
    'cash',
    'wallet'
);`);
    await queryRunner.query(`-- Name: payment_transactions_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.payment_transactions_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded'
);`);
    await queryRunner.query(`-- Name: payrolls_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.payrolls_status_enum AS ENUM (
    'draft',
    'calculated',
    'approved',
    'paid',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: performance_reviews_review_period_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.performance_reviews_review_period_enum AS ENUM (
    'monthly',
    'quarterly',
    'semi_annual',
    'annual'
);`);
    await queryRunner.query(`-- Name: performance_reviews_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.performance_reviews_status_enum AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: points_transactions_source_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.points_transactions_source_enum AS ENUM (
    'order',
    'welcome_bonus',
    'first_order',
    'referral',
    'referral_bonus',
    'achievement',
    'daily_quest',
    'weekly_quest',
    'monthly_quest',
    'streak_bonus',
    'promo',
    'admin',
    'birthday',
    'purchase',
    'refund',
    'expiry'
);`);
    await queryRunner.query(`-- Name: points_transactions_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.points_transactions_type_enum AS ENUM (
    'earn',
    'spend',
    'adjust',
    'expire'
);`);
    await queryRunner.query(`-- Name: positions_level_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.positions_level_enum AS ENUM (
    'intern',
    'junior',
    'middle',
    'senior',
    'lead',
    'head',
    'director',
    'c_level'
);`);
    await queryRunner.query(`-- Name: products_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.products_category_enum AS ENUM (
    'coffee_beans',
    'coffee_instant',
    'tea',
    'chocolate',
    'milk',
    'sugar',
    'cream',
    'syrup',
    'water',
    'hot_drinks',
    'cold_drinks',
    'snacks',
    'sandwiches',
    'salads',
    'ice_cream',
    'cups',
    'lids',
    'stirrers',
    'napkins',
    'other'
);`);
    await queryRunner.query(`-- Name: products_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.products_status_enum AS ENUM (
    'active',
    'inactive',
    'discontinued',
    'out_of_stock'
);`);
    await queryRunner.query(`-- Name: products_unit_of_measure_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.products_unit_of_measure_enum AS ENUM (
    'g',
    'kg',
    'ml',
    'l',
    'pcs',
    'pack',
    'box',
    'portion',
    'cup'
);`);
    await queryRunner.query(`-- Name: promo_codes_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.promo_codes_status_enum AS ENUM (
    'draft',
    'active',
    'paused',
    'expired'
);`);
    await queryRunner.query(`-- Name: promo_codes_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.promo_codes_type_enum AS ENUM (
    'percentage',
    'fixed_amount',
    'loyalty_bonus'
);`);
    await queryRunner.query(`-- Name: purchase_history_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.purchase_history_status_enum AS ENUM (
    'PENDING',
    'RECEIVED',
    'PARTIAL',
    'CANCELLED',
    'RETURNED'
);`);
    await queryRunner.query(`-- Name: quest_difficulty_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.quest_difficulty_enum AS ENUM (
    'easy',
    'medium',
    'hard',
    'legendary'
);`);
    await queryRunner.query(`-- Name: quest_period_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.quest_period_enum AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'one_time',
    'special'
);`);
    await queryRunner.query(`-- Name: quest_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.quest_status_enum AS ENUM (
    'available',
    'in_progress',
    'completed',
    'claimed',
    'expired'
);`);
    await queryRunner.query(`-- Name: quest_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.quest_type_enum AS ENUM (
    'order_count',
    'order_amount',
    'order_single',
    'order_category',
    'order_product',
    'order_time',
    'order_machine',
    'referral',
    'review',
    'share',
    'visit',
    'login_streak',
    'profile_complete',
    'first_order',
    'payment_type',
    'spend_points',
    'loyal_customer',
    'collector'
);`);
    await queryRunner.query(`-- Name: recipe_ingredients_unit_of_measure_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.recipe_ingredients_unit_of_measure_enum AS ENUM (
    'g',
    'kg',
    'ml',
    'l',
    'pcs',
    'pack',
    'box',
    'portion',
    'cup'
);`);
    await queryRunner.query(`-- Name: recipes_type_code_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.recipes_type_code_enum AS ENUM (
    'primary',
    'alternative',
    'promotional',
    'test'
);`);
    await queryRunner.query(`-- Name: reconciliation_mismatches_mismatch_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.reconciliation_mismatches_mismatch_type_enum AS ENUM (
    'order_not_found',
    'payment_not_found',
    'amount_mismatch',
    'time_mismatch',
    'duplicate',
    'partial_match'
);`);
    await queryRunner.query(`-- Name: reconciliation_runs_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.reconciliation_runs_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: referrals_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.referrals_status_enum AS ENUM (
    'pending',
    'completed',
    'expired',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: report_definitions_available_formats_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.report_definitions_available_formats_enum AS ENUM (
    'pdf',
    'excel',
    'csv',
    'json',
    'html'
);`);
    await queryRunner.query(`-- Name: report_definitions_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.report_definitions_category_enum AS ENUM (
    'sales',
    'machines',
    'inventory',
    'finance',
    'operations',
    'complaints',
    'locations',
    'analytics',
    'custom'
);`);
    await queryRunner.query(`-- Name: report_definitions_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.report_definitions_type_enum AS ENUM (
    'sales_summary',
    'sales_by_machine',
    'sales_by_product',
    'sales_by_location',
    'sales_by_period',
    'sales_trend',
    'machine_performance',
    'machine_uptime',
    'machine_errors',
    'machine_maintenance',
    'inventory_levels',
    'inventory_movement',
    'inventory_expiry',
    'stock_out',
    'revenue_report',
    'collection_report',
    'profit_loss',
    'commission_report',
    'contract_payments',
    'task_report',
    'operator_performance',
    'route_efficiency',
    'complaint_report',
    'complaint_sla',
    'customer_satisfaction',
    'location_performance',
    'location_comparison',
    'custom',
    'dashboard'
);`);
    await queryRunner.query(`-- Name: report_subscriptions_delivery_channel_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.report_subscriptions_delivery_channel_enum AS ENUM (
    'email',
    'telegram',
    'in_app'
);`);
    await queryRunner.query(`-- Name: report_subscriptions_preferred_format_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.report_subscriptions_preferred_format_enum AS ENUM (
    'pdf',
    'excel',
    'csv',
    'json',
    'html'
);`);
    await queryRunner.query(`-- Name: route_stops_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.route_stops_status_enum AS ENUM (
    'pending',
    'arrived',
    'in_progress',
    'completed',
    'skipped'
);`);
    await queryRunner.query(`-- Name: routes_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.routes_status_enum AS ENUM (
    'planned',
    'in_progress',
    'completed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: routes_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.routes_type_enum AS ENUM (
    'refill',
    'collection',
    'maintenance',
    'mixed'
);`);
    await queryRunner.query(`-- Name: sales_imports_file_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.sales_imports_file_type_enum AS ENUM (
    'EXCEL',
    'CSV'
);`);
    await queryRunner.query(`-- Name: sales_imports_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.sales_imports_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'PARTIAL'
);`);
    await queryRunner.query(`-- Name: saved_report_filters_period_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.saved_report_filters_period_type_enum AS ENUM (
    'today',
    'yesterday',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
    'this_year',
    'last_year',
    'last_7_days',
    'last_30_days',
    'last_90_days',
    'custom'
);`);
    await queryRunner.query(`-- Name: scheduled_reports_format_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.scheduled_reports_format_enum AS ENUM (
    'pdf',
    'excel',
    'csv',
    'json',
    'html'
);`);
    await queryRunner.query(`-- Name: scheduled_reports_period_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.scheduled_reports_period_type_enum AS ENUM (
    'today',
    'yesterday',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
    'this_year',
    'last_year',
    'last_7_days',
    'last_30_days',
    'last_90_days',
    'custom'
);`);
    await queryRunner.query(`-- Name: schema_definitions_domain_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.schema_definitions_domain_enum AS ENUM (
    'products',
    'machines',
    'users',
    'employees',
    'transactions',
    'sales',
    'inventory',
    'customers',
    'prices',
    'categories',
    'locations',
    'contractors',
    'recipes',
    'planograms',
    'contracts'
);`);
    await queryRunner.query(`-- Name: security_events_event_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.security_events_event_type_enum AS ENUM (
    'login_success',
    'login_failed',
    'login_locked',
    'logout',
    'logout_all',
    'token_refresh',
    'token_blacklisted',
    'password_changed',
    'password_reset_requested',
    'password_reset_completed',
    'two_factor_enabled',
    'two_factor_disabled',
    'two_factor_failed',
    'account_created',
    'account_approved',
    'account_rejected',
    'account_suspended',
    'account_reactivated',
    'role_changed',
    'permission_changed',
    'suspicious_activity'
);`);
    await queryRunner.query(`-- Name: security_events_severity_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.security_events_severity_enum AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);`);
    await queryRunner.query(`-- Name: session_logs_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.session_logs_status_enum AS ENUM (
    'active',
    'expired',
    'revoked',
    'logged_out'
);`);
    await queryRunner.query(`-- Name: source_type; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.source_type AS ENUM (
    'URL',
    'API',
    'FILE',
    'TEXT'
);`);
    await queryRunner.query(`-- Name: stock_movements_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.stock_movements_status_enum AS ENUM (
    'pending',
    'in_transit',
    'completed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: stock_movements_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.stock_movements_type_enum AS ENUM (
    'receipt',
    'transfer',
    'dispatch',
    'return',
    'adjustment',
    'write_off'
);`);
    await queryRunner.query(`-- Name: stock_reservations_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.stock_reservations_status_enum AS ENUM (
    'pending',
    'confirmed',
    'partially_fulfilled',
    'fulfilled',
    'cancelled',
    'expired'
);`);
    await queryRunner.query(`-- Name: stock_takes_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.stock_takes_status_enum AS ENUM (
    'planned',
    'in_progress',
    'completed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: sync_jobs_direction_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.sync_jobs_direction_enum AS ENUM (
    'inbound',
    'outbound',
    'bidirectional'
);`);
    await queryRunner.query(`-- Name: sync_jobs_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.sync_jobs_status_enum AS ENUM (
    'scheduled',
    'running',
    'completed',
    'failed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: sync_log_status; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.sync_log_status AS ENUM (
    'STARTED',
    'SUCCESS',
    'FAILED',
    'PARTIAL'
);`);
    await queryRunner.query(`-- Name: sync_status; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.sync_status AS ENUM (
    'SUCCESS',
    'FAILED',
    'PARTIAL'
);`);
    await queryRunner.query(`-- Name: task_components_role_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.task_components_role_enum AS ENUM (
    'old',
    'new',
    'target'
);`);
    await queryRunner.query(`-- Name: tasks_priority_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.tasks_priority_enum AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);`);
    await queryRunner.query(`-- Name: tasks_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.tasks_status_enum AS ENUM (
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'rejected',
    'postponed',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: tasks_type_code_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.tasks_type_code_enum AS ENUM (
    'refill',
    'collection',
    'cleaning',
    'repair',
    'install',
    'removal',
    'audit',
    'inspection',
    'replace_hopper',
    'replace_grinder',
    'replace_brew_unit',
    'replace_mixer'
);`);
    await queryRunner.query(`-- Name: telegram_bot_analytics_event_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.telegram_bot_analytics_event_type_enum AS ENUM (
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
);`);
    await queryRunner.query(`-- Name: telegram_message_logs_message_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.telegram_message_logs_message_type_enum AS ENUM (
    'command',
    'notification',
    'callback',
    'message',
    'photo',
    'location',
    'contact',
    'error'
);`);
    await queryRunner.query(`-- Name: telegram_message_logs_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.telegram_message_logs_status_enum AS ENUM (
    'sent',
    'delivered',
    'failed',
    'read'
);`);
    await queryRunner.query(`-- Name: telegram_payments_currency_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.telegram_payments_currency_enum AS ENUM (
    'UZS',
    'USD',
    'RUB'
);`);
    await queryRunner.query(`-- Name: telegram_payments_provider_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.telegram_payments_provider_enum AS ENUM (
    'payme',
    'click',
    'uzum',
    'stripe'
);`);
    await queryRunner.query(`-- Name: telegram_payments_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.telegram_payments_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: telegram_settings_default_language_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.telegram_settings_default_language_enum AS ENUM (
    'ru',
    'en',
    'uz'
);`);
    await queryRunner.query(`-- Name: telegram_users_language_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.telegram_users_language_enum AS ENUM (
    'ru',
    'en',
    'uz'
);`);
    await queryRunner.query(`-- Name: telegram_users_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.telegram_users_status_enum AS ENUM (
    'active',
    'blocked',
    'inactive'
);`);
    await queryRunner.query(`-- Name: time_off_requests_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.time_off_requests_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
);`);
    await queryRunner.query(`-- Name: time_off_requests_time_off_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.time_off_requests_time_off_type_enum AS ENUM (
    'vacation',
    'sick_leave',
    'personal',
    'unpaid',
    'maternity',
    'paternity',
    'bereavement',
    'jury_duty',
    'military',
    'other'
);`);
    await queryRunner.query(`-- Name: transactions_expense_category_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.transactions_expense_category_enum AS ENUM (
    'rent',
    'purchase',
    'repair',
    'salary',
    'utilities',
    'depreciation',
    'writeoff',
    'transport',
    'marketing',
    'other'
);`);
    await queryRunner.query(`-- Name: transactions_payment_method_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.transactions_payment_method_enum AS ENUM (
    'cash',
    'card',
    'payme',
    'click',
    'qr',
    'uzcard',
    'humo',
    'visa',
    'mastercard',
    'nfc',
    'uzum',
    'telegram',
    'bonus',
    'mixed'
);`);
    await queryRunner.query(`-- Name: transactions_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.transactions_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'cancelled',
    'partially_refunded'
);`);
    await queryRunner.query(`-- Name: transactions_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.transactions_type_enum AS ENUM (
    'sale',
    'refund',
    'collection',
    'deposit',
    'withdrawal',
    'adjustment',
    'commission',
    'expense'
);`);
    await queryRunner.query(`-- Name: trip_anomalies_severity_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.trip_anomalies_severity_enum AS ENUM (
    'info',
    'warning',
    'critical'
);`);
    await queryRunner.query(`-- Name: trip_anomalies_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.trip_anomalies_type_enum AS ENUM (
    'long_stop',
    'speed_violation',
    'route_deviation',
    'gps_jump',
    'missed_location',
    'unplanned_stop',
    'mileage_discrepancy'
);`);
    await queryRunner.query(`-- Name: trip_task_links_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.trip_task_links_status_enum AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'skipped'
);`);
    await queryRunner.query(`-- Name: trips_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.trips_status_enum AS ENUM (
    'active',
    'completed',
    'cancelled',
    'auto_closed'
);`);
    await queryRunner.query(`-- Name: trips_task_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.trips_task_type_enum AS ENUM (
    'filling',
    'collection',
    'repair',
    'maintenance',
    'inspection',
    'merchandising',
    'other'
);`);
    await queryRunner.query(`-- Name: trips_transport_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.trips_transport_type_enum AS ENUM (
    'car',
    'motorcycle',
    'bicycle',
    'on_foot',
    'public_transport'
);`);
    await queryRunner.query(`-- Name: two_factor_auth_method_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.two_factor_auth_method_enum AS ENUM (
    'totp',
    'sms',
    'email',
    'backup_codes'
);`);
    await queryRunner.query(`-- Name: user_notification_settings_digest_channels_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.user_notification_settings_digest_channels_enum AS ENUM (
    'push',
    'email',
    'sms',
    'telegram',
    'whatsapp',
    'in_app',
    'webhook',
    'slack'
);`);
    await queryRunner.query(`-- Name: user_notification_settings_digest_frequency_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.user_notification_settings_digest_frequency_enum AS ENUM (
    'daily',
    'weekly',
    'none'
);`);
    await queryRunner.query(`-- Name: users_loyalty_level_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.users_loyalty_level_enum AS ENUM (
    'bronze',
    'silver',
    'gold',
    'platinum'
);`);
    await queryRunner.query(`-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.users_role_enum AS ENUM (
    'owner',
    'admin',
    'manager',
    'operator',
    'warehouse',
    'accountant',
    'viewer'
);`);
    await queryRunner.query(`-- Name: users_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.users_status_enum AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending',
    'rejected',
    'password_change_required'
);`);
    await queryRunner.query(`-- Name: validation_rules_domain_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.validation_rules_domain_enum AS ENUM (
    'products',
    'machines',
    'users',
    'employees',
    'transactions',
    'sales',
    'inventory',
    'customers',
    'prices',
    'categories',
    'locations',
    'contractors',
    'recipes',
    'planograms',
    'contracts'
);`);
    await queryRunner.query(`-- Name: validation_rules_rule_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.validation_rules_rule_type_enum AS ENUM (
    'range',
    'regex',
    'enum',
    'required',
    'unique',
    'foreign_key',
    'custom',
    'length',
    'format',
    'cross_field'
);`);
    await queryRunner.query(`-- Name: validation_rules_severity_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.validation_rules_severity_enum AS ENUM (
    'error',
    'warning',
    'info'
);`);
    await queryRunner.query(`-- Name: vehicles_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.vehicles_status_enum AS ENUM (
    'active',
    'inactive',
    'maintenance'
);`);
    await queryRunner.query(`-- Name: vehicles_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.vehicles_type_enum AS ENUM (
    'company',
    'personal'
);`);
    await queryRunner.query(`-- Name: warehouse_zones_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.warehouse_zones_status_enum AS ENUM (
    'active',
    'inactive',
    'maintenance',
    'full'
);`);
    await queryRunner.query(`-- Name: warehouse_zones_storage_condition_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.warehouse_zones_storage_condition_enum AS ENUM (
    'ambient',
    'cool',
    'refrigerated',
    'frozen',
    'dry',
    'climate_controlled'
);`);
    await queryRunner.query(`-- Name: warehouse_zones_zone_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.warehouse_zones_zone_type_enum AS ENUM (
    'storage',
    'receiving',
    'shipping',
    'picking',
    'cold',
    'frozen',
    'hazardous',
    'quarantine',
    'returns',
    'damaged'
);`);
    await queryRunner.query(`-- Name: warehouses_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.warehouses_type_enum AS ENUM (
    'main',
    'regional',
    'transit',
    'virtual'
);`);
    await queryRunner.query(`-- Name: work_logs_activity_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.work_logs_activity_type_enum AS ENUM (
    'refill',
    'collection',
    'maintenance',
    'repair',
    'inspection',
    'cleaning',
    'installation',
    'delivery',
    'office',
    'meeting',
    'travel',
    'other'
);`);
    await queryRunner.query(`-- Name: work_logs_status_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.work_logs_status_enum AS ENUM (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'paid'
);`);
    await queryRunner.query(`-- Name: work_logs_work_type_enum; Type: TYPE; Schema: public; Owner: -
CREATE TYPE public.work_logs_work_type_enum AS ENUM (
    'regular',
    'overtime',
    'weekend',
    'holiday',
    'night_shift',
    'on_call',
    'travel',
    'training'
);`);

    // ── Tables (221) ──
    await queryRunner.query(`-- Name: access_control_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.access_control_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_email character varying(200),
    resource_type character varying(100) NOT NULL,
    resource_id uuid,
    access_type public.access_control_logs_access_type_enum NOT NULL,
    decision public.access_control_logs_decision_enum NOT NULL,
    reason text,
    ip_address character varying(100),
    endpoint character varying(500),
    http_method character varying(20),
    user_permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    required_permissions jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: access_requests; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.access_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    telegram_id character varying(100) NOT NULL,
    telegram_username character varying(100),
    telegram_first_name character varying(100),
    telegram_last_name character varying(100),
    source public.access_requests_source_enum DEFAULT 'telegram'::public.access_requests_source_enum NOT NULL,
    status public.access_requests_status_enum DEFAULT 'new'::public.access_requests_status_enum NOT NULL,
    processed_by_user_id uuid,
    processed_at timestamp with time zone,
    rejection_reason text,
    created_user_id uuid,
    metadata jsonb,
    notes text
);`);
    await queryRunner.query(`-- Name: access_template_rows; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.access_template_rows (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    template_id uuid NOT NULL,
    role public.access_template_rows_role_enum NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: access_templates; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.access_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: achievements; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.achievements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    condition_value integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL,
    title character varying(255) NOT NULL,
    title_uz character varying(255),
    conditions jsonb,
    points_reward integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    name character varying(100) NOT NULL,
    name_uz character varying(100),
    condition_metadata jsonb,
    bonus_points integer DEFAULT 0 NOT NULL,
    image_url character varying,
    display_order integer DEFAULT 0 NOT NULL,
    total_unlocked integer DEFAULT 0 NOT NULL,
    description character varying(500) NOT NULL,
    description_uz character varying(500),
    condition_type public.achievements_condition_type_enum NOT NULL,
    icon character varying(10) DEFAULT '🏆'::character varying NOT NULL,
    category public.achievements_category_enum DEFAULT 'beginner'::public.achievements_category_enum NOT NULL,
    rarity public.achievements_rarity_enum DEFAULT 'common'::public.achievements_rarity_enum NOT NULL
);`);
    await queryRunner.query(`-- Name: agent_progress; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.agent_progress (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    session_id uuid NOT NULL,
    task_id character varying(100),
    status public.agent_progress_status_enum DEFAULT 'in_progress'::public.agent_progress_status_enum NOT NULL,
    category public.agent_progress_category_enum DEFAULT 'other'::public.agent_progress_category_enum NOT NULL,
    message text NOT NULL,
    files_changed jsonb DEFAULT '[]'::jsonb NOT NULL,
    lines_added integer,
    lines_removed integer,
    duration_ms integer,
    proposal_id uuid,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: agent_sessions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.agent_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    session_id character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    agent_type public.agent_sessions_agent_type_enum DEFAULT 'custom'::public.agent_sessions_agent_type_enum NOT NULL,
    status public.agent_sessions_status_enum DEFAULT 'running'::public.agent_sessions_status_enum NOT NULL,
    current_task character varying(500),
    working_directory character varying(200),
    profile character varying(100),
    attached_mcps jsonb DEFAULT '[]'::jsonb NOT NULL,
    last_activity_at timestamp with time zone,
    messages_count integer DEFAULT 0 NOT NULL,
    proposals_count integer DEFAULT 0 NOT NULL,
    files_changed_count integer DEFAULT 0 NOT NULL,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: ai_provider_keys; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.ai_provider_keys (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    provider character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    api_key text NOT NULL,
    model character varying(100),
    base_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    organization_id uuid,
    config jsonb DEFAULT '{}'::jsonb,
    usage_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: alert_history; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.alert_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    rule_id uuid NOT NULL,
    machine_id uuid,
    location_id uuid,
    title character varying(255),
    triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    value numeric(15,2) NOT NULL,
    threshold numeric(15,2) NOT NULL,
    severity public.alert_history_severity_enum NOT NULL,
    status public.alert_history_status_enum DEFAULT 'active'::public.alert_history_status_enum NOT NULL,
    acknowledged_by_user_id uuid,
    acknowledged_at timestamp with time zone,
    acknowledgement_note text,
    resolved_at timestamp with time zone,
    resolved_by_user_id uuid,
    resolution_note text,
    escalated_at timestamp with time zone,
    escalation_level integer DEFAULT 0 NOT NULL,
    metric_snapshot jsonb,
    notification_ids jsonb,
    auto_created_task_id uuid,
    message text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: alert_rules; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.alert_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    metric public.alert_rules_metric_enum NOT NULL,
    condition public.alert_rules_condition_enum NOT NULL,
    threshold numeric(15,2) NOT NULL,
    threshold_max numeric(15,2),
    severity public.alert_rules_severity_enum DEFAULT 'warning'::public.alert_rules_severity_enum NOT NULL,
    machine_id uuid,
    notify_channels jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
    notify_user_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    cooldown_minutes integer DEFAULT 60 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: analytics_snapshots; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.analytics_snapshots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    snapshot_type public.analytics_snapshots_snapshot_type_enum NOT NULL,
    snapshot_date date NOT NULL,
    machine_id uuid,
    location_id uuid,
    product_id uuid,
    total_transactions integer DEFAULT 0 NOT NULL,
    total_revenue numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_units_sold integer DEFAULT 0 NOT NULL,
    average_transaction_value numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    uptime_minutes integer DEFAULT 0 NOT NULL,
    downtime_minutes integer DEFAULT 0 NOT NULL,
    availability_percentage numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    stock_refills integer DEFAULT 0 NOT NULL,
    out_of_stock_incidents integer DEFAULT 0 NOT NULL,
    maintenance_tasks_completed integer DEFAULT 0 NOT NULL,
    incidents_reported integer DEFAULT 0 NOT NULL,
    complaints_received integer DEFAULT 0 NOT NULL,
    operational_costs numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    profit_margin numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    detailed_metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.api_keys (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    key_hash character varying(64) NOT NULL,
    key_prefix character varying(16) NOT NULL,
    user_id uuid NOT NULL,
    status public.api_keys_status_enum DEFAULT 'active'::public.api_keys_status_enum NOT NULL,
    expires_at timestamp without time zone,
    last_used_at timestamp without time zone,
    usage_count integer DEFAULT 0 NOT NULL,
    rate_limit integer,
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: attendances; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.attendances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    date date NOT NULL,
    check_in timestamp with time zone,
    check_out timestamp with time zone,
    total_hours numeric(5,2),
    overtime_hours numeric(5,2),
    break_duration_minutes integer DEFAULT 0 NOT NULL,
    status public.attendances_status_enum DEFAULT 'present'::public.attendances_status_enum NOT NULL,
    note text,
    check_in_location jsonb,
    check_out_location jsonb,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: audit_alert_history; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.audit_alert_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    alert_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    triggered_at timestamp with time zone NOT NULL,
    trigger_reason text NOT NULL,
    matched_events_count integer DEFAULT 1 NOT NULL,
    matched_event_ids uuid[],
    notification_sent boolean DEFAULT false NOT NULL,
    notification_channels_used text[],
    notification_error text,
    is_acknowledged boolean DEFAULT false NOT NULL,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    resolution_notes text
);`);
    await queryRunner.query(`-- Name: audit_alerts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.audit_alerts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    actions public.audit_alerts_actions_enum[],
    categories public.audit_alerts_categories_enum[],
    severities public.audit_alerts_severities_enum[],
    entity_types text[],
    conditions jsonb,
    threshold_count integer,
    threshold_window_minutes integer,
    notification_channels text[] DEFAULT '{}'::text[] NOT NULL,
    notification_recipients jsonb,
    notification_template text,
    cooldown_minutes integer DEFAULT 15 NOT NULL,
    last_triggered_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    trigger_count integer DEFAULT 0 NOT NULL,
    created_by uuid
);`);
    await queryRunner.query(`-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    severity public.audit_logs_severity_enum DEFAULT 'info'::public.audit_logs_severity_enum NOT NULL,
    organization_id uuid,
    user_id uuid,
    ip_address inet,
    description text,
    metadata jsonb,
    error_message text,
    event_type public.audit_logs_event_type_enum NOT NULL,
    target_user_id uuid,
    user_agent text,
    success boolean DEFAULT true NOT NULL,
    user_email character varying(255),
    user_name character varying(255),
    user_role character varying(50),
    entity_type character varying(100) NOT NULL,
    entity_id uuid,
    entity_name character varying(255),
    action public.audit_logs_action_enum NOT NULL,
    category public.audit_logs_category_enum DEFAULT 'data_modification'::public.audit_logs_category_enum NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changes jsonb,
    affected_fields text[],
    context jsonb,
    device_info jsonb,
    geo_location jsonb,
    tags text[],
    is_success boolean DEFAULT true NOT NULL,
    error_stack text,
    retention_days integer DEFAULT 365 NOT NULL,
    expires_at timestamp with time zone
);`);
    await queryRunner.query(`-- Name: audit_reports; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.audit_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    report_type character varying(50) NOT NULL,
    description text,
    date_from timestamp with time zone NOT NULL,
    date_to timestamp with time zone NOT NULL,
    filters jsonb,
    summary jsonb,
    highlights jsonb,
    file_path character varying(500),
    file_format character varying(10) DEFAULT 'pdf'::character varying NOT NULL,
    file_size integer,
    generated_by uuid,
    generation_duration_ms integer,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    error_message text
);`);
    await queryRunner.query(`-- Name: audit_retention_policies; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.audit_retention_policies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    entity_type character varying(100) NOT NULL,
    retention_days integer DEFAULT 365 NOT NULL,
    snapshot_retention_days integer DEFAULT 2555 NOT NULL,
    keep_create boolean DEFAULT true NOT NULL,
    keep_update boolean DEFAULT true NOT NULL,
    keep_delete boolean DEFAULT true NOT NULL,
    create_snapshots boolean DEFAULT false NOT NULL,
    snapshot_on_delete boolean DEFAULT true NOT NULL,
    excluded_fields text[],
    is_compliance_required boolean DEFAULT false NOT NULL,
    compliance_standard character varying(50),
    is_active boolean DEFAULT true NOT NULL
);`);
    await queryRunner.query(`-- Name: audit_sessions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.audit_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    user_id uuid NOT NULL,
    session_token_hash character varying(64),
    ip_address inet,
    device_info jsonb,
    geo_location jsonb,
    login_method character varying(50) DEFAULT 'password'::character varying NOT NULL,
    login_provider character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    is_suspicious boolean DEFAULT false NOT NULL,
    suspicious_reason text,
    last_activity_at timestamp with time zone,
    actions_count integer DEFAULT 0 NOT NULL,
    ended_at timestamp with time zone,
    end_reason character varying(50)
);`);
    await queryRunner.query(`-- Name: audit_snapshots; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.audit_snapshots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    entity_name character varying(255),
    snapshot jsonb NOT NULL,
    version character varying(50),
    checksum character varying(64),
    snapshot_reason character varying(100),
    created_by uuid,
    retention_days integer DEFAULT 2555 NOT NULL,
    expires_at timestamp with time zone
);`);
    await queryRunner.query(`-- Name: bank_deposits; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.bank_deposits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    deposit_date date NOT NULL,
    notes text
);`);
    await queryRunner.query(`-- Name: billing_payments; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.billing_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    payment_number character varying(50),
    amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    payment_method public.billing_payments_payment_method_enum NOT NULL,
    status public.billing_payments_status_enum DEFAULT 'pending'::public.billing_payments_status_enum NOT NULL,
    payment_date date NOT NULL,
    reference_number character varying(100),
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: bin_content_history; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.bin_content_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    bin_id uuid NOT NULL,
    product_id uuid NOT NULL,
    action character varying(20) NOT NULL,
    quantity numeric(10,3) NOT NULL,
    lot_number character varying(100),
    performed_by_user_id uuid,
    reference_id character varying(100),
    notes text
);`);
    await queryRunner.query(`-- Name: client_loyalty_accounts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.client_loyalty_accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    client_user_id uuid NOT NULL,
    organization_id uuid,
    points_balance integer DEFAULT 0 NOT NULL,
    total_earned integer DEFAULT 0 NOT NULL,
    total_redeemed integer DEFAULT 0 NOT NULL,
    tier character varying(20) DEFAULT 'bronze'::character varying NOT NULL,
    tier_updated_at timestamp with time zone
);`);
    await queryRunner.query(`-- Name: client_loyalty_ledger; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.client_loyalty_ledger (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    loyalty_account_id uuid NOT NULL,
    organization_id uuid,
    reason public.client_loyalty_ledger_reason_enum NOT NULL,
    points integer NOT NULL,
    balance_before integer NOT NULL,
    balance_after integer NOT NULL,
    description text,
    reference_id uuid,
    reference_type character varying(50),
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: client_orders; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.client_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    order_number character varying(50) NOT NULL,
    client_user_id uuid NOT NULL,
    machine_id uuid,
    status public.client_orders_status_enum DEFAULT 'PENDING'::public.client_orders_status_enum NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    discount_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    loyalty_points_used integer DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'UZS'::character varying NOT NULL,
    paid_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: client_payments; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.client_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    order_id uuid NOT NULL,
    client_user_id uuid NOT NULL,
    provider character varying(20) NOT NULL,
    provider_payment_id character varying(255),
    amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'UZS'::character varying NOT NULL,
    status public.client_payments_status_enum DEFAULT 'PENDING'::public.client_payments_status_enum NOT NULL,
    paid_at timestamp with time zone,
    error_message text,
    raw_response jsonb,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: client_users; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.client_users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    telegram_id character varying(50),
    phone character varying(20),
    email character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    username character varying(100),
    language character varying(5) DEFAULT 'ru'::character varying NOT NULL,
    avatar_url character varying(500),
    is_verified boolean DEFAULT false NOT NULL,
    is_blocked boolean DEFAULT false NOT NULL,
    last_activity_at timestamp with time zone,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: client_wallet_ledger; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.client_wallet_ledger (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    wallet_id uuid NOT NULL,
    organization_id uuid,
    transaction_type public.client_wallet_ledger_transaction_type_enum NOT NULL,
    amount numeric(15,2) NOT NULL,
    balance_before numeric(15,2) NOT NULL,
    balance_after numeric(15,2) NOT NULL,
    description text,
    reference_id uuid,
    reference_type character varying(50),
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: client_wallets; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.client_wallets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    client_user_id uuid NOT NULL,
    organization_id uuid,
    balance numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    currency character varying(10) DEFAULT 'UZS'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);`);
    await queryRunner.query(`-- Name: cms_articles; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.cms_articles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    content text NOT NULL,
    category character varying(100),
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    author_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    tags text,
    meta_title character varying(255),
    meta_description character varying(500)
);`);
    await queryRunner.query(`-- Name: collection_history; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.collection_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    collection_id uuid NOT NULL,
    changed_by_id uuid NOT NULL,
    field_name character varying(50) NOT NULL,
    old_value text,
    new_value text,
    reason text
);`);
    await queryRunner.query(`-- Name: collection_records; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.collection_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    machine_id uuid NOT NULL,
    task_id character varying,
    transaction_id character varying,
    collected_by_user_id character varying NOT NULL,
    cash_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    coin_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    expected_cash_amount numeric(15,2),
    expected_coin_amount numeric(15,2),
    expected_total_amount numeric(15,2),
    difference numeric(15,2),
    difference_percent numeric(5,2),
    counter_before integer,
    counter_after integer,
    sales_count integer,
    is_verified boolean DEFAULT false NOT NULL,
    verified_by_user_id character varying,
    verified_at timestamp without time zone,
    photo_url text,
    photo_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    collected_at timestamp without time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: collections; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.collections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    machine_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    manager_id uuid,
    collected_at timestamp with time zone NOT NULL,
    received_at timestamp with time zone,
    amount numeric(15,2),
    status public.collections_status_enum DEFAULT 'collected'::public.collections_status_enum NOT NULL,
    source public.collections_source_enum DEFAULT 'realtime'::public.collections_source_enum NOT NULL,
    notes text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    distance_from_machine numeric(10,2),
    location_id uuid
);`);
    await queryRunner.query(`-- Name: commission_calculations; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.commission_calculations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    contract_id uuid,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_revenue numeric(15,2) NOT NULL,
    transaction_count integer NOT NULL,
    commission_amount numeric(15,2) NOT NULL,
    calculation_details jsonb,
    payment_status public.commission_calculations_payment_status_enum DEFAULT 'pending'::public.commission_calculations_payment_status_enum NOT NULL,
    payment_due_date date,
    payment_date date,
    payment_transaction_id uuid,
    notes text,
    calculated_by_user_id uuid,
    commission_type public.commission_calculations_commission_type_enum NOT NULL
);`);
    await queryRunner.query(`-- Name: commissions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.commissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    contract_id character varying NOT NULL,
    location_id character varying,
    machine_id character varying,
    period_start date NOT NULL,
    period_end date NOT NULL,
    base_amount numeric(15,2) NOT NULL,
    commission_rate numeric(5,2),
    fixed_amount numeric(15,2),
    commission_amount numeric(15,2) NOT NULL,
    vat_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    status public.commissions_status_enum DEFAULT 'pending'::public.commissions_status_enum NOT NULL,
    commission_type public.commissions_commission_type_enum DEFAULT 'percentage'::public.commissions_commission_type_enum NOT NULL,
    paid_at timestamp without time zone,
    payment_transaction_id character varying,
    payment_reference text,
    calculation_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    calculated_by_user_id character varying,
    calculated_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: complaint_actions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.complaint_actions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    complaint_id uuid NOT NULL,
    organization_id character varying NOT NULL,
    action_type public.complaint_actions_action_type_enum NOT NULL,
    description character varying(255) NOT NULL,
    changes jsonb,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    performed_by_id uuid,
    performed_by_name character varying(255),
    is_system_action boolean DEFAULT false NOT NULL
);`);
    await queryRunner.query(`-- Name: complaint_automation_rules; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.complaint_automation_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    conditions jsonb NOT NULL,
    actions jsonb NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    stop_on_match boolean DEFAULT true NOT NULL,
    trigger_count integer DEFAULT 0 NOT NULL,
    last_triggered_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL
);`);
    await queryRunner.query(`-- Name: complaint_comments; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.complaint_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    complaint_id uuid NOT NULL,
    organization_id character varying NOT NULL,
    author_id uuid,
    author_name character varying(255) NOT NULL,
    author_type public.complaint_comments_author_type_enum DEFAULT 'staff'::public.complaint_comments_author_type_enum NOT NULL,
    content text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    is_auto_generated boolean DEFAULT false NOT NULL,
    sent_to_customer boolean DEFAULT false NOT NULL,
    sent_via character varying(50),
    sent_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: complaint_qr_codes; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.complaint_qr_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    code character varying(100) NOT NULL,
    organization_id uuid NOT NULL,
    machine_id uuid NOT NULL,
    machine_code character varying(100),
    location_id uuid,
    url text NOT NULL,
    short_url text,
    qr_image_url text,
    scan_count integer DEFAULT 0 NOT NULL,
    complaint_count integer DEFAULT 0 NOT NULL,
    last_scanned_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: complaint_refunds; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.complaint_refunds (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    complaint_id uuid NOT NULL,
    organization_id character varying NOT NULL,
    refund_number character varying(50) NOT NULL,
    type public.complaint_refunds_type_enum DEFAULT 'full'::public.complaint_refunds_type_enum NOT NULL,
    status public.complaint_refunds_status_enum DEFAULT 'pending'::public.complaint_refunds_status_enum NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'UZS'::character varying NOT NULL,
    original_transaction_id uuid,
    original_amount numeric(15,2),
    refund_method character varying(50) NOT NULL,
    refund_details jsonb,
    reason text NOT NULL,
    reason_code character varying(100),
    approved_at timestamp without time zone,
    approved_by_id uuid,
    approved_by_name character varying(255),
    processed_at timestamp without time zone,
    completed_at timestamp without time zone,
    external_refund_id character varying(100),
    notes text,
    rejection_reason text
);`);
    await queryRunner.query(`-- Name: complaint_templates; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.complaint_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    category public.complaint_templates_category_enum,
    template_type public.complaint_templates_template_type_enum DEFAULT 'response'::public.complaint_templates_template_type_enum NOT NULL,
    content_ru text NOT NULL,
    content_uz text,
    content_en text,
    variables jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: complaints; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.complaints (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    ticket_number character varying(20) NOT NULL,
    source public.complaints_source_enum DEFAULT 'qr_code'::public.complaints_source_enum NOT NULL,
    category public.complaints_category_enum DEFAULT 'other'::public.complaints_category_enum NOT NULL,
    subcategory character varying(100),
    priority public.complaints_priority_enum DEFAULT 'medium'::public.complaints_priority_enum NOT NULL,
    status public.complaints_status_enum DEFAULT 'new'::public.complaints_status_enum NOT NULL,
    subject character varying(255) NOT NULL,
    description text NOT NULL,
    customer jsonb,
    customer_id uuid,
    is_anonymous boolean DEFAULT false NOT NULL,
    machine_id uuid,
    machine_info jsonb,
    location_id uuid,
    product_info jsonb,
    transaction_info jsonb,
    geo_location jsonb,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    assigned_to_id uuid,
    assigned_to_name character varying(255),
    assigned_team_id uuid,
    assigned_at timestamp without time zone,
    sla_config jsonb,
    sla_status jsonb,
    response_deadline timestamp without time zone,
    resolution_deadline timestamp without time zone,
    is_sla_breached boolean DEFAULT false NOT NULL,
    resolution text,
    resolution_code character varying(100),
    resolved_at timestamp without time zone,
    resolved_by_id uuid,
    resolved_by_name character varying(255),
    satisfaction_rating integer,
    satisfaction_feedback text,
    feedback_received_at timestamp without time zone,
    is_escalated boolean DEFAULT false NOT NULL,
    escalation_level integer DEFAULT 0 NOT NULL,
    escalated_at timestamp without time zone,
    escalation_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags text,
    comment_count integer DEFAULT 0 NOT NULL,
    reopen_count integer DEFAULT 0 NOT NULL,
    organization_id uuid NOT NULL,
    first_response_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: component_maintenance; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.component_maintenance (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    component_id uuid NOT NULL,
    maintenance_type public.component_maintenance_maintenance_type_enum NOT NULL,
    description text,
    labor_cost numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    parts_cost numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_cost numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    performed_by_user_id uuid NOT NULL,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_minutes integer,
    parts_used jsonb DEFAULT '[]'::jsonb NOT NULL,
    result text,
    is_successful boolean DEFAULT true NOT NULL,
    next_maintenance_date date,
    photo_urls text,
    document_urls text,
    task_id uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: component_movements; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.component_movements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    component_id uuid NOT NULL,
    movement_type public.component_movements_movement_type_enum,
    from_location_type public.component_movements_from_location_type_enum,
    from_location_ref character varying(100),
    to_location_type public.component_movements_to_location_type_enum,
    to_location_ref character varying(100),
    from_machine_id uuid,
    to_machine_id uuid,
    related_machine_id uuid,
    task_id uuid,
    moved_by_user_id uuid NOT NULL,
    moved_at timestamp with time zone DEFAULT now() NOT NULL,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: containers; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.containers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    machine_id uuid NOT NULL,
    nomenclature_id uuid,
    slot_number integer NOT NULL,
    name character varying(100),
    capacity numeric(10,3) NOT NULL,
    current_quantity numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    unit character varying(20) DEFAULT 'g'::character varying NOT NULL,
    min_level numeric(10,3),
    last_refill_date timestamp with time zone,
    status public.containers_status_enum DEFAULT 'active'::public.containers_status_enum NOT NULL,
    metadata jsonb,
    notes text
);`);
    await queryRunner.query(`-- Name: contractor_invoices; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.contractor_invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    contractor_id uuid NOT NULL,
    invoice_number character varying NOT NULL,
    amount numeric(15,2) NOT NULL,
    paid_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    status public.contractor_invoices_status_enum DEFAULT 'pending'::public.contractor_invoices_status_enum NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    paid_date date,
    description text,
    approved_by character varying,
    approved_at timestamp without time zone,
    attachment_urls text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: contractors; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.contractors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_person character varying(200),
    phone character varying(20),
    email character varying(255),
    address text,
    service_type public.contractors_service_type_enum NOT NULL,
    contract_start date,
    contract_end date,
    contract_number text,
    payment_terms text,
    rating numeric(3,2),
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    bank_details jsonb,
    short_name character varying(100),
    inn character varying(9),
    oked character varying(10),
    mfo character varying(5),
    bank_account character varying(30),
    bank_name character varying(200),
    legal_address text,
    actual_address text,
    director_name character varying(200),
    director_position character varying(100),
    is_vat_payer boolean DEFAULT false NOT NULL,
    vat_rate numeric(5,2),
    credit_limit numeric(15,2),
    type public.contractors_type_enum DEFAULT 'supplier'::public.contractors_type_enum NOT NULL,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: contracts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    contract_number character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    status public.contracts_status_enum DEFAULT 'draft'::public.contracts_status_enum NOT NULL,
    commission_type public.contracts_commission_type_enum DEFAULT 'percentage'::public.contracts_commission_type_enum NOT NULL,
    commission_rate numeric(5,2),
    commission_fixed_amount numeric(15,2),
    commission_tiers jsonb,
    commission_hybrid_fixed numeric(15,2),
    commission_hybrid_rate numeric(5,2),
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    payment_term_days integer DEFAULT 30 NOT NULL,
    minimum_monthly_revenue numeric(15,2),
    penalty_rate numeric(5,2),
    special_conditions text,
    notes text,
    contract_file_id uuid,
    counterparty_id uuid NOT NULL,
    contractor_id uuid,
    commission_fixed_period character varying(20),
    payment_type character varying(50)
);`);
    await queryRunner.query(`-- Name: counterparties; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.counterparties (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    short_name character varying(50),
    type public.counterparties_type_enum NOT NULL,
    inn character varying(9) NOT NULL,
    oked character varying(20),
    mfo character varying(5),
    bank_account character varying(50),
    bank_name character varying(255),
    legal_address text,
    actual_address text,
    contact_person character varying(100),
    phone character varying(20),
    email character varying(100),
    director_name character varying(255),
    director_position character varying(255),
    is_vat_payer boolean DEFAULT true NOT NULL,
    vat_rate numeric(5,2) DEFAULT '15'::numeric NOT NULL,
    payment_term_days integer,
    credit_limit numeric(15,2),
    is_active boolean DEFAULT true NOT NULL,
    notes text
);`);
    await queryRunner.query(`-- Name: custom_reports; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.custom_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    report_type public.custom_reports_report_type_enum NOT NULL,
    format public.custom_reports_format_enum DEFAULT 'pdf'::public.custom_reports_format_enum NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_scheduled boolean DEFAULT false NOT NULL,
    schedule_frequency public.custom_reports_schedule_frequency_enum,
    schedule_time time without time zone,
    schedule_days text,
    recipients text,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: daily_stats; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.daily_stats (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    stat_date date NOT NULL,
    total_revenue numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_sales_count integer DEFAULT 0 NOT NULL,
    average_sale_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_collections numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    collections_count integer DEFAULT 0 NOT NULL,
    active_machines_count integer DEFAULT 0 NOT NULL,
    online_machines_count integer DEFAULT 0 NOT NULL,
    offline_machines_count integer DEFAULT 0 NOT NULL,
    refill_tasks_completed integer DEFAULT 0 NOT NULL,
    collection_tasks_completed integer DEFAULT 0 NOT NULL,
    cleaning_tasks_completed integer DEFAULT 0 NOT NULL,
    repair_tasks_completed integer DEFAULT 0 NOT NULL,
    total_tasks_completed integer DEFAULT 0 NOT NULL,
    inventory_units_refilled integer DEFAULT 0 NOT NULL,
    inventory_units_sold integer DEFAULT 0 NOT NULL,
    top_products jsonb,
    top_machines jsonb,
    active_operators_count integer DEFAULT 0 NOT NULL,
    is_finalized boolean DEFAULT false NOT NULL,
    metadata jsonb,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_full_rebuild_at timestamp with time zone
);`);
    await queryRunner.query(`-- Name: dashboard_widgets; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.dashboard_widgets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    chart_type public.dashboard_widgets_chart_type_enum,
    width integer DEFAULT 6 NOT NULL,
    height integer DEFAULT 4 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    dashboard_id uuid,
    title_uz character varying(100),
    position_x integer DEFAULT 0 NOT NULL,
    position_y integer DEFAULT 0 NOT NULL,
    definition_id uuid,
    filters jsonb,
    period_type public.dashboard_widgets_period_type_enum DEFAULT 'this_month'::public.dashboard_widgets_period_type_enum NOT NULL,
    chart_config jsonb,
    kpi_config jsonb,
    refresh_interval_seconds integer DEFAULT 300 NOT NULL,
    last_refresh_at timestamp without time zone,
    cached_data jsonb,
    cache_expires_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    user_id uuid NOT NULL,
    widget_type public.dashboard_widgets_widget_type_enum NOT NULL,
    time_range public.dashboard_widgets_time_range_enum DEFAULT 'last_7_days'::public.dashboard_widgets_time_range_enum NOT NULL,
    "position" integer NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    title character varying(255) NOT NULL
);`);
    await queryRunner.query(`-- Name: dashboards; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.dashboards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    name_uz character varying(100),
    description text,
    icon character varying(50),
    grid_columns integer DEFAULT 12 NOT NULL,
    row_height integer DEFAULT 60 NOT NULL,
    default_filters jsonb,
    default_period public.dashboards_default_period_enum DEFAULT 'this_month'::public.dashboards_default_period_enum NOT NULL,
    allowed_roles text DEFAULT '[]'::text NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_system boolean DEFAULT false NOT NULL
);`);
    await queryRunner.query(`-- Name: data_encryption; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.data_encryption (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    field_name character varying(100) NOT NULL,
    algorithm public.data_encryption_algorithm_enum DEFAULT 'aes-256-gcm'::public.data_encryption_algorithm_enum NOT NULL,
    key_version integer DEFAULT 1 NOT NULL,
    key_identifier character varying(255),
    status public.data_encryption_status_enum DEFAULT 'active'::public.data_encryption_status_enum NOT NULL,
    last_rotated_at timestamp with time zone,
    next_rotation_at timestamp with time zone,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: departments; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.departments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    manager_id uuid,
    parent_department_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: directories; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.directories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    type public.directory_type NOT NULL,
    scope public.directory_scope DEFAULT 'HQ'::public.directory_scope NOT NULL,
    organization_id uuid,
    location_id uuid,
    is_hierarchical boolean DEFAULT false NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    icon text,
    settings jsonb DEFAULT '{"prefetch": false, "offline_enabled": false, "approval_required": false, "allow_inline_create": true, "allow_local_overlay": true, "offline_max_entries": 1000}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: directory_entries; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.directory_entries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    directory_id uuid NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    normalized_name text NOT NULL,
    code text,
    external_key text,
    description text,
    translations jsonb,
    origin public.entry_origin DEFAULT 'LOCAL'::public.entry_origin NOT NULL,
    origin_source text,
    origin_date timestamp with time zone,
    status public.entry_status DEFAULT 'ACTIVE'::public.entry_status NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    deprecated_at timestamp with time zone,
    replacement_entry_id uuid,
    tags text[],
    sort_order integer DEFAULT 0 NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    search_vector tsvector,
    organization_id uuid
);`);
    await queryRunner.query(`-- Name: directory_entry_audit; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.directory_entry_audit (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    entry_id uuid NOT NULL,
    action public.directory_audit_action NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    old_values jsonb,
    new_values jsonb,
    change_reason text,
    ip_address inet,
    user_agent text
);`);
    await queryRunner.query(`-- Name: directory_fields; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.directory_fields (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    directory_id uuid NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    field_type public.field_type NOT NULL,
    ref_directory_id uuid,
    allow_free_text boolean DEFAULT false NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_unique boolean DEFAULT false NOT NULL,
    is_unique_per_org boolean DEFAULT false NOT NULL,
    show_in_list boolean DEFAULT false NOT NULL,
    show_in_card boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    default_value jsonb,
    validation_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    translations jsonb
);`);
    await queryRunner.query(`-- Name: directory_sources; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.directory_sources (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    directory_id uuid NOT NULL,
    name text NOT NULL,
    source_type public.source_type NOT NULL,
    url text,
    auth_config jsonb,
    request_config jsonb,
    column_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    unique_key_field text,
    schedule text,
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp with time zone,
    last_sync_status public.sync_status,
    last_sync_error text,
    consecutive_failures integer DEFAULT 0 NOT NULL,
    source_version text
);`);
    await queryRunner.query(`-- Name: directory_sync_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.directory_sync_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    directory_id uuid NOT NULL,
    source_id uuid NOT NULL,
    status public.sync_log_status NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    total_records integer DEFAULT 0 NOT NULL,
    created_count integer DEFAULT 0 NOT NULL,
    updated_count integer DEFAULT 0 NOT NULL,
    deprecated_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    errors jsonb,
    triggered_by uuid
);`);
    await queryRunner.query(`-- Name: dividend_payments; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.dividend_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    investor_profile_id uuid NOT NULL,
    period character varying(20) NOT NULL,
    payment_date date NOT NULL,
    amount bigint NOT NULL,
    status character varying(50) DEFAULT 'paid'::character varying NOT NULL,
    notes text
);`);
    await queryRunner.query(`-- Name: employee_documents; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.employee_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    employee_id uuid,
    document_type character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    url character varying(500) NOT NULL,
    expiry_date date,
    notes text
);`);
    await queryRunner.query(`-- Name: employees; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.employees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    user_id uuid,
    employee_number character varying NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    middle_name character varying(100),
    phone character varying(20),
    email character varying(255),
    date_of_birth date,
    gender character varying(10),
    employee_role public.employees_employee_role_enum NOT NULL,
    employment_type public.employees_employment_type_enum DEFAULT 'full_time'::public.employees_employment_type_enum NOT NULL,
    status public.employees_status_enum DEFAULT 'active'::public.employees_status_enum NOT NULL,
    telegram_user_id character varying,
    telegram_username character varying(100),
    hire_date date NOT NULL,
    termination_date date,
    termination_reason text,
    salary numeric(15,2),
    salary_frequency public.employees_salary_frequency_enum,
    bank_account character varying(100),
    tax_id character varying(100),
    department_id uuid,
    position_id uuid,
    address text,
    city character varying(100),
    district character varying(100),
    emergency_contact_name character varying(200),
    emergency_contact_phone character varying(20),
    emergency_contact_relation character varying(100),
    documents jsonb,
    notes text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: equipment_components; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.equipment_components (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    machine_id uuid,
    component_type public.equipment_components_component_type_enum NOT NULL,
    component_status public.equipment_components_component_status_enum DEFAULT 'new'::public.equipment_components_component_status_enum NOT NULL,
    name character varying(200) NOT NULL,
    serial_number character varying(100),
    manufacturer character varying(100),
    model character varying(100),
    purchase_date date,
    purchase_price numeric(12,2),
    warranty_until date,
    installed_at date,
    expected_life_hours integer,
    current_hours integer DEFAULT 0 NOT NULL,
    last_maintenance_date date,
    next_maintenance_date date,
    current_location_type public.equipment_components_current_location_type_enum DEFAULT 'warehouse'::public.equipment_components_current_location_type_enum NOT NULL,
    current_location_ref character varying(100),
    maintenance_interval_days integer,
    replacement_date date,
    replaced_by_component_id uuid,
    replaces_component_id uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: favorites; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.favorites (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    user_id uuid NOT NULL,
    type public.favorites_type_enum NOT NULL,
    product_id uuid,
    machine_id uuid,
    notes character varying(255),
    sort_order integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: fcm_tokens; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.fcm_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp with time zone,
    metadata jsonb,
    device_id character varying(200),
    token character varying(500) NOT NULL,
    device_type character varying(50),
    device_name character varying(100)
);`);
    await queryRunner.query(`-- Name: files; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    original_filename character varying(255) NOT NULL,
    stored_filename character varying(255) NOT NULL,
    file_path character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size bigint NOT NULL,
    category_code character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100) NOT NULL,
    uploaded_by_user_id uuid NOT NULL,
    description text,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    image_width integer,
    image_height integer,
    url text,
    thumbnail_url text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: fiscal_devices; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.fiscal_devices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying NOT NULL,
    provider character varying NOT NULL,
    serial_number character varying,
    terminal_id character varying,
    credentials jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.fiscal_devices_status_enum DEFAULT 'inactive'::public.fiscal_devices_status_enum NOT NULL,
    sandbox_mode boolean DEFAULT false NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_sync jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: fiscal_queue; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.fiscal_queue (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    device_id uuid NOT NULL,
    operation character varying NOT NULL,
    payload jsonb NOT NULL,
    status public.fiscal_queue_status_enum DEFAULT 'pending'::public.fiscal_queue_status_enum NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 5 NOT NULL,
    next_retry_at timestamp without time zone,
    last_error character varying,
    result jsonb,
    processed_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: fiscal_receipts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.fiscal_receipts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    device_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    external_receipt_id character varying,
    order_id character varying,
    transaction_id character varying,
    type public.fiscal_receipts_type_enum DEFAULT 'sale'::public.fiscal_receipts_type_enum NOT NULL,
    status public.fiscal_receipts_status_enum DEFAULT 'pending'::public.fiscal_receipts_status_enum NOT NULL,
    items jsonb NOT NULL,
    payment jsonb NOT NULL,
    total numeric(18,2) NOT NULL,
    vat_total numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    fiscal_number character varying,
    fiscal_sign character varying,
    qr_code_url character varying,
    receipt_url character varying,
    fiscalized_at timestamp without time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error character varying,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: fiscal_shifts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.fiscal_shifts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    device_id uuid NOT NULL,
    external_shift_id character varying,
    shift_number integer NOT NULL,
    status public.fiscal_shifts_status_enum DEFAULT 'open'::public.fiscal_shifts_status_enum NOT NULL,
    cashier_name character varying NOT NULL,
    opened_at timestamp without time zone NOT NULL,
    closed_at timestamp without time zone,
    total_sales numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    total_refunds numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    total_cash numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    total_card numeric(18,2) DEFAULT '0'::numeric NOT NULL,
    receipts_count integer DEFAULT 0 NOT NULL,
    z_report_number character varying,
    z_report_url character varying,
    vat_summary jsonb
);`);
    await queryRunner.query(`-- Name: generated_reports; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.generated_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    definition_id uuid NOT NULL,
    scheduled_report_id uuid,
    report_number character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    type public.generated_reports_type_enum NOT NULL,
    status public.generated_reports_status_enum DEFAULT 'generating'::public.generated_reports_status_enum NOT NULL,
    filters jsonb,
    period_type public.generated_reports_period_type_enum,
    date_from date,
    date_to date,
    generation_params jsonb,
    result jsonb,
    summary jsonb,
    row_count integer DEFAULT 0 NOT NULL,
    files jsonb DEFAULT '[]'::jsonb NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    generation_time_ms integer,
    error_message text,
    error_details jsonb,
    expires_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: goods_classifiers; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.goods_classifiers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    code character varying(20) NOT NULL,
    name_ru character varying(500) NOT NULL,
    name_uz character varying(500),
    name_en character varying(500),
    group_code character varying(20),
    group_name character varying(500),
    subgroup_code character varying(20),
    subgroup_name character varying(500),
    parent_code character varying(20),
    level integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: hopper_types; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.hopper_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    volume_ml integer NOT NULL,
    material character varying(100),
    compatible_machine_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: hw_imported_sales; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.hw_imported_sales (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    import_batch_id uuid NOT NULL,
    sale_date timestamp without time zone NOT NULL,
    machine_code character varying(50) NOT NULL,
    machine_id uuid,
    amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    payment_method character varying(50),
    order_number character varying(100),
    transaction_id uuid,
    product_name character varying(200),
    product_code character varying(50),
    quantity integer DEFAULT 1 NOT NULL,
    import_source public.hw_imported_sales_import_source_enum NOT NULL,
    import_filename character varying(255),
    import_row_number integer,
    is_reconciled boolean DEFAULT false NOT NULL,
    reconciliation_run_id uuid,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    imported_by_user_id uuid
);`);
    await queryRunner.query(`-- Name: ikpu_codes; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.ikpu_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    code character varying(20) NOT NULL,
    name_ru character varying(500) NOT NULL,
    name_uz character varying(500),
    mxik_code character varying(20),
    vat_rate numeric(5,2) DEFAULT '12'::numeric NOT NULL,
    is_marked boolean DEFAULT false NOT NULL,
    package_code character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: import_audit_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.import_audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    session_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    action_type public.import_audit_logs_action_type_enum NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id uuid,
    before_state jsonb,
    after_state jsonb,
    field_changes jsonb,
    row_number integer,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    executed_by_user_id uuid,
    error_message text,
    success boolean DEFAULT true NOT NULL
);`);
    await queryRunner.query(`-- Name: import_jobs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.import_jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    job_number character varying(50) NOT NULL,
    import_type public.import_jobs_import_type_enum NOT NULL,
    source public.import_jobs_source_enum NOT NULL,
    status public.import_jobs_status_enum DEFAULT 'pending'::public.import_jobs_status_enum NOT NULL,
    file_name character varying(255),
    file_url character varying(500),
    file_size bigint,
    total_rows integer DEFAULT 0 NOT NULL,
    processed_rows integer DEFAULT 0 NOT NULL,
    successful_rows integer DEFAULT 0 NOT NULL,
    failed_rows integer DEFAULT 0 NOT NULL,
    skipped_rows integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    duration_seconds integer,
    error_message text,
    error_details jsonb,
    validation_warnings jsonb,
    options jsonb,
    summary jsonb,
    created_by_user_id uuid NOT NULL,
    cancelled_by_user_id uuid
);`);
    await queryRunner.query(`-- Name: import_sessions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.import_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    domain public.import_sessions_domain_enum NOT NULL,
    status public.import_sessions_status_enum DEFAULT 'uploaded'::public.import_sessions_status_enum NOT NULL,
    import_job_id uuid,
    template_id uuid,
    file_name character varying(255) NOT NULL,
    file_size bigint NOT NULL,
    file_type character varying(20) NOT NULL,
    file_url character varying(500),
    file_metadata jsonb,
    classification_result jsonb,
    classification_confidence numeric(5,2),
    column_mapping jsonb,
    unmapped_columns jsonb,
    validation_report jsonb,
    action_plan jsonb,
    approval_status public.import_sessions_approval_status_enum DEFAULT 'pending'::public.import_sessions_approval_status_enum NOT NULL,
    approved_by_user_id uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    execution_result jsonb,
    uploaded_by_user_id uuid NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    message text
);`);
    await queryRunner.query(`-- Name: import_templates; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.import_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    import_type public.import_templates_import_type_enum NOT NULL,
    source public.import_templates_source_enum NOT NULL,
    column_mappings jsonb NOT NULL,
    default_values jsonb,
    transformations jsonb,
    validation_rules jsonb,
    options jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id uuid NOT NULL
);`);
    await queryRunner.query(`-- Name: incidents; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.incidents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    machine_id uuid NOT NULL,
    type public.incidents_type_enum DEFAULT 'other'::public.incidents_type_enum NOT NULL,
    status public.incidents_status_enum DEFAULT 'reported'::public.incidents_status_enum NOT NULL,
    priority public.incidents_priority_enum DEFAULT 'medium'::public.incidents_priority_enum NOT NULL,
    title character varying(300) NOT NULL,
    description text,
    reported_by_user_id uuid NOT NULL,
    assigned_to_user_id uuid,
    resolved_by_user_id uuid,
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    repair_cost numeric(15,2),
    insurance_claim boolean DEFAULT false NOT NULL,
    insurance_claim_number character varying(100),
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    resolution text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: ingredient_batches; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.ingredient_batches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    product_id uuid NOT NULL,
    batch_number character varying(100) NOT NULL,
    quantity numeric(12,3) NOT NULL,
    remaining_quantity numeric(12,3) NOT NULL,
    reserved_quantity numeric(12,3) DEFAULT '0'::numeric NOT NULL,
    unit_of_measure public.ingredient_batches_unit_of_measure_enum DEFAULT 'g'::public.ingredient_batches_unit_of_measure_enum NOT NULL,
    purchase_price numeric(15,2),
    total_cost numeric(15,2),
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    supplier_id character varying,
    supplier_batch_number character varying(100),
    invoice_number character varying(100),
    manufacture_date date,
    expiry_date date,
    received_date date DEFAULT ('now'::text)::date NOT NULL,
    status public.ingredient_batches_status_enum DEFAULT 'in_stock'::public.ingredient_batches_status_enum NOT NULL,
    warehouse_location_id character varying,
    storage_location character varying(50),
    is_quality_checked boolean DEFAULT false NOT NULL,
    quality_checked_by_user_id character varying,
    quality_checked_at timestamp without time zone,
    quality_notes text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: integration_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.integration_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    integration_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    method character varying(10) NOT NULL,
    endpoint character varying(500) NOT NULL,
    request_headers jsonb,
    request_body jsonb,
    response_status integer,
    response_headers jsonb,
    response_body jsonb,
    duration integer,
    success boolean DEFAULT true NOT NULL,
    error text,
    reference_id character varying(100),
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: integration_templates; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.integration_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    name character varying(100) NOT NULL,
    display_name character varying(200) NOT NULL,
    description text,
    category public.integration_templates_category_enum NOT NULL,
    logo character varying(500),
    website character varying(500),
    documentation_url character varying(1000),
    default_config jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    country character varying(10) DEFAULT 'UZ'::character varying NOT NULL,
    tags text,
    usage_count integer DEFAULT 0 NOT NULL,
    rating numeric(3,2) DEFAULT '0'::numeric NOT NULL
);`);
    await queryRunner.query(`-- Name: integration_webhooks; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.integration_webhooks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    integration_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    event character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    headers jsonb,
    processed boolean DEFAULT false NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    processing_error text,
    retry_count integer DEFAULT 0 NOT NULL,
    processed_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: integrations; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.integrations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(200) NOT NULL,
    description text,
    category public.integrations_category_enum DEFAULT 'payment'::public.integrations_category_enum NOT NULL,
    status public.integrations_status_enum DEFAULT 'draft'::public.integrations_status_enum NOT NULL,
    logo character varying(500),
    website character varying(500),
    documentation_url character varying(1000),
    config jsonb NOT NULL,
    credentials jsonb,
    sandbox_credentials jsonb,
    sandbox_mode boolean DEFAULT true NOT NULL,
    is_template boolean DEFAULT false NOT NULL,
    template_id character varying(100),
    priority integer DEFAULT 0 NOT NULL,
    metadata jsonb,
    ai_config_session jsonb,
    last_error text,
    last_tested_at timestamp without time zone,
    last_used_at timestamp without time zone,
    success_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: inventory_adjustments; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.inventory_adjustments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    adjustment_number character varying(50) NOT NULL,
    inventory_level character varying(20) NOT NULL,
    reference_id uuid NOT NULL,
    product_id uuid NOT NULL,
    adjustment_type public.inventory_adjustments_adjustment_type_enum NOT NULL,
    system_quantity numeric(10,3) NOT NULL,
    actual_quantity numeric(10,3) NOT NULL,
    difference numeric(10,3) NOT NULL,
    reason text,
    notes text,
    adjusted_by_user_id uuid NOT NULL,
    approved_by_user_id uuid,
    approved_at timestamp with time zone,
    is_approved boolean DEFAULT false NOT NULL,
    movement_id uuid
);`);
    await queryRunner.query(`-- Name: inventory_batches; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.inventory_batches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    product_id uuid NOT NULL,
    batch_number character varying(100) NOT NULL,
    quantity numeric(12,3) NOT NULL,
    remaining_quantity numeric(12,3) NOT NULL,
    unit_of_measure character varying(20) DEFAULT 'pcs'::character varying NOT NULL,
    cost_per_unit numeric(15,2),
    expiry_date date,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: inventory_count_items; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.inventory_count_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    count_id uuid NOT NULL,
    product_id uuid NOT NULL,
    system_quantity numeric(10,3) NOT NULL,
    counted_quantity numeric(10,3),
    difference numeric(10,3),
    notes text,
    counted_by_user_id uuid,
    counted_at timestamp with time zone,
    is_verified boolean DEFAULT false NOT NULL
);`);
    await queryRunner.query(`-- Name: inventory_counts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.inventory_counts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    count_number character varying(50) NOT NULL,
    inventory_level character varying(20) NOT NULL,
    reference_id uuid NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    started_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    started_by_user_id uuid NOT NULL,
    completed_by_user_id uuid,
    notes text,
    total_items_counted integer DEFAULT 0 NOT NULL,
    total_differences integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: inventory_difference_thresholds; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.inventory_difference_thresholds (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    threshold_type public.inventory_difference_thresholds_threshold_type_enum NOT NULL,
    reference_id uuid,
    name character varying(200) NOT NULL,
    threshold_abs numeric(15,3),
    threshold_rel numeric(5,2),
    severity_level public.inventory_difference_thresholds_severity_level_enum DEFAULT 'WARNING'::public.inventory_difference_thresholds_severity_level_enum NOT NULL,
    create_incident boolean DEFAULT false NOT NULL,
    create_task boolean DEFAULT false NOT NULL,
    notify_users jsonb,
    notify_roles jsonb,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    description text
);`);
    await queryRunner.query(`-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.inventory_movements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    movement_type public.inventory_movements_movement_type_enum NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,3) NOT NULL,
    performed_by_user_id uuid,
    operator_id uuid,
    machine_id uuid,
    task_id uuid,
    operation_date timestamp with time zone,
    notes text,
    metadata jsonb,
    unit_cost numeric(12,2),
    total_cost numeric(12,2),
    source_ref character varying(100),
    destination_ref character varying(100)
);`);
    await queryRunner.query(`-- Name: inventory_report_presets; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.inventory_report_presets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    user_id uuid NOT NULL,
    filters jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_shared boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: inventory_reservations; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.inventory_reservations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    reservation_number character varying(50) NOT NULL,
    task_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity_reserved numeric(10,3) NOT NULL,
    quantity_fulfilled numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    status public.inventory_reservations_status_enum DEFAULT 'pending'::public.inventory_reservations_status_enum NOT NULL,
    inventory_level character varying(20) NOT NULL,
    reference_id uuid NOT NULL,
    reserved_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    fulfilled_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    notes text,
    created_by_user_id uuid
);`);
    await queryRunner.query(`-- Name: investor_profiles; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.investor_profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    share_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total_invested bigint DEFAULT '0'::bigint NOT NULL,
    payback_months integer,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    notes text
);`);
    await queryRunner.query(`-- Name: invoices; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    invoice_number character varying(50) NOT NULL,
    customer_id uuid,
    customer_name character varying(255),
    issue_date date NOT NULL,
    due_date date NOT NULL,
    status public.invoices_status_enum DEFAULT 'draft'::public.invoices_status_enum NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    tax_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    paid_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    line_items jsonb NOT NULL,
    notes text,
    paid_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.leave_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    leave_type public.leave_requests_leave_type_enum NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_days numeric(5,1) NOT NULL,
    reason text,
    status public.leave_requests_status_enum DEFAULT 'pending'::public.leave_requests_status_enum NOT NULL,
    approved_by_id uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: location_contract_payments; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.location_contract_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    contract_id uuid NOT NULL,
    location_id character varying NOT NULL,
    organization_id character varying NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    base_amount numeric(15,2) NOT NULL,
    revenue_share_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    utilities_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    penalty_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    paid_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    currency character varying(10) DEFAULT 'UZS'::character varying NOT NULL,
    due_date date NOT NULL,
    paid_date date,
    status public.location_contract_payments_status_enum DEFAULT 'pending'::public.location_contract_payments_status_enum NOT NULL,
    payment_method character varying(50),
    payment_reference character varying(100),
    notes text,
    documents jsonb DEFAULT '[]'::jsonb NOT NULL,
    paid_by uuid
);`);
    await queryRunner.query(`-- Name: location_contracts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.location_contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    location_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    contract_number character varying(100) NOT NULL,
    title character varying(255),
    type public.location_contracts_type_enum DEFAULT 'rent'::public.location_contracts_type_enum NOT NULL,
    status public.location_contracts_status_enum DEFAULT 'draft'::public.location_contracts_status_enum NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    signed_date date,
    terminated_date date,
    auto_renewal boolean DEFAULT false NOT NULL,
    renewal_period_months integer DEFAULT 12 NOT NULL,
    notice_before_expiry_days integer DEFAULT 30 NOT NULL,
    financials jsonb NOT NULL,
    payment_frequency public.location_contracts_payment_frequency_enum DEFAULT 'monthly'::public.location_contracts_payment_frequency_enum NOT NULL,
    payment_due_day integer DEFAULT 5 NOT NULL,
    monthly_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    revenue_share_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    deposit_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    currency character varying(10) DEFAULT 'UZS'::character varying NOT NULL,
    company_name character varying(255),
    company_representative character varying(255),
    landlord_name character varying(255) NOT NULL,
    landlord_inn character varying(20),
    landlord_representative character varying(255),
    landlord_phone character varying(50),
    landlord_email character varying(255),
    landlord_address text,
    special_conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    allowed_machine_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    max_machines integer,
    restricted_products jsonb DEFAULT '[]'::jsonb NOT NULL,
    documents jsonb DEFAULT '[]'::jsonb NOT NULL,
    contract_file_url text,
    total_paid numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_due numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    last_payment_date date,
    next_payment_date date,
    notes text,
    termination_reason text,
    approved_by uuid,
    approved_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: location_events; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.location_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    location_id uuid NOT NULL,
    organization_id character varying NOT NULL,
    event_type public.location_events_event_type_enum NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    related_entity_id uuid,
    related_entity_type character varying(50),
    changes jsonb,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    user_id uuid,
    user_name character varying(255)
);`);
    await queryRunner.query(`-- Name: location_notes; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.location_notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    location_id uuid NOT NULL,
    organization_id character varying NOT NULL,
    content text NOT NULL,
    note_type public.location_notes_note_type_enum DEFAULT 'general'::public.location_notes_note_type_enum NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    is_private boolean DEFAULT false NOT NULL,
    reminder_at timestamp without time zone,
    reminder_sent boolean DEFAULT false NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by_name character varying(255)
);`);
    await queryRunner.query(`-- Name: location_visits; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.location_visits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    location_id uuid NOT NULL,
    organization_id character varying NOT NULL,
    user_id character varying NOT NULL,
    user_name character varying(255),
    visit_date date NOT NULL,
    check_in_time time without time zone,
    check_out_time time without time zone,
    duration_minutes integer,
    visit_type public.location_visits_visit_type_enum DEFAULT 'routine'::public.location_visits_visit_type_enum NOT NULL,
    check_in_latitude numeric(10,8),
    check_in_longitude numeric(11,8),
    check_out_latitude numeric(10,8),
    check_out_longitude numeric(11,8),
    notes text,
    tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    status public.location_visits_status_enum DEFAULT 'scheduled'::public.location_visits_status_enum NOT NULL
);`);
    await queryRunner.query(`-- Name: location_zones; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.location_zones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    location_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    type public.location_zones_type_enum DEFAULT 'other'::public.location_zones_type_enum NOT NULL,
    description text,
    floor character varying,
    section character varying,
    spot character varying,
    internal_x numeric(10,8),
    internal_y numeric(10,8),
    characteristics jsonb DEFAULT '{}'::jsonb NOT NULL,
    available_width numeric(5,2),
    available_depth numeric(5,2),
    available_height numeric(5,2),
    monthly_rent numeric(15,2),
    machine_id uuid,
    is_occupied boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_premium boolean DEFAULT false NOT NULL,
    is_reserved boolean DEFAULT false NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: locations; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.locations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    type public.locations_type_enum DEFAULT 'other'::public.locations_type_enum NOT NULL,
    status public.locations_status_enum DEFAULT 'prospecting'::public.locations_status_enum NOT NULL,
    address jsonb NOT NULL,
    city character varying(100) NOT NULL,
    region character varying(100),
    postal_code character varying(20),
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    coordinates jsonb,
    contacts jsonb DEFAULT '[]'::jsonb NOT NULL,
    primary_contact_name character varying(255),
    primary_contact_phone character varying(50),
    primary_contact_email character varying(255),
    working_hours jsonb,
    is24_hours boolean DEFAULT false NOT NULL,
    holidays jsonb DEFAULT '[]'::jsonb NOT NULL,
    timezone character varying(50) DEFAULT 'Asia/Tashkent'::character varying NOT NULL,
    characteristics jsonb DEFAULT '{}'::jsonb NOT NULL,
    contract_type public.locations_contract_type_enum DEFAULT 'rent'::public.locations_contract_type_enum NOT NULL,
    monthly_rent numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    revenue_share_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    currency character varying(10) DEFAULT 'UZS'::character varying NOT NULL,
    active_contract_id uuid,
    stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    machine_count integer DEFAULT 0 NOT NULL,
    total_revenue numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_transactions integer DEFAULT 0 NOT NULL,
    rating numeric(3,2),
    rating_count integer DEFAULT 0 NOT NULL,
    priority_score integer DEFAULT 5 NOT NULL,
    potential_score integer,
    risk_score integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags text,
    is_active boolean DEFAULT true NOT NULL,
    is_vip boolean DEFAULT false NOT NULL,
    requires_approval boolean DEFAULT false NOT NULL,
    has_exclusivity boolean DEFAULT false NOT NULL,
    organization_id uuid NOT NULL,
    manager_id uuid,
    sales_rep_id uuid,
    activated_at timestamp without time zone,
    last_visit_at timestamp without time zone,
    next_visit_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.login_attempts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    email character varying NOT NULL,
    ip_address character varying NOT NULL,
    user_agent character varying,
    success boolean NOT NULL,
    failure_reason character varying,
    user_id character varying
);`);
    await queryRunner.query(`-- Name: loyalty_promo_code_usages; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.loyalty_promo_code_usages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    promo_code_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    points_awarded integer DEFAULT 0 NOT NULL,
    discount_applied numeric(12,2) DEFAULT '0'::numeric NOT NULL
);`);
    await queryRunner.query(`-- Name: loyalty_promo_codes; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.loyalty_promo_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type public.loyalty_promo_codes_type_enum NOT NULL,
    value numeric(12,2) NOT NULL,
    max_usage_total integer,
    max_usage_per_user integer DEFAULT 1 NOT NULL,
    current_usage integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    minimum_order_amount numeric(12,2)
);`);
    await queryRunner.query(`-- Name: machine_access; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.machine_access (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    machine_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.machine_access_role_enum DEFAULT 'view'::public.machine_access_role_enum NOT NULL,
    granted_by_user_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: machine_components; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.machine_components (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    machine_id uuid,
    component_type public.machine_components_component_type_enum NOT NULL,
    name character varying(200) NOT NULL,
    serial_number character varying(100),
    manufacturer character varying(100),
    model character varying(100),
    status public.machine_components_status_enum DEFAULT 'installed'::public.machine_components_status_enum NOT NULL,
    purchase_date date,
    purchase_price numeric(12,2),
    installed_at date,
    installed_by_user_id character varying,
    warranty_until date,
    expected_life_hours integer,
    current_hours integer DEFAULT 0 NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: machine_error_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.machine_error_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    machine_id uuid NOT NULL,
    error_code character varying(50) NOT NULL,
    message text NOT NULL,
    severity public.machine_error_logs_severity_enum DEFAULT 'error'::public.machine_error_logs_severity_enum NOT NULL,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL,
    resolved_at timestamp without time zone,
    resolved_by_user_id character varying,
    resolution text,
    task_id character varying,
    context jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: machine_inventory; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.machine_inventory (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    machine_id uuid NOT NULL,
    product_id uuid NOT NULL,
    current_quantity numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    min_stock_level numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    max_capacity numeric(10,3),
    last_refilled_at timestamp with time zone,
    last_refill_task_id uuid,
    slot_number character varying(50),
    selling_price numeric(12,2),
    last_sale_at timestamp with time zone,
    total_sold integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: machine_location_history; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.machine_location_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    machine_id uuid NOT NULL,
    from_location_id character varying,
    to_location_id character varying NOT NULL,
    moved_at timestamp without time zone DEFAULT now() NOT NULL,
    moved_by_user_id character varying NOT NULL,
    reason public.machine_location_history_reason_enum DEFAULT 'relocation'::public.machine_location_history_reason_enum NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: machine_location_syncs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.machine_location_syncs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    vhm24_machine_id character varying(100) NOT NULL,
    vhm24_machine_number character varying(50),
    vhm24_machine_name character varying(200),
    vhm24_location_id character varying(100),
    vhm24_location_name character varying(200),
    vhm24_address text,
    vhm24_latitude numeric(10,7),
    vhm24_longitude numeric(10,7),
    location_id uuid,
    sync_status public.machine_location_syncs_sync_status_enum DEFAULT 'active'::public.machine_location_syncs_sync_status_enum NOT NULL,
    auto_create_geofence boolean DEFAULT true NOT NULL,
    default_geofence_radius_m integer DEFAULT 50 NOT NULL,
    last_synced_at timestamp with time zone,
    last_sync_error text
);`);
    await queryRunner.query(`-- Name: machine_maintenance_schedules; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.machine_maintenance_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    machine_id uuid NOT NULL,
    maintenance_type public.machine_maintenance_schedules_maintenance_type_enum NOT NULL,
    status public.machine_maintenance_schedules_status_enum DEFAULT 'scheduled'::public.machine_maintenance_schedules_status_enum NOT NULL,
    scheduled_date date NOT NULL,
    completed_date date,
    assigned_to_user_id character varying,
    completed_by_user_id character varying,
    task_id character varying,
    description text,
    notes text,
    estimated_duration_minutes integer,
    actual_duration_minutes integer,
    estimated_cost numeric(12,2),
    actual_cost numeric(12,2),
    repeat_interval_days integer,
    next_schedule_id character varying,
    checklist jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: machine_slots; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.machine_slots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    machine_id uuid NOT NULL,
    slot_number character varying(20) NOT NULL,
    product_id character varying,
    capacity integer DEFAULT 0 NOT NULL,
    current_quantity integer DEFAULT 0 NOT NULL,
    price numeric(12,2),
    cost_price numeric(12,2),
    is_active boolean DEFAULT true NOT NULL,
    min_quantity integer DEFAULT 0 NOT NULL,
    last_refilled_at timestamp without time zone,
    total_sold integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: machines; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.machines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    machine_number character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    serial_number character varying(100),
    type public.machines_type_enum DEFAULT 'coffee'::public.machines_type_enum NOT NULL,
    status public.machines_status_enum DEFAULT 'active'::public.machines_status_enum NOT NULL,
    connection_status public.machines_connection_status_enum DEFAULT 'unknown'::public.machines_connection_status_enum NOT NULL,
    manufacturer character varying(100),
    model character varying(100),
    year_of_manufacture integer,
    firmware_version character varying(100),
    qr_code character varying(100),
    qr_code_url text,
    location_id character varying,
    latitude numeric(10,8),
    longitude numeric(11,8),
    address text,
    installation_date date,
    last_maintenance_date date,
    next_maintenance_date date,
    last_ping_at timestamp without time zone,
    last_refill_date timestamp without time zone,
    last_collection_date timestamp without time zone,
    last_sync_at timestamp without time zone,
    max_product_slots integer DEFAULT 0 NOT NULL,
    current_product_count integer DEFAULT 0 NOT NULL,
    low_stock_threshold_percent integer DEFAULT 10 NOT NULL,
    cash_capacity numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    current_cash_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    accepts_cash boolean DEFAULT true NOT NULL,
    accepts_card boolean DEFAULT false NOT NULL,
    accepts_qr boolean DEFAULT false NOT NULL,
    accepts_nfc boolean DEFAULT false NOT NULL,
    assigned_operator_id character varying,
    total_sales_count integer DEFAULT 0 NOT NULL,
    total_revenue numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    purchase_price numeric(15,2),
    purchase_date date,
    depreciation_years integer,
    depreciation_method public.machines_depreciation_method_enum DEFAULT 'linear'::public.machines_depreciation_method_enum NOT NULL,
    accumulated_depreciation numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    last_depreciation_date date,
    is_disposed boolean DEFAULT false NOT NULL,
    disposal_date date,
    disposal_reason public.machines_disposal_reason_enum,
    disposal_notes text,
    disposal_transaction_id character varying,
    telemetry jsonb DEFAULT '{}'::jsonb NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    description text,
    image text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    contract_id character varying
);`);
    await queryRunner.query(`-- Name: maintenance_parts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.maintenance_parts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    maintenance_request_id uuid NOT NULL,
    product_id uuid NOT NULL,
    part_name character varying(255) NOT NULL,
    part_number character varying(100),
    quantity_needed numeric(10,3) NOT NULL,
    quantity_used numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_price numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    serial_number character varying(100),
    old_serial_number character varying(100),
    warranty_until date,
    notes text
);`);
    await queryRunner.query(`-- Name: maintenance_requests; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.maintenance_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    request_number character varying(50) NOT NULL,
    maintenance_type public.maintenance_requests_maintenance_type_enum NOT NULL,
    status public.maintenance_requests_status_enum DEFAULT 'draft'::public.maintenance_requests_status_enum NOT NULL,
    priority public.maintenance_requests_priority_enum DEFAULT 'normal'::public.maintenance_requests_priority_enum NOT NULL,
    machine_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    symptoms jsonb,
    error_codes jsonb,
    assigned_technician_id uuid,
    created_by_user_id uuid NOT NULL,
    scheduled_date timestamp with time zone,
    estimated_duration integer,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    actual_duration integer,
    approved_by_user_id uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    verified_by_user_id uuid,
    verified_at timestamp with time zone,
    estimated_cost numeric(15,2),
    labor_cost numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    parts_cost numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_cost numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    completion_notes text,
    root_cause text,
    actions_taken jsonb,
    recommendations text,
    has_photos_before boolean DEFAULT false NOT NULL,
    has_photos_after boolean DEFAULT false NOT NULL,
    photos jsonb,
    sla_due_date timestamp with time zone,
    sla_breached boolean DEFAULT false NOT NULL,
    downtime_start timestamp with time zone,
    downtime_end timestamp with time zone,
    downtime_minutes integer,
    related_task_id uuid,
    is_scheduled boolean DEFAULT false NOT NULL,
    maintenance_schedule_id uuid,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: maintenance_schedules; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.maintenance_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    maintenance_type public.maintenance_schedules_maintenance_type_enum NOT NULL,
    machine_id uuid,
    machine_model character varying(100),
    frequency_type character varying(50) NOT NULL,
    frequency_value integer NOT NULL,
    days_of_week jsonb,
    day_of_month integer,
    last_executed_date date,
    next_due_date date,
    times_executed integer DEFAULT 0 NOT NULL,
    checklist_template jsonb,
    estimated_duration integer,
    estimated_cost numeric(15,2),
    notify_days_before integer DEFAULT 7 NOT NULL,
    auto_create_request boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id uuid NOT NULL
);`);
    await queryRunner.query(`-- Name: maintenance_work_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.maintenance_work_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    maintenance_request_id uuid NOT NULL,
    technician_id uuid NOT NULL,
    work_type public.maintenance_work_logs_work_type_enum NOT NULL,
    work_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    duration_minutes integer NOT NULL,
    hourly_rate numeric(15,2),
    labor_cost numeric(15,2),
    description text NOT NULL,
    notes text,
    is_billable boolean DEFAULT true NOT NULL
);`);
    await queryRunner.query(`-- Name: material_request_history; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.material_request_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    request_id uuid NOT NULL,
    user_id character varying NOT NULL,
    from_status public.material_request_history_from_status_enum NOT NULL,
    to_status public.material_request_history_to_status_enum NOT NULL,
    comment text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: material_request_items; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.material_request_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    request_id uuid NOT NULL,
    product_id character varying NOT NULL,
    product_name character varying(255) NOT NULL,
    product_sku character varying(100),
    quantity integer NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    delivered_quantity integer DEFAULT 0 NOT NULL,
    notes text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: material_requests; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.material_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    request_number character varying NOT NULL,
    requester_id uuid NOT NULL,
    status public.material_requests_status_enum DEFAULT 'draft'::public.material_requests_status_enum NOT NULL,
    priority public.material_requests_priority_enum DEFAULT 'normal'::public.material_requests_priority_enum NOT NULL,
    supplier_id character varying,
    notes text,
    total_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    paid_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    approved_by uuid,
    approved_at timestamp without time zone,
    rejection_reason text,
    rejected_by character varying,
    rejected_at timestamp without time zone,
    submitted_at timestamp without time zone,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    completed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    cancellation_reason text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: materials; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.materials (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    category public.materials_category_enum DEFAULT 'other'::public.materials_category_enum NOT NULL,
    unit character varying(50) DEFAULT 'шт'::character varying NOT NULL,
    sku character varying(100),
    description text,
    unit_price numeric(15,2),
    min_order_quantity integer DEFAULT 1 NOT NULL,
    supplier_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    image_url character varying(500),
    sort_order integer DEFAULT 0 NOT NULL,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: notification_campaigns; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.notification_campaigns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    template_id uuid,
    content jsonb NOT NULL,
    variables jsonb,
    channels public.notification_campaigns_channels_enum[] NOT NULL,
    audience_type public.notification_campaigns_audience_type_enum DEFAULT 'all'::public.notification_campaigns_audience_type_enum NOT NULL,
    roles text,
    user_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    filter jsonb,
    estimated_recipients integer DEFAULT 0 NOT NULL,
    scheduled_at timestamp without time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    status public.notification_campaigns_status_enum DEFAULT 'draft'::public.notification_campaigns_status_enum NOT NULL,
    total_sent integer DEFAULT 0 NOT NULL,
    total_delivered integer DEFAULT 0 NOT NULL,
    total_read integer DEFAULT 0 NOT NULL,
    total_failed integer DEFAULT 0 NOT NULL,
    delivery_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    read_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL
);`);
    await queryRunner.query(`-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.notification_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    notification_id uuid NOT NULL,
    queue_id uuid,
    channel public.notification_logs_channel_enum NOT NULL,
    status public.notification_logs_status_enum NOT NULL,
    user_id uuid,
    recipient character varying(255),
    external_id text,
    error_message text,
    error_code character varying(50),
    provider_response jsonb,
    duration_ms integer
);`);
    await queryRunner.query(`-- Name: notification_queue; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.notification_queue (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    notification_id uuid NOT NULL,
    channel public.notification_queue_channel_enum NOT NULL,
    status public.notification_queue_status_enum DEFAULT 'queued'::public.notification_queue_status_enum NOT NULL,
    user_id uuid,
    recipient jsonb NOT NULL,
    content jsonb NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    processed_at timestamp without time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    next_retry_at timestamp without time zone,
    last_error text,
    external_id text,
    response jsonb
);`);
    await queryRunner.query(`-- Name: notification_rules; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.notification_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    event_category public.notification_rules_event_category_enum NOT NULL,
    event_type character varying(100) NOT NULL,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    all_conditions_must_match boolean DEFAULT false NOT NULL,
    template_id uuid,
    notification_type public.notification_rules_notification_type_enum NOT NULL,
    channels public.notification_rules_channels_enum[] NOT NULL,
    priority public.notification_rules_priority_enum DEFAULT 'normal'::public.notification_rules_priority_enum NOT NULL,
    recipient_type public.notification_rules_recipient_type_enum DEFAULT 'assignee'::public.notification_rules_recipient_type_enum NOT NULL,
    specific_user_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    roles text,
    delay_minutes integer DEFAULT 0 NOT NULL,
    group_similar boolean DEFAULT false NOT NULL,
    group_window_minutes integer DEFAULT 0 NOT NULL,
    cooldown_minutes integer,
    schedule jsonb,
    trigger_count integer DEFAULT 0 NOT NULL,
    last_triggered_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.notification_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    type public.notification_templates_type_enum NOT NULL,
    title_ru character varying(255) NOT NULL,
    body_ru text NOT NULL,
    short_body_ru text,
    html_body_ru text,
    title_uz character varying(255),
    body_uz text,
    short_body_uz text,
    title_en character varying(255),
    body_en text,
    default_channels public.notification_templates_default_channels_enum[] DEFAULT '{in_app}'::public.notification_templates_default_channels_enum[] NOT NULL,
    default_priority public.notification_templates_default_priority_enum DEFAULT 'normal'::public.notification_templates_default_priority_enum NOT NULL,
    available_variables jsonb DEFAULT '[]'::jsonb NOT NULL,
    action_url text,
    action_text_ru character varying(100),
    action_text_uz character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: notifications; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    notification_id character varying(50) NOT NULL,
    type public.notifications_type_enum DEFAULT 'system'::public.notifications_type_enum NOT NULL,
    priority public.notifications_priority_enum DEFAULT 'normal'::public.notifications_priority_enum NOT NULL,
    status public.notifications_status_enum DEFAULT 'pending'::public.notifications_status_enum NOT NULL,
    content jsonb NOT NULL,
    user_id uuid,
    recipient jsonb,
    is_broadcast boolean DEFAULT false NOT NULL,
    channels public.notifications_channels_enum[] DEFAULT '{in_app}'::public.notifications_channels_enum[] NOT NULL,
    delivery_status jsonb DEFAULT '[]'::jsonb NOT NULL,
    schedule jsonb,
    scheduled_at timestamp without time zone,
    expires_at timestamp without time zone,
    event_category public.notifications_event_category_enum,
    related_entity_id uuid,
    related_entity_type character varying(50),
    template_id uuid,
    variables jsonb,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags text,
    retry_count integer DEFAULT 0 NOT NULL,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    read_at timestamp without time zone,
    failed_at timestamp without time zone,
    error_message text,
    organization_id uuid NOT NULL
);`);
    await queryRunner.query(`-- Name: operator_inventory; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.operator_inventory (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    product_id uuid NOT NULL,
    current_quantity numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    reserved_quantity numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    last_received_at timestamp with time zone,
    last_task_id uuid
);`);
    await queryRunner.query(`-- Name: operator_ratings; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.operator_ratings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    tasks_assigned integer DEFAULT 0 NOT NULL,
    tasks_completed integer DEFAULT 0 NOT NULL,
    tasks_on_time integer DEFAULT 0 NOT NULL,
    tasks_late integer DEFAULT 0 NOT NULL,
    avg_completion_time_hours numeric(8,2) DEFAULT '0'::numeric NOT NULL,
    task_completion_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    task_on_time_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    timeliness_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    task_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    tasks_with_photos_before integer DEFAULT 0 NOT NULL,
    tasks_with_photos_after integer DEFAULT 0 NOT NULL,
    total_photos_uploaded integer DEFAULT 0 NOT NULL,
    photo_compliance_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    photo_quality_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    machine_cleanliness_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    stock_accuracy_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    quality_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    cash_collection_accuracy numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    inventory_loss_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    collections_with_variance integer DEFAULT 0 NOT NULL,
    avg_collection_variance_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    inventory_discrepancies integer DEFAULT 0 NOT NULL,
    financial_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    scheduled_shifts integer DEFAULT 0 NOT NULL,
    completed_shifts integer DEFAULT 0 NOT NULL,
    late_arrivals integer DEFAULT 0 NOT NULL,
    attendance_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    attendance_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    complaints_received integer DEFAULT 0 NOT NULL,
    complaints_resolved integer DEFAULT 0 NOT NULL,
    average_response_time integer DEFAULT 0 NOT NULL,
    avg_customer_rating numeric(3,2) DEFAULT '0'::numeric NOT NULL,
    positive_feedback_count integer DEFAULT 0 NOT NULL,
    customer_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    checklist_items_completed integer DEFAULT 0 NOT NULL,
    checklist_items_total integer DEFAULT 0 NOT NULL,
    checklist_completion_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    comments_sent integer DEFAULT 0 NOT NULL,
    discipline_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total_score numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    grade character varying(2),
    rank integer,
    notes text,
    notification_sent_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: order_items; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.order_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name character varying(255) NOT NULL,
    product_sku character varying(100),
    quantity integer NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    customizations jsonb,
    notes text
);`);
    await queryRunner.query(`-- Name: orders; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    order_number character varying NOT NULL,
    user_id uuid NOT NULL,
    machine_id uuid,
    status public.orders_status_enum DEFAULT 'pending'::public.orders_status_enum NOT NULL,
    payment_status public.orders_payment_status_enum DEFAULT 'pending'::public.orders_payment_status_enum NOT NULL,
    payment_method public.orders_payment_method_enum,
    subtotal_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    bonus_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    points_earned integer DEFAULT 0 NOT NULL,
    points_used integer DEFAULT 0 NOT NULL,
    promo_code character varying(50),
    promo_discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    cancellation_reason text,
    confirmed_at timestamp without time zone,
    prepared_at timestamp without time zone,
    completed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    paid_at timestamp without time zone,
    refunded_at timestamp without time zone,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: organization_audit_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.organization_audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    user_id character varying,
    action public.organization_audit_logs_action_enum NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying,
    description text,
    old_values jsonb,
    new_values jsonb,
    context jsonb
);`);
    await queryRunner.query(`-- Name: organization_contracts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.organization_contracts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    counterparty_id character varying,
    contract_number character varying(50) NOT NULL,
    contract_type public.organization_contracts_contract_type_enum NOT NULL,
    status public.organization_contracts_status_enum DEFAULT 'draft'::public.organization_contracts_status_enum NOT NULL,
    subject character varying(500),
    start_date date NOT NULL,
    end_date date,
    signed_date date,
    auto_renew boolean DEFAULT false NOT NULL,
    renewal_period_months integer,
    commission_type public.organization_contracts_commission_type_enum,
    commission_rate numeric(5,2),
    fixed_amount numeric(15,2),
    commission_tiers jsonb,
    minimum_monthly_fee numeric(15,2),
    franchise_fee numeric(15,2),
    deposit numeric(15,2),
    payment_term_days integer DEFAULT 30 NOT NULL,
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    territory jsonb,
    documents jsonb DEFAULT '[]'::jsonb NOT NULL,
    terms_and_conditions text,
    contacts jsonb,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: organization_invitations; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.organization_invitations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    role character varying(50) NOT NULL,
    token character varying(100) NOT NULL,
    status public.organization_invitations_status_enum DEFAULT 'pending'::public.organization_invitations_status_enum NOT NULL,
    message text,
    expires_at timestamp without time zone NOT NULL,
    accepted_at timestamp without time zone,
    accepted_by_user_id character varying,
    invited_by_user_id character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: organizations; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.organizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    name character varying(200) NOT NULL,
    name_uz character varying(200),
    slug character varying(100) NOT NULL,
    logo text,
    description text,
    type public.organizations_type_enum DEFAULT 'operator'::public.organizations_type_enum NOT NULL,
    status public.organizations_status_enum DEFAULT 'pending'::public.organizations_status_enum NOT NULL,
    parent_id uuid,
    hierarchy_level integer DEFAULT 0 NOT NULL,
    hierarchy_path text,
    email character varying(255),
    phone character varying(20),
    phone_secondary character varying(20),
    address text,
    city character varying(100),
    region character varying(100),
    postal_code character varying(20),
    latitude numeric(10,8),
    longitude numeric(11,8),
    inn character varying(20),
    pinfl character varying(20),
    mfo character varying(20),
    bank_account character varying(50),
    bank_name character varying(200),
    okonx character varying(20),
    director_name character varying(100),
    accountant_name character varying(100),
    fiscal_settings jsonb,
    subscription_tier public.organizations_subscription_tier_enum DEFAULT 'free'::public.organizations_subscription_tier_enum NOT NULL,
    subscription_start_date timestamp without time zone,
    subscription_expires_at timestamp without time zone,
    is_trial_used boolean DEFAULT false NOT NULL,
    limits jsonb DEFAULT '{}'::jsonb NOT NULL,
    usage jsonb DEFAULT '{}'::jsonb NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    commission_settings jsonb,
    api_keys jsonb DEFAULT '[]'::jsonb NOT NULL,
    webhooks jsonb DEFAULT '[]'::jsonb NOT NULL,
    integrations jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    verified_at timestamp without time zone,
    verified_by_user_id character varying
);`);
    await queryRunner.query(`-- Name: package_types; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.package_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    code character varying(50) NOT NULL,
    name_ru character varying(255) NOT NULL,
    name_uz character varying(255),
    name_en character varying(255),
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    user_id uuid NOT NULL,
    token character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    ip_address character varying NOT NULL,
    user_agent character varying
);`);
    await queryRunner.query(`-- Name: payment_providers; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.payment_providers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    name_ru character varying(255),
    name_uz character varying(255),
    type public.payment_providers_type_enum NOT NULL,
    logo_url text,
    website_url text,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    commission_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    settings jsonb,
    supported_currencies jsonb,
    sort_order integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: payment_refunds; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.payment_refunds (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    payment_transaction_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    reason public.payment_refunds_reason_enum NOT NULL,
    reason_note text,
    status public.payment_refunds_status_enum DEFAULT 'pending'::public.payment_refunds_status_enum NOT NULL,
    provider_refund_id character varying(255),
    processed_at timestamp with time zone,
    processed_by_user_id uuid
);`);
    await queryRunner.query(`-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.payment_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    provider public.payment_transactions_provider_enum NOT NULL,
    provider_tx_id character varying(255),
    amount numeric(12,2) NOT NULL,
    currency character varying(10) DEFAULT 'UZS'::character varying NOT NULL,
    status public.payment_transactions_status_enum DEFAULT 'pending'::public.payment_transactions_status_enum NOT NULL,
    order_id uuid,
    machine_id uuid,
    client_user_id uuid,
    raw_request jsonb,
    raw_response jsonb,
    error_message text,
    processed_at timestamp with time zone,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: payrolls; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.payrolls (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    base_salary numeric(15,2) NOT NULL,
    overtime_pay numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    bonuses numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    allowances numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    deductions numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    tax_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    net_salary numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'UZS'::character varying NOT NULL,
    status public.payrolls_status_enum DEFAULT 'draft'::public.payrolls_status_enum NOT NULL,
    calculated_at timestamp with time zone,
    approved_by_id uuid,
    approved_at timestamp with time zone,
    paid_at timestamp with time zone,
    payment_reference character varying(100),
    working_days integer NOT NULL,
    worked_days integer NOT NULL,
    absent_days integer DEFAULT 0 NOT NULL,
    overtime_hours numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    details jsonb,
    note text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: performance_reviews; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.performance_reviews (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    review_period public.performance_reviews_review_period_enum NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status public.performance_reviews_status_enum DEFAULT 'scheduled'::public.performance_reviews_status_enum NOT NULL,
    overall_rating numeric(3,1),
    ratings jsonb,
    strengths text,
    areas_for_improvement text,
    goals text,
    employee_comments text,
    reviewer_comments text,
    completed_at timestamp with time zone,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: permissions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    name character varying(100) NOT NULL,
    resource character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    description character varying(255),
    is_active boolean DEFAULT true NOT NULL
);`);
    await queryRunner.query(`-- Name: points_transactions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.points_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type public.points_transactions_type_enum NOT NULL,
    amount integer NOT NULL,
    balance_after integer NOT NULL,
    source public.points_transactions_source_enum NOT NULL,
    reference_id character varying,
    reference_type character varying(50),
    description character varying(255),
    description_uz character varying(255),
    metadata jsonb,
    expires_at timestamp without time zone,
    is_expired boolean DEFAULT false NOT NULL,
    remaining_amount integer,
    admin_id character varying,
    admin_reason text
);`);
    await queryRunner.query(`-- Name: positions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.positions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    title character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    department_id uuid,
    level public.positions_level_enum NOT NULL,
    min_salary numeric(15,2),
    max_salary numeric(15,2),
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: product_price_history; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.product_price_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    product_id uuid NOT NULL,
    purchase_price numeric(15,2) NOT NULL,
    selling_price numeric(15,2) NOT NULL,
    effective_from timestamp without time zone DEFAULT now() NOT NULL,
    effective_to timestamp without time zone,
    change_reason text,
    changed_by_user_id character varying
);`);
    await queryRunner.query(`-- Name: products; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    sku character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    name_uz character varying(200),
    description text,
    description_uz text,
    category public.products_category_enum DEFAULT 'other'::public.products_category_enum NOT NULL,
    status public.products_status_enum DEFAULT 'active'::public.products_status_enum NOT NULL,
    unit_of_measure public.products_unit_of_measure_enum DEFAULT 'pcs'::public.products_unit_of_measure_enum NOT NULL,
    is_ingredient boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    requires_temperature_control boolean DEFAULT false NOT NULL,
    barcode character varying(50),
    supplier_sku character varying(100),
    purchase_price numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    selling_price numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    ikpu_code character varying(20),
    mxik_code character varying(20),
    vat_rate numeric(5,2) DEFAULT '12'::numeric NOT NULL,
    package_type character varying(20),
    mark_required boolean DEFAULT false NOT NULL,
    weight numeric(10,3),
    volume numeric(10,3),
    min_stock_level numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    max_stock_level numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    shelf_life_days integer,
    default_supplier_id character varying,
    image_url text,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    nutrition jsonb,
    allergens jsonb DEFAULT '[]'::jsonb NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    compatible_machine_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    price_modifiers jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: promo_code_redemptions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.promo_code_redemptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    promo_code_id uuid NOT NULL,
    client_user_id uuid NOT NULL,
    order_id uuid,
    discount_applied numeric(12,2) NOT NULL,
    loyalty_points_awarded integer DEFAULT 0 NOT NULL,
    order_amount numeric(12,2),
    redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);`);
    await queryRunner.query(`-- Name: promo_codes; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.promo_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    type public.promo_codes_type_enum NOT NULL,
    value numeric(12,2) NOT NULL,
    status public.promo_codes_status_enum DEFAULT 'draft'::public.promo_codes_status_enum NOT NULL,
    max_total_uses integer,
    max_uses_per_user integer DEFAULT 1 NOT NULL,
    current_total_uses integer DEFAULT 0 NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    min_order_amount numeric(12,2),
    max_discount_amount numeric(12,2),
    applicable_machine_ids jsonb,
    applicable_product_ids jsonb,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: purchase_history; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.purchase_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    purchase_date date NOT NULL,
    invoice_number character varying(50),
    supplier_id uuid,
    product_id uuid NOT NULL,
    warehouse_id uuid,
    quantity numeric(15,3) NOT NULL,
    unit character varying(20) DEFAULT 'pcs'::character varying NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    vat_rate numeric(5,2) DEFAULT '12'::numeric NOT NULL,
    vat_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    batch_number character varying(50),
    production_date date,
    expiry_date date,
    status public.purchase_history_status_enum DEFAULT 'PENDING'::public.purchase_history_status_enum NOT NULL,
    delivery_date date,
    delivery_note_number character varying(50),
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    exchange_rate numeric(10,4) DEFAULT '1'::numeric NOT NULL,
    payment_method character varying(50),
    payment_date date,
    import_source character varying(50),
    import_session_id uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp with time zone,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: quests; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.quests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    title character varying(100) NOT NULL,
    title_uz character varying(100),
    description character varying(500) NOT NULL,
    description_uz character varying(500),
    period public.quest_period_enum NOT NULL,
    type public.quest_type_enum NOT NULL,
    difficulty public.quest_difficulty_enum DEFAULT 'medium'::public.quest_difficulty_enum NOT NULL,
    target_value integer NOT NULL,
    reward_points integer NOT NULL,
    additional_rewards jsonb,
    metadata jsonb,
    requirements jsonb,
    icon character varying(10) DEFAULT '🎯'::character varying NOT NULL,
    color character varying(20) DEFAULT '#4CAF50'::character varying NOT NULL,
    image_url character varying,
    starts_at timestamp without time zone,
    ends_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    total_started integer DEFAULT 0 NOT NULL,
    total_completed integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: recipe_ingredients; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.recipe_ingredients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    recipe_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit_of_measure public.recipe_ingredients_unit_of_measure_enum DEFAULT 'g'::public.recipe_ingredients_unit_of_measure_enum NOT NULL,
    sort_order integer DEFAULT 1 NOT NULL,
    is_optional boolean DEFAULT false NOT NULL,
    substitute_ingredient_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: recipe_snapshots; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.recipe_snapshots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    recipe_id uuid NOT NULL,
    version integer NOT NULL,
    snapshot jsonb NOT NULL,
    valid_from timestamp without time zone DEFAULT now() NOT NULL,
    valid_to timestamp without time zone,
    change_reason text,
    checksum character varying(64)
);`);
    await queryRunner.query(`-- Name: recipes; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.recipes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    product_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    name_uz character varying(200),
    type_code public.recipes_type_code_enum DEFAULT 'primary'::public.recipes_type_code_enum NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    preparation_time_seconds integer,
    temperature_celsius integer,
    serving_size_ml integer DEFAULT 1 NOT NULL,
    total_cost numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: reconciliation_mismatches; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.reconciliation_mismatches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    run_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    order_number character varying(100),
    machine_code character varying(50),
    order_time timestamp without time zone,
    amount numeric(15,2),
    payment_method character varying(50),
    mismatch_type public.reconciliation_mismatches_mismatch_type_enum NOT NULL,
    match_score numeric(5,2),
    discrepancy_amount numeric(15,2),
    sources_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    is_resolved boolean DEFAULT false NOT NULL,
    resolution_notes text,
    resolved_at timestamp without time zone,
    resolved_by_user_id uuid
);`);
    await queryRunner.query(`-- Name: reconciliation_runs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.reconciliation_runs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    status public.reconciliation_runs_status_enum DEFAULT 'pending'::public.reconciliation_runs_status_enum NOT NULL,
    date_from date NOT NULL,
    date_to date NOT NULL,
    sources jsonb DEFAULT '[]'::jsonb NOT NULL,
    machine_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    time_tolerance integer DEFAULT 300 NOT NULL,
    amount_tolerance numeric(5,2) DEFAULT 0.01 NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    processing_time_ms integer,
    summary jsonb,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: referrals; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.referrals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid,
    status public.referrals_status_enum DEFAULT 'pending'::public.referrals_status_enum NOT NULL,
    referral_code character varying(20) NOT NULL,
    referrer_reward_points integer DEFAULT 0 NOT NULL,
    referred_reward_points integer DEFAULT 0 NOT NULL,
    referrer_reward_paid boolean DEFAULT false NOT NULL,
    referred_reward_paid boolean DEFAULT false NOT NULL,
    activation_order_id character varying,
    activation_order_amount numeric(15,2),
    activated_at timestamp without time zone,
    source character varying(20) DEFAULT 'code'::character varying NOT NULL,
    utm_campaign character varying,
    metadata jsonb,
    code character varying(8) NOT NULL,
    referrer_rewarded boolean DEFAULT false NOT NULL,
    referred_rewarded boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone
);`);
    await queryRunner.query(`-- Name: report_definitions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.report_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    name_uz character varying(100),
    code character varying(50) NOT NULL,
    description text,
    description_uz text,
    type public.report_definitions_type_enum NOT NULL,
    category public.report_definitions_category_enum NOT NULL,
    sections jsonb DEFAULT '[]'::jsonb NOT NULL,
    columns jsonb DEFAULT '[]'::jsonb NOT NULL,
    default_filters jsonb,
    "grouping" jsonb,
    sorting jsonb,
    generation_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    available_formats public.report_definitions_available_formats_enum[] DEFAULT '{pdf,excel}'::public.report_definitions_available_formats_enum[] NOT NULL,
    sql_query text,
    query_parameters jsonb DEFAULT '[]'::jsonb NOT NULL,
    allowed_roles text DEFAULT '[]'::text NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    is_favorite boolean DEFAULT false NOT NULL,
    run_count integer DEFAULT 0 NOT NULL,
    last_run_at timestamp without time zone,
    average_generation_time_ms integer
);`);
    await queryRunner.query(`-- Name: report_subscriptions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.report_subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    scheduled_report_id uuid,
    user_id uuid NOT NULL,
    delivery_channel public.report_subscriptions_delivery_channel_enum DEFAULT 'email'::public.report_subscriptions_delivery_channel_enum NOT NULL,
    delivery_address character varying(255),
    preferred_format public.report_subscriptions_preferred_format_enum DEFAULT 'pdf'::public.report_subscriptions_preferred_format_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);`);
    await queryRunner.query(`-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);`);
    await queryRunner.query(`-- Name: roles; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    name character varying(100) NOT NULL,
    description character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    organization_id uuid,
    level integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: route_stops; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.route_stops (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    route_id uuid NOT NULL,
    machine_id uuid NOT NULL,
    sequence integer NOT NULL,
    task_id uuid,
    status public.route_stops_status_enum DEFAULT 'pending'::public.route_stops_status_enum NOT NULL,
    address text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    estimated_arrival timestamp with time zone,
    actual_arrival timestamp with time zone,
    departed_at timestamp with time zone,
    estimated_duration_minutes integer DEFAULT 15 NOT NULL,
    is_priority boolean DEFAULT false NOT NULL,
    notes text,
    completion_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: routes; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.routes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    type public.routes_type_enum DEFAULT 'refill'::public.routes_type_enum NOT NULL,
    status public.routes_status_enum DEFAULT 'planned'::public.routes_status_enum NOT NULL,
    planned_date date NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    estimated_duration_minutes integer,
    actual_duration_minutes integer,
    estimated_distance_km numeric(8,2),
    actual_distance_km numeric(8,2),
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: sales_imports; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.sales_imports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    uploaded_by_user_id uuid NOT NULL,
    filename character varying(255) NOT NULL,
    file_type public.sales_imports_file_type_enum NOT NULL,
    file_id uuid,
    status public.sales_imports_status_enum DEFAULT 'PENDING'::public.sales_imports_status_enum NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    success_rows integer DEFAULT 0 NOT NULL,
    failed_rows integer DEFAULT 0 NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    summary jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    message text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: saved_report_filters; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.saved_report_filters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    definition_id uuid,
    user_id uuid,
    name character varying(100) NOT NULL,
    description text,
    filters jsonb NOT NULL,
    period_type public.saved_report_filters_period_type_enum,
    is_default boolean DEFAULT false NOT NULL,
    is_shared boolean DEFAULT false NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: scheduled_reports; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.scheduled_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    definition_id uuid,
    name character varying(100) NOT NULL,
    description text,
    schedule jsonb NOT NULL,
    next_run_at timestamp without time zone,
    last_run_at timestamp without time zone,
    filters jsonb,
    period_type public.scheduled_reports_period_type_enum DEFAULT 'last_30_days'::public.scheduled_reports_period_type_enum NOT NULL,
    recipients jsonb DEFAULT '[]'::jsonb NOT NULL,
    format public.scheduled_reports_format_enum DEFAULT 'pdf'::public.scheduled_reports_format_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    run_count integer DEFAULT 0 NOT NULL,
    fail_count integer DEFAULT 0 NOT NULL,
    last_success_at timestamp without time zone,
    last_error text
);`);
    await queryRunner.query(`-- Name: schema_definitions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.schema_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    domain public.schema_definitions_domain_enum NOT NULL,
    table_name character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    field_definitions jsonb NOT NULL,
    relationships jsonb,
    required_fields jsonb NOT NULL,
    unique_fields jsonb NOT NULL,
    version character varying(20) DEFAULT '1.0'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);`);
    await queryRunner.query(`-- Name: security_events; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.security_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    event_type public.security_events_event_type_enum NOT NULL,
    severity public.security_events_severity_enum DEFAULT 'low'::public.security_events_severity_enum NOT NULL,
    user_id uuid,
    organization_id uuid,
    ip_address character varying(45),
    user_agent text,
    resource character varying(255),
    resource_id uuid,
    description text NOT NULL,
    metadata jsonb,
    session_id character varying(255),
    is_resolved boolean DEFAULT false NOT NULL,
    resolved_by_id uuid,
    resolved_at timestamp with time zone,
    resolution_notes text
);`);
    await queryRunner.query(`-- Name: session_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.session_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_id character varying(100) NOT NULL,
    ip_address character varying(100) NOT NULL,
    user_agent text,
    device_type character varying(100),
    browser character varying(100),
    os character varying(100),
    location character varying(100),
    status public.session_logs_status_enum DEFAULT 'active'::public.session_logs_status_enum NOT NULL,
    logged_in_at timestamp with time zone NOT NULL,
    logged_out_at timestamp with time zone,
    expires_at timestamp with time zone,
    last_activity_at timestamp with time zone,
    actions_count integer DEFAULT 0 NOT NULL,
    is_suspicious boolean DEFAULT false NOT NULL,
    revoke_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: spare_parts; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.spare_parts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    part_number character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    compatible_component_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    min_quantity integer DEFAULT 0 NOT NULL,
    cost_price numeric(12,2),
    supplier_id uuid,
    storage_location character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.stock_movements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    from_warehouse_id uuid,
    to_warehouse_id uuid,
    product_id uuid NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit_of_measure character varying(20) DEFAULT 'pcs'::character varying NOT NULL,
    type public.stock_movements_type_enum NOT NULL,
    status public.stock_movements_status_enum DEFAULT 'pending'::public.stock_movements_status_enum NOT NULL,
    reference_number character varying(100),
    requested_by_user_id uuid NOT NULL,
    approved_by_user_id uuid,
    completed_by_user_id uuid,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    cost numeric(15,2),
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: stock_opening_balances; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.stock_opening_balances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    balance_date date NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit character varying(20) DEFAULT 'pcs'::character varying NOT NULL,
    unit_cost numeric(15,2) NOT NULL,
    total_cost numeric(15,2) NOT NULL,
    batch_number character varying(50),
    expiry_date date,
    location character varying(100),
    is_applied boolean DEFAULT false NOT NULL,
    applied_at timestamp with time zone,
    applied_by_user_id uuid,
    import_source character varying(50),
    import_session_id uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: stock_reservations; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.stock_reservations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    reservation_number character varying(50) NOT NULL,
    warehouse_id uuid NOT NULL,
    product_id uuid NOT NULL,
    batch_id uuid,
    quantity_reserved numeric(10,3) NOT NULL,
    quantity_fulfilled numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    unit character varying(20) NOT NULL,
    status public.stock_reservations_status_enum DEFAULT 'pending'::public.stock_reservations_status_enum NOT NULL,
    reserved_for character varying(100) NOT NULL,
    reserved_by_user_id uuid,
    reserved_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    fulfilled_at timestamp with time zone,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: stock_takes; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.stock_takes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    stock_take_number character varying(50) NOT NULL,
    warehouse_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    status public.stock_takes_status_enum DEFAULT 'planned'::public.stock_takes_status_enum NOT NULL,
    scheduled_date date NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    supervisor_id uuid,
    team_members text,
    zones_to_count text,
    is_full_inventory boolean DEFAULT false NOT NULL,
    items_counted integer DEFAULT 0 NOT NULL,
    discrepancies_found integer DEFAULT 0 NOT NULL,
    notes text,
    results jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.suppliers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    contact_person character varying(200),
    phone character varying(20),
    email character varying(255),
    address text,
    tax_id character varying(20),
    bank_account character varying(50),
    telegram_id character varying(64),
    telegram_username character varying(255),
    categories jsonb,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    payment_term_days integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: sync_jobs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.sync_jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    integration_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    job_name character varying(100) NOT NULL,
    direction public.sync_jobs_direction_enum NOT NULL,
    entity_type character varying(100) NOT NULL,
    status public.sync_jobs_status_enum DEFAULT 'scheduled'::public.sync_jobs_status_enum NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    duration_ms integer,
    total_records integer DEFAULT 0 NOT NULL,
    processed_records integer DEFAULT 0 NOT NULL,
    successful_records integer DEFAULT 0 NOT NULL,
    failed_records integer DEFAULT 0 NOT NULL,
    error_message text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    results jsonb DEFAULT '{}'::jsonb NOT NULL,
    triggered_by_id uuid
);`);
    await queryRunner.query(`-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.system_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    key character varying(255) NOT NULL,
    value jsonb,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    description text,
    is_encrypted boolean DEFAULT false NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    organization_id uuid
);`);
    await queryRunner.query(`-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.task_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    comment text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    attachments jsonb
);`);
    await queryRunner.query(`-- Name: task_components; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.task_components (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    task_id uuid NOT NULL,
    component_id uuid NOT NULL,
    role public.task_components_role_enum NOT NULL,
    serial_number character varying(100),
    notes text,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: task_items; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.task_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    task_id uuid NOT NULL,
    product_id uuid NOT NULL,
    planned_quantity numeric(10,3) NOT NULL,
    actual_quantity numeric(10,3),
    slot_number character varying(50),
    unit_of_measure character varying(50),
    notes text
);`);
    await queryRunner.query(`-- Name: task_photos; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.task_photos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    task_id uuid NOT NULL,
    category character varying(50) NOT NULL,
    url character varying(500) NOT NULL,
    thumbnail_url character varying(500),
    file_size bigint,
    mime_type character varying(100),
    width integer,
    height integer,
    latitude numeric(10,8),
    longitude numeric(11,8),
    uploaded_by_user_id uuid NOT NULL,
    description text
);`);
    await queryRunner.query(`-- Name: tasks; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    task_number character varying(50) NOT NULL,
    type_code public.tasks_type_code_enum NOT NULL,
    status public.tasks_status_enum DEFAULT 'pending'::public.tasks_status_enum NOT NULL,
    priority public.tasks_priority_enum DEFAULT 'normal'::public.tasks_priority_enum NOT NULL,
    machine_id uuid NOT NULL,
    assigned_to_user_id uuid,
    created_by_user_id uuid NOT NULL,
    scheduled_date timestamp with time zone,
    due_date timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    operation_date timestamp with time zone,
    description text,
    completion_notes text,
    postpone_reason text,
    checklist jsonb,
    expected_cash_amount numeric(15,2),
    actual_cash_amount numeric(15,2),
    has_photo_before boolean DEFAULT false NOT NULL,
    has_photo_after boolean DEFAULT false NOT NULL,
    requires_photo_before boolean DEFAULT true NOT NULL,
    requires_photo_after boolean DEFAULT true NOT NULL,
    photo_before_url character varying(500),
    photo_after_url character varying(500),
    pending_photos boolean DEFAULT false NOT NULL,
    offline_completed boolean DEFAULT false NOT NULL,
    completed_latitude numeric(10,8),
    completed_longitude numeric(11,8),
    rejected_by_user_id uuid,
    rejected_at timestamp with time zone,
    rejection_reason text,
    estimated_duration integer,
    actual_duration integer,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: telegram_bot_analytics; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.telegram_bot_analytics (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    telegram_user_id uuid,
    user_id uuid,
    bot_type character varying(20) NOT NULL,
    event_type public.telegram_bot_analytics_event_type_enum NOT NULL,
    action_name character varying(100) NOT NULL,
    action_category character varying(50),
    response_time_ms integer,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    session_id character varying(50),
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: telegram_message_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.telegram_message_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    telegram_user_id uuid NOT NULL,
    chat_id character varying(50) NOT NULL,
    direction character varying(10) NOT NULL,
    message_type public.telegram_message_logs_message_type_enum NOT NULL,
    command character varying(100),
    message_text text,
    telegram_message_id integer,
    status public.telegram_message_logs_status_enum DEFAULT 'sent'::public.telegram_message_logs_status_enum NOT NULL,
    error_message text,
    response_time_ms integer,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: telegram_payments; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.telegram_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid,
    provider public.telegram_payments_provider_enum NOT NULL,
    status public.telegram_payments_status_enum DEFAULT 'pending'::public.telegram_payments_status_enum NOT NULL,
    currency public.telegram_payments_currency_enum NOT NULL,
    amount numeric(15,2) NOT NULL,
    telegram_user_id bigint NOT NULL,
    telegram_chat_id bigint,
    telegram_payment_charge_id character varying,
    provider_payment_charge_id character varying,
    invoice_payload character varying,
    shipping_option_id character varying,
    order_info jsonb,
    description text,
    failure_reason text,
    metadata jsonb,
    refunded_at timestamp without time zone,
    refunded_amount numeric(15,2),
    completed_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: telegram_settings; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.telegram_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    setting_key character varying(50) NOT NULL,
    bot_token_encrypted text,
    bot_username character varying(100),
    mode character varying(20) DEFAULT 'polling'::character varying NOT NULL,
    webhook_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    send_notifications boolean DEFAULT true NOT NULL,
    max_messages_per_minute integer DEFAULT 30 NOT NULL,
    default_language public.telegram_settings_default_language_enum DEFAULT 'ru'::public.telegram_settings_default_language_enum NOT NULL,
    welcome_message_ru text,
    welcome_message_uz text,
    welcome_message_en text,
    default_notification_preferences jsonb,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: telegram_users; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.telegram_users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid,
    telegram_id character varying(50) NOT NULL,
    user_id uuid,
    chat_id character varying(50) NOT NULL,
    username character varying(100),
    first_name character varying(100),
    last_name character varying(100),
    phone character varying(20),
    language public.telegram_users_language_enum DEFAULT 'ru'::public.telegram_users_language_enum NOT NULL,
    status public.telegram_users_status_enum DEFAULT 'active'::public.telegram_users_status_enum NOT NULL,
    bot_type character varying(20) NOT NULL,
    notification_preferences jsonb,
    is_verified boolean DEFAULT false NOT NULL,
    verification_code character varying(10),
    verification_expires_at timestamp with time zone,
    last_interaction_at timestamp with time zone,
    metadata jsonb
);`);
    await queryRunner.query(`-- Name: time_off_requests; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.time_off_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    request_number character varying(50) NOT NULL,
    employee_id uuid NOT NULL,
    time_off_type public.time_off_requests_time_off_type_enum NOT NULL,
    status public.time_off_requests_status_enum DEFAULT 'pending'::public.time_off_requests_status_enum NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_days integer NOT NULL,
    half_day_start boolean DEFAULT false NOT NULL,
    half_day_end boolean DEFAULT false NOT NULL,
    reason text,
    documents jsonb,
    approved_by_user_id uuid,
    approved_at timestamp with time zone,
    rejection_reason text
);`);
    await queryRunner.query(`-- Name: timesheets; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.timesheets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    timesheet_number character varying(50) NOT NULL,
    employee_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    total_worked_days integer DEFAULT 0 NOT NULL,
    total_worked_hours numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_overtime_hours numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total_time_off_days integer DEFAULT 0 NOT NULL,
    total_sick_days integer DEFAULT 0 NOT NULL,
    regular_pay numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    overtime_pay numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    deductions numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_pay numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    daily_summary jsonb,
    submitted_at timestamp with time zone,
    approved_by_user_id uuid,
    approved_at timestamp with time zone,
    paid_at timestamp with time zone,
    notes text
);`);
    await queryRunner.query(`-- Name: transaction_daily_summaries; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.transaction_daily_summaries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    machine_id character varying,
    summary_date date NOT NULL,
    sales_count integer DEFAULT 0 NOT NULL,
    sales_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    sales_vat_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    cash_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    card_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    mobile_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    refunds_count integer DEFAULT 0 NOT NULL,
    refunds_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    collections_count integer DEFAULT 0 NOT NULL,
    collections_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    expenses_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    net_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    top_products jsonb DEFAULT '[]'::jsonb NOT NULL,
    hourly_stats jsonb DEFAULT '[]'::jsonb NOT NULL,
    calculated_at timestamp without time zone
);`);
    await queryRunner.query(`-- Name: transaction_items; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.transaction_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    transaction_id uuid NOT NULL,
    product_id character varying NOT NULL,
    product_name character varying(200) NOT NULL,
    sku character varying(50),
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    vat_rate numeric(5,2) DEFAULT '12'::numeric NOT NULL,
    vat_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    mxik_code character varying(20),
    ikpu_code character varying(20),
    package_type character varying(20),
    mark_code text,
    slot_number character varying(20),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: transactions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id character varying NOT NULL,
    machine_id uuid,
    transaction_number character varying(50),
    type public.transactions_type_enum NOT NULL,
    status public.transactions_status_enum DEFAULT 'pending'::public.transactions_status_enum NOT NULL,
    payment_method public.transactions_payment_method_enum DEFAULT 'cash'::public.transactions_payment_method_enum NOT NULL,
    amount numeric(15,2) NOT NULL,
    vat_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount_amount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'UZS'::character varying NOT NULL,
    exchange_rate numeric(10,4) DEFAULT '1'::numeric NOT NULL,
    transaction_date timestamp without time zone DEFAULT now() NOT NULL,
    sale_date date,
    payment_id character varying(100),
    payment_reference character varying(100),
    card_mask character varying(20),
    card_type character varying(20),
    user_id character varying,
    recipe_id character varying,
    recipe_snapshot_id character varying,
    recipe_version integer,
    quantity integer DEFAULT 1 NOT NULL,
    task_id character varying,
    counterparty_id character varying,
    contract_id character varying,
    expense_category public.transactions_expense_category_enum,
    fiscal_sign character varying(100),
    fiscal_receipt_number character varying(50),
    fiscal_receipt_url text,
    fiscal_qr_code text,
    fiscalized_at timestamp without time zone,
    is_fiscalized boolean DEFAULT false NOT NULL,
    fiscal_data jsonb,
    original_transaction_id uuid,
    refunded_amount numeric(15,2),
    refunded_at timestamp without time zone,
    refund_reason text,
    refunded_by_user_id character varying,
    machine_slot_id character varying,
    vending_session_id character varying,
    telemetry_data jsonb,
    description text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: trip_anomalies; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.trip_anomalies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    trip_id uuid NOT NULL,
    type public.trip_anomalies_type_enum NOT NULL,
    severity public.trip_anomalies_severity_enum DEFAULT 'warning'::public.trip_anomalies_severity_enum NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    notification_sent boolean DEFAULT false NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    resolved_by_id uuid,
    resolved_at timestamp with time zone,
    resolution_notes text,
    detected_at timestamp with time zone DEFAULT now() NOT NULL
);`);
    await queryRunner.query(`-- Name: trip_points; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.trip_points (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    trip_id uuid NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    accuracy_meters numeric(8,2),
    speed_mps numeric(8,2),
    heading numeric(5,2),
    altitude numeric(10,2),
    distance_from_prev_meters numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    is_filtered boolean DEFAULT false NOT NULL,
    filter_reason character varying(50),
    recorded_at timestamp with time zone NOT NULL
);`);
    await queryRunner.query(`-- Name: trip_reconciliations; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.trip_reconciliations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    vehicle_id uuid,
    actual_odometer integer,
    expected_odometer integer,
    difference_km integer,
    threshold_km integer,
    is_anomaly boolean,
    performed_by_id uuid,
    performed_at timestamp with time zone,
    notes text,
    trip_id uuid,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_stops integer DEFAULT 0 NOT NULL,
    verified_stops integer DEFAULT 0 NOT NULL,
    unverified_stops integer DEFAULT 0 NOT NULL,
    total_tasks integer DEFAULT 0 NOT NULL,
    completed_tasks integer DEFAULT 0 NOT NULL,
    verified_tasks integer DEFAULT 0 NOT NULL,
    mismatch_tasks integer DEFAULT 0 NOT NULL,
    mismatches jsonb DEFAULT '[]'::jsonb NOT NULL,
    overall_severity character varying(20) DEFAULT 'info'::character varying NOT NULL,
    resolved_by_id uuid,
    resolved_at timestamp with time zone,
    resolution_notes text
);`);
    await queryRunner.query(`-- Name: trip_stops; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.trip_stops (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    trip_id uuid NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    machine_id uuid,
    machine_name character varying(128),
    machine_address character varying(256),
    distance_to_machine_meters integer,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    is_verified boolean DEFAULT false NOT NULL,
    is_anomaly boolean DEFAULT false NOT NULL,
    notification_sent boolean DEFAULT false NOT NULL,
    notes text
);`);
    await queryRunner.query(`-- Name: trip_task_links; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.trip_task_links (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    trip_id uuid NOT NULL,
    task_id uuid NOT NULL,
    status public.trip_task_links_status_enum DEFAULT 'pending'::public.trip_task_links_status_enum NOT NULL,
    verified_by_gps boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    verification_status character varying(50),
    vhm24_task_id character varying,
    vhm24_task_type character varying,
    vhm24_machine_id character varying,
    expected_latitude numeric(10,7),
    expected_longitude numeric(10,7),
    actual_latitude numeric(10,7),
    actual_longitude numeric(10,7),
    distance_from_expected_m numeric(10,2),
    verification_radius_m numeric(10,2) DEFAULT '100'::numeric NOT NULL,
    stop_duration_seconds integer,
    trip_stop_id uuid,
    overridden_by_id uuid
);`);
    await queryRunner.query(`-- Name: trips; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.trips (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    vehicle_id uuid,
    task_type public.trips_task_type_enum DEFAULT 'other'::public.trips_task_type_enum NOT NULL,
    status public.trips_status_enum DEFAULT 'active'::public.trips_status_enum NOT NULL,
    transport_type public.trips_transport_type_enum DEFAULT 'car'::public.trips_transport_type_enum,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    start_odometer integer,
    end_odometer integer,
    calculated_distance_meters integer DEFAULT 0 NOT NULL,
    start_latitude numeric(10,8),
    start_longitude numeric(11,8),
    end_latitude numeric(10,8),
    end_longitude numeric(11,8),
    start_machine_id uuid,
    end_machine_id uuid,
    total_points integer DEFAULT 0 NOT NULL,
    total_stops integer DEFAULT 0 NOT NULL,
    total_anomalies integer DEFAULT 0 NOT NULL,
    visited_machines_count integer DEFAULT 0 NOT NULL,
    live_location_active boolean DEFAULT false NOT NULL,
    last_location_update timestamp with time zone,
    telegram_message_id bigint,
    taxi_total_amount numeric(12,2),
    notes text
);`);
    await queryRunner.query(`-- Name: two_factor_auth; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.two_factor_auth (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    user_id uuid NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    totp_secret character varying,
    totp_secret_iv character varying,
    sms_phone character varying,
    email_address character varying,
    used_backup_codes text,
    method public.two_factor_auth_method_enum NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    secret character varying(500),
    phone_number character varying(50),
    email character varying(200),
    backup_codes_used integer DEFAULT 0 NOT NULL,
    enabled_at timestamp with time zone,
    backup_codes jsonb DEFAULT '[]'::jsonb NOT NULL,
    last_used_at timestamp with time zone,
    locked_until timestamp with time zone
);`);
    await queryRunner.query(`-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.user_achievements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    unlocked_at timestamp with time zone,
    organization_id uuid NOT NULL,
    points_awarded integer DEFAULT 0 NOT NULL,
    current_value integer DEFAULT 0 NOT NULL,
    target_value integer NOT NULL,
    is_unlocked boolean DEFAULT false NOT NULL,
    claimed_at timestamp with time zone,
    points_claimed integer,
    progress_details jsonb
);`);
    await queryRunner.query(`-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.user_notification_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    quiet_hours_start character varying(5),
    quiet_hours_end character varying(5),
    timezone character varying(50) DEFAULT 'Asia/Tashkent'::character varying NOT NULL,
    language character varying(5) DEFAULT 'ru'::character varying NOT NULL,
    push_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    sms_enabled boolean DEFAULT false NOT NULL,
    telegram_enabled boolean DEFAULT true NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    email character varying(255),
    phone character varying(20),
    telegram_id character varying(50),
    device_tokens jsonb DEFAULT '[]'::jsonb NOT NULL,
    type_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    digest_enabled boolean DEFAULT false NOT NULL,
    digest_frequency public.user_notification_settings_digest_frequency_enum DEFAULT 'none'::public.user_notification_settings_digest_frequency_enum NOT NULL,
    digest_time character varying(5),
    digest_channels public.user_notification_settings_digest_channels_enum[] DEFAULT '{}'::public.user_notification_settings_digest_channels_enum[] NOT NULL
);`);
    await queryRunner.query(`-- Name: user_quests; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.user_quests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    user_id uuid NOT NULL,
    quest_id uuid NOT NULL,
    status public.quest_status_enum DEFAULT 'in_progress'::public.quest_status_enum NOT NULL,
    current_value integer DEFAULT 0 NOT NULL,
    target_value integer NOT NULL,
    progress_details jsonb,
    period_start date,
    period_end date,
    reward_points integer NOT NULL,
    points_claimed integer,
    rewards_claimed jsonb,
    completed_at timestamp without time zone,
    claimed_at timestamp without time zone,
    expired_at timestamp without time zone,
    started_at timestamp without time zone DEFAULT now() NOT NULL
);`);
    await queryRunner.query(`-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL
);`);
    await queryRunner.query(`-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    user_id uuid,
    refresh_token_hash character varying NOT NULL,
    refresh_token_hint character varying(16) NOT NULL,
    device_info jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    device_type character varying(100),
    device_name character varying(100),
    os character varying(100),
    browser character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    last_activity_at timestamp without time zone NOT NULL,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_revoked boolean DEFAULT false NOT NULL,
    revoked_at timestamp without time zone,
    revoked_reason character varying,
    metadata jsonb DEFAULT '{}'::jsonb
);`);
    await queryRunner.query(`-- Name: users; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    email character varying NOT NULL,
    username character varying,
    password character varying NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    patronymic character varying,
    phone character varying,
    avatar character varying,
    role public.users_role_enum DEFAULT 'viewer'::public.users_role_enum NOT NULL,
    status public.users_status_enum DEFAULT 'pending'::public.users_status_enum NOT NULL,
    telegram_id character varying,
    telegram_username character varying,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    last_login_at timestamp without time zone,
    last_login_ip character varying,
    login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp without time zone,
    password_changed_at timestamp without time zone,
    must_change_password boolean DEFAULT false NOT NULL,
    ip_whitelist text,
    organization_id uuid,
    approved_at timestamp without time zone,
    approved_by_id uuid,
    rejected_at timestamp without time zone,
    rejected_by_id uuid,
    rejection_reason text,
    password_changed_by_user boolean DEFAULT false NOT NULL,
    points_balance integer DEFAULT 0 NOT NULL,
    loyalty_level public.users_loyalty_level_enum DEFAULT 'bronze'::public.users_loyalty_level_enum NOT NULL,
    total_points_earned integer DEFAULT 0 NOT NULL,
    total_spent numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total_orders integer DEFAULT 0 NOT NULL,
    welcome_bonus_received boolean DEFAULT false NOT NULL,
    first_order_bonus_received boolean DEFAULT false NOT NULL,
    current_streak integer DEFAULT 0 NOT NULL,
    longest_streak integer DEFAULT 0 NOT NULL,
    last_order_date date,
    referral_code character varying,
    referred_by_id uuid,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: validation_rules; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.validation_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    domain public.validation_rules_domain_enum NOT NULL,
    rule_name character varying(100) NOT NULL,
    description text,
    rule_type public.validation_rules_rule_type_enum NOT NULL,
    field_name character varying(100) NOT NULL,
    rule_definition jsonb NOT NULL,
    severity public.validation_rules_severity_enum DEFAULT 'error'::public.validation_rules_severity_enum NOT NULL,
    error_message_template text,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: vat_rates; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.vat_rates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    code character varying(50) NOT NULL,
    rate numeric(5,2) NOT NULL,
    name_ru character varying(255) NOT NULL,
    name_uz character varying(255),
    description text,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    effective_from date,
    effective_to date,
    sort_order integer DEFAULT 0 NOT NULL
);`);
    await queryRunner.query(`-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.vehicles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    owner_employee_id uuid,
    type public.vehicles_type_enum DEFAULT 'company'::public.vehicles_type_enum NOT NULL,
    brand character varying(100) NOT NULL,
    model character varying(100),
    plate_number character varying(20) NOT NULL,
    current_odometer integer DEFAULT 0 NOT NULL,
    last_odometer_update timestamp with time zone,
    status public.vehicles_status_enum DEFAULT 'active'::public.vehicles_status_enum NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: warehouse_bins; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.warehouse_bins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    zone_id uuid NOT NULL,
    barcode character varying(50) NOT NULL,
    name character varying(100),
    "row" integer,
    shelf integer,
    "position" integer,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    max_capacity numeric(10,2),
    current_quantity numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    product_id uuid,
    lot_number character varying(100),
    expiry_date date,
    width numeric(8,2),
    height numeric(8,2),
    depth numeric(8,2),
    max_weight numeric(10,2),
    is_pickable boolean DEFAULT true NOT NULL,
    last_picked_at timestamp with time zone,
    last_restocked_at timestamp with time zone
);`);
    await queryRunner.query(`-- Name: warehouse_inventory; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.warehouse_inventory (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    current_quantity numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    reserved_quantity numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    min_stock_level numeric(10,3) DEFAULT '0'::numeric NOT NULL,
    max_stock_level numeric(10,3),
    last_restocked_at timestamp with time zone,
    location_in_warehouse character varying(200),
    avg_purchase_price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    last_purchase_price numeric(12,2)
);`);
    await queryRunner.query(`-- Name: warehouse_zones; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.warehouse_zones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    name character varying(100) NOT NULL,
    zone_type public.warehouse_zones_zone_type_enum DEFAULT 'storage'::public.warehouse_zones_zone_type_enum NOT NULL,
    description text,
    metadata jsonb,
    warehouse_id uuid NOT NULL,
    area_sqm numeric(10,2),
    capacity integer,
    current_occupancy integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    organization_id uuid NOT NULL,
    status public.warehouse_zones_status_enum DEFAULT 'active'::public.warehouse_zones_status_enum NOT NULL,
    storage_condition public.warehouse_zones_storage_condition_enum DEFAULT 'ambient'::public.warehouse_zones_storage_condition_enum NOT NULL,
    floor integer DEFAULT 1 NOT NULL,
    aisle character varying(20),
    total_capacity numeric(10,2),
    used_capacity numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    capacity_unit character varying(20) DEFAULT 'units'::character varying NOT NULL,
    min_temperature numeric(5,2),
    max_temperature numeric(5,2),
    current_temperature numeric(5,2),
    temperature_updated_at timestamp with time zone,
    allowed_categories jsonb,
    excluded_categories jsonb,
    is_pickable boolean DEFAULT true NOT NULL,
    pick_priority integer DEFAULT 100 NOT NULL,
    fifo_enabled boolean DEFAULT true NOT NULL,
    code character varying(20) NOT NULL
);`);
    await queryRunner.query(`-- Name: warehouses; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.warehouses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50) NOT NULL,
    type public.warehouses_type_enum DEFAULT 'main'::public.warehouses_type_enum NOT NULL,
    address text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    manager_id uuid,
    phone character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    capacity integer,
    current_occupancy integer DEFAULT 0 NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: washing_schedules; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.washing_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    machine_id uuid NOT NULL,
    component_id uuid,
    frequency_days integer NOT NULL,
    last_wash_date date,
    next_wash_date date NOT NULL,
    assigned_to_user_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);`);
    await queryRunner.query(`-- Name: website_configs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.website_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL,
    section character varying(50) DEFAULT 'general'::character varying NOT NULL,
    updated_by uuid
);`);
    await queryRunner.query(`-- Name: work_logs; Type: TABLE; Schema: public; Owner: -
CREATE TABLE public.work_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by_id uuid,
    updated_by_id uuid,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    work_type public.work_logs_work_type_enum DEFAULT 'regular'::public.work_logs_work_type_enum NOT NULL,
    activity_type public.work_logs_activity_type_enum NOT NULL,
    status public.work_logs_status_enum DEFAULT 'draft'::public.work_logs_status_enum NOT NULL,
    clock_in time without time zone NOT NULL,
    clock_out time without time zone NOT NULL,
    break_minutes integer DEFAULT 0 NOT NULL,
    worked_minutes integer NOT NULL,
    overtime_minutes integer DEFAULT 0 NOT NULL,
    check_in_latitude numeric(10,8),
    check_in_longitude numeric(11,8),
    check_out_latitude numeric(10,8),
    check_out_longitude numeric(11,8),
    task_id uuid,
    machine_id uuid,
    maintenance_request_id uuid,
    description text NOT NULL,
    notes text,
    hourly_rate numeric(15,2),
    overtime_multiplier numeric(3,2) DEFAULT 1.5 NOT NULL,
    pay_amount numeric(15,2),
    approved_by_user_id uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    metadata jsonb
);`);

    // ── Primary Keys (221) ──
    await queryRunner.query(`-- Name: order_items PK_005269d8574e6fac0493715c308; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: client_wallet_ledger PK_006fe6e0fbe01e33737ac17e854; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_wallet_ledger
    ADD CONSTRAINT "PK_006fe6e0fbe01e33737ac17e854" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: alert_history PK_01cc54a2bdfa890a86511d26822; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.alert_history
    ADD CONSTRAINT "PK_01cc54a2bdfa890a86511d26822" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: material_requests PK_02316f941b471665a48e9659454; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.material_requests
    ADD CONSTRAINT "PK_02316f941b471665a48e9659454" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: machine_inventory PK_028645dd62ab9e97731d7fb1483; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_inventory
    ADD CONSTRAINT "PK_028645dd62ab9e97731d7fb1483" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: recipe_snapshots PK_047964615565620c45a5ced363d; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.recipe_snapshots
    ADD CONSTRAINT "PK_047964615565620c45a5ced363d" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: login_attempts PK_070e613c8f768b1a70742705c5b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT "PK_070e613c8f768b1a70742705c5b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: fcm_tokens PK_0802a779d616597e9330bb9a7cc; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.fcm_tokens
    ADD CONSTRAINT "PK_0802a779d616597e9330bb9a7cc" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: audit_snapshots PK_087a0a6f34aaa52c254e3481c4e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.audit_snapshots
    ADD CONSTRAINT "PK_087a0a6f34aaa52c254e3481c4e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: client_wallets PK_0a6db1bbecedc9979e2455edbad; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_wallets
    ADD CONSTRAINT "PK_0a6db1bbecedc9979e2455edbad" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: directory_entry_audit PK_0b87aab726da88ef8ff7fbb2f8b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_entry_audit
    ADD CONSTRAINT "PK_0b87aab726da88ef8ff7fbb2f8b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: investor_profiles PK_154d889a096b3948f856b4ca53f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.investor_profiles
    ADD CONSTRAINT "PK_154d889a096b3948f856b4ca53f" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: fiscal_receipts PK_168cb6eba91cffb55b29c87fb5b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.fiscal_receipts
    ADD CONSTRAINT "PK_168cb6eba91cffb55b29c87fb5b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: positions PK_17e4e62ccd5749b289ae3fae6f3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.positions
    ADD CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: access_control_logs PK_1830f92f48978666ac070c6f31e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.access_control_logs
    ADD CONSTRAINT "PK_1830f92f48978666ac070c6f31e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: vehicles PK_18d8646b59304dce4af3a9e35b6; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: notification_logs PK_19c524e644cdeaebfcffc284871; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT "PK_19c524e644cdeaebfcffc284871" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: location_notes PK_1a12b540f386b949e8d06cbea98; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_notes
    ADD CONSTRAINT "PK_1a12b540f386b949e8d06cbea98" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: dashboards PK_1b4b4bc346118e0d335f16c5344; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT "PK_1b4b4bc346118e0d335f16c5344" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: inventory_batches PK_1b670b7f687d8b8c58ef8d4629a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_batches
    ADD CONSTRAINT "PK_1b670b7f687d8b8c58ef8d4629a" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: achievements PK_1bc19c37c6249f70186f318d71d; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT "PK_1bc19c37c6249f70186f318d71d" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: package_types PK_1d2a2de151b8e5076ae9de7ebd5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.package_types
    ADD CONSTRAINT "PK_1d2a2de151b8e5076ae9de7ebd5" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: timesheets PK_1dc280b68c9353ecce41a34be71; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT "PK_1dc280b68c9353ecce41a34be71" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: integration_webhooks PK_1e400939bc3644d4a5f19687350; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.integration_webhooks
    ADD CONSTRAINT "PK_1e400939bc3644d4a5f19687350" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: payment_providers PK_1e51e9c9553171a6d1a3c46f3a3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_providers
    ADD CONSTRAINT "PK_1e51e9c9553171a6d1a3c46f3a3" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: equipment_components PK_20297e22b6f9cde928d3da38a7c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.equipment_components
    ADD CONSTRAINT "PK_20297e22b6f9cde928d3da38a7c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: collections PK_21c00b1ebbd41ba1354242c5c4e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.collections
    ADD CONSTRAINT "PK_21c00b1ebbd41ba1354242c5c4e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: containers PK_21cbac3e68f7b1cf53d39cda70c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.containers
    ADD CONSTRAINT "PK_21cbac3e68f7b1cf53d39cda70c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: route_stops PK_22c09afc24c0a7a13644c629073; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT "PK_22c09afc24c0a7a13644c629073" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: trip_reconciliations PK_2301a711fba066709b326d1dbf6; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trip_reconciliations
    ADD CONSTRAINT "PK_2301a711fba066709b326d1dbf6" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: user_roles PK_23ed6f04fe43066df08379fd034; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY (user_id, role_id);`);
    await queryRunner.query(`-- Name: role_permissions PK_25d24010f53bb80b78e412c9656; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY (role_id, permission_id);`);
    await queryRunner.query(`-- Name: user_quests PK_26397091cd37dde7d59fde6084d; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_quests
    ADD CONSTRAINT "PK_26397091cd37dde7d59fde6084d" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: commissions PK_2701379966e2e670bb5ff0ae78e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT "PK_2701379966e2e670bb5ff0ae78e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: contracts PK_2c7b8f3a7b1acdd49497d83d0fb; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: maintenance_schedules PK_2ce3383b6ff08ab48a28f515e4f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT "PK_2ce3383b6ff08ab48a28f515e4f" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: component_movements PK_2d02e72a973e9eedfbe32866d59; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.component_movements
    ADD CONSTRAINT "PK_2d02e72a973e9eedfbe32866d59" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: directory_fields PK_2e6bb16398ce201e8dcf8f48d4e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_fields
    ADD CONSTRAINT "PK_2e6bb16398ce201e8dcf8f48d4e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: saved_report_filters PK_2eb804262b7be41a52c9acb77c2; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.saved_report_filters
    ADD CONSTRAINT "PK_2eb804262b7be41a52c9acb77c2" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: materials PK_2fd1a93ecb222a28bef28663fa0; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "PK_2fd1a93ecb222a28bef28663fa0" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: sales_imports PK_320e26c2432da4e1b703d06a794; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.sales_imports
    ADD CONSTRAINT "PK_320e26c2432da4e1b703d06a794" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: fiscal_queue PK_351b7022a763d5d36803e401de8; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.fiscal_queue
    ADD CONSTRAINT "PK_351b7022a763d5d36803e401de8" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: schema_definitions PK_37196e4614e7509ed38093130a5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.schema_definitions
    ADD CONSTRAINT "PK_37196e4614e7509ed38093130a5" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: generated_reports PK_3875618b27e8f2d438168399374; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT "PK_3875618b27e8f2d438168399374" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: collection_history PK_394c54833596330e4893e896cf2; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.collection_history
    ADD CONSTRAINT "PK_394c54833596330e4893e896cf2" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: user_achievements PK_3d94aba7e9ed55365f68b5e77fa; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "PK_3d94aba7e9ed55365f68b5e77fa" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: material_request_history PK_3e7dbbe58a9a36771772b78c5b6; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.material_request_history
    ADD CONSTRAINT "PK_3e7dbbe58a9a36771772b78c5b6" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: warehouse_bins PK_3f5b2d69d36e76d3857cd03dd27; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouse_bins
    ADD CONSTRAINT "PK_3f5b2d69d36e76d3857cd03dd27" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: client_loyalty_ledger PK_413388497a1897e4bb877be3d28; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_loyalty_ledger
    ADD CONSTRAINT "PK_413388497a1897e4bb877be3d28" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: stock_reservations PK_46ec0f5605d70f64654ad4e7bd9; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT "PK_46ec0f5605d70f64654ad4e7bd9" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: performance_reviews PK_46f39f620497eb3de4fe6dafdef; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT "PK_46f39f620497eb3de4fe6dafdef" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: attendances PK_483ed97cd4cd43ab4a117516b69; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "PK_483ed97cd4cd43ab4a117516b69" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: cms_articles PK_4a02d17fdbdcf15def746937d17; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.cms_articles
    ADD CONSTRAINT "PK_4a02d17fdbdcf15def746937d17" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: import_audit_logs PK_4a3acd2e6169a79bdf9d10baf5c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.import_audit_logs
    ADD CONSTRAINT "PK_4a3acd2e6169a79bdf9d10baf5c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: complaints PK_4b7566a2a489c2cc7c12ed076ad; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT "PK_4b7566a2a489c2cc7c12ed076ad" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: integration_templates PK_4ccb1f740bf2bc0fcf3b79ef409; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.integration_templates
    ADD CONSTRAINT "PK_4ccb1f740bf2bc0fcf3b79ef409" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: import_jobs PK_4d206c602f173f98e4bb85819a3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT "PK_4d206c602f173f98e4bb85819a3" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: scheduled_reports PK_4e9443d4280f94e84c7349300a6; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.scheduled_reports
    ADD CONSTRAINT "PK_4e9443d4280f94e84c7349300a6" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: reconciliation_runs PK_4edbdb165c9e754997036a4176a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.reconciliation_runs
    ADD CONSTRAINT "PK_4edbdb165c9e754997036a4176a" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: payrolls PK_4fc19dcf3522661435565b5ecf3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payrolls
    ADD CONSTRAINT "PK_4fc19dcf3522661435565b5ecf3" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: commission_calculations PK_545d76d26e3923d9cc712e15874; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.commission_calculations
    ADD CONSTRAINT "PK_545d76d26e3923d9cc712e15874" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: warehouses PK_56ae21ee2432b2270b48867e4be; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: agent_sessions PK_56f9e856ca24a6064c903044605; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.agent_sessions
    ADD CONSTRAINT "PK_56f9e856ca24a6064c903044605" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: operator_inventory PK_57117778b66af901c820a92c9f2; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.operator_inventory
    ADD CONSTRAINT "PK_57117778b66af901c820a92c9f2" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: stock_movements PK_57a26b190618550d8e65fb860e7; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: api_keys PK_5c8a79801b44bd27b79228e1dad; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: location_events PK_5d5f49548a71fb50f0a1ac19c5d; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_events
    ADD CONSTRAINT "PK_5d5f49548a71fb50f0a1ac19c5d" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: task_items PK_60212fc446f00e3002d69c9955b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_items
    ADD CONSTRAINT "PK_60212fc446f00e3002d69c9955b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: organization_audit_logs PK_6075f8a564952502b6302672f7c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.organization_audit_logs
    ADD CONSTRAINT "PK_6075f8a564952502b6302672f7c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: notification_queue PK_60a6aa02d8322bf9912101f47d3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT "PK_60a6aa02d8322bf9912101f47d3" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: trip_task_links PK_618b4812e0ad73911eef64972d9; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trip_task_links
    ADD CONSTRAINT "PK_618b4812e0ad73911eef64972d9" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: invoices PK_668cef7c22a427fd822cc1be3ce; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: inventory_adjustments PK_67a6cd67ec23f212ac3d124325e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT "PK_67a6cd67ec23f212ac3d124325e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: warehouse_inventory PK_68eed43c66d3da3931f9a10354c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouse_inventory
    ADD CONSTRAINT "PK_68eed43c66d3da3931f9a10354c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: client_loyalty_accounts PK_6936590f727f1b71cb2565fe35a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_loyalty_accounts
    ADD CONSTRAINT "PK_6936590f727f1b71cb2565fe35a" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: ai_provider_keys PK_69bf5ae5c33211f10d27b45a214; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.ai_provider_keys
    ADD CONSTRAINT "PK_69bf5ae5c33211f10d27b45a214" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: washing_schedules PK_6a22f8ac76fff086780ed009f10; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.washing_schedules
    ADD CONSTRAINT "PK_6a22f8ac76fff086780ed009f10" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: organizations PK_6b031fcd0863e3f6b44230163f9; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: notification_campaigns PK_6bd3e0649c6f3fb8caa63dd39ea; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notification_campaigns
    ADD CONSTRAINT "PK_6bd3e0649c6f3fb8caa63dd39ea" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: loyalty_promo_code_usages PK_6bf911f0710c81906524817a1f5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.loyalty_promo_code_usages
    ADD CONSTRAINT "PK_6bf911f0710c81906524817a1f5" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: files PK_6c16b9093a142e0e7613b04a3d9; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.files
    ADD CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: contractors PK_6dbfde8813cdc4c4689f1e1e503; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.contractors
    ADD CONSTRAINT "PK_6dbfde8813cdc4c4689f1e1e503" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: security_events PK_6fc100d6700780737348df0d3ae; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT "PK_6fc100d6700780737348df0d3ae" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: spare_parts PK_6fe9b0bb96e021d248731580f1b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT "PK_6fe9b0bb96e021d248731580f1b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: orders PK_710e2d4957aa5878dfe94e4ac2f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: analytics_snapshots PK_72ddc015c269977322f808a19a7; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT "PK_72ddc015c269977322f808a19a7" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: website_configs PK_7418ac10713ee27e04620c3bc0c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.website_configs
    ADD CONSTRAINT "PK_7418ac10713ee27e04620c3bc0c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: push_subscriptions PK_757fc8f00c34f66832668dc2e53; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT "PK_757fc8f00c34f66832668dc2e53" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: promo_code_redemptions PK_75fdf62e184f963a6cab7683a7b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.promo_code_redemptions
    ADD CONSTRAINT "PK_75fdf62e184f963a6cab7683a7b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: routes PK_76100511cdfa1d013c859f01d8b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.routes
    ADD CONSTRAINT "PK_76100511cdfa1d013c859f01d8b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: notification_templates PK_76f0fc48b8d057d2ae7f3a2848a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT "PK_76f0fc48b8d057d2ae7f3a2848a" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: fiscal_devices PK_774fd86601951ba9d15c64c13fb; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.fiscal_devices
    ADD CONSTRAINT "PK_774fd86601951ba9d15c64c13fb" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: machines PK_7b0817c674bb984650c5274e713; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machines
    ADD CONSTRAINT "PK_7b0817c674bb984650c5274e713" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: component_maintenance PK_7b8b13633a2274c839bcd985bc3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.component_maintenance
    ADD CONSTRAINT "PK_7b8b13633a2274c839bcd985bc3" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: machine_maintenance_schedules PK_7baaa31bacb40e869498fc245ce; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_maintenance_schedules
    ADD CONSTRAINT "PK_7baaa31bacb40e869498fc245ce" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: complaint_qr_codes PK_7c5b2ea67edf621528ea2b29793; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_qr_codes
    ADD CONSTRAINT "PK_7c5b2ea67edf621528ea2b29793" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: locations PK_7cc1c9e3853b94816c094825e74; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.locations
    ADD CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: location_contract_payments PK_7e14f9c8d68a8ea3faeaba3cc54; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_contract_payments
    ADD CONSTRAINT "PK_7e14f9c8d68a8ea3faeaba3cc54" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: task_photos PK_7f5609ef95ff8d5ca3eea7cf504; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_photos
    ADD CONSTRAINT "PK_7f5609ef95ff8d5ca3eea7cf504" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: organization_contracts PK_813807d5cffe628153e7cb1fc98; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.organization_contracts
    ADD CONSTRAINT "PK_813807d5cffe628153e7cb1fc98" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: inventory_counts PK_8230343330002d07a2efb485680; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT "PK_8230343330002d07a2efb485680" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: system_settings PK_82521f08790d248b2a80cc85d40; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT "PK_82521f08790d248b2a80cc85d40" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: departments PK_839517a681a86bb84cbcc6a1e9d; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: task_comments PK_83b99b0b03db29d4cafcb579b77; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT "PK_83b99b0b03db29d4cafcb579b77" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: access_templates PK_84c7ae40324fef1e13c84e0c94b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.access_templates
    ADD CONSTRAINT "PK_84c7ae40324fef1e13c84e0c94b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: maintenance_parts PK_857612b5819f8fef6b13dbb5226; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.maintenance_parts
    ADD CONSTRAINT "PK_857612b5819f8fef6b13dbb5226" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: sync_jobs PK_8586b15058c8811de6286052139; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.sync_jobs
    ADD CONSTRAINT "PK_8586b15058c8811de6286052139" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: machine_location_history PK_869391ba1f4c89b0d1023f32b88; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_location_history
    ADD CONSTRAINT "PK_869391ba1f4c89b0d1023f32b88" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: trip_stops PK_876633f878970267cb0dc525984; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trip_stops
    ADD CONSTRAINT "PK_876633f878970267cb0dc525984" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: favorites PK_890818d27523748dd36a4d1bdc8; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: integration_logs PK_89ba1967bb4ac6c412901cf29a5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT "PK_89ba1967bb4ac6c412901cf29a5" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: product_price_history PK_8ad05105010c053126d79113a5c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT "PK_8ad05105010c053126d79113a5c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: tasks PK_8d12ff38fcc62aaba2cab748772; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: machine_components PK_8dd9b4eee7904e6295a871c10c5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_components
    ADD CONSTRAINT "PK_8dd9b4eee7904e6295a871c10c5" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: recipes PK_8f09680a51bf3669c1598a21682; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT "PK_8f09680a51bf3669c1598a21682" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: recipe_ingredients PK_8f15a314e55970414fc92ffb532; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT "PK_8f15a314e55970414fc92ffb532" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: location_visits PK_92ac7e3ceb6b72a6ea762d26658; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_visits
    ADD CONSTRAINT "PK_92ac7e3ceb6b72a6ea762d26658" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: report_subscriptions PK_945d832ffd394d105d169eb47e3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.report_subscriptions
    ADD CONSTRAINT "PK_945d832ffd394d105d169eb47e3" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: fiscal_shifts PK_97723d77725ff9997bcc523dcef; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.fiscal_shifts
    ADD CONSTRAINT "PK_97723d77725ff9997bcc523dcef" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: hopper_types PK_97e7912ec42a9c75bb4695a52d5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.hopper_types
    ADD CONSTRAINT "PK_97e7912ec42a9c75bb4695a52d5" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: integrations PK_9adcdc6d6f3922535361ce641e8; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT "PK_9adcdc6d6f3922535361ce641e8" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: counterparties PK_9f045dc184ca2426af5e9dfb13b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.counterparties
    ADD CONSTRAINT "PK_9f045dc184ca2426af5e9dfb13b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: quests PK_a037497017b64f530fe09c75364; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.quests
    ADD CONSTRAINT "PK_a037497017b64f530fe09c75364" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: client_orders PK_a07244887e8ab7262ad9085fd08; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT "PK_a07244887e8ab7262ad9085fd08" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: warehouse_zones PK_a114809f670f1625d8f2faa8fc8; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouse_zones
    ADD CONSTRAINT "PK_a114809f670f1625d8f2faa8fc8" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: user_notification_settings PK_a195de67d093e096152f387afbd; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT "PK_a195de67d093e096152f387afbd" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: transactions PK_a219afd8dd77ed80f5a862f1db9; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: reconciliation_mismatches PK_a286752fc71b04a2c81c0fec3dd; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.reconciliation_mismatches
    ADD CONSTRAINT "PK_a286752fc71b04a2c81c0fec3dd" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: contractor_invoices PK_a2ff9ff16ae7bbd16bf46ef8441; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.contractor_invoices
    ADD CONSTRAINT "PK_a2ff9ff16ae7bbd16bf46ef8441" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: import_templates PK_a47e7a2d8919d644fcd6347109e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.import_templates
    ADD CONSTRAINT "PK_a47e7a2d8919d644fcd6347109e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: dashboard_widgets PK_a77038e4644617970badd975284; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.dashboard_widgets
    ADD CONSTRAINT "PK_a77038e4644617970badd975284" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: goods_classifiers PK_aa21abe25c8bfb525ea657a7200; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.goods_classifiers
    ADD CONSTRAINT "PK_aa21abe25c8bfb525ea657a7200" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: audit_alerts PK_abab64d8f1a8e3d1c5772722c62; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.audit_alerts
    ADD CONSTRAINT "PK_abab64d8f1a8e3d1c5772722c62" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: directory_entries PK_abc395692d7505c91ca93a26c66; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_entries
    ADD CONSTRAINT "PK_abc395692d7505c91ca93a26c66" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: two_factor_auth PK_ac930594b4dbe3771cf16cd108d; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.two_factor_auth
    ADD CONSTRAINT "PK_ac930594b4dbe3771cf16cd108d" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: location_zones PK_adca183701035dbd2491ea8d25e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_zones
    ADD CONSTRAINT "PK_adca183701035dbd2491ea8d25e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: alert_rules PK_ae580564f087ffab9d229225aec; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT "PK_ae580564f087ffab9d229225aec" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: custom_reports PK_ae93e392a2332df782588fd1d14; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.custom_reports
    ADD CONSTRAINT "PK_ae93e392a2332df782588fd1d14" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: inventory_reservations PK_af438c0ce596eea6c4d472a0489; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_reservations
    ADD CONSTRAINT "PK_af438c0ce596eea6c4d472a0489" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: stock_takes PK_afd37c89465f9b9caae8bad71a9; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.stock_takes
    ADD CONSTRAINT "PK_afd37c89465f9b9caae8bad71a9" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: directory_sources PK_b0d8e827c0a8e37e309c0e2bc65; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_sources
    ADD CONSTRAINT "PK_b0d8e827c0a8e37e309c0e2bc65" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: points_transactions PK_b368729603fe6bc50fdb6750b33; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT "PK_b368729603fe6bc50fdb6750b33" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: telegram_bot_analytics PK_b6896f6ac73b50ecdd9bcd52cdb; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_bot_analytics
    ADD CONSTRAINT "PK_b6896f6ac73b50ecdd9bcd52cdb" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: suppliers PK_b70ac51766a9e3144f778cfe81e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: inventory_report_presets PK_b76927879ec36c58692ee403e70; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_report_presets
    ADD CONSTRAINT "PK_b76927879ec36c58692ee403e70" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: agent_progress PK_b80466318f6ec5ee75d554d9fcc; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.agent_progress
    ADD CONSTRAINT "PK_b80466318f6ec5ee75d554d9fcc" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: employees PK_b9535a98350d5b26e7eb0c26af4; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: bin_content_history PK_ba9847fce803ce195a2d7a5f8de; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.bin_content_history
    ADD CONSTRAINT "PK_ba9847fce803ce195a2d7a5f8de" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: telegram_message_logs PK_bbe0d48a6241c022835c7bf27a8; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_message_logs
    ADD CONSTRAINT "PK_bbe0d48a6241c022835c7bf27a8" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: machine_location_syncs PK_bdd7e7677e8bf74a7a1e8240d26; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_location_syncs
    ADD CONSTRAINT "PK_bdd7e7677e8bf74a7a1e8240d26" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: transaction_daily_summaries PK_c052131a725bf85dc21efde6a0b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.transaction_daily_summaries
    ADD CONSTRAINT "PK_c052131a725bf85dc21efde6a0b" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: maintenance_requests PK_c1521eb67c471accae8c531f9fe; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT "PK_c1521eb67c471accae8c531f9fe" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: employee_documents PK_c19b36f5e604e261fb430293b68; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT "PK_c19b36f5e604e261fb430293b68" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: session_logs PK_c207b11fec303a8c7f04cab22c9; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.session_logs
    ADD CONSTRAINT "PK_c207b11fec303a8c7f04cab22c9" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: audit_alert_history PK_c27ff015bbd579cdba72497f07e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.audit_alert_history
    ADD CONSTRAINT "PK_c27ff015bbd579cdba72497f07e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: hw_imported_sales PK_c2e58d2feeaf7d03e51d3232da5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.hw_imported_sales
    ADD CONSTRAINT "PK_c2e58d2feeaf7d03e51d3232da5" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: payment_refunds PK_c33fe9426d69e3d60080c7d2f06; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT "PK_c33fe9426d69e3d60080c7d2f06" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: ikpu_codes PK_c49e7940618e58d6bef2f5b9b25; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.ikpu_codes
    ADD CONSTRAINT "PK_c49e7940618e58d6bef2f5b9b25" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: billing_payments PK_c4e4866a41953b04f9229b273ce; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.billing_payments
    ADD CONSTRAINT "PK_c4e4866a41953b04f9229b273ce" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: promo_codes PK_c7b4f01710fda5afa056a2b4a35; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT "PK_c7b4f01710fda5afa056a2b4a35" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: ingredient_batches PK_c990de48f9d8141514b51feff58; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.ingredient_batches
    ADD CONSTRAINT "PK_c990de48f9d8141514b51feff58" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: complaint_actions PK_c9af2fc9b08d31bd16a288fe75a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_actions
    ADD CONSTRAINT "PK_c9af2fc9b08d31bd16a288fe75a" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: incidents PK_ccb34c01719889017e2246469f9; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT "PK_ccb34c01719889017e2246469f9" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: task_components PK_cd0707306c41983f47e26c0c70c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_components
    ADD CONSTRAINT "PK_cd0707306c41983f47e26c0c70c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: telegram_payments PK_d05aa6b6dfe984f14c531cd231a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_payments
    ADD CONSTRAINT "PK_d05aa6b6dfe984f14c531cd231a" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: password_reset_tokens PK_d16bebd73e844c48bca50ff8d3d; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: daily_stats PK_d1830b57aa5fafc5cb26a09aa73; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT "PK_d1830b57aa5fafc5cb26a09aa73" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: import_sessions PK_d1e679263b8401aa5ff3fb583fe; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.import_sessions
    ADD CONSTRAINT "PK_d1e679263b8401aa5ff3fb583fe" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: time_off_requests PK_d2dc15201117320068bbc641715; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.time_off_requests
    ADD CONSTRAINT "PK_d2dc15201117320068bbc641715" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: payment_transactions PK_d32b3c6b0d2c1d22604cbcc8c49; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "PK_d32b3c6b0d2c1d22604cbcc8c49" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: leave_requests PK_d3abcf9a16cef1450129e06fa9f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "PK_d3abcf9a16cef1450129e06fa9f" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: bank_deposits PK_d5dbd6a64cd641795db6f971896; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.bank_deposits
    ADD CONSTRAINT "PK_d5dbd6a64cd641795db6f971896" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: stock_opening_balances PK_d7034c43e4195623cc96b79f8d4; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.stock_opening_balances
    ADD CONSTRAINT "PK_d7034c43e4195623cc96b79f8d4" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: inventory_movements PK_d7597827c1dcffae889db3ab873; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT "PK_d7597827c1dcffae889db3ab873" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: trip_anomalies PK_d838cb63230d71a35b9dece9ceb; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trip_anomalies
    ADD CONSTRAINT "PK_d838cb63230d71a35b9dece9ceb" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: directory_sync_logs PK_d88008a46a61dfffdbdabda56e1; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_sync_logs
    ADD CONSTRAINT "PK_d88008a46a61dfffdbdabda56e1" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: dividend_payments PK_d91b930e7dfd89061f42bfc59ac; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.dividend_payments
    ADD CONSTRAINT "PK_d91b930e7dfd89061f42bfc59ac" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: directories PK_d9318ce2673e948a761c266b63e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directories
    ADD CONSTRAINT "PK_d9318ce2673e948a761c266b63e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: material_request_items PK_d978a89b84dad12899d6a080a56; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.material_request_items
    ADD CONSTRAINT "PK_d978a89b84dad12899d6a080a56" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: telegram_users PK_dcba80e97f84ad7f9bc8f19f472; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT "PK_dcba80e97f84ad7f9bc8f19f472" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: access_template_rows PK_deb38b3cc7c5870ccdffdadc1c9; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.access_template_rows
    ADD CONSTRAINT "PK_deb38b3cc7c5870ccdffdadc1c9" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: vat_rates PK_e02b6a93f41d6d7f5f2fa1df535; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.vat_rates
    ADD CONSTRAINT "PK_e02b6a93f41d6d7f5f2fa1df535" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: inventory_count_items PK_e1e695e1a140cdc8b94542d4956; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT "PK_e1e695e1a140cdc8b94542d4956" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: inventory_difference_thresholds PK_e273d0e3aec5daf0dfbe0d4828f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_difference_thresholds
    ADD CONSTRAINT "PK_e273d0e3aec5daf0dfbe0d4828f" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: machine_slots PK_e3431c10494ae19a77e1c90a59f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_slots
    ADD CONSTRAINT "PK_e3431c10494ae19a77e1c90a59f" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: purchase_history PK_e5426ccc10998593a2714764ec6; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.purchase_history
    ADD CONSTRAINT "PK_e5426ccc10998593a2714764ec6" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: machine_error_logs PK_e6db9b46b68fa21035446fb7d5f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_error_logs
    ADD CONSTRAINT "PK_e6db9b46b68fa21035446fb7d5f" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: validation_rules PK_e716d3b67a48a975d22ecb7a0b5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.validation_rules
    ADD CONSTRAINT "PK_e716d3b67a48a975d22ecb7a0b5" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: client_payments PK_e7a0d65da19e18571b00b8a862c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_payments
    ADD CONSTRAINT "PK_e7a0d65da19e18571b00b8a862c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: complaint_templates PK_e8210292a26fdfe88eda7e583e6; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_templates
    ADD CONSTRAINT "PK_e8210292a26fdfe88eda7e583e6" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: maintenance_work_logs PK_e82a5fb32e7403ec9b7369d67c1; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.maintenance_work_logs
    ADD CONSTRAINT "PK_e82a5fb32e7403ec9b7369d67c1" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: user_sessions PK_e93e031a5fed190d4789b6bfd83; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: audit_retention_policies PK_ea3b2c71ed3fe7286b32b6246e3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.audit_retention_policies
    ADD CONSTRAINT "PK_ea3b2c71ed3fe7286b32b6246e3" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: referrals PK_ea9980e34f738b6252817326c08; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT "PK_ea9980e34f738b6252817326c08" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: collection_records PK_eaf757c7cd41e726b30309a6ec2; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.collection_records
    ADD CONSTRAINT "PK_eaf757c7cd41e726b30309a6ec2" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: notification_rules PK_eb87ba4f7f01eabf003fcf4e65c; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT "PK_eb87ba4f7f01eabf003fcf4e65c" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: loyalty_promo_codes PK_ec913a4895dbb9a5258b589fb2e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.loyalty_promo_codes
    ADD CONSTRAINT "PK_ec913a4895dbb9a5258b589fb2e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: complaint_automation_rules PK_ecaac01c3f282c54aacafde2506; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_automation_rules
    ADD CONSTRAINT "PK_ecaac01c3f282c54aacafde2506" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: machine_access PK_ecbad5fb688c2cbcfd1e35d8279; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_access
    ADD CONSTRAINT "PK_ecbad5fb688c2cbcfd1e35d8279" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: audit_sessions PK_edfdd76908c4e6139251775c0e2; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.audit_sessions
    ADD CONSTRAINT "PK_edfdd76908c4e6139251775c0e2" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: operator_ratings PK_efe0edd9e7a5027477926618f7e; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.operator_ratings
    ADD CONSTRAINT "PK_efe0edd9e7a5027477926618f7e" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: audit_reports PK_f01b07a42c31f9273ac35cf9b81; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.audit_reports
    ADD CONSTRAINT "PK_f01b07a42c31f9273ac35cf9b81" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: data_encryption PK_f0c1adbffb8707765fe92c2fdf4; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.data_encryption
    ADD CONSTRAINT "PK_f0c1adbffb8707765fe92c2fdf4" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: organization_invitations PK_f172f12b8a9ee6584b661f57e24; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.organization_invitations
    ADD CONSTRAINT "PK_f172f12b8a9ee6584b661f57e24" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: work_logs PK_f4f3234af57451baa20576887be; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.work_logs
    ADD CONSTRAINT "PK_f4f3234af57451baa20576887be" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: trip_points PK_f545e8804e4ec782e6dbcb833df; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trip_points
    ADD CONSTRAINT "PK_f545e8804e4ec782e6dbcb833df" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: trips PK_f71c231dee9c05a9522f9e840f5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: complaint_comments PK_f78297102d686643a5c4f4ede67; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_comments
    ADD CONSTRAINT "PK_f78297102d686643a5c4f4ede67" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: access_requests PK_f89e51c15e3dbea13aa248fe128; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT "PK_f89e51c15e3dbea13aa248fe128" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: telegram_settings PK_f8e8f766f24321de5415d19ddb7; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_settings
    ADD CONSTRAINT "PK_f8e8f766f24321de5415d19ddb7" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: report_definitions PK_fa3c447eb43b86f206b4f54f033; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.report_definitions
    ADD CONSTRAINT "PK_fa3c447eb43b86f206b4f54f033" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: location_contracts PK_fcc9cb11faa5b8187d29454db25; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_contracts
    ADD CONSTRAINT "PK_fcc9cb11faa5b8187d29454db25" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: client_users PK_fe74bfd4d01077395ee4204b553; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_users
    ADD CONSTRAINT "PK_fe74bfd4d01077395ee4204b553" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: complaint_refunds PK_fe97783687363321763df94be38; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_refunds
    ADD CONSTRAINT "PK_fe97783687363321763df94be38" PRIMARY KEY (id);`);
    await queryRunner.query(`-- Name: transaction_items PK_ff5a487ad820dccafd53bebf578; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT "PK_ff5a487ad820dccafd53bebf578" PRIMARY KEY (id);`);

    // ── Unique Constraints (61) ──
    await queryRunner.query(`-- Name: push_subscriptions UQ_0008bdfd174e533a3f98bf9af16; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT "UQ_0008bdfd174e533a3f98bf9af16" UNIQUE (endpoint);`);
    await queryRunner.query(`-- Name: vat_rates UQ_054a791d611b9c991ff5fae6858; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.vat_rates
    ADD CONSTRAINT "UQ_054a791d611b9c991ff5fae6858" UNIQUE (code);`);
    await queryRunner.query(`-- Name: cms_articles UQ_13b50e3b2094783f3af45fe9327; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.cms_articles
    ADD CONSTRAINT "UQ_13b50e3b2094783f3af45fe9327" UNIQUE (slug);`);
    await queryRunner.query(`-- Name: users UQ_1a1e4649fd31ea6ec6b025c7bfc; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_1a1e4649fd31ea6ec6b025c7bfc" UNIQUE (telegram_id);`);
    await queryRunner.query(`-- Name: client_users UQ_1b08a71cf48cbbd139d4742d61a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_users
    ADD CONSTRAINT "UQ_1b08a71cf48cbbd139d4742d61a" UNIQUE (email);`);
    await queryRunner.query(`-- Name: locations UQ_1c65ef243169e51b514c814eeae; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.locations
    ADD CONSTRAINT "UQ_1c65ef243169e51b514c814eeae" UNIQUE (code);`);
    await queryRunner.query(`-- Name: location_zones UQ_206ac2e1d13cd5a4da6465046f5; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_zones
    ADD CONSTRAINT "UQ_206ac2e1d13cd5a4da6465046f5" UNIQUE (code);`);
    await queryRunner.query(`-- Name: stock_takes UQ_249c7b9ad301da305673eaf11ba; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.stock_takes
    ADD CONSTRAINT "UQ_249c7b9ad301da305673eaf11ba" UNIQUE (stock_take_number);`);
    await queryRunner.query(`-- Name: complaint_refunds UQ_24dc601046a70492cb556cff2f8; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_refunds
    ADD CONSTRAINT "UQ_24dc601046a70492cb556cff2f8" UNIQUE (refund_number);`);
    await queryRunner.query(`-- Name: promo_codes UQ_2f096c406a9d9d5b8ce204190c3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT "UQ_2f096c406a9d9d5b8ce204190c3" UNIQUE (code);`);
    await queryRunner.query(`-- Name: favorites UQ_2fc28f6f5b938f0a32ec9e7eac2; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT "UQ_2fc28f6f5b938f0a32ec9e7eac2" UNIQUE (user_id, type, product_id, machine_id);`);
    await queryRunner.query(`-- Name: session_logs UQ_38a64677f5a54fa001e06f50743; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.session_logs
    ADD CONSTRAINT "UQ_38a64677f5a54fa001e06f50743" UNIQUE (session_id);`);
    await queryRunner.query(`-- Name: payment_providers UQ_3b92bdeea5c610e84052154ef25; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_providers
    ADD CONSTRAINT "UQ_3b92bdeea5c610e84052154ef25" UNIQUE (code);`);
    await queryRunner.query(`-- Name: complaints UQ_40eb950815d445357e188daa3ec; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT "UQ_40eb950815d445357e188daa3ec" UNIQUE (ticket_number);`);
    await queryRunner.query(`-- Name: client_wallets UQ_4b4c42e6b79e55afe9a10c7cd21; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_wallets
    ADD CONSTRAINT "UQ_4b4c42e6b79e55afe9a10c7cd21" UNIQUE (client_user_id);`);
    await queryRunner.query(`-- Name: inventory_counts UQ_4b6745cce257838b087759600ed; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT "UQ_4b6745cce257838b087759600ed" UNIQUE (count_number);`);
    await queryRunner.query(`-- Name: client_users UQ_50905ca53c7557775159deb5708; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_users
    ADD CONSTRAINT "UQ_50905ca53c7557775159deb5708" UNIQUE (phone);`);
    await queryRunner.query(`-- Name: user_notification_settings UQ_52182ffd0f785e8256f8fcb4fd6; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT "UQ_52182ffd0f785e8256f8fcb4fd6" UNIQUE (user_id);`);
    await queryRunner.query(`-- Name: client_users UQ_5283338b59878671ab12ecd3eff; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_users
    ADD CONSTRAINT "UQ_5283338b59878671ab12ecd3eff" UNIQUE (telegram_id);`);
    await queryRunner.query(`-- Name: ikpu_codes UQ_52d2b2e3303c81fd0aabd7defca; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.ikpu_codes
    ADD CONSTRAINT "UQ_52d2b2e3303c81fd0aabd7defca" UNIQUE (code);`);
    await queryRunner.query(`-- Name: location_contracts UQ_56d635906071d2d8a122ed3b987; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_contracts
    ADD CONSTRAINT "UQ_56d635906071d2d8a122ed3b987" UNIQUE (contract_number);`);
    await queryRunner.query(`-- Name: api_keys UQ_57384430aa1959f4578046c9b81; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "UQ_57384430aa1959f4578046c9b81" UNIQUE (key_hash);`);
    await queryRunner.query(`-- Name: inventory_adjustments UQ_59bbd310c8a726bb68efdc5254a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT "UQ_59bbd310c8a726bb68efdc5254a" UNIQUE (adjustment_number);`);
    await queryRunner.query(`-- Name: two_factor_auth UQ_64385b800e675d22928d1e1cecf; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.two_factor_auth
    ADD CONSTRAINT "UQ_64385b800e675d22928d1e1cecf" UNIQUE (user_id);`);
    await queryRunner.query(`-- Name: generated_reports UQ_660cb24d7b11b62ea82e2973614; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT "UQ_660cb24d7b11b62ea82e2973614" UNIQUE (report_number);`);
    await queryRunner.query(`-- Name: warehouse_inventory UQ_677c92821c31bc787da9f48c518; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouse_inventory
    ADD CONSTRAINT "UQ_677c92821c31bc787da9f48c518" UNIQUE (organization_id, product_id);`);
    await queryRunner.query(`-- Name: orders UQ_75eba1c6b1a66b09f2a97e6927b; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "UQ_75eba1c6b1a66b09f2a97e6927b" UNIQUE (order_number);`);
    await queryRunner.query(`-- Name: complaint_qr_codes UQ_78372737aff010cb892331c0d2f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_qr_codes
    ADD CONSTRAINT "UQ_78372737aff010cb892331c0d2f" UNIQUE (code);`);
    await queryRunner.query(`-- Name: material_requests UQ_847e23381f3167aeb6ed86f1510; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.material_requests
    ADD CONSTRAINT "UQ_847e23381f3167aeb6ed86f1510" UNIQUE (request_number);`);
    await queryRunner.query(`-- Name: telegram_users UQ_88256a651008c00c1eea23e0b61; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT "UQ_88256a651008c00c1eea23e0b61" UNIQUE (telegram_id);`);
    await queryRunner.query(`-- Name: employees UQ_8878710dc844ecd6f9e587f34fc; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "UQ_8878710dc844ecd6f9e587f34fc" UNIQUE (employee_number);`);
    await queryRunner.query(`-- Name: stock_reservations UQ_8d2b3daa888aaf3441d93205a94; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT "UQ_8d2b3daa888aaf3441d93205a94" UNIQUE (reservation_number);`);
    await queryRunner.query(`-- Name: goods_classifiers UQ_907cfad3314b412ad3de1b08679; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.goods_classifiers
    ADD CONSTRAINT "UQ_907cfad3314b412ad3de1b08679" UNIQUE (code);`);
    await queryRunner.query(`-- Name: departments UQ_91fddbe23e927e1e525c152baa3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "UQ_91fddbe23e927e1e525c152baa3" UNIQUE (code);`);
    await queryRunner.query(`-- Name: daily_stats UQ_939a107ba7471a73cbc2d0580f3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT "UQ_939a107ba7471a73cbc2d0580f3" UNIQUE (stat_date, organization_id);`);
    await queryRunner.query(`-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);`);
    await queryRunner.query(`-- Name: timesheets UQ_994df8f46f687a00801c46e2204; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.timesheets
    ADD CONSTRAINT "UQ_994df8f46f687a00801c46e2204" UNIQUE (timesheet_number);`);
    await queryRunner.query(`-- Name: time_off_requests UQ_9d8f9dbffc9c901eb6c35adffd1; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.time_off_requests
    ADD CONSTRAINT "UQ_9d8f9dbffc9c901eb6c35adffd1" UNIQUE (request_number);`);
    await queryRunner.query(`-- Name: telegram_settings UQ_9ebad42ecd66a1cad9b8dd6be57; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_settings
    ADD CONSTRAINT "UQ_9ebad42ecd66a1cad9b8dd6be57" UNIQUE (setting_key);`);
    await queryRunner.query(`-- Name: user_achievements UQ_a103993b75768d942744e4b3b40; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "UQ_a103993b75768d942744e4b3b40" UNIQUE (user_id, achievement_id);`);
    await queryRunner.query(`-- Name: client_orders UQ_a204259413174b9680f72cd17f6; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT "UQ_a204259413174b9680f72cd17f6" UNIQUE (order_number);`);
    await queryRunner.query(`-- Name: referrals UQ_a53a83849f95cbcf3fbcf32fd0a; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT "UQ_a53a83849f95cbcf3fbcf32fd0a" UNIQUE (code);`);
    await queryRunner.query(`-- Name: tasks UQ_ae394f93fcb0a172c55ee28339d; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "UQ_ae394f93fcb0a172c55ee28339d" UNIQUE (task_number);`);
    await queryRunner.query(`-- Name: api_keys UQ_b99bbb8e545065a99b409dbc5d8; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "UQ_b99bbb8e545065a99b409dbc5d8" UNIQUE (key_prefix);`);
    await queryRunner.query(`-- Name: users UQ_ba10055f9ef9690e77cf6445cba; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_ba10055f9ef9690e77cf6445cba" UNIQUE (referral_code);`);
    await queryRunner.query(`-- Name: client_loyalty_accounts UQ_c8873cde649332303fbc228e884; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_loyalty_accounts
    ADD CONSTRAINT "UQ_c8873cde649332303fbc228e884" UNIQUE (client_user_id);`);
    await queryRunner.query(`-- Name: operator_inventory UQ_c88d6e46e98ca0520485b54ec63; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.operator_inventory
    ADD CONSTRAINT "UQ_c88d6e46e98ca0520485b54ec63" UNIQUE (organization_id, operator_id, product_id);`);
    await queryRunner.query(`-- Name: agent_sessions UQ_cd1a671c7e6c5f7c8dd83887edb; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.agent_sessions
    ADD CONSTRAINT "UQ_cd1a671c7e6c5f7c8dd83887edb" UNIQUE (session_id);`);
    await queryRunner.query(`-- Name: integration_templates UQ_cd2241a0eb6ba48e11f9e1eb7e8; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.integration_templates
    ADD CONSTRAINT "UQ_cd2241a0eb6ba48e11f9e1eb7e8" UNIQUE (name);`);
    await queryRunner.query(`-- Name: import_jobs UQ_ce6e1cdb9f668b9562281d137e8; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT "UQ_ce6e1cdb9f668b9562281d137e8" UNIQUE (job_number);`);
    await queryRunner.query(`-- Name: contractor_invoices UQ_d81b8173cb6ef6b402a74869940; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.contractor_invoices
    ADD CONSTRAINT "UQ_d81b8173cb6ef6b402a74869940" UNIQUE (invoice_number);`);
    await queryRunner.query(`-- Name: maintenance_requests UQ_d9a39d56a3d86d1f2d61babe3c2; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT "UQ_d9a39d56a3d86d1f2d61babe3c2" UNIQUE (request_number);`);
    await queryRunner.query(`-- Name: report_definitions UQ_db2158da24366b3936126554959; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.report_definitions
    ADD CONSTRAINT "UQ_db2158da24366b3936126554959" UNIQUE (code);`);
    await queryRunner.query(`-- Name: positions UQ_e21258bdc3692b44960c623940f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.positions
    ADD CONSTRAINT "UQ_e21258bdc3692b44960c623940f" UNIQUE (code);`);
    await queryRunner.query(`-- Name: package_types UQ_e57e09325c33cf6ff3e78599c81; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.package_types
    ADD CONSTRAINT "UQ_e57e09325c33cf6ff3e78599c81" UNIQUE (code);`);
    await queryRunner.query(`-- Name: notifications UQ_eaedfe19f0f765d26afafa85956; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "UQ_eaedfe19f0f765d26afafa85956" UNIQUE (notification_id);`);
    await queryRunner.query(`-- Name: user_quests UQ_ef494681de3ea6734825e880429; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_quests
    ADD CONSTRAINT "UQ_ef494681de3ea6734825e880429" UNIQUE (user_id, quest_id, period_start);`);
    await queryRunner.query(`-- Name: machine_inventory UQ_ef570aa7b5794acc088e910ac36; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_inventory
    ADD CONSTRAINT "UQ_ef570aa7b5794acc088e910ac36" UNIQUE (organization_id, machine_id, product_id);`);
    await queryRunner.query(`-- Name: inventory_reservations UQ_f87771fd10298e31d6f2e08961f; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_reservations
    ADD CONSTRAINT "UQ_f87771fd10298e31d6f2e08961f" UNIQUE (reservation_number);`);
    await queryRunner.query(`-- Name: users UQ_fe0bb3f6520ee0469504521e710; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE (username);`);
    await queryRunner.query(`-- Name: user_achievements UQ_user_achievement; Type: CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "UQ_user_achievement" UNIQUE (user_id, achievement_id);`);

    // ── Indexes (744) ──
    await queryRunner.query(`-- Name: IDX_0008bdfd174e533a3f98bf9af1; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_0008bdfd174e533a3f98bf9af1" ON public.push_subscriptions USING btree (endpoint);`);
    await queryRunner.query(`-- Name: IDX_003e599a9fc0e8f154b6313639; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_003e599a9fc0e8f154b6313639" ON public.favorites USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_003eb4c04a36d6a6d6dbbf1a6b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_003eb4c04a36d6a6d6dbbf1a6b" ON public.promo_code_redemptions USING btree (promo_code_id, client_user_id);`);
    await queryRunner.query(`-- Name: IDX_005371020edbeff27e9f10925d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_005371020edbeff27e9f10925d" ON public.referrals USING btree (referrer_id, status);`);
    await queryRunner.query(`-- Name: IDX_00aff5f4f5a6ef7fe260af5a61; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_00aff5f4f5a6ef7fe260af5a61" ON public.time_off_requests USING btree (organization_id, employee_id);`);
    await queryRunner.query(`-- Name: IDX_00dfdbf250684b4409d388c044; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_00dfdbf250684b4409d388c044" ON public.audit_alert_history USING btree (alert_id);`);
    await queryRunner.query(`-- Name: IDX_01824033fc0756bf6b89a7825b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_01824033fc0756bf6b89a7825b" ON public.machine_maintenance_schedules USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_0203a72d5b60f5caebd91906f6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0203a72d5b60f5caebd91906f6" ON public.stock_movements USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_027964fc28560d4d68a0de5ce3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_027964fc28560d4d68a0de5ce3" ON public.transaction_items USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_028ef94bd4b2afbbd48e1f85c9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_028ef94bd4b2afbbd48e1f85c9" ON public.inventory_batches USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_02ad1b333b3e81ca6ea91345fa; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_02ad1b333b3e81ca6ea91345fa" ON public.inventory_reservations USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_02b9fb3753249279d235840e84; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_02b9fb3753249279d235840e84" ON public.complaint_qr_codes USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_02d46f0981e9959a407a251c17; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_02d46f0981e9959a407a251c17" ON public.organization_contracts USING btree (counterparty_id);`);
    await queryRunner.query(`-- Name: IDX_03086122b1e79404dc0dc63684; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_03086122b1e79404dc0dc63684" ON public.fiscal_shifts USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_03100b9371022fc5cfd85f776d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_03100b9371022fc5cfd85f776d" ON public.hw_imported_sales USING btree (sale_date);`);
    await queryRunner.query(`-- Name: IDX_0339137136f1a856420218557e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0339137136f1a856420218557e" ON public.inventory_movements USING btree (movement_type);`);
    await queryRunner.query(`-- Name: IDX_0457ee681a50419881ea2ee796; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0457ee681a50419881ea2ee796" ON public.invoices USING btree (due_date);`);
    await queryRunner.query(`-- Name: IDX_04d886c2c8ef15e01e40691932; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_04d886c2c8ef15e01e40691932" ON public.machines USING btree (serial_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_0512f3afb804d8ec6a5bfc77b4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0512f3afb804d8ec6a5bfc77b4" ON public.fiscal_receipts USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_0529f019377be7d05a7c329b85; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0529f019377be7d05a7c329b85" ON public.directories USING btree (type);`);
    await queryRunner.query(`-- Name: IDX_055924f2446dd4bb5084553cbf; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_055924f2446dd4bb5084553cbf" ON public.hw_imported_sales USING btree (machine_code);`);
    await queryRunner.query(`-- Name: IDX_0571ac62f396e19805ee5ccc90; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0571ac62f396e19805ee5ccc90" ON public.machine_error_logs USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_05b18f38db1644977f178ea9ac; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_05b18f38db1644977f178ea9ac" ON public.component_movements USING btree (moved_at);`);
    await queryRunner.query(`-- Name: IDX_06b3016ed70149b8c000de1f27; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_06b3016ed70149b8c000de1f27" ON public.data_encryption USING btree (field_name);`);
    await queryRunner.query(`-- Name: IDX_07a29362eb14e05acb4af148ce; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_07a29362eb14e05acb4af148ce" ON public.contractor_invoices USING btree (contractor_id);`);
    await queryRunner.query(`-- Name: IDX_07dd038b9d30dfa20da2849f1e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_07dd038b9d30dfa20da2849f1e" ON public.website_configs USING btree (organization_id, section);`);
    await queryRunner.query(`-- Name: IDX_07e866497195e23133ba8ed50d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_07e866497195e23133ba8ed50d" ON public.stock_opening_balances USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_07ff0d4347a198527663bda63d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_07ff0d4347a198527663bda63d" ON public.task_comments USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_08bb949889ab3a944637db8303; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_08bb949889ab3a944637db8303" ON public.ingredient_batches USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_0908f3584c3773a234002cbec5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0908f3584c3773a234002cbec5" ON public.contractors USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_09204a0ce8cd7e73a55e3482f3; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_09204a0ce8cd7e73a55e3482f3" ON public.contracts USING btree (contract_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_09fe65c0684782b299df75a496; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_09fe65c0684782b299df75a496" ON public.work_logs USING btree (employee_id, work_date);`);
    await queryRunner.query(`-- Name: IDX_0a0d83baed7a608f036a16dcfe; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0a0d83baed7a608f036a16dcfe" ON public.quests USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_0a0ecda0a1ad4e36470bfba26b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0a0ecda0a1ad4e36470bfba26b" ON public.ingredient_batches USING btree (expiry_date);`);
    await queryRunner.query(`-- Name: IDX_0a4cfcf45a37df52df92addfb1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0a4cfcf45a37df52df92addfb1" ON public.session_logs USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_0ac4d4b745bc6775101f5abb75; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0ac4d4b745bc6775101f5abb75" ON public.machines USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_0aedff58b23995504f9dc99f75; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0aedff58b23995504f9dc99f75" ON public.login_attempts USING btree (email);`);
    await queryRunner.query(`-- Name: IDX_0b811063c6acc8021c038b40b4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0b811063c6acc8021c038b40b4" ON public.sales_imports USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_0bb5f5b4a546e69ae204d754ce; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0bb5f5b4a546e69ae204d754ce" ON public.equipment_components USING btree (serial_number);`);
    await queryRunner.query(`-- Name: IDX_0c4ec1b4b9a4008673260ee4e7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0c4ec1b4b9a4008673260ee4e7" ON public.audit_alerts USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_0caa44f67a16661e4e2cad2ed5; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_0caa44f67a16661e4e2cad2ed5" ON public.organizations USING btree (inn) WHERE ((inn IS NOT NULL) AND (deleted_at IS NULL));`);
    await queryRunner.query(`-- Name: IDX_0cef917ae373767ec67faf9789; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0cef917ae373767ec67faf9789" ON public.telegram_message_logs USING btree (message_type, status);`);
    await queryRunner.query(`-- Name: IDX_0d5e8935aa595468a0b86cf212; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_0d5e8935aa595468a0b86cf212" ON public.vehicles USING btree (organization_id, plate_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_0d7287b1cc92d41e3b0792401b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0d7287b1cc92d41e3b0792401b" ON public.directory_sync_logs USING btree (directory_id);`);
    await queryRunner.query(`-- Name: IDX_0e4d8f5997bf931466eff7587e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0e4d8f5997bf931466eff7587e" ON public.orders USING btree (machine_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_0ef3c4332ae24536da18c7822d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0ef3c4332ae24536da18c7822d" ON public.machine_location_syncs USING btree (vhm24_machine_id);`);
    await queryRunner.query(`-- Name: IDX_0f3b6323c98bbf0239d6a5060b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0f3b6323c98bbf0239d6a5060b" ON public.user_notification_settings USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_0f581511ac19ecb02dab437cd4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0f581511ac19ecb02dab437cd4" ON public.payment_transactions USING btree (order_id);`);
    await queryRunner.query(`-- Name: IDX_0f7b66f17920bd2a534e5575a0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_0f7b66f17920bd2a534e5575a0" ON public.collections USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_1053b5bac93e2530c446cdcda2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1053b5bac93e2530c446cdcda2" ON public.work_logs USING btree (work_date);`);
    await queryRunner.query(`-- Name: IDX_1095e4a0c6b17363448f028db1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1095e4a0c6b17363448f028db1" ON public.trip_reconciliations USING btree (vehicle_id);`);
    await queryRunner.query(`-- Name: IDX_10a23630b4d9d87c95b3c3628e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_10a23630b4d9d87c95b3c3628e" ON public.access_requests USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_10aca48427ccc267796bf5b631; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_10aca48427ccc267796bf5b631" ON public.promo_codes USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_10adecd1236c82f60a15ca1d47; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_10adecd1236c82f60a15ca1d47" ON public.reconciliation_mismatches USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_10ed89fa3ea4e9f4fc9344b92a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_10ed89fa3ea4e9f4fc9344b92a" ON public.inventory_batches USING btree (expiry_date);`);
    await queryRunner.query(`-- Name: IDX_11881e8eecce8b26b53cb41c10; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_11881e8eecce8b26b53cb41c10" ON public.containers USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_120d5922b2ea0533228062306a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_120d5922b2ea0533228062306a" ON public.payment_refunds USING btree (payment_transaction_id);`);
    await queryRunner.query(`-- Name: IDX_121d7826393316d089f4cad4d6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_121d7826393316d089f4cad4d6" ON public.user_quests USING btree (quest_id, status);`);
    await queryRunner.query(`-- Name: IDX_1223f0e61631826b9dafb89e77; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1223f0e61631826b9dafb89e77" ON public.warehouse_bins USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_129c621c26fad8f2ca9347f43f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_129c621c26fad8f2ca9347f43f" ON public.reconciliation_mismatches USING btree (run_id);`);
    await queryRunner.query(`-- Name: IDX_133545365243061dc2c55dc137; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_133545365243061dc2c55dc137" ON public.recipe_ingredients USING btree (ingredient_id);`);
    await queryRunner.query(`-- Name: IDX_13eeae011fbfa4491157ea2dd5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_13eeae011fbfa4491157ea2dd5" ON public.generated_reports USING btree (definition_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_13f7b0c83a2021f662e1ff3c41; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_13f7b0c83a2021f662e1ff3c41" ON public.cms_articles USING btree (organization_id, category);`);
    await queryRunner.query(`-- Name: IDX_145f35b204c731ba7fc1a0be0e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_145f35b204c731ba7fc1a0be0e" ON public.audit_logs USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_148ee02399918b869f27b9673e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_148ee02399918b869f27b9673e" ON public.notifications USING btree (user_id, status);`);
    await queryRunner.query(`-- Name: IDX_14c56fd4f33ec104368efee5f1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_14c56fd4f33ec104368efee5f1" ON public.inventory_counts USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_151e3f097d5951781e58d80a4e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_151e3f097d5951781e58d80a4e" ON public.report_subscriptions USING btree (scheduled_report_id);`);
    await queryRunner.query(`-- Name: IDX_15ca4e68803c84170f17a5edd6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_15ca4e68803c84170f17a5edd6" ON public.maintenance_work_logs USING btree (work_date);`);
    await queryRunner.query(`-- Name: IDX_15fdd7323bb78f9c4464a02782; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_15fdd7323bb78f9c4464a02782" ON public.trips USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_16e11ae00659f2ad463f8f384a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_16e11ae00659f2ad463f8f384a" ON public.product_price_history USING btree (effective_from);`);
    await queryRunner.query(`-- Name: IDX_17022daf3f885f7d35423e9971; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON public.role_permissions USING btree (permission_id);`);
    await queryRunner.query(`-- Name: IDX_177e3667c2d6ea987b5b3a851f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_177e3667c2d6ea987b5b3a851f" ON public.task_photos USING btree (task_id);`);
    await queryRunner.query(`-- Name: IDX_178199805b901ccd220ab7740e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON public.role_permissions USING btree (role_id);`);
    await queryRunner.query(`-- Name: IDX_17c66e770946a5eb381ee3250c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_17c66e770946a5eb381ee3250c" ON public.telegram_payments USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_185f53105548b6793b05e02dee; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_185f53105548b6793b05e02dee" ON public.notification_queue USING btree (retry_count, status);`);
    await queryRunner.query(`-- Name: IDX_18af9fcaffac6d6d3b28130e14; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_18af9fcaffac6d6d3b28130e14" ON public.referrals USING btree (referrer_id);`);
    await queryRunner.query(`-- Name: IDX_18b67510a1850a0e8ef9c81fdb; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_18b67510a1850a0e8ef9c81fdb" ON public.users USING btree (username) WHERE (username IS NOT NULL);`);
    await queryRunner.query(`-- Name: IDX_1909f45dffbe33636328b0c57f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1909f45dffbe33636328b0c57f" ON public.telegram_message_logs USING btree (chat_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_198957f5c5a1fa53aeaf2a0838; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_198957f5c5a1fa53aeaf2a0838" ON public.vehicles USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_19d5ffc619169b1d3d2e722b10; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_19d5ffc619169b1d3d2e722b10" ON public.complaint_comments USING btree (complaint_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_19e34090f83e0007e75d21c006; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_19e34090f83e0007e75d21c006" ON public.payment_transactions USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_19f6b66df9442ef171a36451e3; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_19f6b66df9442ef171a36451e3" ON public.audit_retention_policies USING btree (organization_id, entity_type);`);
    await queryRunner.query(`-- Name: IDX_1a2a99411da527ab442b1c919b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1a2a99411da527ab442b1c919b" ON public.stock_opening_balances USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_1a802bc2e16fceacdc3b0b7648; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_1a802bc2e16fceacdc3b0b7648" ON public.website_configs USING btree (organization_id, key) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_1b740b61aec7100c70f89d413d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1b740b61aec7100c70f89d413d" ON public.fiscal_shifts USING btree (organization_id, opened_at);`);
    await queryRunner.query(`-- Name: IDX_1bbba3340f18aee929f3ab77d3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1bbba3340f18aee929f3ab77d3" ON public.client_orders USING btree (client_user_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_1bc0c2bf70548d94bed76ef064; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_1bc0c2bf70548d94bed76ef064" ON public.machines USING btree (qr_code) WHERE ((deleted_at IS NULL) AND (qr_code IS NOT NULL));`);
    await queryRunner.query(`-- Name: IDX_1d4adc26e33f119d8534fecd3f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1d4adc26e33f119d8534fecd3f" ON public.fiscal_receipts USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_1d883fa09e29792824becad1fe; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1d883fa09e29792824becad1fe" ON public.operator_inventory USING btree (operator_id);`);
    await queryRunner.query(`-- Name: IDX_1e1efa912719d36a7ae75cb130; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1e1efa912719d36a7ae75cb130" ON public.saved_report_filters USING btree (organization_id, user_id);`);
    await queryRunner.query(`-- Name: IDX_1e43d2b07fc0ed4aea56117dc9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1e43d2b07fc0ed4aea56117dc9" ON public.collection_records USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_1e59fa4cd002abcf4ea11e9fea; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1e59fa4cd002abcf4ea11e9fea" ON public.warehouse_zones USING btree (organization_id, zone_type);`);
    await queryRunner.query(`-- Name: IDX_1e9de13bac402d95dad6f116e0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1e9de13bac402d95dad6f116e0" ON public.trips USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_1f3f518a9ddb1ae1e15492d54a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1f3f518a9ddb1ae1e15492d54a" ON public.products USING btree (is_ingredient);`);
    await queryRunner.query(`-- Name: IDX_1f49d9b216d725febd8b16db3c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1f49d9b216d725febd8b16db3c" ON public.trip_stops USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_1f5dc163c1da61527d08b6936f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1f5dc163c1da61527d08b6936f" ON public.recipe_snapshots USING btree (valid_from);`);
    await queryRunner.query(`-- Name: IDX_1f605725b9502e832483c2e823; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1f605725b9502e832483c2e823" ON public.import_sessions USING btree (organization_id, domain);`);
    await queryRunner.query(`-- Name: IDX_1f6b02c86005dda9781001a2e6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1f6b02c86005dda9781001a2e6" ON public.collections USING btree (machine_id, collected_at);`);
    await queryRunner.query(`-- Name: IDX_1fa76e3a0e9f3afc4c1f34b1e1; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_1fa76e3a0e9f3afc4c1f34b1e1" ON public.recipe_snapshots USING btree (recipe_id, version);`);
    await queryRunner.query(`-- Name: IDX_1fc05dab6c209918c2d88130db; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_1fc05dab6c209918c2d88130db" ON public.trip_points USING btree (trip_id, recorded_at);`);
    await queryRunner.query(`-- Name: IDX_20365ed7562812826af747998a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_20365ed7562812826af747998a" ON public.user_achievements USING btree (user_id, unlocked_at);`);
    await queryRunner.query(`-- Name: IDX_205522788c81d9fcb7a2fc32d2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_205522788c81d9fcb7a2fc32d2" ON public.commissions USING btree (contract_id);`);
    await queryRunner.query(`-- Name: IDX_20c702ec6648f2fca5caf13982; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_20c702ec6648f2fca5caf13982" ON public.trip_anomalies USING btree (type);`);
    await queryRunner.query(`-- Name: IDX_210905985d10aa14aefff3fd44; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_210905985d10aa14aefff3fd44" ON public.component_movements USING btree (component_id);`);
    await queryRunner.query(`-- Name: IDX_211e6fd90f1265bb68aa4dffe0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_211e6fd90f1265bb68aa4dffe0" ON public.payment_refunds USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_21a659804ed7bf61eb91688dea; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_21a659804ed7bf61eb91688dea" ON public.users USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_21d3fca82a1f4fd6008fd3175f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_21d3fca82a1f4fd6008fd3175f" ON public.incidents USING btree (reported_at);`);
    await queryRunner.query(`-- Name: IDX_221a06777c190567ac242ba926; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_221a06777c190567ac242ba926" ON public.inventory_movements USING btree (operator_id);`);
    await queryRunner.query(`-- Name: IDX_224f9ac1134b4339a4b076f3a9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_224f9ac1134b4339a4b076f3a9" ON public.maintenance_work_logs USING btree (maintenance_request_id);`);
    await queryRunner.query(`-- Name: IDX_22c7efb405b602e67b04e78267; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_22c7efb405b602e67b04e78267" ON public.products USING btree (barcode) WHERE ((barcode IS NOT NULL) AND (deleted_at IS NULL));`);
    await queryRunner.query(`-- Name: IDX_237f7a8016f2ab372b2b1ad8d7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_237f7a8016f2ab372b2b1ad8d7" ON public.task_items USING btree (task_id);`);
    await queryRunner.query(`-- Name: IDX_23dd4a0a67f7ca7c4fcfb2e9bf; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_23dd4a0a67f7ca7c4fcfb2e9bf" ON public.trips USING btree (employee_id);`);
    await queryRunner.query(`-- Name: IDX_245f73843f5949d161ea0c3ca1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_245f73843f5949d161ea0c3ca1" ON public.transactions USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_249b8cad324cf3a02781c7adb8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_249b8cad324cf3a02781c7adb8" ON public.notification_templates USING btree (organization_id, type);`);
    await queryRunner.query(`-- Name: IDX_25ee15dac1ed563916ad876c0e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_25ee15dac1ed563916ad876c0e" ON public.collections USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_25f0b25327a0bc759c21bbcdce; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_25f0b25327a0bc759c21bbcdce" ON public.user_achievements USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_26569b6ea546cd6ed9ff831b08; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_26569b6ea546cd6ed9ff831b08" ON public.complaints USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_267f76d9fa5bc70e8a3a1680a0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_267f76d9fa5bc70e8a3a1680a0" ON public.timesheets USING btree (employee_id);`);
    await queryRunner.query(`-- Name: IDX_26f2c028653a5fc3f8d4608edc; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_26f2c028653a5fc3f8d4608edc" ON public.inventory_batches USING btree (warehouse_id, product_id, batch_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_27821ee30aa99daef697f21322; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_27821ee30aa99daef697f21322" ON public.tasks USING btree (assigned_to_user_id);`);
    await queryRunner.query(`-- Name: IDX_2787d86e3c71d204ac3112869a; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_2787d86e3c71d204ac3112869a" ON public.organization_contracts USING btree (contract_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_285706a79624c3a49e7fc066c8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_285706a79624c3a49e7fc066c8" ON public.quests USING btree (period, starts_at, ends_at);`);
    await queryRunner.query(`-- Name: IDX_28c2712f5eef0b2c119d73b5ec; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_28c2712f5eef0b2c119d73b5ec" ON public.equipment_components USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_29f45d9ec2f2afa1baea633bfb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_29f45d9ec2f2afa1baea633bfb" ON public.purchase_history USING btree (warehouse_id);`);
    await queryRunner.query(`-- Name: IDX_2a3edd7bc16920c3287331ea42; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2a3edd7bc16920c3287331ea42" ON public.roles USING btree (is_system);`);
    await queryRunner.query(`-- Name: IDX_2ae07c24b53c951fcb32163aa6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2ae07c24b53c951fcb32163aa6" ON public.locations USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_2af074843ceab1d4b9ef5f3e14; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2af074843ceab1d4b9ef5f3e14" ON public.integration_templates USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_2c1bb05b80ddcc562cd28d826c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2c1bb05b80ddcc562cd28d826c" ON public.stock_movements USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_2c5ea6ff95f19dc44dce1f3df9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2c5ea6ff95f19dc44dce1f3df9" ON public.validation_rules USING btree (rule_type);`);
    await queryRunner.query(`-- Name: IDX_2cd10fda8276bb995288acfbfb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON public.audit_logs USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_2cf7e25bd1f3b96043682a6454; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2cf7e25bd1f3b96043682a6454" ON public.audit_alert_history USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_2d11995817c8d382fb313dc46c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2d11995817c8d382fb313dc46c" ON public.performance_reviews USING btree (reviewer_id);`);
    await queryRunner.query(`-- Name: IDX_2d404aa7aa4a0404eafd184091; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2d404aa7aa4a0404eafd184091" ON public.products USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_2d4b58b7c2a5c2b7f4ccaac77d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2d4b58b7c2a5c2b7f4ccaac77d" ON public.directory_fields USING btree (directory_id, sort_order);`);
    await queryRunner.query(`-- Name: IDX_2d5fa024a84dceb158b2b95f34; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2d5fa024a84dceb158b2b95f34" ON public.transactions USING btree (type);`);
    await queryRunner.query(`-- Name: IDX_2d6673ae91cee09bef47d2a5de; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2d6673ae91cee09bef47d2a5de" ON public.departments USING btree (parent_department_id);`);
    await queryRunner.query(`-- Name: IDX_2d7573ee4c3dfc55c432e4bc70; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2d7573ee4c3dfc55c432e4bc70" ON public.alert_history USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_2dfd8da5caff888f5f24140ca5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2dfd8da5caff888f5f24140ca5" ON public.material_requests USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_2e45e55a610ca2b66f0b43741a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2e45e55a610ca2b66f0b43741a" ON public.inventory_movements USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_2ec5347327b80693eda2c54f4d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2ec5347327b80693eda2c54f4d" ON public.machine_components USING btree (serial_number);`);
    await queryRunner.query(`-- Name: IDX_2f096c406a9d9d5b8ce204190c; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_2f096c406a9d9d5b8ce204190c" ON public.promo_codes USING btree (code);`);
    await queryRunner.query(`-- Name: IDX_2f68e345c05e8166ff9deea1ab; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2f68e345c05e8166ff9deea1ab" ON public.audit_logs USING btree (user_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_2faf8d93948a40d75264350293; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2faf8d93948a40d75264350293" ON public.equipment_components USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_2ff6d8133818fb23fcb6402bad; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_2ff6d8133818fb23fcb6402bad" ON public.containers USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_3001101e87a47578b7399ec70a; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_3001101e87a47578b7399ec70a" ON public.invoices USING btree (invoice_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_304f15c85f6636f57a75f3da41; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_304f15c85f6636f57a75f3da41" ON public.recipe_snapshots USING btree (valid_to);`);
    await queryRunner.query(`-- Name: IDX_30aa0a067cd11357a990dd16d7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_30aa0a067cd11357a990dd16d7" ON public.audit_reports USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_31517d98cec6386869f587664d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_31517d98cec6386869f587664d" ON public.points_transactions USING btree (organization_id, user_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_3197969cb5ed9b2a00252a3c9e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3197969cb5ed9b2a00252a3c9e" ON public.audit_logs USING btree (severity);`);
    await queryRunner.query(`-- Name: IDX_31fa89104f54fe7ae18b450fb7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_31fa89104f54fe7ae18b450fb7" ON public.transactions USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_32e2a0252f3f966ebba5bd9e89; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_32e2a0252f3f966ebba5bd9e89" ON public.payment_transactions USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_33654510b0caa15dba4ccb8284; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_33654510b0caa15dba4ccb8284" ON public.telegram_users USING btree (chat_id);`);
    await queryRunner.query(`-- Name: IDX_338c5f27f68f2486aa39a746b6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_338c5f27f68f2486aa39a746b6" ON public.data_encryption USING btree (key_version);`);
    await queryRunner.query(`-- Name: IDX_3438459bf8792a39d8769d1d51; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3438459bf8792a39d8769d1d51" ON public.maintenance_schedules USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_3447c3113b59846fa3f2a92e73; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3447c3113b59846fa3f2a92e73" ON public.trip_stops USING btree (started_at);`);
    await queryRunner.query(`-- Name: IDX_34c30bb27d534ba4104b414cab; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_34c30bb27d534ba4104b414cab" ON public.warehouses USING btree (type);`);
    await queryRunner.query(`-- Name: IDX_3519c4e06d93d6936db6a900ca; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_3519c4e06d93d6936db6a900ca" ON public.products USING btree (sku) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_351efa45102e8ffd665b8a50bd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_351efa45102e8ffd665b8a50bd" ON public.users USING btree (rejected_by_id);`);
    await queryRunner.query(`-- Name: IDX_3580f4ccc6bfbc45da05171637; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3580f4ccc6bfbc45da05171637" ON public.leave_requests USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_35a197daa6a49578386ce8cffe; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_35a197daa6a49578386ce8cffe" ON public.complaints USING btree (organization_id, category);`);
    await queryRunner.query(`-- Name: IDX_35a6b05ee3b624d0de01ee5059; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_35a6b05ee3b624d0de01ee5059" ON public.favorites USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_35bc020c6d25477dd5680677cc; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_35bc020c6d25477dd5680677cc" ON public.notification_templates USING btree (organization_id, code);`);
    await queryRunner.query(`-- Name: IDX_35d10601c83b1c07cc4005ddcf; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_35d10601c83b1c07cc4005ddcf" ON public.user_sessions USING btree (refresh_token_hint);`);
    await queryRunner.query(`-- Name: IDX_3676155292d72c67cd4e090514; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON public.users USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_368d458fdd057df22e9d4b8d33; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_368d458fdd057df22e9d4b8d33" ON public.inventory_adjustments USING btree (adjustment_type);`);
    await queryRunner.query(`-- Name: IDX_36b4a912357ad1342b735d4d4c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_36b4a912357ad1342b735d4d4c" ON public.user_achievements USING btree (achievement_id);`);
    await queryRunner.query(`-- Name: IDX_371d16639cf355d61f53753574; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_371d16639cf355d61f53753574" ON public.organization_audit_logs USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_3814041f83c7bb60089d3ce48a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3814041f83c7bb60089d3ce48a" ON public.collection_records USING btree (task_id);`);
    await queryRunner.query(`-- Name: IDX_385dd167bc3fe894f301c7537b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_385dd167bc3fe894f301c7537b" ON public.files USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_38a64677f5a54fa001e06f5074; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_38a64677f5a54fa001e06f5074" ON public.session_logs USING btree (session_id);`);
    await queryRunner.query(`-- Name: IDX_3932fd981d8305741d98fe95c6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3932fd981d8305741d98fe95c6" ON public.alert_history USING btree (triggered_at);`);
    await queryRunner.query(`-- Name: IDX_395bf67bba67f25e9631d0fb4d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_395bf67bba67f25e9631d0fb4d" ON public.inventory_adjustments USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_3965336df1e4ccc9c2f4b1f8bc; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3965336df1e4ccc9c2f4b1f8bc" ON public.import_audit_logs USING btree (executed_at);`);
    await queryRunner.query(`-- Name: IDX_3a2aa672794884d30ecf133dba; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3a2aa672794884d30ecf133dba" ON public.contractor_invoices USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_3b13df1eb3b062fd5ed4ebc53b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3b13df1eb3b062fd5ed4ebc53b" ON public.orders USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_3b6c5373c29f8eb0e1b41056e5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3b6c5373c29f8eb0e1b41056e5" ON public.dashboard_widgets USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_3b9ed7346f79119e4212ad151f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3b9ed7346f79119e4212ad151f" ON public.maintenance_requests USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_3be7f4ff03ab99c06125ef7dba; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3be7f4ff03ab99c06125ef7dba" ON public.audit_sessions USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_3d3bc4729062b93fb56b084d78; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3d3bc4729062b93fb56b084d78" ON public.employees USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_3d8ee3b8d3de4295787338d24a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3d8ee3b8d3de4295787338d24a" ON public.access_control_logs USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_3e9f69576d3622550efafbd6e4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3e9f69576d3622550efafbd6e4" ON public.suppliers USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_3f6a318f2b662d8ca1ebb29558; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_3f6a318f2b662d8ca1ebb29558" ON public.attendances USING btree (organization_id, date);`);
    await queryRunner.query(`-- Name: IDX_4015fec9995a0b0f68395af258; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4015fec9995a0b0f68395af258" ON public.sync_jobs USING btree (scheduled_at);`);
    await queryRunner.query(`-- Name: IDX_40dd3757b510c58f0597a8eba5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_40dd3757b510c58f0597a8eba5" ON public.user_achievements USING btree (unlocked_at);`);
    await queryRunner.query(`-- Name: IDX_40ea931ae9cd6dae986737239a; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_40ea931ae9cd6dae986737239a" ON public.system_settings USING btree (key) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_40eb950815d445357e188daa3e; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_40eb950815d445357e188daa3e" ON public.complaints USING btree (ticket_number);`);
    await queryRunner.query(`-- Name: IDX_40f4ce5599d415af10708607b6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_40f4ce5599d415af10708607b6" ON public.sync_jobs USING btree (integration_id);`);
    await queryRunner.query(`-- Name: IDX_412c5e42c9c11c4eccb65240f6; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_412c5e42c9c11c4eccb65240f6" ON public.machine_slots USING btree (machine_id, slot_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_41c552a550443af0817c7eb47a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_41c552a550443af0817c7eb47a" ON public.directory_fields USING btree (directory_id);`);
    await queryRunner.query(`-- Name: IDX_4311795814c0262649ef0f90c8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4311795814c0262649ef0f90c8" ON public.hw_imported_sales USING btree (is_reconciled);`);
    await queryRunner.query(`-- Name: IDX_4320d996e1660a416eacc09cf1; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_4320d996e1660a416eacc09cf1" ON public.payment_transactions USING btree (provider_tx_id) WHERE (provider_tx_id IS NOT NULL);`);
    await queryRunner.query(`-- Name: IDX_4327f197b4d5200242c15fe04b; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_4327f197b4d5200242c15fe04b" ON public.suppliers USING btree (code) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_446282ecc0386b40db3b8b1c5f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_446282ecc0386b40db3b8b1c5f" ON public.telegram_bot_analytics USING btree (event_type, created_at);`);
    await queryRunner.query(`-- Name: IDX_44964f8b9c38702dc3150a8fa7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_44964f8b9c38702dc3150a8fa7" ON public.material_requests USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_44e7812e7962e45767f696b563; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_44e7812e7962e45767f696b563" ON public.report_definitions USING btree (organization_id, type);`);
    await queryRunner.query(`-- Name: IDX_450a5294dfde65588ff285fcff; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_450a5294dfde65588ff285fcff" ON public.transactions USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_4600d0ed79620961be33b17c70; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4600d0ed79620961be33b17c70" ON public.inventory_reservations USING btree (task_id);`);
    await queryRunner.query(`-- Name: IDX_472b8af729b61d7a1280972bb4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_472b8af729b61d7a1280972bb4" ON public.routes USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_47f1b620bbc532c3013b5b61c6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_47f1b620bbc532c3013b5b61c6" ON public.notification_campaigns USING btree (scheduled_at, status);`);
    await queryRunner.query(`-- Name: IDX_4836ee3b7dca7ef2eef25d90f1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4836ee3b7dca7ef2eef25d90f1" ON public.fiscal_receipts USING btree (fiscal_number);`);
    await queryRunner.query(`-- Name: IDX_48c56d822af0d4e2fa2e036c2a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_48c56d822af0d4e2fa2e036c2a" ON public.dashboards USING btree (organization_id, is_default);`);
    await queryRunner.query(`-- Name: IDX_48c63bc77946fb757d79ef3a32; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_48c63bc77946fb757d79ef3a32" ON public.client_payments USING btree (order_id);`);
    await queryRunner.query(`-- Name: IDX_48ce552495d14eae9b187bb671; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_48ce552495d14eae9b187bb671" ON public.permissions USING btree (name);`);
    await queryRunner.query(`-- Name: IDX_49db3170a2b93fc3e71eb22752; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_49db3170a2b93fc3e71eb22752" ON public.organization_audit_logs USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_4a270959307c2d584b4f5b1421; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4a270959307c2d584b4f5b1421" ON public.achievements USING btree (category);`);
    await queryRunner.query(`-- Name: IDX_4af34e004565170e5a67806772; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4af34e004565170e5a67806772" ON public.promo_code_redemptions USING btree (promo_code_id);`);
    await queryRunner.query(`-- Name: IDX_4b8366efe7ddde0b5d1aac50f3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4b8366efe7ddde0b5d1aac50f3" ON public.work_logs USING btree (organization_id, work_date);`);
    await queryRunner.query(`-- Name: IDX_4b8f0ccb5926cfeabea7c18b8e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4b8f0ccb5926cfeabea7c18b8e" ON public.contracts USING btree (counterparty_id);`);
    await queryRunner.query(`-- Name: IDX_4bf360298954c40d6e5f5f3dde; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4bf360298954c40d6e5f5f3dde" ON public.timesheets USING btree (organization_id, employee_id);`);
    await queryRunner.query(`-- Name: IDX_4c5a0ea3ec7850977ed3a2d0b0; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_4c5a0ea3ec7850977ed3a2d0b0" ON public.users USING btree (telegram_id) WHERE (telegram_id IS NOT NULL);`);
    await queryRunner.query(`-- Name: IDX_4c61f9ea6b50033a3e63ebf5c4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4c61f9ea6b50033a3e63ebf5c4" ON public.achievements USING btree (category, rarity);`);
    await queryRunner.query(`-- Name: IDX_4cb920f745c259c897f883a304; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4cb920f745c259c897f883a304" ON public.stock_movements USING btree (from_warehouse_id);`);
    await queryRunner.query(`-- Name: IDX_4cdff75f8fed4ac375b9e2eb5a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4cdff75f8fed4ac375b9e2eb5a" ON public.containers USING btree (nomenclature_id);`);
    await queryRunner.query(`-- Name: IDX_4d0b572cc18218fc59653a4b63; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4d0b572cc18218fc59653a4b63" ON public.incidents USING btree (type);`);
    await queryRunner.query(`-- Name: IDX_4d5ade0997eff6ee9043ccb668; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4d5ade0997eff6ee9043ccb668" ON public.integrations USING btree (organization_id, category);`);
    await queryRunner.query(`-- Name: IDX_4dcd2cd0cf988da1681469a0f4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4dcd2cd0cf988da1681469a0f4" ON public.products USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_4ded767be5cae9863fbe23ba92; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4ded767be5cae9863fbe23ba92" ON public.materials USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_4e589ae9e8fde5a605d1064dfe; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4e589ae9e8fde5a605d1064dfe" ON public.users USING btree (approved_by_id);`);
    await queryRunner.query(`-- Name: IDX_4f296f238b5f4d742e04beca34; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4f296f238b5f4d742e04beca34" ON public.location_zones USING btree (location_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_4f588cdb903d85bd36e40b3e3d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4f588cdb903d85bd36e40b3e3d" ON public.reconciliation_mismatches USING btree (mismatch_type);`);
    await queryRunner.query(`-- Name: IDX_4f996a1a39911cc58343aaa426; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4f996a1a39911cc58343aaa426" ON public.session_logs USING btree (user_id, status);`);
    await queryRunner.query(`-- Name: IDX_4fce449d8632c522204f5203d5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4fce449d8632c522204f5203d5" ON public.inventory_reservations USING btree (expires_at);`);
    await queryRunner.query(`-- Name: IDX_4fec67704b8a4575a58c89615c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_4fec67704b8a4575a58c89615c" ON public.containers USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_507a2818bf5524662b068c2e81; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_507a2818bf5524662b068c2e81" ON public.referrals USING btree (referred_id);`);
    await queryRunner.query(`-- Name: IDX_507bf6633cdae55e5fe4fecd4c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_507bf6633cdae55e5fe4fecd4c" ON public.access_templates USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_52093b7a5010edacaceb5209d6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_52093b7a5010edacaceb5209d6" ON public.payment_transactions USING btree (organization_id, provider);`);
    await queryRunner.query(`-- Name: IDX_52182ffd0f785e8256f8fcb4fd; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_52182ffd0f785e8256f8fcb4fd" ON public.user_notification_settings USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_522df4fefa0b166fc2a363499f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_522df4fefa0b166fc2a363499f" ON public.inventory_reservations USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_5238b99d654df4c4d2c8c716b6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5238b99d654df4c4d2c8c716b6" ON public.inventory_count_items USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_52ac3785e7b6c58c6a801a2a00; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_52ac3785e7b6c58c6a801a2a00" ON public.reconciliation_runs USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_52ac39dd8a28730c63aeb428c9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_52ac39dd8a28730c63aeb428c9" ON public.password_reset_tokens USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_52cfbe89591ab179ada34e2504; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_52cfbe89591ab179ada34e2504" ON public.machine_location_history USING btree (to_location_id);`);
    await queryRunner.query(`-- Name: IDX_5323e538db5a38387d8aa302a4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5323e538db5a38387d8aa302a4" ON public.timesheets USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_534b3187cce608d7e40373dae8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_534b3187cce608d7e40373dae8" ON public.machines USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_542ed6532b7cf1bf70c483f711; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_542ed6532b7cf1bf70c483f711" ON public.commission_calculations USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_546d1b197aefc79094bb436fb3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_546d1b197aefc79094bb436fb3" ON public.machine_inventory USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_558198775d351c94287b370d08; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_558198775d351c94287b370d08" ON public.positions USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_56f9c222171266887eaad15da1; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_56f9c222171266887eaad15da1" ON public.payrolls USING btree (employee_id, period_start);`);
    await queryRunner.query(`-- Name: IDX_5747a78ca8d2fd269466f18c16; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5747a78ca8d2fd269466f18c16" ON public.inventory_movements USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_5912cc0e732b0ec270b936ae61; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5912cc0e732b0ec270b936ae61" ON public.timesheets USING btree (period_start, period_end);`);
    await queryRunner.query(`-- Name: IDX_5926425896b30c0d681fe879af; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5926425896b30c0d681fe879af" ON public.transaction_items USING btree (transaction_id);`);
    await queryRunner.query(`-- Name: IDX_599bf94fe4010a2e4f49dab3ee; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_599bf94fe4010a2e4f49dab3ee" ON public.locations USING btree (organization_id, type);`);
    await queryRunner.query(`-- Name: IDX_5a153c7ad1e21418c7af9ac89f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5a153c7ad1e21418c7af9ac89f" ON public.materials USING btree (category);`);
    await queryRunner.query(`-- Name: IDX_5a8e0c18328a68facab7f01132; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5a8e0c18328a68facab7f01132" ON public.organizations USING btree (type);`);
    await queryRunner.query(`-- Name: IDX_5ab1cf9b6c8aab45b587464d9c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5ab1cf9b6c8aab45b587464d9c" ON public.stock_movements USING btree (requested_at);`);
    await queryRunner.query(`-- Name: IDX_5bfb22f5417882f573d823cb26; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5bfb22f5417882f573d823cb26" ON public.inventory_count_items USING btree (count_id);`);
    await queryRunner.query(`-- Name: IDX_5c0a8881f7b03048725c984d04; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5c0a8881f7b03048725c984d04" ON public.client_loyalty_ledger USING btree (reason);`);
    await queryRunner.query(`-- Name: IDX_5c3bec1682252c36fa16158773; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5c3bec1682252c36fa16158773" ON public.inventory_movements USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_5cb5ec6432abdf6f1e1c3a0970; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5cb5ec6432abdf6f1e1c3a0970" ON public.trip_stops USING btree (trip_id);`);
    await queryRunner.query(`-- Name: IDX_5de5c5829890925066b1e8327d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5de5c5829890925066b1e8327d" ON public.machine_inventory USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_5e40bbfc8ae8957f078eb8fb11; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5e40bbfc8ae8957f078eb8fb11" ON public.audit_alert_history USING btree (organization_id, triggered_at);`);
    await queryRunner.query(`-- Name: IDX_5e550d70e60fed673e89682176; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5e550d70e60fed673e89682176" ON public.directory_entries USING btree (directory_id);`);
    await queryRunner.query(`-- Name: IDX_5ec76b6935875f4c6ced106bb3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5ec76b6935875f4c6ced106bb3" ON public.achievements USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_5edb883df7acb70fdef859bda6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5edb883df7acb70fdef859bda6" ON public.inventory_adjustments USING btree (inventory_level);`);
    await queryRunner.query(`-- Name: IDX_5f33567abf87788abbab1a9b58; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5f33567abf87788abbab1a9b58" ON public.machine_access USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_5f64e2f8aeb3bd94b35ca95d51; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_5f64e2f8aeb3bd94b35ca95d51" ON public.counterparties USING btree (type);`);
    await queryRunner.query(`-- Name: IDX_6035d44d55f4ad83bd2237cde5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6035d44d55f4ad83bd2237cde5" ON public.ingredient_batches USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_60918744ee561a9f057747ece1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_60918744ee561a9f057747ece1" ON public.access_requests USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_60c250875614c743993278049d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_60c250875614c743993278049d" ON public.analytics_snapshots USING btree (machine_id, snapshot_date);`);
    await queryRunner.query(`-- Name: IDX_6158910bf5b1e52aff229ee6ac; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6158910bf5b1e52aff229ee6ac" ON public.inventory_counts USING btree (inventory_level);`);
    await queryRunner.query(`-- Name: IDX_6229026f1c90ea3b939e113148; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6229026f1c90ea3b939e113148" ON public.component_movements USING btree (related_machine_id);`);
    await queryRunner.query(`-- Name: IDX_62632b51357923985ef56b1eab; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_62632b51357923985ef56b1eab" ON public.trip_anomalies USING btree (trip_id);`);
    await queryRunner.query(`-- Name: IDX_628073e398f9bd2d0f1eaa2f3d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_628073e398f9bd2d0f1eaa2f3d" ON public.promo_code_redemptions USING btree (order_id);`);
    await queryRunner.query(`-- Name: IDX_6335813ef19bc35b8d866cc656; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6335813ef19bc35b8d866cc656" ON public.order_items USING btree (order_id, product_id);`);
    await queryRunner.query(`-- Name: IDX_6347d84d3d21f0de48bad4f81b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6347d84d3d21f0de48bad4f81b" ON public.routes USING btree (planned_date);`);
    await queryRunner.query(`-- Name: IDX_6359abd2ae30de509501923763; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6359abd2ae30de509501923763" ON public.inventory_movements USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_6394aff358077869d2e60ee08e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6394aff358077869d2e60ee08e" ON public.tasks USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_639c0f1d38d97d778122d4f299; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_639c0f1d38d97d778122d4f299" ON public.fcm_tokens USING btree (token);`);
    await queryRunner.query(`-- Name: IDX_63b73a80b808e1a2a94d06d646; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_63b73a80b808e1a2a94d06d646" ON public.client_orders USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_63d2d5c1894d2dc3e5ee1ca419; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_63d2d5c1894d2dc3e5ee1ca419" ON public.collection_records USING btree (collected_at);`);
    await queryRunner.query(`-- Name: IDX_64385b800e675d22928d1e1cec; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_64385b800e675d22928d1e1cec" ON public.two_factor_auth USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_6448419610a33b73209ba94fc7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6448419610a33b73209ba94fc7" ON public.stock_opening_balances USING btree (balance_date);`);
    await queryRunner.query(`-- Name: IDX_649a12c77927110cbebbcd1d1f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_649a12c77927110cbebbcd1d1f" ON public.custom_reports USING btree (report_type);`);
    await queryRunner.query(`-- Name: IDX_651cfd3a8194cb7f741dedf1db; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_651cfd3a8194cb7f741dedf1db" ON public.sales_imports USING btree (created_at) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_65e3145f317bd655481d3f96c7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_65e3145f317bd655481d3f96c7" ON public.invoices USING btree (customer_id);`);
    await queryRunner.query(`-- Name: IDX_668e658c3bca6b4d2e34c1a2e8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_668e658c3bca6b4d2e34c1a2e8" ON public.transactions USING btree (payment_method);`);
    await queryRunner.query(`-- Name: IDX_66e82a56e1a2eda91017e0d18b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_66e82a56e1a2eda91017e0d18b" ON public.loyalty_promo_code_usages USING btree (promo_code_id, user_id);`);
    await queryRunner.query(`-- Name: IDX_6745ceaed810a422e136904236; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6745ceaed810a422e136904236" ON public.inventory_difference_thresholds USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_6771f119f1c06d2ccf38f23866; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6771f119f1c06d2ccf38f23866" ON public.push_subscriptions USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_67a7721442c325dfd567fb2e2c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_67a7721442c325dfd567fb2e2c" ON public.billing_payments USING btree (payment_date);`);
    await queryRunner.query(`-- Name: IDX_67b6be47c360600bf435dead79; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_67b6be47c360600bf435dead79" ON public.stock_opening_balances USING btree (is_applied);`);
    await queryRunner.query(`-- Name: IDX_67b72f5fef17dc9f978c1fa0db; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_67b72f5fef17dc9f978c1fa0db" ON public.warehouses USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_689674ce1054698475d2150c94; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_689674ce1054698475d2150c94" ON public.commission_calculations USING btree (contract_id);`);
    await queryRunner.query(`-- Name: IDX_68f0aa88b340b78f7faf163b79; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_68f0aa88b340b78f7faf163b79" ON public.fiscal_devices USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_691570840e6ee441301b02597b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_691570840e6ee441301b02597b" ON public.machine_maintenance_schedules USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_6944dd5929f7204520fb55d25d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6944dd5929f7204520fb55d25d" ON public.time_off_requests USING btree (employee_id);`);
    await queryRunner.query(`-- Name: IDX_699c50db7c54c0ef95c806abd7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_699c50db7c54c0ef95c806abd7" ON public.routes USING btree (operator_id);`);
    await queryRunner.query(`-- Name: IDX_69fb1c5e3dc1d2f3171f6e6025; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_69fb1c5e3dc1d2f3171f6e6025" ON public.attendances USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_6a0053227f709d4b265f04d22d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6a0053227f709d4b265f04d22d" ON public.inventory_difference_thresholds USING btree (priority, is_active);`);
    await queryRunner.query(`-- Name: IDX_6a279d4c4cbb2aec514c746956; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_6a279d4c4cbb2aec514c746956" ON public.ai_provider_keys USING btree (provider, organization_id) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_6a6fed6fdb05846e53390c906c; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_6a6fed6fdb05846e53390c906c" ON public.schema_definitions USING btree (domain, table_name);`);
    await queryRunner.query(`-- Name: IDX_6b1137062cb31f7a20f1062d1c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6b1137062cb31f7a20f1062d1c" ON public.performance_reviews USING btree (employee_id, review_period);`);
    await queryRunner.query(`-- Name: IDX_6b26e86efcb435dac9b81cb0fa; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6b26e86efcb435dac9b81cb0fa" ON public.audit_snapshots USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_6bfc03571aee5cb6149d397328; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_6bfc03571aee5cb6149d397328" ON public.counterparties USING btree (inn) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_6c0a3017732f03feb52e47fad9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6c0a3017732f03feb52e47fad9" ON public.warehouses USING btree (manager_id);`);
    await queryRunner.query(`-- Name: IDX_6c97f267a031722c414f8bd398; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6c97f267a031722c414f8bd398" ON public.fiscal_queue USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_6cf5b31ce82002ccb284c3432d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6cf5b31ce82002ccb284c3432d" ON public.equipment_components USING btree (component_status);`);
    await queryRunner.query(`-- Name: IDX_6d134ea396d389dfec19a15ba0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6d134ea396d389dfec19a15ba0" ON public.audit_snapshots USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_6d68ba1671a6abb3cf8e573cb3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6d68ba1671a6abb3cf8e573cb3" ON public.audit_alert_history USING btree (triggered_at);`);
    await queryRunner.query(`-- Name: IDX_6d79d79646c5b036eccd98c51f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6d79d79646c5b036eccd98c51f" ON public.referrals USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_6db14572ea2aec88cfa13fff47; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6db14572ea2aec88cfa13fff47" ON public.saved_report_filters USING btree (definition_id);`);
    await queryRunner.query(`-- Name: IDX_6df9ae73095fe37614bc0190d1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6df9ae73095fe37614bc0190d1" ON public.payrolls USING btree (period_start, period_end);`);
    await queryRunner.query(`-- Name: IDX_6dfd4bd3af1c2e0f4f56dd8813; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6dfd4bd3af1c2e0f4f56dd8813" ON public.contractors USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_6e54530d60d566db6044ff5da7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6e54530d60d566db6044ff5da7" ON public.import_jobs USING btree (organization_id, import_type);`);
    await queryRunner.query(`-- Name: IDX_6f34432dd3ebd8ecac88ca14a8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6f34432dd3ebd8ecac88ca14a8" ON public.operator_ratings USING btree (period_start, period_end);`);
    await queryRunner.query(`-- Name: IDX_6f5bc0114c6bbac7865290dc4f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6f5bc0114c6bbac7865290dc4f" ON public.component_movements USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_6f6890ab1f3fa2c69814783edf; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6f6890ab1f3fa2c69814783edf" ON public.purchase_history USING btree (invoice_number);`);
    await queryRunner.query(`-- Name: IDX_6fa7e61c79777de95b6a4ecd63; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_6fa7e61c79777de95b6a4ecd63" ON public.incidents USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_7005b9a34497a42b3fea4749c5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7005b9a34497a42b3fea4749c5" ON public.work_logs USING btree (organization_id, employee_id);`);
    await queryRunner.query(`-- Name: IDX_703c8bd2c58a9e122939c4f450; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_703c8bd2c58a9e122939c4f450" ON public.audit_sessions USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_70597b4533496985f96871a14b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_70597b4533496985f96871a14b" ON public.sync_jobs USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_707cfc415c7c12d38dfc2ec8eb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_707cfc415c7c12d38dfc2ec8eb" ON public.tasks USING btree (due_date);`);
    await queryRunner.query(`-- Name: IDX_70bf0cfdc68926b55cbac67138; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_70bf0cfdc68926b55cbac67138" ON public.referrals USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_71070628c130f2c9cd3cd5f082; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_71070628c130f2c9cd3cd5f082" ON public.departments USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_71326ee34ee2dbc1e438a5b90a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_71326ee34ee2dbc1e438a5b90a" ON public.loyalty_promo_code_usages USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_71fef71b47bf988fa899406acb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_71fef71b47bf988fa899406acb" ON public.audit_logs USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_7279df6410eba8167de4e0fc07; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7279df6410eba8167de4e0fc07" ON public.location_contracts USING btree (location_id, status);`);
    await queryRunner.query(`-- Name: IDX_7331684c0c5b063803a425001a; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_7331684c0c5b063803a425001a" ON public.permissions USING btree (resource, action);`);
    await queryRunner.query(`-- Name: IDX_735cfc29c69ecabd52d3726527; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_735cfc29c69ecabd52d3726527" ON public.collections USING btree (status, collected_at);`);
    await queryRunner.query(`-- Name: IDX_73843addc463ef238567f6f110; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_73843addc463ef238567f6f110" ON public.dashboard_widgets USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_740da3f4896bb7c64d394684b5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_740da3f4896bb7c64d394684b5" ON public.machine_location_syncs USING btree (location_id);`);
    await queryRunner.query(`-- Name: IDX_7421efc125d95e413657efa3c6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON public.audit_logs USING btree (entity_type, entity_id);`);
    await queryRunner.query(`-- Name: IDX_7488d58d47e47b10d851674dcb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7488d58d47e47b10d851674dcb" ON public.alert_history USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_74b070fc42ed1686c6d5ddc7e8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_74b070fc42ed1686c6d5ddc7e8" ON public.promo_codes USING btree (valid_from, valid_until);`);
    await queryRunner.query(`-- Name: IDX_74b26775faa1af2c4e797d7127; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_74b26775faa1af2c4e797d7127" ON public.payment_refunds USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_7574bbb24db339b6ad4df00436; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7574bbb24db339b6ad4df00436" ON public.inventory_difference_thresholds USING btree (threshold_type);`);
    await queryRunner.query(`-- Name: IDX_75eba1c6b1a66b09f2a97e6927; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_75eba1c6b1a66b09f2a97e6927" ON public.orders USING btree (order_number);`);
    await queryRunner.query(`-- Name: IDX_76057081e4ca241baeacae1a0b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_76057081e4ca241baeacae1a0b" ON public.cms_articles USING btree (organization_id, is_published);`);
    await queryRunner.query(`-- Name: IDX_7686da7f066f82cbe3a6077cb9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7686da7f066f82cbe3a6077cb9" ON public.import_audit_logs USING btree (session_id);`);
    await queryRunner.query(`-- Name: IDX_76d3e56379fde9e047d915006a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_76d3e56379fde9e047d915006a" ON public.tasks USING btree (organization_id, type_code, status);`);
    await queryRunner.query(`-- Name: IDX_7797173c5d5349271c80c7122c; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_7797173c5d5349271c80c7122c" ON public.attendances USING btree (employee_id, date);`);
    await queryRunner.query(`-- Name: IDX_7821a68980640e90c5b42a8184; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7821a68980640e90c5b42a8184" ON public.points_transactions USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_78372737aff010cb892331c0d2; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_78372737aff010cb892331c0d2" ON public.complaint_qr_codes USING btree (code);`);
    await queryRunner.query(`-- Name: IDX_7840622ab1ebc3aa4d827da66e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7840622ab1ebc3aa4d827da66e" ON public.system_settings USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_78455712f944271619ae7f24c0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_78455712f944271619ae7f24c0" ON public.machine_error_logs USING btree (severity);`);
    await queryRunner.query(`-- Name: IDX_784e5994d6c60de63f900e9c0e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_784e5994d6c60de63f900e9c0e" ON public.analytics_snapshots USING btree (location_id, snapshot_date);`);
    await queryRunner.query(`-- Name: IDX_789d1669e6dcec609a539d8a1c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_789d1669e6dcec609a539d8a1c" ON public.warehouse_zones USING btree (zone_type);`);
    await queryRunner.query(`-- Name: IDX_78fd0b9f9cbfc7869ca4d9f5e3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_78fd0b9f9cbfc7869ca4d9f5e3" ON public.contracts USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_7960a10acfd37ff3d45b98212b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7960a10acfd37ff3d45b98212b" ON public.machines USING btree (assigned_operator_id);`);
    await queryRunner.query(`-- Name: IDX_797d199fff9037e5b231dc4ffb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_797d199fff9037e5b231dc4ffb" ON public.system_settings USING btree (category);`);
    await queryRunner.query(`-- Name: IDX_7a1e621864efac86f546dbf31e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7a1e621864efac86f546dbf31e" ON public.fiscal_devices USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_7a25fdc08fed6c0c68a1ebc3f5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7a25fdc08fed6c0c68a1ebc3f5" ON public.maintenance_requests USING btree (priority);`);
    await queryRunner.query(`-- Name: IDX_7a34f2ac9743a453c117a707d1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7a34f2ac9743a453c117a707d1" ON public.billing_payments USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_7aae877b5b5fcd2edcbcd60562; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7aae877b5b5fcd2edcbcd60562" ON public.ingredient_batches USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_7ba1ee87fb2c441e70dc723112; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7ba1ee87fb2c441e70dc723112" ON public.notifications USING btree (organization_id, status, created_at);`);
    await queryRunner.query(`-- Name: IDX_7bb74ba6d5e1d1e8b6e7e20e7c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7bb74ba6d5e1d1e8b6e7e20e7c" ON public.leave_requests USING btree (start_date, end_date);`);
    await queryRunner.query(`-- Name: IDX_7bfe42a897d7717ca8acca3840; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7bfe42a897d7717ca8acca3840" ON public.audit_reports USING btree (report_type);`);
    await queryRunner.query(`-- Name: IDX_7c038e5a589b06cbe4320cc88b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7c038e5a589b06cbe4320cc88b" ON public.password_reset_tokens USING btree (expires_at);`);
    await queryRunner.query(`-- Name: IDX_7c177ca98bb68c39bf59cd014f; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_7c177ca98bb68c39bf59cd014f" ON public.transaction_daily_summaries USING btree (organization_id, summary_date);`);
    await queryRunner.query(`-- Name: IDX_7c4276195bb9afcea6519154d2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7c4276195bb9afcea6519154d2" ON public.washing_schedules USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_7c9856b2fe938b5c08e59c7095; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7c9856b2fe938b5c08e59c7095" ON public.complaint_refunds USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_7ce69523d087f39fe0007c08b7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7ce69523d087f39fe0007c08b7" ON public.audit_reports USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_7ce9e0ccb4ea8ec09a4d66275f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7ce9e0ccb4ea8ec09a4d66275f" ON public.stock_reservations USING btree (warehouse_id, product_id);`);
    await queryRunner.query(`-- Name: IDX_7d21959202e9393a45702b7ada; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7d21959202e9393a45702b7ada" ON public.alert_rules USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_7d854ab6c8ff34e8b50cf042aa; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7d854ab6c8ff34e8b50cf042aa" ON public.ai_provider_keys USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_7dfa5b36a9305efc5b7e9f369a; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_7dfa5b36a9305efc5b7e9f369a" ON public.organization_invitations USING btree (token);`);
    await queryRunner.query(`-- Name: IDX_7e163532e5a524fcd85693c699; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7e163532e5a524fcd85693c699" ON public.machines USING btree (location_id);`);
    await queryRunner.query(`-- Name: IDX_7e6b34e70892ece47dcb6d2206; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7e6b34e70892ece47dcb6d2206" ON public.machine_components USING btree (component_type);`);
    await queryRunner.query(`-- Name: IDX_7ee1b2664cfbd19235f200b5b3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7ee1b2664cfbd19235f200b5b3" ON public.notification_campaigns USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_7ee75a980c1f29f19bffe09cf8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7ee75a980c1f29f19bffe09cf8" ON public.location_contract_payments USING btree (organization_id, due_date);`);
    await queryRunner.query(`-- Name: IDX_7f88954e8d667a76ae3ced6f44; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_7f88954e8d667a76ae3ced6f44" ON public.organization_invitations USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_80a62c1048ed101d604d846042; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_80a62c1048ed101d604d846042" ON public.materials USING btree (supplier_id);`);
    await queryRunner.query(`-- Name: IDX_8106d315b861f4480f97aa4792; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8106d315b861f4480f97aa4792" ON public.agent_sessions USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_814ed9100fcdf2ff3eaf51f563; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_814ed9100fcdf2ff3eaf51f563" ON public.locations USING btree (status, deleted_at);`);
    await queryRunner.query(`-- Name: IDX_8188f54cfe86c9eceb882d5e24; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8188f54cfe86c9eceb882d5e24" ON public.audit_sessions USING btree (organization_id, user_id);`);
    await queryRunner.query(`-- Name: IDX_82113e10fc4870ea35e4af18a5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_82113e10fc4870ea35e4af18a5" ON public.loyalty_promo_code_usages USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_82551f4fad2f515d685917e7eb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_82551f4fad2f515d685917e7eb" ON public.fiscal_receipts USING btree (order_id);`);
    await queryRunner.query(`-- Name: IDX_8277c0338e9c648f0ae95da0dd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8277c0338e9c648f0ae95da0dd" ON public.report_definitions USING btree (organization_id, category);`);
    await queryRunner.query(`-- Name: IDX_82ea8be9c4838e1a2b4c4a76fa; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_82ea8be9c4838e1a2b4c4a76fa" ON public.ingredient_batches USING btree (supplier_id);`);
    await queryRunner.query(`-- Name: IDX_8301ec46a58c57ef1bb4576fe8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8301ec46a58c57ef1bb4576fe8" ON public.favorites USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_83034f111961af3aa6eaff9a9d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_83034f111961af3aa6eaff9a9d" ON public.operator_ratings USING btree (grade);`);
    await queryRunner.query(`-- Name: IDX_83141eeaaef5a92fbab76b256e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_83141eeaaef5a92fbab76b256e" ON public.leave_requests USING btree (employee_id, status);`);
    await queryRunner.query(`-- Name: IDX_83b307a0559a91491649720e1f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_83b307a0559a91491649720e1f" ON public.loyalty_promo_codes USING btree (starts_at, expires_at);`);
    await queryRunner.query(`-- Name: IDX_83dbf13f428455bde89cb1eaa2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_83dbf13f428455bde89cb1eaa2" ON public.integrations USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_840c04623aa3cdec50c332d5e6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_840c04623aa3cdec50c332d5e6" ON public.analytics_snapshots USING btree (snapshot_type, snapshot_date);`);
    await queryRunner.query(`-- Name: IDX_848438fc158f257bc9e91543f3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_848438fc158f257bc9e91543f3" ON public.client_payments USING btree (provider_payment_id);`);
    await queryRunner.query(`-- Name: IDX_84b9551a3b2bbf37c77dc3ac9d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_84b9551a3b2bbf37c77dc3ac9d" ON public.machine_components USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_84dd39c764a6fe434f004236a2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_84dd39c764a6fe434f004236a2" ON public.files USING btree (category_code);`);
    await queryRunner.query(`-- Name: IDX_84de4b1a63bec7cb363e034e94; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_84de4b1a63bec7cb363e034e94" ON public.inventory_reservations USING btree (inventory_level, reference_id);`);
    await queryRunner.query(`-- Name: IDX_851c200e845682143f9cb0e35c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_851c200e845682143f9cb0e35c" ON public.payrolls USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_867b91108d721aded509360512; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_867b91108d721aded509360512" ON public.achievements USING btree (condition_type);`);
    await queryRunner.query(`-- Name: IDX_87041b3f4518df5d3ee1866aff; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_87041b3f4518df5d3ee1866aff" ON public.notification_queue USING btree (status, scheduled_at);`);
    await queryRunner.query(`-- Name: IDX_8708cd4de43f55001fc1734ca0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8708cd4de43f55001fc1734ca0" ON public.login_attempts USING btree (ip_address);`);
    await queryRunner.query(`-- Name: IDX_871e12860e5fdaa9d31aba7fea; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_871e12860e5fdaa9d31aba7fea" ON public.hw_imported_sales USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_8722fde700a7d15e95568f163d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8722fde700a7d15e95568f163d" ON public.alert_history USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_87b8888186ca9769c960e92687; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON public.user_roles USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_87c998073af994bb49340be58c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_87c998073af994bb49340be58c" ON public.security_events USING btree (ip_address);`);
    await queryRunner.query(`-- Name: IDX_87dcaa3bf8c0bd00e0d41719b0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_87dcaa3bf8c0bd00e0d41719b0" ON public.warehouse_bins USING btree (organization_id, zone_id);`);
    await queryRunner.query(`-- Name: IDX_87ed7b30913961a5111c9bb43c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_87ed7b30913961a5111c9bb43c" ON public.component_maintenance USING btree (component_id);`);
    await queryRunner.query(`-- Name: IDX_88256a651008c00c1eea23e0b6; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_88256a651008c00c1eea23e0b6" ON public.telegram_users USING btree (telegram_id);`);
    await queryRunner.query(`-- Name: IDX_8860742a92e502b7a9f76fb84d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8860742a92e502b7a9f76fb84d" ON public.generated_reports USING btree (created_by_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_8878710dc844ecd6f9e587f34f; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_8878710dc844ecd6f9e587f34f" ON public.employees USING btree (employee_number);`);
    await queryRunner.query(`-- Name: IDX_899c2496e42b9342f8b9ab86b1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_899c2496e42b9342f8b9ab86b1" ON public.daily_stats USING btree (last_updated_at);`);
    await queryRunner.query(`-- Name: IDX_8a39cde260ce4b67368702dcfd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8a39cde260ce4b67368702dcfd" ON public.dashboards USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_8afaebf6f5abd225b96b5bd3f5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8afaebf6f5abd225b96b5bd3f5" ON public.client_orders USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_8bce4fce75cd1a02e2ba6a9478; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8bce4fce75cd1a02e2ba6a9478" ON public.purchase_history USING btree (purchase_date);`);
    await queryRunner.query(`-- Name: IDX_8bd4e52a21e2ccb586469426f1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8bd4e52a21e2ccb586469426f1" ON public.ingredient_batches USING btree (received_date);`);
    await queryRunner.query(`-- Name: IDX_8bdcf7999d2e71031da1f4869a; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_8bdcf7999d2e71031da1f4869a" ON public.roles USING btree (name, organization_id);`);
    await queryRunner.query(`-- Name: IDX_8be22d435eef595b102d358978; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8be22d435eef595b102d358978" ON public.directory_sources USING btree (directory_id);`);
    await queryRunner.query(`-- Name: IDX_8c5731a4b36073cf67cf44d86d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8c5731a4b36073cf67cf44d86d" ON public.client_wallets USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_8ca6942f90008b5bbac4a19686; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8ca6942f90008b5bbac4a19686" ON public.maintenance_schedules USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_8cc5abda61af748c5d19155ce2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8cc5abda61af748c5d19155ce2" ON public.telegram_users USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_8d1ba37d8e0a24e41fc1658d55; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8d1ba37d8e0a24e41fc1658d55" ON public.purchase_history USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_8e5e23ee6fccba37f99df331d1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_8e5e23ee6fccba37f99df331d1" ON public.audit_logs USING btree (ip_address);`);
    await queryRunner.query(`-- Name: IDX_907b77b00258fc6e07f3b65f19; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_907b77b00258fc6e07f3b65f19" ON public.notification_logs USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_90c3b06f1a2f7173d5d727fec3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_90c3b06f1a2f7173d5d727fec3" ON public.audit_snapshots USING btree (entity_type);`);
    await queryRunner.query(`-- Name: IDX_90db063a6644bd36a7ea263630; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_90db063a6644bd36a7ea263630" ON public.stock_reservations USING btree (status, expires_at);`);
    await queryRunner.query(`-- Name: IDX_90dc0a31091e9f6ad1cc92bcdb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_90dc0a31091e9f6ad1cc92bcdb" ON public.access_requests USING btree (telegram_id);`);
    await queryRunner.query(`-- Name: IDX_917c5af1a4ff626346694df6df; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_917c5af1a4ff626346694df6df" ON public.telegram_payments USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_91802c1051bc9bb61ba5e7a9be; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_91802c1051bc9bb61ba5e7a9be" ON public.machine_location_history USING btree (moved_at);`);
    await queryRunner.query(`-- Name: IDX_91fddbe23e927e1e525c152baa; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_91fddbe23e927e1e525c152baa" ON public.departments USING btree (code);`);
    await queryRunner.query(`-- Name: IDX_9246a78491a04609a93fe3b8fa; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_9246a78491a04609a93fe3b8fa" ON public.trip_task_links USING btree (trip_id, task_id) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_924c6ec37aa493395ac23e5b79; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_924c6ec37aa493395ac23e5b79" ON public.contractor_invoices USING btree (due_date);`);
    await queryRunner.query(`-- Name: IDX_927d2c570eedf500676ba406dd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_927d2c570eedf500676ba406dd" ON public.investor_profiles USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_92d3a961871e6e540bdbc2b752; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_92d3a961871e6e540bdbc2b752" ON public.complaint_actions USING btree (organization_id, action_type);`);
    await queryRunner.query(`-- Name: IDX_9300d9ae06520676d0f616e1cd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9300d9ae06520676d0f616e1cd" ON public.user_quests USING btree (quest_id);`);
    await queryRunner.query(`-- Name: IDX_930b63e086db0154a116e2d5b2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_930b63e086db0154a116e2d5b2" ON public.component_maintenance USING btree (performed_at);`);
    await queryRunner.query(`-- Name: IDX_93243aa452f48f013aeb0e9b62; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_93243aa452f48f013aeb0e9b62" ON public.maintenance_requests USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_932b7ae90148e482bc27b0a6d6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_932b7ae90148e482bc27b0a6d6" ON public.tasks USING btree (created_by_user_id);`);
    await queryRunner.query(`-- Name: IDX_9350781ae7a615d184b56660e3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9350781ae7a615d184b56660e3" ON public.inventory_batches USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_94d568ce2619e54a2554062d64; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_94d568ce2619e54a2554062d64" ON public.organization_contracts USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_94f503d904c8f3d0f583f20c27; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_94f503d904c8f3d0f583f20c27" ON public.route_stops USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_95048d503befe40e467d550713; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_95048d503befe40e467d550713" ON public.alert_history USING btree (rule_id);`);
    await queryRunner.query(`-- Name: IDX_9593d9f308802b0b480721b7c0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9593d9f308802b0b480721b7c0" ON public.audit_snapshots USING btree (entity_id);`);
    await queryRunner.query(`-- Name: IDX_95abbf534010d7b8fe3956d725; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_95abbf534010d7b8fe3956d725" ON public.trip_anomalies USING btree (resolved);`);
    await queryRunner.query(`-- Name: IDX_95de0129a0dd8a7950e6900926; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_95de0129a0dd8a7950e6900926" ON public.operator_inventory USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_966cbc720d258257e0b2e25461; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_966cbc720d258257e0b2e25461" ON public.audit_logs USING btree (expires_at);`);
    await queryRunner.query(`-- Name: IDX_96e947902c9c62e76cb6d273f9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_96e947902c9c62e76cb6d273f9" ON public.telegram_bot_analytics USING btree (action_name);`);
    await queryRunner.query(`-- Name: IDX_96eb092e740543b46d18b08a99; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_96eb092e740543b46d18b08a99" ON public.equipment_components USING btree (component_type);`);
    await queryRunner.query(`-- Name: IDX_96faf054764324b00b7f338ef1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_96faf054764324b00b7f338ef1" ON public.orders USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_9747f77c3338647dd2d3a675a4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9747f77c3338647dd2d3a675a4" ON public.trip_points USING btree (trip_id, is_filtered);`);
    await queryRunner.query(`-- Name: IDX_97672ac88f789774dd47f7c8be; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON public.users USING btree (email);`);
    await queryRunner.query(`-- Name: IDX_9769b08635b0f67bbdd0ddc27f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9769b08635b0f67bbdd0ddc27f" ON public.machine_inventory USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_976ca73048abef18222c8b69f2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_976ca73048abef18222c8b69f2" ON public.billing_payments USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_9878db1f2b10fccdecf4daa5c1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9878db1f2b10fccdecf4daa5c1" ON public.trips USING btree (started_at);`);
    await queryRunner.query(`-- Name: IDX_98d9135ed4fbea74b98146863f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_98d9135ed4fbea74b98146863f" ON public.material_request_items USING btree (request_id, product_id);`);
    await queryRunner.query(`-- Name: IDX_9940fa48327e0f0a06aaef70a7; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_9940fa48327e0f0a06aaef70a7" ON public.ingredient_batches USING btree (product_id, batch_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_99f8da5e7a609a6282374d19c8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_99f8da5e7a609a6282374d19c8" ON public.stock_opening_balances USING btree (warehouse_id);`);
    await queryRunner.query(`-- Name: IDX_99fca4a3a4a93c26a756c5aca5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_99fca4a3a4a93c26a756c5aca5" ON public.audit_logs USING btree (action, created_at);`);
    await queryRunner.query(`-- Name: IDX_9a4327eadc5dc2bf238f8b2732; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9a4327eadc5dc2bf238f8b2732" ON public.stock_takes USING btree (warehouse_id, status);`);
    await queryRunner.query(`-- Name: IDX_9acb0dee0783ee1531fea2c479; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9acb0dee0783ee1531fea2c479" ON public.telegram_payments USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_9ad75f509aa8d2c4bf31f3ed29; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9ad75f509aa8d2c4bf31f3ed29" ON public.inventory_counts USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_9bbe39ab10e86530296c3340aa; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9bbe39ab10e86530296c3340aa" ON public.product_price_history USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_9c0d79e11f66d70879124fad24; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9c0d79e11f66d70879124fad24" ON public.trip_reconciliations USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_9d053a241fd87121aeb284fa35; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9d053a241fd87121aeb284fa35" ON public.user_quests USING btree (user_id, status);`);
    await queryRunner.query(`-- Name: IDX_9d29073e67e125787cedef475b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9d29073e67e125787cedef475b" ON public.counterparties USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_9db8428b86bea5697bc558a64e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9db8428b86bea5697bc558a64e" ON public.collection_history USING btree (collection_id);`);
    await queryRunner.query(`-- Name: IDX_9dbf13e5d4e1f2518e044e76df; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9dbf13e5d4e1f2518e044e76df" ON public.complaints USING btree (assigned_to_id, status);`);
    await queryRunner.query(`-- Name: IDX_9de249fd010da237ee16ffefbc; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9de249fd010da237ee16ffefbc" ON public.loyalty_promo_codes USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_9de6e4368a313dbf57a8f0949c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9de6e4368a313dbf57a8f0949c" ON public.contractor_invoices USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_9df7f1b3b8124eafea365dca3d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9df7f1b3b8124eafea365dca3d" ON public.component_movements USING btree (movement_type);`);
    await queryRunner.query(`-- Name: IDX_9eb13b466a6658b7b226977ad1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9eb13b466a6658b7b226977ad1" ON public.import_audit_logs USING btree (table_name, record_id);`);
    await queryRunner.query(`-- Name: IDX_9ebad42ecd66a1cad9b8dd6be5; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_9ebad42ecd66a1cad9b8dd6be5" ON public.telegram_settings USING btree (setting_key);`);
    await queryRunner.query(`-- Name: IDX_9f1a2b99a56c1b8a0f231bbd01; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9f1a2b99a56c1b8a0f231bbd01" ON public.bin_content_history USING btree (bin_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_9f1cfab59f911e75a484420078; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_9f1cfab59f911e75a484420078" ON public.warehouse_zones USING btree (organization_id, code);`);
    await queryRunner.query(`-- Name: IDX_9f3c28e5899c598fab8a6ea493; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9f3c28e5899c598fab8a6ea493" ON public.operator_ratings USING btree (total_score);`);
    await queryRunner.query(`-- Name: IDX_9f4354acba3c0f001ded516755; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9f4354acba3c0f001ded516755" ON public.directory_entry_audit USING btree (entry_id);`);
    await queryRunner.query(`-- Name: IDX_9f72caa046df7e9e8c4efaec4f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9f72caa046df7e9e8c4efaec4f" ON public.location_contracts USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_9f7b2ebca9f6cc562566673e77; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9f7b2ebca9f6cc562566673e77" ON public.custom_reports USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_9fade8dbe8d133e88f660f04a1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9fade8dbe8d133e88f660f04a1" ON public.task_components USING btree (role);`);
    await queryRunner.query(`-- Name: IDX_9fd867cabc75028a5625ce7b24; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_9fd867cabc75028a5625ce7b24" ON public.fcm_tokens USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_a0817e3c24f4430ab47067fc02; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a0817e3c24f4430ab47067fc02" ON public.client_wallet_ledger USING btree (wallet_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_a1bc6a387038ee38133cbeebec; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a1bc6a387038ee38133cbeebec" ON public.audit_snapshots USING btree (organization_id, entity_type, entity_id);`);
    await queryRunner.query(`-- Name: IDX_a1f57398cc39bca4dc833384b7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a1f57398cc39bca4dc833384b7" ON public.operator_inventory USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_a22a514103eb82799eda0f532b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a22a514103eb82799eda0f532b" ON public.telegram_bot_analytics USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_a283bdef18876e525aefaec042; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a283bdef18876e525aefaec042" ON public.api_keys USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_a2f8274c1ed9195dff87f6a056; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a2f8274c1ed9195dff87f6a056" ON public.material_requests USING btree (requester_id);`);
    await queryRunner.query(`-- Name: IDX_a322bf37f4f4d2a75fb3efc99c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a322bf37f4f4d2a75fb3efc99c" ON public.import_jobs USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_a45f6171005c8e106f2d3d9258; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a45f6171005c8e106f2d3d9258" ON public.collections USING btree (operator_id, collected_at);`);
    await queryRunner.query(`-- Name: IDX_a4edc4961d20098ebc2399cea4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a4edc4961d20098ebc2399cea4" ON public.spare_parts USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_a4fdb3d46dc59b3b32a5440db9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a4fdb3d46dc59b3b32a5440db9" ON public.commissions USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_a5574c9f29e9fb91bda742f38b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a5574c9f29e9fb91bda742f38b" ON public.machine_location_syncs USING btree (sync_status);`);
    await queryRunner.query(`-- Name: IDX_a6171a9597c533488dc7e29298; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a6171a9597c533488dc7e29298" ON public.audit_logs USING btree (category, severity);`);
    await queryRunner.query(`-- Name: IDX_a700a8344476ca72fd8d22bda4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a700a8344476ca72fd8d22bda4" ON public.dividend_payments USING btree (investor_profile_id);`);
    await queryRunner.query(`-- Name: IDX_a78a00605c95ca6737389f6360; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a78a00605c95ca6737389f6360" ON public.users USING btree (referred_by_id);`);
    await queryRunner.query(`-- Name: IDX_a7e28dd4663ba9f7b3a4776ae1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a7e28dd4663ba9f7b3a4776ae1" ON public.favorites USING btree (user_id, type);`);
    await queryRunner.query(`-- Name: IDX_a7f15a849b5db3970d7f070c2b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a7f15a849b5db3970d7f070c2b" ON public.trip_reconciliations USING btree (performed_at);`);
    await queryRunner.query(`-- Name: IDX_a8030edd2b1b6faf36e715ed4c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a8030edd2b1b6faf36e715ed4c" ON public.inventory_report_presets USING btree (user_id, is_default);`);
    await queryRunner.query(`-- Name: IDX_a86e012cd850bacc23678f78bf; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a86e012cd850bacc23678f78bf" ON public.directory_entries USING btree (directory_id, origin);`);
    await queryRunner.query(`-- Name: IDX_a893b017cafa5724da64c108b9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a893b017cafa5724da64c108b9" ON public.alert_rules USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_a8d823e5d3ffb48e361abcf9a4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a8d823e5d3ffb48e361abcf9a4" ON public.purchase_history USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_a8decd7a9d10f3ab8fafd74a75; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_a8decd7a9d10f3ab8fafd74a75" ON public.recipes USING btree (product_id, type_code) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_a8e58002d072212596a36f8e9a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a8e58002d072212596a36f8e9a" ON public.points_transactions USING btree (user_id, source);`);
    await queryRunner.query(`-- Name: IDX_a951139a725db0bc5c9dbded3d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a951139a725db0bc5c9dbded3d" ON public.route_stops USING btree (task_id);`);
    await queryRunner.query(`-- Name: IDX_a9a35f7f94236526b41e45d3dc; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_a9a35f7f94236526b41e45d3dc" ON public.machine_location_syncs USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_aa4764cf5ba4d7c13b2cdb3a0e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_aa4764cf5ba4d7c13b2cdb3a0e" ON public.location_visits USING btree (user_id, visit_date);`);
    await queryRunner.query(`-- Name: IDX_aa5f218fc445c6f98519e37b60; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_aa5f218fc445c6f98519e37b60" ON public.achievements USING btree (sort_order);`);
    await queryRunner.query(`-- Name: IDX_aa827a703f547f650ae603ef50; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_aa827a703f547f650ae603ef50" ON public.achievements USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_aadd0af8145704f94cc746a1be; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_aadd0af8145704f94cc746a1be" ON public.integration_webhooks USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_aaeb547cbb5a7ccf183a604e49; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_aaeb547cbb5a7ccf183a604e49" ON public.location_notes USING btree (location_id, is_pinned);`);
    await queryRunner.query(`-- Name: IDX_ab1f0cfcf9c2868ab525191b4d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ab1f0cfcf9c2868ab525191b4d" ON public.files USING btree (entity_type, entity_id);`);
    await queryRunner.query(`-- Name: IDX_ab2d29b77f1d736d9b0af89e8b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ab2d29b77f1d736d9b0af89e8b" ON public.client_orders USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_ab4b806373c2ee43946679d572; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ab4b806373c2ee43946679d572" ON public.trips USING btree (vehicle_id);`);
    await queryRunner.query(`-- Name: IDX_ab673f0e63eac966762155508e; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_ab673f0e63eac966762155508e" ON public.password_reset_tokens USING btree (token);`);
    await queryRunner.query(`-- Name: IDX_ac0419c594360d319a6a453591; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ac0419c594360d319a6a453591" ON public.security_events USING btree (event_type);`);
    await queryRunner.query(`-- Name: IDX_ac0f09364e3701d9ed35435288; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ac0f09364e3701d9ed35435288" ON public.invoices USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_ac4f9117b8e2daa502d1e7919e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ac4f9117b8e2daa502d1e7919e" ON public.access_control_logs USING btree (resource_type, decision);`);
    await queryRunner.query(`-- Name: IDX_ac77c9923a11c661e0f983a41b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ac77c9923a11c661e0f983a41b" ON public.client_payments USING btree (client_user_id);`);
    await queryRunner.query(`-- Name: IDX_aca541146f696d610371d03ed6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_aca541146f696d610371d03ed6" ON public.alert_history USING btree (severity);`);
    await queryRunner.query(`-- Name: IDX_ace513fa30d485cfd25c11a9e4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON public.users USING btree (role);`);
    await queryRunner.query(`-- Name: IDX_acf4184d2246fe1d167f5b9729; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_acf4184d2246fe1d167f5b9729" ON public.inventory_batches USING btree (warehouse_id);`);
    await queryRunner.query(`-- Name: IDX_ad426d2f300c635915da119ed9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ad426d2f300c635915da119ed9" ON public.points_transactions USING btree (reference_id);`);
    await queryRunner.query(`-- Name: IDX_adc51c4811d63b81a812bb99da; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_adc51c4811d63b81a812bb99da" ON public.machine_error_logs USING btree (occurred_at);`);
    await queryRunner.query(`-- Name: IDX_adf7309aceca5a1c2118c1d2aa; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_adf7309aceca5a1c2118c1d2aa" ON public.routes USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_ae5660af983ee383ca55f46247; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ae5660af983ee383ca55f46247" ON public.inventory_difference_thresholds USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_afbe2294df13e3930b8d758a27; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_afbe2294df13e3930b8d758a27" ON public.bank_deposits USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_afc904026a4054ec54aa4b02d5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_afc904026a4054ec54aa4b02d5" ON public.inventory_movements USING btree (operation_date);`);
    await queryRunner.query(`-- Name: IDX_b0aafedbe2d4d0fd19ee0de115; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b0aafedbe2d4d0fd19ee0de115" ON public.purchase_history USING btree (supplier_id);`);
    await queryRunner.query(`-- Name: IDX_b0deb6b1ee4723d3af34980cde; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b0deb6b1ee4723d3af34980cde" ON public.collection_records USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_b113eff65a4f9b06a883891319; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b113eff65a4f9b06a883891319" ON public.notification_templates USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_b1297d3c62c0d4a72c0e69389b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b1297d3c62c0d4a72c0e69389b" ON public.material_request_history USING btree (request_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_b16cab5c66870949cbb4ee748c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b16cab5c66870949cbb4ee748c" ON public.route_stops USING btree (route_id);`);
    await queryRunner.query(`-- Name: IDX_b2173b9221e9e60b74b3fa09ac; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b2173b9221e9e60b74b3fa09ac" ON public.employee_documents USING btree (employee_id, document_type);`);
    await queryRunner.query(`-- Name: IDX_b239e5f3c1b5c8c3c96f554222; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b239e5f3c1b5c8c3c96f554222" ON public.task_components USING btree (task_id);`);
    await queryRunner.query(`-- Name: IDX_b23c65e50a758245a33ee35fda; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON public.user_roles USING btree (role_id);`);
    await queryRunner.query(`-- Name: IDX_b2f77d6d9772e4ce54efd8f5bf; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b2f77d6d9772e4ce54efd8f5bf" ON public.employees USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_b36d6aba7370d286e7aac443af; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b36d6aba7370d286e7aac443af" ON public.tasks USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_b444e6e61d81952b3f7a103574; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b444e6e61d81952b3f7a103574" ON public.notification_rules USING btree (event_category, is_active);`);
    await queryRunner.query(`-- Name: IDX_b449a1adb4f1435fec6608f7be; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b449a1adb4f1435fec6608f7be" ON public.washing_schedules USING btree (next_wash_date);`);
    await queryRunner.query(`-- Name: IDX_b45330157d3eb8d4e7a99f7699; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b45330157d3eb8d4e7a99f7699" ON public.trips USING btree (employee_id, status) WHERE ((status = 'active'::public.trips_status_enum) AND (deleted_at IS NULL));`);
    await queryRunner.query(`-- Name: IDX_b499811df36d2e584d84b93fe0; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_b499811df36d2e584d84b93fe0" ON public.transactions USING btree (transaction_number) WHERE (transaction_number IS NOT NULL);`);
    await queryRunner.query(`-- Name: IDX_b53b480af9583dd139f3350722; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b53b480af9583dd139f3350722" ON public.report_subscriptions USING btree (organization_id, user_id);`);
    await queryRunner.query(`-- Name: IDX_b58d20eeeed7a1eead6718b2f0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b58d20eeeed7a1eead6718b2f0" ON public.operator_ratings USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_b641b62d57ba82c26800c3c6ac; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b641b62d57ba82c26800c3c6ac" ON public.reconciliation_runs USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_b66e719a451514b7f905ef31ce; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_b66e719a451514b7f905ef31ce" ON public.telegram_payments USING btree (telegram_payment_charge_id) WHERE (telegram_payment_charge_id IS NOT NULL);`);
    await queryRunner.query(`-- Name: IDX_b83b57c12df8839bf64cd13e72; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b83b57c12df8839bf64cd13e72" ON public.user_quests USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_b858d8691515da1e76b84089b6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b858d8691515da1e76b84089b6" ON public.machine_maintenance_schedules USING btree (scheduled_date);`);
    await queryRunner.query(`-- Name: IDX_b8d40c126783c5290536857cad; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b8d40c126783c5290536857cad" ON public.complaints USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_b8d6f38a4fa5139d290cb7a765; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b8d6f38a4fa5139d290cb7a765" ON public.organization_audit_logs USING btree (action);`);
    await queryRunner.query(`-- Name: IDX_b91f0e41894678cad37098f85d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b91f0e41894678cad37098f85d" ON public.operator_ratings USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_b9c5cf7ea15be7008e464d420f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b9c5cf7ea15be7008e464d420f" ON public.complaint_templates USING btree (organization_id, category);`);
    await queryRunner.query(`-- Name: IDX_b9d62e3e30aa32d6d273509f81; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_b9d62e3e30aa32d6d273509f81" ON public.stock_movements USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_ba064d16d4c7670ff5443237b9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ba064d16d4c7670ff5443237b9" ON public.spare_parts USING btree (supplier_id);`);
    await queryRunner.query(`-- Name: IDX_ba8c6162f421373a7ad367dcb3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ba8c6162f421373a7ad367dcb3" ON public.maintenance_schedules USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_ba9e465cfc707006e60aae5994; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ba9e465cfc707006e60aae5994" ON public.task_comments USING btree (task_id);`);
    await queryRunner.query(`-- Name: IDX_bae5cfbe8974cff00d5bb2bc14; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bae5cfbe8974cff00d5bb2bc14" ON public.location_contract_payments USING btree (contract_id, status);`);
    await queryRunner.query(`-- Name: IDX_bb854018fe0bb1ad64922f4898; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_bb854018fe0bb1ad64922f4898" ON public.containers USING btree (machine_id, slot_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_bbb70aafbb0f8e604c988764dc; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bbb70aafbb0f8e604c988764dc" ON public.task_photos USING btree (uploaded_by_user_id);`);
    await queryRunner.query(`-- Name: IDX_bbbd382746fd66b98f801ba04c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bbbd382746fd66b98f801ba04c" ON public.telegram_payments USING btree (user_id, status);`);
    await queryRunner.query(`-- Name: IDX_bc3acd8ceca85056bbc5f4d1c7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bc3acd8ceca85056bbc5f4d1c7" ON public.inventory_report_presets USING btree (user_id, is_shared);`);
    await queryRunner.query(`-- Name: IDX_bd2726fd31b35443f2245b93ba; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON public.audit_logs USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_bda2ca8150437c5c3c349cf3cd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bda2ca8150437c5c3c349cf3cd" ON public.recipes USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_be5388d0db2eae80713f5f4943; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_be5388d0db2eae80713f5f4943" ON public.access_template_rows USING btree (template_id);`);
    await queryRunner.query(`-- Name: IDX_be7814e413287e7ac47e25aa6e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_be7814e413287e7ac47e25aa6e" ON public.maintenance_requests USING btree (assigned_technician_id);`);
    await queryRunner.query(`-- Name: IDX_bea6f685f4acdf6ecdeb33b5c5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bea6f685f4acdf6ecdeb33b5c5" ON public.telegram_message_logs USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_bf38e0515a1c89bb657d0c92a1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bf38e0515a1c89bb657d0c92a1" ON public.machine_access USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_bfbee6ad07098ee557b6e71b0a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bfbee6ad07098ee557b6e71b0a" ON public.vehicles USING btree (owner_employee_id);`);
    await queryRunner.query(`-- Name: IDX_bff9f1a35509574fffeb4a08a3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_bff9f1a35509574fffeb4a08a3" ON public.commission_calculations USING btree (period_start, period_end);`);
    await queryRunner.query(`-- Name: IDX_c00afaf9fcaf5f2fd3314e2767; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c00afaf9fcaf5f2fd3314e2767" ON public.performance_reviews USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_c0469cda2f63d7311fd65996d9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c0469cda2f63d7311fd65996d9" ON public.notifications USING btree (scheduled_at, status);`);
    await queryRunner.query(`-- Name: IDX_c086ddadcb23699a8ccd3def58; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c086ddadcb23699a8ccd3def58" ON public.fiscal_queue USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_c0dfddafd5d9d49593930be293; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c0dfddafd5d9d49593930be293" ON public.security_events USING btree (severity);`);
    await queryRunner.query(`-- Name: IDX_c14f5f7112bd9b09f89db9055a; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_c14f5f7112bd9b09f89db9055a" ON public.route_stops USING btree (route_id, sequence) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_c1d5ba3373e55c70f6e3ce9e1a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c1d5ba3373e55c70f6e3ce9e1a" ON public.transaction_daily_summaries USING btree (machine_id, summary_date);`);
    await queryRunner.query(`-- Name: IDX_c1d63ed5127c053e50abcdbce5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c1d63ed5127c053e50abcdbce5" ON public.organization_invitations USING btree (email);`);
    await queryRunner.query(`-- Name: IDX_c2ebd7cc75091c58fc810a2e31; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c2ebd7cc75091c58fc810a2e31" ON public.notification_logs USING btree (notification_id);`);
    await queryRunner.query(`-- Name: IDX_c31aec9f27fea49b50bbcb0cc2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c31aec9f27fea49b50bbcb0cc2" ON public.complaint_automation_rules USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_c328a1ecd12a5f153a96df4509; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c328a1ecd12a5f153a96df4509" ON public.roles USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_c32ecf959314190b5711d864cf; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_c32ecf959314190b5711d864cf" ON public.organizations USING btree (slug) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_c380deb29c3ced0355eef7c3f1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c380deb29c3ced0355eef7c3f1" ON public.directory_sync_logs USING btree (source_id);`);
    await queryRunner.query(`-- Name: IDX_c3932231d2385ac248d0888d95; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c3932231d2385ac248d0888d95" ON public.products USING btree (category);`);
    await queryRunner.query(`-- Name: IDX_c4360fcffc82d5293780871214; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c4360fcffc82d5293780871214" ON public.fiscal_receipts USING btree (shift_id, type);`);
    await queryRunner.query(`-- Name: IDX_c487067e7c88e17c7ece21401a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c487067e7c88e17c7ece21401a" ON public.suppliers USING btree (telegram_id);`);
    await queryRunner.query(`-- Name: IDX_c4fbefa60834eb3254ba4a1145; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c4fbefa60834eb3254ba4a1145" ON public.telegram_payments USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_c62275c94bea0870eeb422b1e4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c62275c94bea0870eeb422b1e4" ON public.location_contracts USING btree (end_date, status);`);
    await queryRunner.query(`-- Name: IDX_c6547cd135a1ee7e029ac3b3e7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c6547cd135a1ee7e029ac3b3e7" ON public.organization_contracts USING btree (end_date);`);
    await queryRunner.query(`-- Name: IDX_c68897daf6d7184c76cbe04ad2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c68897daf6d7184c76cbe04ad2" ON public.maintenance_requests USING btree (scheduled_date);`);
    await queryRunner.query(`-- Name: IDX_c727fda76a7af7e135d74721a7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c727fda76a7af7e135d74721a7" ON public.points_transactions USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_c755e3741cd46fc5ae3ef06592; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c755e3741cd46fc5ae3ef06592" ON public.user_achievements USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_c764127ce1307409f2d8362f23; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c764127ce1307409f2d8362f23" ON public.import_templates USING btree (organization_id, import_type);`);
    await queryRunner.query(`-- Name: IDX_c819677e66143db1ad0075a82d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c819677e66143db1ad0075a82d" ON public.stock_movements USING btree (to_warehouse_id);`);
    await queryRunner.query(`-- Name: IDX_c87c990b675d80ed7ce95b1d06; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c87c990b675d80ed7ce95b1d06" ON public.organization_audit_logs USING btree (entity_type, entity_id);`);
    await queryRunner.query(`-- Name: IDX_c8873cde649332303fbc228e88; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_c8873cde649332303fbc228e88" ON public.client_loyalty_accounts USING btree (client_user_id);`);
    await queryRunner.query(`-- Name: IDX_c8c9177aadd13e382709cea969; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c8c9177aadd13e382709cea969" ON public.incidents USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_c95586bf2b5b60707fb57efdbd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_c95586bf2b5b60707fb57efdbd" ON public.maintenance_parts USING btree (maintenance_request_id);`);
    await queryRunner.query(`-- Name: IDX_ca9be7aadd366bacb192832c8c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ca9be7aadd366bacb192832c8c" ON public.locations USING btree (city, status);`);
    await queryRunner.query(`-- Name: IDX_cad0f47a65842d00cd293795bf; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_cad0f47a65842d00cd293795bf" ON public.machine_location_history USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_cbf20fadedfa0fe481b91b2d11; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_cbf20fadedfa0fe481b91b2d11" ON public.quests USING btree (organization_id, period, is_active);`);
    await queryRunner.query(`-- Name: IDX_cca7634960c09010c40b6490a1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_cca7634960c09010c40b6490a1" ON public.stock_movements USING btree (type);`);
    await queryRunner.query(`-- Name: IDX_cce5d08866d46f82c6d640e374; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_cce5d08866d46f82c6d640e374" ON public.location_visits USING btree (location_id, visit_date);`);
    await queryRunner.query(`-- Name: IDX_cd1a671c7e6c5f7c8dd83887ed; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_cd1a671c7e6c5f7c8dd83887ed" ON public.agent_sessions USING btree (session_id);`);
    await queryRunner.query(`-- Name: IDX_cd35ced9851c456a28e2956340; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_cd35ced9851c456a28e2956340" ON public.loyalty_promo_codes USING btree (code, organization_id);`);
    await queryRunner.query(`-- Name: IDX_cd44f579c183ac92c91b726f9b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_cd44f579c183ac92c91b726f9b" ON public.hopper_types USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_ce3ad0df76c4373470a9b529ff; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ce3ad0df76c4373470a9b529ff" ON public.integration_templates USING btree (category);`);
    await queryRunner.query(`-- Name: IDX_ce63d7a25deb7270e279e04685; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ce63d7a25deb7270e279e04685" ON public.inventory_adjustments USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_ce6a4bce5d45d71217ac382007; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ce6a4bce5d45d71217ac382007" ON public.commission_calculations USING btree (payment_status);`);
    await queryRunner.query(`-- Name: IDX_ce7dcb294e0122bc9ff236bc4b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ce7dcb294e0122bc9ff236bc4b" ON public.washing_schedules USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_cee5459245f652b75eb2759b4c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON public.audit_logs USING btree (action);`);
    await queryRunner.query(`-- Name: IDX_cf3808c90b68b06f22820d6168; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_cf3808c90b68b06f22820d6168" ON public.notification_logs USING btree (channel, status);`);
    await queryRunner.query(`-- Name: IDX_cf6cff2bb63ef7f80fb152f0a3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_cf6cff2bb63ef7f80fb152f0a3" ON public.client_wallet_ledger USING btree (transaction_type);`);
    await queryRunner.query(`-- Name: IDX_d0485e8aa7535f089f39368983; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d0485e8aa7535f089f39368983" ON public.inventory_movements USING btree (task_id);`);
    await queryRunner.query(`-- Name: IDX_d04b0d5892487f7626f2bf594c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d04b0d5892487f7626f2bf594c" ON public.inventory_counts USING btree (started_at);`);
    await queryRunner.query(`-- Name: IDX_d176469f39171f2ba56cf090cd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d176469f39171f2ba56cf090cd" ON public.notification_queue USING btree (channel, status);`);
    await queryRunner.query(`-- Name: IDX_d1891b273f5c77638d2149a9f0; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d1891b273f5c77638d2149a9f0" ON public.security_events USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_d1fe2c2ac0c023b324017d9b34; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d1fe2c2ac0c023b324017d9b34" ON public.maintenance_work_logs USING btree (technician_id);`);
    await queryRunner.query(`-- Name: IDX_d243fa737f206a31ff6e342ef5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d243fa737f206a31ff6e342ef5" ON public.api_keys USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_d2a92f4b3dc392cf2cfce4b0a3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d2a92f4b3dc392cf2cfce4b0a3" ON public.spare_parts USING btree (part_number);`);
    await queryRunner.query(`-- Name: IDX_d2cb5265edb896a12f739a6956; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d2cb5265edb896a12f739a6956" ON public.data_encryption USING btree (entity_type, entity_id);`);
    await queryRunner.query(`-- Name: IDX_d371c434f05e82186a8de0cd4e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d371c434f05e82186a8de0cd4e" ON public.analytics_snapshots USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_d399463823006612d6e4deab81; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_d399463823006612d6e4deab81" ON public.warehouse_bins USING btree (organization_id, barcode);`);
    await queryRunner.query(`-- Name: IDX_d3bd929b40dbef1d393e90cfcc; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d3bd929b40dbef1d393e90cfcc" ON public.warehouse_zones USING btree (warehouse_id);`);
    await queryRunner.query(`-- Name: IDX_d3f6468a97511341901e791e06; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d3f6468a97511341901e791e06" ON public.bank_deposits USING btree (deposit_date);`);
    await queryRunner.query(`-- Name: IDX_d427feb44a7c095eaf491a77b8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d427feb44a7c095eaf491a77b8" ON public.materials USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_d4abe9dbb16e4d54d1deadef47; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d4abe9dbb16e4d54d1deadef47" ON public.alert_rules USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_d4bbd861731298b2b1488683d4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d4bbd861731298b2b1488683d4" ON public.audit_logs USING btree (event_type);`);
    await queryRunner.query(`-- Name: IDX_d4bfcff0f564ae87ed63043add; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d4bfcff0f564ae87ed63043add" ON public.time_off_requests USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_d4e095bcd100de447d3c27708f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d4e095bcd100de447d3c27708f" ON public.invoices USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_d54dc5babc58e0ffcfd4bb441e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d54dc5babc58e0ffcfd4bb441e" ON public.scheduled_reports USING btree (next_run_at, is_active);`);
    await queryRunner.query(`-- Name: IDX_d58d69c1e69173e66e72bdc044; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d58d69c1e69173e66e72bdc044" ON public.payment_transactions USING btree (client_user_id);`);
    await queryRunner.query(`-- Name: IDX_d63b6d922ed49419ce8115bf00; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d63b6d922ed49419ce8115bf00" ON public.report_definitions USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_d726ea8cb17e08c1857a5b2d38; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d726ea8cb17e08c1857a5b2d38" ON public.import_sessions USING btree (approval_status);`);
    await queryRunner.query(`-- Name: IDX_d77c8048967cd22a3476a8834d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d77c8048967cd22a3476a8834d" ON public.promo_code_redemptions USING btree (client_user_id);`);
    await queryRunner.query(`-- Name: IDX_d7ee51bf4f499cf0af07df6f5f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d7ee51bf4f499cf0af07df6f5f" ON public.daily_stats USING btree (stat_date);`);
    await queryRunner.query(`-- Name: IDX_d85e1601a356116065b4228e49; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d85e1601a356116065b4228e49" ON public.inventory_reservations USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_d86aa84090327c9a94aee62e18; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d86aa84090327c9a94aee62e18" ON public.security_events USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_d89f6bb8b700e395020d49ba57; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d89f6bb8b700e395020d49ba57" ON public.bin_content_history USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_d8c2c6a3bcb69238fd03823da1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d8c2c6a3bcb69238fd03823da1" ON public.contractors USING btree (service_type);`);
    await queryRunner.query(`-- Name: IDX_d9a5e61e9b0321ac40f6f7bdeb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d9a5e61e9b0321ac40f6f7bdeb" ON public.client_payments USING btree (provider, status);`);
    await queryRunner.query(`-- Name: IDX_d9dd7c3f22582724b9ee9aa59b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_d9dd7c3f22582724b9ee9aa59b" ON public.data_encryption USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_da87c55b3bbbe96c6ed88ea7ee; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_da87c55b3bbbe96c6ed88ea7ee" ON public.transactions USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_dac5d7acd8006ead52ea1767bb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_dac5d7acd8006ead52ea1767bb" ON public.billing_payments USING btree (invoice_id);`);
    await queryRunner.query(`-- Name: IDX_db3b44aa62d979387ac48434e5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_db3b44aa62d979387ac48434e5" ON public.work_logs USING btree (employee_id);`);
    await queryRunner.query(`-- Name: IDX_dbc81ff542b1b3366bae195f2a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_dbc81ff542b1b3366bae195f2a" ON public.user_sessions USING btree (expires_at);`);
    await queryRunner.query(`-- Name: IDX_dc6aba5d0545d09cb258b0ba4d; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_dc6aba5d0545d09cb258b0ba4d" ON public.cms_articles USING btree (organization_id, slug) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_dcfd6e27aaf98a5a45c7c3b862; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_dcfd6e27aaf98a5a45c7c3b862" ON public.import_sessions USING btree (uploaded_by_user_id);`);
    await queryRunner.query(`-- Name: IDX_dd60ad41a3cbe295ae80343fcb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_dd60ad41a3cbe295ae80343fcb" ON public.session_logs USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_ddab9262c21e371e47a54e7598; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ddab9262c21e371e47a54e7598" ON public.commissions USING btree (period_start, period_end);`);
    await queryRunner.query(`-- Name: IDX_de5ac300b8c6e878e736f964fd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_de5ac300b8c6e878e736f964fd" ON public.trip_reconciliations USING btree (trip_id);`);
    await queryRunner.query(`-- Name: IDX_de787f72d26b0bf6a63613781d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_de787f72d26b0bf6a63613781d" ON public.audit_alert_history USING btree (alert_id, triggered_at);`);
    await queryRunner.query(`-- Name: IDX_deb40e2f2ce5c32699535a0584; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_deb40e2f2ce5c32699535a0584" ON public.contracts USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_deb4d92d0e7c86f68e1b8af30f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_deb4d92d0e7c86f68e1b8af30f" ON public.validation_rules USING btree (domain, is_active);`);
    await queryRunner.query(`-- Name: IDX_dec89676178666a0d96c804325; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_dec89676178666a0d96c804325" ON public.integration_webhooks USING btree (integration_id);`);
    await queryRunner.query(`-- Name: IDX_df5b7bffeba40ba13e437bb472; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_df5b7bffeba40ba13e437bb472" ON public.client_loyalty_ledger USING btree (loyalty_account_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_dfc074824aafcb94990f44a12d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_dfc074824aafcb94990f44a12d" ON public.machine_slots USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_e004ec4f829ea684b9d7b32dd5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e004ec4f829ea684b9d7b32dd5" ON public.import_sessions USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_e02a897b6671bf1ba00fd8a855; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e02a897b6671bf1ba00fd8a855" ON public.tasks USING btree (rejected_by_user_id);`);
    await queryRunner.query(`-- Name: IDX_e155b57aaec56e019290767d63; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e155b57aaec56e019290767d63" ON public.organization_contracts USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_e160695f0c64ad45a78a533c6d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e160695f0c64ad45a78a533c6d" ON public.audit_alerts USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_e21258bdc3692b44960c623940; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_e21258bdc3692b44960c623940" ON public.positions USING btree (code);`);
    await queryRunner.query(`-- Name: IDX_e35295180445db7acc39d2b986; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e35295180445db7acc39d2b986" ON public.sales_imports USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_e3653640e4f62aa511fe43b6f8; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e3653640e4f62aa511fe43b6f8" ON public.contracts USING btree (contractor_id);`);
    await queryRunner.query(`-- Name: IDX_e4816844450e8870fbef1a33e6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e4816844450e8870fbef1a33e6" ON public.points_transactions USING btree (user_id, expires_at);`);
    await queryRunner.query(`-- Name: IDX_e4bcd3624640f163c16b4a5a08; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e4bcd3624640f163c16b4a5a08" ON public.warehouse_inventory USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_e4dc0b6ac9b5cdf5034bb3395a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e4dc0b6ac9b5cdf5034bb3395a" ON public.user_quests USING btree (completed_at);`);
    await queryRunner.query(`-- Name: IDX_e50edd36e78d8f7b8e7b0edcd9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e50edd36e78d8f7b8e7b0edcd9" ON public.task_items USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_e5280348f3369bbe13e2c5900f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e5280348f3369bbe13e2c5900f" ON public.audit_sessions USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_e546f3ca65e46562421acc9d1a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e546f3ca65e46562421acc9d1a" ON public.access_control_logs USING btree (user_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_e5e9700bea2236e4e825b93de2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e5e9700bea2236e4e825b93de2" ON public.tasks USING btree (pending_photos);`);
    await queryRunner.query(`-- Name: IDX_e73d92cf352ad7b17b08c615cd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e73d92cf352ad7b17b08c615cd" ON public.warehouse_zones USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_e74aaed2d9b76fb9b2ea8f4641; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e74aaed2d9b76fb9b2ea8f4641" ON public.achievements USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_e7bf37394bce993d45c08daa88; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e7bf37394bce993d45c08daa88" ON public.work_logs USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_e82318571c7dbbf75c831e026a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e82318571c7dbbf75c831e026a" ON public.task_photos USING btree (category);`);
    await queryRunner.query(`-- Name: IDX_e8e01c2ca66e12a12734c44c72; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e8e01c2ca66e12a12734c44c72" ON public.location_events USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_e8f8a5f008766c84d27cf421c5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e8f8a5f008766c84d27cf421c5" ON public.telegram_bot_analytics USING btree (telegram_user_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_e93134ceafb5e76d6144680e74; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e93134ceafb5e76d6144680e74" ON public.task_components USING btree (component_id);`);
    await queryRunner.query(`-- Name: IDX_e9658e959c490b0a634dfc5478; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e9658e959c490b0a634dfc5478" ON public.user_sessions USING btree (user_id);`);
    await queryRunner.query(`-- Name: IDX_e9af82f460cca2c82c36cff21d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_e9af82f460cca2c82c36cff21d" ON public.employees USING btree (telegram_user_id);`);
    await queryRunner.query(`-- Name: IDX_ea9ba3dfb39050f831ee3be40d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ea9ba3dfb39050f831ee3be40d" ON public.audit_logs USING btree (entity_type);`);
    await queryRunner.query(`-- Name: IDX_eab898ec3be5f2ac29e3e58301; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_eab898ec3be5f2ac29e3e58301" ON public.organization_invitations USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_eae5327e9069c824467f9e746a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_eae5327e9069c824467f9e746a" ON public.files USING btree (uploaded_by_user_id);`);
    await queryRunner.query(`-- Name: IDX_eb38e77f1d8b40a41f61b254e6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_eb38e77f1d8b40a41f61b254e6" ON public.notification_rules USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_eb9b018e4840b025cee715530d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_eb9b018e4840b025cee715530d" ON public.maintenance_parts USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_ebb707c53f52f776bdf51d4553; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ebb707c53f52f776bdf51d4553" ON public.daily_stats USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_ec56d9868592034af35cfc1568; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ec56d9868592034af35cfc1568" ON public.complaint_templates USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_ec6d397f20f7e3076d640cbdc6; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ec6d397f20f7e3076d640cbdc6" ON public.reconciliation_runs USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_ec877c5ee2e3a69ab734542bc1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ec877c5ee2e3a69ab734542bc1" ON public.telegram_message_logs USING btree (telegram_user_id);`);
    await queryRunner.query(`-- Name: IDX_ecfdd540cccb1942859f8cbcfb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ecfdd540cccb1942859f8cbcfb" ON public.counterparties USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_ed87efa614768fd3203af9e613; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ed87efa614768fd3203af9e613" ON public.transaction_daily_summaries USING btree (summary_date);`);
    await queryRunner.query(`-- Name: IDX_edbb0539fb55308f11600fd24f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_edbb0539fb55308f11600fd24f" ON public.generated_reports USING btree (organization_id, status, created_at);`);
    await queryRunner.query(`-- Name: IDX_edf97df34076d8daabc39b4daf; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_edf97df34076d8daabc39b4daf" ON public.hw_imported_sales USING btree (import_batch_id);`);
    await queryRunner.query(`-- Name: IDX_ee6d7c7e1393b4edc4e7598b68; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ee6d7c7e1393b4edc4e7598b68" ON public.organization_audit_logs USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_eee65e9fe7ff1e3c98edf0c60a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_eee65e9fe7ff1e3c98edf0c60a" ON public.directory_entries USING btree (directory_id, status);`);
    await queryRunner.query(`-- Name: IDX_ef494681de3ea6734825e88042; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_ef494681de3ea6734825e88042" ON public.user_quests USING btree (user_id, quest_id, period_start);`);
    await queryRunner.query(`-- Name: IDX_ef6d0ca5165ef6b197b086df10; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ef6d0ca5165ef6b197b086df10" ON public.purchase_history USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_f0e3007d5d0f3d4234444bdb2f; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f0e3007d5d0f3d4234444bdb2f" ON public.analytics_snapshots USING btree (machine_id);`);
    await queryRunner.query(`-- Name: IDX_f10339fa4982575e6ca525a8c3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f10339fa4982575e6ca525a8c3" ON public.directories USING btree (scope, organization_id);`);
    await queryRunner.query(`-- Name: IDX_f10a22c524df6bee306ea7d915; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f10a22c524df6bee306ea7d915" ON public.time_off_requests USING btree (start_date, end_date);`);
    await queryRunner.query(`-- Name: IDX_f1727abfbb0b1dfd42c357b8c3; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f1727abfbb0b1dfd42c357b8c3" ON public.transactions USING btree (transaction_date);`);
    await queryRunner.query(`-- Name: IDX_f1878a5d380864f46623c6a526; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f1878a5d380864f46623c6a526" ON public.alert_rules USING btree (metric);`);
    await queryRunner.query(`-- Name: IDX_f240137e0e13bed80bdf64fed5; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f240137e0e13bed80bdf64fed5" ON public.recipe_ingredients USING btree (recipe_id);`);
    await queryRunner.query(`-- Name: IDX_f2586fd9b28d23adc3421db417; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f2586fd9b28d23adc3421db417" ON public.reconciliation_mismatches USING btree (is_resolved);`);
    await queryRunner.query(`-- Name: IDX_f281c2cf990361f17f8bd81a31; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f281c2cf990361f17f8bd81a31" ON public.complaint_actions USING btree (complaint_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_f3770f157bd77d83ab022e92fc; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f3770f157bd77d83ab022e92fc" ON public.organizations USING btree (status);`);
    await queryRunner.query(`-- Name: IDX_f3a7c9411eaa5f9cbc5363de33; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f3a7c9411eaa5f9cbc5363de33" ON public.organizations USING btree (parent_id);`);
    await queryRunner.query(`-- Name: IDX_f3f73accc1d8e36d413bdfc475; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f3f73accc1d8e36d413bdfc475" ON public.referrals USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_f4803065489d2038b62124c52a; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_f4803065489d2038b62124c52a" ON public.warehouses USING btree (code) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_f4a82100908db1462e35d73013; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f4a82100908db1462e35d73013" ON public.complaints USING btree (status, priority);`);
    await queryRunner.query(`-- Name: IDX_f4b30d2efe6a5b9eabdfa40b25; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f4b30d2efe6a5b9eabdfa40b25" ON public.loyalty_promo_code_usages USING btree (order_id);`);
    await queryRunner.query(`-- Name: IDX_f4ea2bca842a89e43c786598ed; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f4ea2bca842a89e43c786598ed" ON public.location_events USING btree (location_id, event_type);`);
    await queryRunner.query(`-- Name: IDX_f5c8fa9c4a25f0ded60fd45a2b; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f5c8fa9c4a25f0ded60fd45a2b" ON public.agent_progress USING btree (session_id);`);
    await queryRunner.query(`-- Name: IDX_f6170d327bab454f6378ea1eba; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f6170d327bab454f6378ea1eba" ON public.client_users USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_f64cfae3dc201348f591b4bf22; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f64cfae3dc201348f591b4bf22" ON public.recipes USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_f65df6f9c4c4e7fd1f4f5d392d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f65df6f9c4c4e7fd1f4f5d392d" ON public.warehouse_inventory USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_f67a410d462576f328bc836cb9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f67a410d462576f328bc836cb9" ON public.security_events USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_f68f5db1271a89d9b5f992984e; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f68f5db1271a89d9b5f992984e" ON public.fiscal_queue USING btree (device_id, priority);`);
    await queryRunner.query(`-- Name: IDX_f69079ea35bee81b45207a256a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f69079ea35bee81b45207a256a" ON public.machine_error_logs USING btree (error_code);`);
    await queryRunner.query(`-- Name: IDX_f6a0ff7fcf8d7952401523dc0a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f6a0ff7fcf8d7952401523dc0a" ON public.inventory_report_presets USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_f6bd6f8934e1a8c87462e47136; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f6bd6f8934e1a8c87462e47136" ON public.tasks USING btree (assigned_to_user_id, status);`);
    await queryRunner.query(`-- Name: IDX_f72496aa53e3584e07b43e2cd1; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f72496aa53e3584e07b43e2cd1" ON public.commissions USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_f77c3adc34092e3fa833c616b7; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f77c3adc34092e3fa833c616b7" ON public.scheduled_reports USING btree (organization_id, is_active);`);
    await queryRunner.query(`-- Name: IDX_f81075bcc6ed548247c1a33347; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f81075bcc6ed548247c1a33347" ON public.locations USING btree (latitude, longitude);`);
    await queryRunner.query(`-- Name: IDX_f8aa5a0ec5345433ba253a7eaa; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f8aa5a0ec5345433ba253a7eaa" ON public.notifications USING btree (type, status);`);
    await queryRunner.query(`-- Name: IDX_f9603f682ee2d499d3abfd5022; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f9603f682ee2d499d3abfd5022" ON public.vehicles USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_f9a740a06205119ac43fe9aabd; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_f9a740a06205119ac43fe9aabd" ON public.complaint_refunds USING btree (complaint_id, status);`);
    await queryRunner.query(`-- Name: IDX_fa8b76306d731663cdaa42a335; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fa8b76306d731663cdaa42a335" ON public.favorites USING btree (user_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_fb1343b1ae1968a348d1ebea73; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fb1343b1ae1968a348d1ebea73" ON public.login_attempts USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_fb642e1ed580983701d5a2f8a2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fb642e1ed580983701d5a2f8a2" ON public.dividend_payments USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_fbabc7192bfdb38bb6c2d0f777; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fbabc7192bfdb38bb6c2d0f777" ON public.incidents USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_fbfc1475fc6797244d160068cb; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fbfc1475fc6797244d160068cb" ON public.orders USING btree (user_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_fc0a9120621b8998ecff91ae9c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fc0a9120621b8998ecff91ae9c" ON public.component_maintenance USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_fc11433e8c56193e6f7747b85d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fc11433e8c56193e6f7747b85d" ON public.audit_sessions USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_fcd7d036f0747cdc55429832d4; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fcd7d036f0747cdc55429832d4" ON public.import_jobs USING btree (created_at);`);
    await queryRunner.query(`-- Name: IDX_fce34be6f971ac78888e41791a; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fce34be6f971ac78888e41791a" ON public.complaints USING btree (machine_id, status);`);
    await queryRunner.query(`-- Name: IDX_fcf0f29fa6d4ed5aae3c463552; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fcf0f29fa6d4ed5aae3c463552" ON public.fiscal_shifts USING btree (device_id, status);`);
    await queryRunner.query(`-- Name: IDX_fd7938f76af0e73901787c728d; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fd7938f76af0e73901787c728d" ON public.inventory_difference_thresholds USING btree (reference_id);`);
    await queryRunner.query(`-- Name: IDX_fdaf4db6d5693d82655d1bb1d2; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fdaf4db6d5693d82655d1bb1d2" ON public.maintenance_schedules USING btree (next_due_date);`);
    await queryRunner.query(`-- Name: IDX_fdc8ba1b938c6d5b78ec75e289; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fdc8ba1b938c6d5b78ec75e289" ON public.integration_logs USING btree (integration_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_fe247ee01cf040fc74cb2656c9; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fe247ee01cf040fc74cb2656c9" ON public.inventory_adjustments USING btree (product_id);`);
    await queryRunner.query(`-- Name: IDX_fe6ca83164ef657b437739df22; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fe6ca83164ef657b437739df22" ON public.machine_access USING btree (organization_id);`);
    await queryRunner.query(`-- Name: IDX_ff019a44669463cb21f9c40cd2; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_ff019a44669463cb21f9c40cd2" ON public.machines USING btree (machine_number) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: IDX_ff4f6ca0e6a33552778e460adf; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ff4f6ca0e6a33552778e460adf" ON public.integration_logs USING btree (organization_id, created_at);`);
    await queryRunner.query(`-- Name: IDX_ffb661eaf4459cfabf7f6c6f72; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ffb661eaf4459cfabf7f6c6f72" ON public.telegram_users USING btree (organization_id, status);`);
    await queryRunner.query(`-- Name: IDX_fff5d76d68111f4dea0927149c; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_fff5d76d68111f4dea0927149c" ON public.recipe_snapshots USING btree (recipe_id);`);
    await queryRunner.query(`-- Name: IDX_goods_classifiers_code; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_goods_classifiers_code" ON public.goods_classifiers USING btree (code);`);
    await queryRunner.query(`-- Name: IDX_goods_classifiers_group_code; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_goods_classifiers_group_code" ON public.goods_classifiers USING btree (group_code);`);
    await queryRunner.query(`-- Name: IDX_goods_classifiers_is_active; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_goods_classifiers_is_active" ON public.goods_classifiers USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_goods_classifiers_parent_code; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_goods_classifiers_parent_code" ON public.goods_classifiers USING btree (parent_code);`);
    await queryRunner.query(`-- Name: IDX_ikpu_codes_code; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_ikpu_codes_code" ON public.ikpu_codes USING btree (code);`);
    await queryRunner.query(`-- Name: IDX_ikpu_codes_is_active; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ikpu_codes_is_active" ON public.ikpu_codes USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_ikpu_codes_is_marked; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ikpu_codes_is_marked" ON public.ikpu_codes USING btree (is_marked);`);
    await queryRunner.query(`-- Name: IDX_ikpu_codes_mxik_code; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_ikpu_codes_mxik_code" ON public.ikpu_codes USING btree (mxik_code);`);
    await queryRunner.query(`-- Name: IDX_package_types_code; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_package_types_code" ON public.package_types USING btree (code);`);
    await queryRunner.query(`-- Name: IDX_package_types_is_active; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_package_types_is_active" ON public.package_types USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_payment_providers_code; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_payment_providers_code" ON public.payment_providers USING btree (code);`);
    await queryRunner.query(`-- Name: IDX_payment_providers_is_active; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_payment_providers_is_active" ON public.payment_providers USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_payment_providers_type; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_payment_providers_type" ON public.payment_providers USING btree (type);`);
    await queryRunner.query(`-- Name: IDX_vat_rates_code; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "IDX_vat_rates_code" ON public.vat_rates USING btree (code);`);
    await queryRunner.query(`-- Name: IDX_vat_rates_is_active; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_vat_rates_is_active" ON public.vat_rates USING btree (is_active);`);
    await queryRunner.query(`-- Name: IDX_vat_rates_is_default; Type: INDEX; Schema: public; Owner: -
CREATE INDEX "IDX_vat_rates_is_default" ON public.vat_rates USING btree (is_default);`);
    await queryRunner.query(`-- Name: UQ_access_templates_name_org; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "UQ_access_templates_name_org" ON public.access_templates USING btree (name, organization_id) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: UQ_analytics_snapshot_composite; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "UQ_analytics_snapshot_composite" ON public.analytics_snapshots USING btree (organization_id, snapshot_type, snapshot_date, machine_id, location_id, product_id) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: UQ_daily_stats_org_date; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "UQ_daily_stats_org_date" ON public.daily_stats USING btree (organization_id, stat_date) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: UQ_machine_access_machine_user; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "UQ_machine_access_machine_user" ON public.machine_access USING btree (machine_id, user_id) WHERE (deleted_at IS NULL);`);
    await queryRunner.query(`-- Name: UQ_operator_ratings_user_period; Type: INDEX; Schema: public; Owner: -
CREATE UNIQUE INDEX "UQ_operator_ratings_user_period" ON public.operator_ratings USING btree (user_id, period_start, period_end) WHERE (deleted_at IS NULL);`);

    // ── Foreign Keys (196) ──
    await queryRunner.query(`-- Name: favorites FK_003e599a9fc0e8f154b6313639f; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT "FK_003e599a9fc0e8f154b6313639f" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: audit_alert_history FK_00dfdbf250684b4409d388c044d; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.audit_alert_history
    ADD CONSTRAINT "FK_00dfdbf250684b4409d388c044d" FOREIGN KEY (alert_id) REFERENCES public.audit_alerts(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: machine_error_logs FK_0571ac62f396e19805ee5ccc902; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_error_logs
    ADD CONSTRAINT "FK_0571ac62f396e19805ee5ccc902" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: fiscal_receipts FK_06fec03a91584c1485f0cec0af1; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.fiscal_receipts
    ADD CONSTRAINT "FK_06fec03a91584c1485f0cec0af1" FOREIGN KEY (shift_id) REFERENCES public.fiscal_shifts(id);`);
    await queryRunner.query(`-- Name: contractor_invoices FK_07a29362eb14e05acb4af148ce4; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.contractor_invoices
    ADD CONSTRAINT "FK_07a29362eb14e05acb4af148ce4" FOREIGN KEY (contractor_id) REFERENCES public.contractors(id);`);
    await queryRunner.query(`-- Name: task_comments FK_07ff0d4347a198527663bda63d9; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT "FK_07ff0d4347a198527663bda63d9" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: quests FK_0a0d83baed7a608f036a16dcfec; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.quests
    ADD CONSTRAINT "FK_0a0d83baed7a608f036a16dcfec" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: directory_sync_logs FK_0d7287b1cc92d41e3b0792401bf; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_sync_logs
    ADD CONSTRAINT "FK_0d7287b1cc92d41e3b0792401bf" FOREIGN KEY (directory_id) REFERENCES public.directories(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: user_notification_settings FK_0f3b6323c98bbf0239d6a5060b2; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT "FK_0f3b6323c98bbf0239d6a5060b2" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: payment_transactions FK_0f581511ac19ecb02dab437cd41; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "FK_0f581511ac19ecb02dab437cd41" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: location_contract_payments FK_0f91e423c0e6437868fedb650ba; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_contract_payments
    ADD CONSTRAINT "FK_0f91e423c0e6437868fedb650ba" FOREIGN KEY (contract_id) REFERENCES public.location_contracts(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: payment_refunds FK_120d5922b2ea0533228062306ac; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT "FK_120d5922b2ea0533228062306ac" FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: location_visits FK_126594b82e8bfd2af69e4e036fd; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_visits
    ADD CONSTRAINT "FK_126594b82e8bfd2af69e4e036fd" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: reconciliation_mismatches FK_129c621c26fad8f2ca9347f43fe; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.reconciliation_mismatches
    ADD CONSTRAINT "FK_129c621c26fad8f2ca9347f43fe" FOREIGN KEY (run_id) REFERENCES public.reconciliation_runs(id);`);
    await queryRunner.query(`-- Name: recipe_ingredients FK_133545365243061dc2c55dc1373; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT "FK_133545365243061dc2c55dc1373" FOREIGN KEY (ingredient_id) REFERENCES public.products(id) ON DELETE RESTRICT;`);
    await queryRunner.query(`-- Name: order_items FK_145532db85752b29c57d2b7b1f1; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: inventory_counts FK_14c56fd4f33ec104368efee5f1e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT "FK_14c56fd4f33ec104368efee5f1e" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: report_subscriptions FK_151e3f097d5951781e58d80a4e0; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.report_subscriptions
    ADD CONSTRAINT "FK_151e3f097d5951781e58d80a4e0" FOREIGN KEY (scheduled_report_id) REFERENCES public.scheduled_reports(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: role_permissions FK_17022daf3f885f7d35423e9971e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: task_photos FK_177e3667c2d6ea987b5b3a851f2; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_photos
    ADD CONSTRAINT "FK_177e3667c2d6ea987b5b3a851f2" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: role_permissions FK_178199805b901ccd220ab7740ec; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: complaint_comments FK_17a2eb3e8642a9a06309fec7a6a; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_comments
    ADD CONSTRAINT "FK_17a2eb3e8642a9a06309fec7a6a" FOREIGN KEY (complaint_id) REFERENCES public.complaints(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: telegram_payments FK_17c66e770946a5eb381ee3250ca; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_payments
    ADD CONSTRAINT "FK_17c66e770946a5eb381ee3250ca" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: referrals FK_18af9fcaffac6d6d3b28130e149; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT "FK_18af9fcaffac6d6d3b28130e149" FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: telegram_bot_analytics FK_1b3a3cee39a04beb26375023d8e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_bot_analytics
    ADD CONSTRAINT "FK_1b3a3cee39a04beb26375023d8e" FOREIGN KEY (telegram_user_id) REFERENCES public.telegram_users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: operator_inventory FK_1d883fa09e29792824becad1fee; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.operator_inventory
    ADD CONSTRAINT "FK_1d883fa09e29792824becad1fee" FOREIGN KEY (operator_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: collection_records FK_1e43d2b07fc0ed4aea56117dc98; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.collection_records
    ADD CONSTRAINT "FK_1e43d2b07fc0ed4aea56117dc98" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: scheduled_reports FK_20cbd5a76f30d814ae1de73689d; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.scheduled_reports
    ADD CONSTRAINT "FK_20cbd5a76f30d814ae1de73689d" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: component_movements FK_210905985d10aa14aefff3fd447; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.component_movements
    ADD CONSTRAINT "FK_210905985d10aa14aefff3fd447" FOREIGN KEY (component_id) REFERENCES public.equipment_components(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: payment_refunds FK_211e6fd90f1265bb68aa4dffe01; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_refunds
    ADD CONSTRAINT "FK_211e6fd90f1265bb68aa4dffe01" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: users FK_21a659804ed7bf61eb91688dea7; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_21a659804ed7bf61eb91688dea7" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: inventory_movements FK_221a06777c190567ac242ba926e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT "FK_221a06777c190567ac242ba926e" FOREIGN KEY (operator_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: maintenance_work_logs FK_224f9ac1134b4339a4b076f3a90; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.maintenance_work_logs
    ADD CONSTRAINT "FK_224f9ac1134b4339a4b076f3a90" FOREIGN KEY (maintenance_request_id) REFERENCES public.maintenance_requests(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: task_items FK_237f7a8016f2ab372b2b1ad8d76; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_items
    ADD CONSTRAINT "FK_237f7a8016f2ab372b2b1ad8d76" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: tasks FK_27821ee30aa99daef697f21322c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "FK_27821ee30aa99daef697f21322c" FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: location_events FK_29e0ca43796ed36801718236e05; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_events
    ADD CONSTRAINT "FK_29e0ca43796ed36801718236e05" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: saved_report_filters FK_2abd4582af2d44eb5183fa47186; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.saved_report_filters
    ADD CONSTRAINT "FK_2abd4582af2d44eb5183fa47186" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: integrations FK_2b83d3671eccf9da46693130ced; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT "FK_2b83d3671eccf9da46693130ced" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: warehouse_zones FK_2cc09ed3ffb74b669e0b843b2c2; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouse_zones
    ADD CONSTRAINT "FK_2cc09ed3ffb74b669e0b843b2c2" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: performance_reviews FK_2d1d9e46c9f01ac7c07d59b2756; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT "FK_2d1d9e46c9f01ac7c07d59b2756" FOREIGN KEY (employee_id) REFERENCES public.employees(id);`);
    await queryRunner.query(`-- Name: departments FK_2d6673ae91cee09bef47d2a5de2; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "FK_2d6673ae91cee09bef47d2a5de2" FOREIGN KEY (parent_department_id) REFERENCES public.departments(id);`);
    await queryRunner.query(`-- Name: employees FK_2d83c53c3e553a48dadb9722e38; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "FK_2d83c53c3e553a48dadb9722e38" FOREIGN KEY (user_id) REFERENCES public.users(id);`);
    await queryRunner.query(`-- Name: transactions FK_31fa89104f54fe7ae18b450fb74; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_31fa89104f54fe7ae18b450fb74" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: dashboard_widgets FK_320cc93480d7bb25a4a984599ba; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.dashboard_widgets
    ADD CONSTRAINT "FK_320cc93480d7bb25a4a984599ba" FOREIGN KEY (dashboard_id) REFERENCES public.dashboards(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: payment_transactions FK_32e2a0252f3f966ebba5bd9e89e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "FK_32e2a0252f3f966ebba5bd9e89e" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: users FK_351efa45102e8ffd665b8a50bdd; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_351efa45102e8ffd665b8a50bdd" FOREIGN KEY (rejected_by_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: favorites FK_35a6b05ee3b624d0de01ee50593; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: inventory_adjustments FK_36368323328962c549dd600b624; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT "FK_36368323328962c549dd600b624" FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: user_achievements FK_36b4a912357ad1342b735d4d4c8; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "FK_36b4a912357ad1342b735d4d4c8" FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: orders FK_3afb9735d6a22a1625a7363bda4; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_3afb9735d6a22a1625a7363bda4" FOREIGN KEY (machine_id) REFERENCES public.machines(id);`);
    await queryRunner.query(`-- Name: sync_jobs FK_40f4ce5599d415af10708607b6e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.sync_jobs
    ADD CONSTRAINT "FK_40f4ce5599d415af10708607b6e" FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: directory_fields FK_41c552a550443af0817c7eb47ab; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_fields
    ADD CONSTRAINT "FK_41c552a550443af0817c7eb47ab" FOREIGN KEY (directory_id) REFERENCES public.directories(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: attendances FK_43dca8b4751d7449a38b583991c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT "FK_43dca8b4751d7449a38b583991c" FOREIGN KEY (employee_id) REFERENCES public.employees(id);`);
    await queryRunner.query(`-- Name: tasks FK_44a9b5209cdfd6f72fb09a7c994; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "FK_44a9b5209cdfd6f72fb09a7c994" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: client_payments FK_48c63bc77946fb757d79ef3a324; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_payments
    ADD CONSTRAINT "FK_48c63bc77946fb757d79ef3a324" FOREIGN KEY (order_id) REFERENCES public.client_orders(id);`);
    await queryRunner.query(`-- Name: warehouse_bins FK_49be6819f95962817605f3c611e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouse_bins
    ADD CONSTRAINT "FK_49be6819f95962817605f3c611e" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: promo_code_redemptions FK_4af34e004565170e5a678067721; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.promo_code_redemptions
    ADD CONSTRAINT "FK_4af34e004565170e5a678067721" FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: client_wallets FK_4b4c42e6b79e55afe9a10c7cd21; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_wallets
    ADD CONSTRAINT "FK_4b4c42e6b79e55afe9a10c7cd21" FOREIGN KEY (client_user_id) REFERENCES public.client_users(id);`);
    await queryRunner.query(`-- Name: contracts FK_4b8f0ccb5926cfeabea7c18b8e0; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "FK_4b8f0ccb5926cfeabea7c18b8e0" FOREIGN KEY (counterparty_id) REFERENCES public.counterparties(id) ON DELETE RESTRICT;`);
    await queryRunner.query(`-- Name: containers FK_4cdff75f8fed4ac375b9e2eb5aa; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.containers
    ADD CONSTRAINT "FK_4cdff75f8fed4ac375b9e2eb5aa" FOREIGN KEY (nomenclature_id) REFERENCES public.products(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: users FK_4e589ae9e8fde5a605d1064dfe9; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_4e589ae9e8fde5a605d1064dfe9" FOREIGN KEY (approved_by_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: trip_task_links FK_4fa037c2523fde6f8797b4f4b7f; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trip_task_links
    ADD CONSTRAINT "FK_4fa037c2523fde6f8797b4f4b7f" FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: containers FK_4fec67704b8a4575a58c89615cc; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.containers
    ADD CONSTRAINT "FK_4fec67704b8a4575a58c89615cc" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: referrals FK_507a2818bf5524662b068c2e81c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT "FK_507a2818bf5524662b068c2e81c" FOREIGN KEY (referred_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: payrolls FK_5145d894f823722a43ec3e1955e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payrolls
    ADD CONSTRAINT "FK_5145d894f823722a43ec3e1955e" FOREIGN KEY (employee_id) REFERENCES public.employees(id);`);
    await queryRunner.query(`-- Name: inventory_reservations FK_522df4fefa0b166fc2a363499fe; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_reservations
    ADD CONSTRAINT "FK_522df4fefa0b166fc2a363499fe" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: password_reset_tokens FK_52ac39dd8a28730c63aeb428c9c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: leave_requests FK_52b4b7c7d295e204add6dbe0a09; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT "FK_52b4b7c7d295e204add6dbe0a09" FOREIGN KEY (employee_id) REFERENCES public.employees(id);`);
    await queryRunner.query(`-- Name: inventory_movements FK_5747a78ca8d2fd269466f18c164; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT "FK_5747a78ca8d2fd269466f18c164" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: location_contracts FK_57ae89295ca97de37224a5f2a27; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_contracts
    ADD CONSTRAINT "FK_57ae89295ca97de37224a5f2a27" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: transaction_items FK_5926425896b30c0d681fe879af0; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT "FK_5926425896b30c0d681fe879af0" FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: inventory_count_items FK_5bfb22f5417882f573d823cb261; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_count_items
    ADD CONSTRAINT "FK_5bfb22f5417882f573d823cb261" FOREIGN KEY (count_id) REFERENCES public.inventory_counts(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: trip_stops FK_5cb5ec6432abdf6f1e1c3a0970c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trip_stops
    ADD CONSTRAINT "FK_5cb5ec6432abdf6f1e1c3a0970c" FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: trip_points FK_5d5040c3dd4ade9ea92776ed2c1; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trip_points
    ADD CONSTRAINT "FK_5d5040c3dd4ade9ea92776ed2c1" FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: machine_inventory FK_5de5c5829890925066b1e8327dc; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_inventory
    ADD CONSTRAINT "FK_5de5c5829890925066b1e8327dc" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: directory_entries FK_5e550d70e60fed673e896821761; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_entries
    ADD CONSTRAINT "FK_5e550d70e60fed673e896821761" FOREIGN KEY (directory_id) REFERENCES public.directories(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: achievements FK_5ec76b6935875f4c6ced106bb39; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT "FK_5ec76b6935875f4c6ced106bb39" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: bin_content_history FK_60f5ff5e30350f4ab55e43cec63; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.bin_content_history
    ADD CONSTRAINT "FK_60f5ff5e30350f4ab55e43cec63" FOREIGN KEY (bin_id) REFERENCES public.warehouse_bins(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: trip_anomalies FK_62632b51357923985ef56b1eabe; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trip_anomalies
    ADD CONSTRAINT "FK_62632b51357923985ef56b1eabe" FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: inventory_movements FK_6359abd2ae30de5095019237631; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT "FK_6359abd2ae30de5095019237631" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: two_factor_auth FK_64385b800e675d22928d1e1cecf; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.two_factor_auth
    ADD CONSTRAINT "FK_64385b800e675d22928d1e1cecf" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: employees FK_678a3540f843823784b0fe4a4f2; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "FK_678a3540f843823784b0fe4a4f2" FOREIGN KEY (department_id) REFERENCES public.departments(id);`);
    await queryRunner.query(`-- Name: commission_calculations FK_689674ce1054698475d2150c947; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.commission_calculations
    ADD CONSTRAINT "FK_689674ce1054698475d2150c947" FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: machine_maintenance_schedules FK_691570840e6ee441301b02597b6; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_maintenance_schedules
    ADD CONSTRAINT "FK_691570840e6ee441301b02597b6" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: scheduled_reports FK_6c18b466213dbcd5cb4fcc3ca51; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.scheduled_reports
    ADD CONSTRAINT "FK_6c18b466213dbcd5cb4fcc3ca51" FOREIGN KEY (definition_id) REFERENCES public.report_definitions(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: saved_report_filters FK_6db14572ea2aec88cfa13fff475; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.saved_report_filters
    ADD CONSTRAINT "FK_6db14572ea2aec88cfa13fff475" FOREIGN KEY (definition_id) REFERENCES public.report_definitions(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: directory_entries FK_6e301e1bf771a4e713f849540d3; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_entries
    ADD CONSTRAINT "FK_6e301e1bf771a4e713f849540d3" FOREIGN KEY (parent_id) REFERENCES public.directory_entries(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: inventory_movements FK_7021a9f94ae1fcfbc33056414d6; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT "FK_7021a9f94ae1fcfbc33056414d6" FOREIGN KEY (performed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: dashboard_widgets FK_73843addc463ef238567f6f1109; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.dashboard_widgets
    ADD CONSTRAINT "FK_73843addc463ef238567f6f1109" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: payment_transactions FK_73f910b0ec2682e3f80f1dd05dd; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "FK_73f910b0ec2682e3f80f1dd05dd" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: points_transactions FK_7821a68980640e90c5b42a81840; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT "FK_7821a68980640e90c5b42a81840" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: recipe_ingredients FK_783f76e4992154e51df8f1c6ee3; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT "FK_783f76e4992154e51df8f1c6ee3" FOREIGN KEY (substitute_ingredient_id) REFERENCES public.products(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: notification_campaigns FK_78711938778f7092200faa0fe73; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notification_campaigns
    ADD CONSTRAINT "FK_78711938778f7092200faa0fe73" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: ingredient_batches FK_7aae877b5b5fcd2edcbcd605620; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.ingredient_batches
    ADD CONSTRAINT "FK_7aae877b5b5fcd2edcbcd605620" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;`);
    await queryRunner.query(`-- Name: client_loyalty_ledger FK_7cd732194e054737d8078dd7928; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_loyalty_ledger
    ADD CONSTRAINT "FK_7cd732194e054737d8078dd7928" FOREIGN KEY (loyalty_account_id) REFERENCES public.client_loyalty_accounts(id);`);
    await queryRunner.query(`-- Name: generated_reports FK_7cfd923cd2d2119a1b33a505c99; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT "FK_7cfd923cd2d2119a1b33a505c99" FOREIGN KEY (definition_id) REFERENCES public.report_definitions(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: organization_invitations FK_7f88954e8d667a76ae3ced6f446; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.organization_invitations
    ADD CONSTRAINT "FK_7f88954e8d667a76ae3ced6f446" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: employee_documents FK_7fce49bcbfe15a73953b2809944; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.employee_documents
    ADD CONSTRAINT "FK_7fce49bcbfe15a73953b2809944" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: materials FK_80a62c1048ed101d604d8460428; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.materials
    ADD CONSTRAINT "FK_80a62c1048ed101d604d8460428" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: favorites FK_8301ec46a58c57ef1bb4576fe81; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT "FK_8301ec46a58c57ef1bb4576fe81" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: machine_components FK_84b9551a3b2bbf37c77dc3ac9df; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_components
    ADD CONSTRAINT "FK_84b9551a3b2bbf37c77dc3ac9df" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: telegram_payments FK_869c3039adbfd7a03489b77e3de; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_payments
    ADD CONSTRAINT "FK_869c3039adbfd7a03489b77e3de" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: user_roles FK_87b8888186ca9769c960e926870; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: component_maintenance FK_87ed7b30913961a5111c9bb43c0; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.component_maintenance
    ADD CONSTRAINT "FK_87ed7b30913961a5111c9bb43c0" FOREIGN KEY (component_id) REFERENCES public.equipment_components(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: employees FK_8b14204e8af5e371e36b8c11e1b; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "FK_8b14204e8af5e371e36b8c11e1b" FOREIGN KEY (position_id) REFERENCES public.positions(id);`);
    await queryRunner.query(`-- Name: directory_sources FK_8be22d435eef595b102d3589788; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_sources
    ADD CONSTRAINT "FK_8be22d435eef595b102d3589788" FOREIGN KEY (directory_id) REFERENCES public.directories(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: integration_logs FK_8beda96d280101a52c32269ea8f; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.integration_logs
    ADD CONSTRAINT "FK_8beda96d280101a52c32269ea8f" FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: dashboards FK_8e995347a57f361f7608cff64e8; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT "FK_8e995347a57f361f7608cff64e8" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: report_definitions FK_8f015439f6b9cd4d9a3668a12fe; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.report_definitions
    ADD CONSTRAINT "FK_8f015439f6b9cd4d9a3668a12fe" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: complaint_actions FK_8f8bdf3553705242dbfcca393d3; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_actions
    ADD CONSTRAINT "FK_8f8bdf3553705242dbfcca393d3" FOREIGN KEY (complaint_id) REFERENCES public.complaints(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: directory_entries FK_91720fda2a8e78a0260a0d97d2a; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_entries
    ADD CONSTRAINT "FK_91720fda2a8e78a0260a0d97d2a" FOREIGN KEY (replacement_entry_id) REFERENCES public.directory_entries(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: order_items FK_9263386c35b6b242540f9493b00; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY (product_id) REFERENCES public.products(id);`);
    await queryRunner.query(`-- Name: investor_profiles FK_927d2c570eedf500676ba406dd3; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.investor_profiles
    ADD CONSTRAINT "FK_927d2c570eedf500676ba406dd3" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: user_quests FK_9300d9ae06520676d0f616e1cd2; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_quests
    ADD CONSTRAINT "FK_9300d9ae06520676d0f616e1cd2" FOREIGN KEY (quest_id) REFERENCES public.quests(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: tasks FK_932b7ae90148e482bc27b0a6d65; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "FK_932b7ae90148e482bc27b0a6d65" FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: warehouse_bins FK_93b9f090b559238adbbb83c8d54; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouse_bins
    ADD CONSTRAINT "FK_93b9f090b559238adbbb83c8d54" FOREIGN KEY (zone_id) REFERENCES public.warehouse_zones(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: alert_history FK_95048d503befe40e467d550713a; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.alert_history
    ADD CONSTRAINT "FK_95048d503befe40e467d550713a" FOREIGN KEY (rule_id) REFERENCES public.alert_rules(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: operator_inventory FK_95de0129a0dd8a7950e69009264; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.operator_inventory
    ADD CONSTRAINT "FK_95de0129a0dd8a7950e69009264" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: machine_inventory FK_9769b08635b0f67bbdd0ddc27f2; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_inventory
    ADD CONSTRAINT "FK_9769b08635b0f67bbdd0ddc27f2" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: report_subscriptions FK_9b08cb29b5a17f47df7f27864fd; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.report_subscriptions
    ADD CONSTRAINT "FK_9b08cb29b5a17f47df7f27864fd" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: product_price_history FK_9bbe39ab10e86530296c3340aa3; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT "FK_9bbe39ab10e86530296c3340aa3" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: collection_history FK_9db8428b86bea5697bc558a64ef; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.collection_history
    ADD CONSTRAINT "FK_9db8428b86bea5697bc558a64ef" FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: directory_entry_audit FK_9f4354acba3c0f001ded5167559; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_entry_audit
    ADD CONSTRAINT "FK_9f4354acba3c0f001ded5167559" FOREIGN KEY (entry_id) REFERENCES public.directory_entries(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: notification_rules FK_a1da97aa4e0eff3821ef8144235; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notification_rules
    ADD CONSTRAINT "FK_a1da97aa4e0eff3821ef8144235" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: fiscal_shifts FK_a2dd1f3e13fe3078574d9294573; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.fiscal_shifts
    ADD CONSTRAINT "FK_a2dd1f3e13fe3078574d9294573" FOREIGN KEY (device_id) REFERENCES public.fiscal_devices(id);`);
    await queryRunner.query(`-- Name: material_requests FK_a2f8274c1ed9195dff87f6a0562; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.material_requests
    ADD CONSTRAINT "FK_a2f8274c1ed9195dff87f6a0562" FOREIGN KEY (requester_id) REFERENCES public.users(id);`);
    await queryRunner.query(`-- Name: access_requests FK_a65c5d8f1dc67afc97fadaef95c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT "FK_a65c5d8f1dc67afc97fadaef95c" FOREIGN KEY (processed_by_user_id) REFERENCES public.users(id);`);
    await queryRunner.query(`-- Name: dividend_payments FK_a700a8344476ca72fd8d22bda4f; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.dividend_payments
    ADD CONSTRAINT "FK_a700a8344476ca72fd8d22bda4f" FOREIGN KEY (investor_profile_id) REFERENCES public.investor_profiles(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: users FK_a78a00605c95ca6737389f6360b; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_a78a00605c95ca6737389f6360b" FOREIGN KEY (referred_by_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: orders FK_a922b820eeef29ac1c6800e826a; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY (user_id) REFERENCES public.users(id);`);
    await queryRunner.query(`-- Name: complaint_templates FK_ab3857aee3485570702a8530256; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_templates
    ADD CONSTRAINT "FK_ab3857aee3485570702a8530256" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: trips FK_ab4b806373c2ee43946679d572e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.trips
    ADD CONSTRAINT "FK_ab4b806373c2ee43946679d572e" FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);`);
    await queryRunner.query(`-- Name: client_payments FK_ac77c9923a11c661e0f983a41b0; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_payments
    ADD CONSTRAINT "FK_ac77c9923a11c661e0f983a41b0" FOREIGN KEY (client_user_id) REFERENCES public.client_users(id);`);
    await queryRunner.query(`-- Name: material_request_items FK_aeb1e879f684ef512b88ee2e887; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.material_request_items
    ADD CONSTRAINT "FK_aeb1e879f684ef512b88ee2e887" FOREIGN KEY (request_id) REFERENCES public.material_requests(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: route_stops FK_b16cab5c66870949cbb4ee748c0; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT "FK_b16cab5c66870949cbb4ee748c0" FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: client_wallet_ledger FK_b209741961baa08ddc0421a8b93; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_wallet_ledger
    ADD CONSTRAINT "FK_b209741961baa08ddc0421a8b93" FOREIGN KEY (wallet_id) REFERENCES public.client_wallets(id);`);
    await queryRunner.query(`-- Name: client_orders FK_b2120f822c07c65657496d85110; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_orders
    ADD CONSTRAINT "FK_b2120f822c07c65657496d85110" FOREIGN KEY (client_user_id) REFERENCES public.client_users(id);`);
    await queryRunner.query(`-- Name: task_components FK_b239e5f3c1b5c8c3c96f5542227; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_components
    ADD CONSTRAINT "FK_b239e5f3c1b5c8c3c96f5542227" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: user_roles FK_b23c65e50a758245a33ee35fda1; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: tasks FK_b36d6aba7370d286e7aac443af5; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "FK_b36d6aba7370d286e7aac443af5" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: complaint_qr_codes FK_b4cb20045194efec7c1fea71c12; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_qr_codes
    ADD CONSTRAINT "FK_b4cb20045194efec7c1fea71c12" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: inventory_report_presets FK_b722b26e2815c480cd8a8b5d398; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_report_presets
    ADD CONSTRAINT "FK_b722b26e2815c480cd8a8b5d398" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: transactions FK_b783fa40c871184d41cc9b4d39c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_b783fa40c871184d41cc9b4d39c" FOREIGN KEY (original_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: user_quests FK_b83b57c12df8839bf64cd13e726; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_quests
    ADD CONSTRAINT "FK_b83b57c12df8839bf64cd13e726" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: operator_ratings FK_b91f0e41894678cad37098f85d8; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.operator_ratings
    ADD CONSTRAINT "FK_b91f0e41894678cad37098f85d8" FOREIGN KEY (user_id) REFERENCES public.users(id);`);
    await queryRunner.query(`-- Name: task_comments FK_ba9e465cfc707006e60aae59946; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT "FK_ba9e465cfc707006e60aae59946" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: task_photos FK_bbb70aafbb0f8e604c988764dcf; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.task_photos
    ADD CONSTRAINT "FK_bbb70aafbb0f8e604c988764dcf" FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: complaint_automation_rules FK_bc986a8ee84163a1d335b9200d6; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_automation_rules
    ADD CONSTRAINT "FK_bc986a8ee84163a1d335b9200d6" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: access_template_rows FK_be5388d0db2eae80713f5f49435; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.access_template_rows
    ADD CONSTRAINT "FK_be5388d0db2eae80713f5f49435" FOREIGN KEY (template_id) REFERENCES public.access_templates(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: notification_queue FK_c1cbf269b16cfba1436c5dab67c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT "FK_c1cbf269b16cfba1436c5dab67c" FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: directory_sync_logs FK_c380deb29c3ced0355eef7c3f18; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_sync_logs
    ADD CONSTRAINT "FK_c380deb29c3ced0355eef7c3f18" FOREIGN KEY (source_id) REFERENCES public.directory_sources(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: directory_fields FK_c4af14eb9e9e52910fadc527abe; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.directory_fields
    ADD CONSTRAINT "FK_c4af14eb9e9e52910fadc527abe" FOREIGN KEY (ref_directory_id) REFERENCES public.directories(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: loyalty_promo_code_usages FK_c4bc689265b50ff9b7138d721d8; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.loyalty_promo_code_usages
    ADD CONSTRAINT "FK_c4bc689265b50ff9b7138d721d8" FOREIGN KEY (promo_code_id) REFERENCES public.loyalty_promo_codes(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: material_requests FK_c4c55d81a8cbae35a4910595266; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.material_requests
    ADD CONSTRAINT "FK_c4c55d81a8cbae35a4910595266" FOREIGN KEY (approved_by) REFERENCES public.users(id);`);
    await queryRunner.query(`-- Name: points_transactions FK_c727fda76a7af7e135d74721a76; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.points_transactions
    ADD CONSTRAINT "FK_c727fda76a7af7e135d74721a76" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: user_achievements FK_c755e3741cd46fc5ae3ef06592c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "FK_c755e3741cd46fc5ae3ef06592c" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: location_notes FK_c77bce22cd3a0d9005f16a1f915; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_notes
    ADD CONSTRAINT "FK_c77bce22cd3a0d9005f16a1f915" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: client_loyalty_accounts FK_c8873cde649332303fbc228e884; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.client_loyalty_accounts
    ADD CONSTRAINT "FK_c8873cde649332303fbc228e884" FOREIGN KEY (client_user_id) REFERENCES public.client_users(id);`);
    await queryRunner.query(`-- Name: maintenance_parts FK_c95586bf2b5b60707fb57efdbdd; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.maintenance_parts
    ADD CONSTRAINT "FK_c95586bf2b5b60707fb57efdbdd" FOREIGN KEY (maintenance_request_id) REFERENCES public.maintenance_requests(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: machine_location_history FK_cad0f47a65842d00cd293795bf1; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_location_history
    ADD CONSTRAINT "FK_cad0f47a65842d00cd293795bf1" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: notifications FK_cb7b1fb018b296f2107e998b2ff; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_cb7b1fb018b296f2107e998b2ff" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: stock_reservations FK_cde1bae0d7686c1f9b2e8a29a95; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT "FK_cde1bae0d7686c1f9b2e8a29a95" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);`);
    await queryRunner.query(`-- Name: inventory_adjustments FK_ce63d7a25deb7270e279e046855; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT "FK_ce63d7a25deb7270e279e046855" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: fiscal_receipts FK_d29f2349aad8219fcbcd82e00d8; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.fiscal_receipts
    ADD CONSTRAINT "FK_d29f2349aad8219fcbcd82e00d8" FOREIGN KEY (device_id) REFERENCES public.fiscal_devices(id);`);
    await queryRunner.query(`-- Name: location_zones FK_d2d95dfec2ab3b210ec8ce42f72; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_zones
    ADD CONSTRAINT "FK_d2d95dfec2ab3b210ec8ce42f72" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: warehouse_zones FK_d3bd929b40dbef1d393e90cfcc9; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouse_zones
    ADD CONSTRAINT "FK_d3bd929b40dbef1d393e90cfcc9" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);`);
    await queryRunner.query(`-- Name: payment_transactions FK_d58d69c1e69173e66e72bdc0442; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT "FK_d58d69c1e69173e66e72bdc0442" FOREIGN KEY (client_user_id) REFERENCES public.client_users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: billing_payments FK_dac5d7acd8006ead52ea1767bb6; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.billing_payments
    ADD CONSTRAINT "FK_dac5d7acd8006ead52ea1767bb6" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);`);
    await queryRunner.query(`-- Name: location_contracts FK_dc0d70b0b628a501480e3a80ee9; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.location_contracts
    ADD CONSTRAINT "FK_dc0d70b0b628a501480e3a80ee9" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: inventory_counts FK_dd33ec322834fc31fc789c2919f; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_counts
    ADD CONSTRAINT "FK_dd33ec322834fc31fc789c2919f" FOREIGN KEY (started_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: notification_templates FK_de2847337566c6cd836affd571e; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT "FK_de2847337566c6cd836affd571e" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: integration_webhooks FK_dec89676178666a0d96c804325c; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.integration_webhooks
    ADD CONSTRAINT "FK_dec89676178666a0d96c804325c" FOREIGN KEY (integration_id) REFERENCES public.integrations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: material_request_history FK_df4a136c7f807b68436cc109fd4; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.material_request_history
    ADD CONSTRAINT "FK_df4a136c7f807b68436cc109fd4" FOREIGN KEY (request_id) REFERENCES public.material_requests(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: machine_slots FK_dfc074824aafcb94990f44a12d1; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.machine_slots
    ADD CONSTRAINT "FK_dfc074824aafcb94990f44a12d1" FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: tasks FK_e02a897b6671bf1ba00fd8a8551; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "FK_e02a897b6671bf1ba00fd8a8551" FOREIGN KEY (rejected_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: organization_contracts FK_e155b57aaec56e019290767d633; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.organization_contracts
    ADD CONSTRAINT "FK_e155b57aaec56e019290767d633" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: complaint_refunds FK_e15a35a46a9c71e71a1caa6ff56; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaint_refunds
    ADD CONSTRAINT "FK_e15a35a46a9c71e71a1caa6ff56" FOREIGN KEY (complaint_id) REFERENCES public.complaints(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: contracts FK_e3653640e4f62aa511fe43b6f84; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "FK_e3653640e4f62aa511fe43b6f84" FOREIGN KEY (contractor_id) REFERENCES public.contractors(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: positions FK_e413c6578fcdae9a8fd673c5bc7; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.positions
    ADD CONSTRAINT "FK_e413c6578fcdae9a8fd673c5bc7" FOREIGN KEY (department_id) REFERENCES public.departments(id);`);
    await queryRunner.query(`-- Name: warehouse_inventory FK_e4bcd3624640f163c16b4a5a08d; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.warehouse_inventory
    ADD CONSTRAINT "FK_e4bcd3624640f163c16b4a5a08d" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: inventory_adjustments FK_e79d0609a97ef03b407c342eb93; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT "FK_e79d0609a97ef03b407c342eb93" FOREIGN KEY (adjusted_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: locations FK_e80aa366acb3dbc300e668c3ee2; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.locations
    ADD CONSTRAINT "FK_e80aa366acb3dbc300e668c3ee2" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: user_sessions FK_e9658e959c490b0a634dfc54783; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: telegram_message_logs FK_ec877c5ee2e3a69ab734542bc15; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.telegram_message_logs
    ADD CONSTRAINT "FK_ec877c5ee2e3a69ab734542bc15" FOREIGN KEY (telegram_user_id) REFERENCES public.telegram_users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: generated_reports FK_ede6863d7732ba007dca048e748; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.generated_reports
    ADD CONSTRAINT "FK_ede6863d7732ba007dca048e748" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: organization_audit_logs FK_ee6d7c7e1393b4edc4e7598b68b; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.organization_audit_logs
    ADD CONSTRAINT "FK_ee6d7c7e1393b4edc4e7598b68b" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: access_requests FK_ef817d967604c900825694f5c71; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT "FK_ef817d967604c900825694f5c71" FOREIGN KEY (created_user_id) REFERENCES public.users(id);`);
    await queryRunner.query(`-- Name: recipe_ingredients FK_f240137e0e13bed80bdf64fed53; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT "FK_f240137e0e13bed80bdf64fed53" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: organizations FK_f3a7c9411eaa5f9cbc5363de331; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "FK_f3a7c9411eaa5f9cbc5363de331" FOREIGN KEY (parent_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: referrals FK_f3f73accc1d8e36d413bdfc4751; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT "FK_f3f73accc1d8e36d413bdfc4751" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: complaints FK_f5c7365e81336c640bf51c29019; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT "FK_f5c7365e81336c640bf51c29019" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: agent_progress FK_f5c8fa9c4a25f0ded60fd45a2ba; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.agent_progress
    ADD CONSTRAINT "FK_f5c8fa9c4a25f0ded60fd45a2ba" FOREIGN KEY (session_id) REFERENCES public.agent_sessions(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: recipes FK_f64cfae3dc201348f591b4bf221; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT "FK_f64cfae3dc201348f591b4bf221" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: dividend_payments FK_fb642e1ed580983701d5a2f8a2a; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.dividend_payments
    ADD CONSTRAINT "FK_fb642e1ed580983701d5a2f8a2a" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;`);
    await queryRunner.query(`-- Name: inventory_reservations FK_fce484d2b1056b29ca37e78d0b8; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.inventory_reservations
    ADD CONSTRAINT "FK_fce484d2b1056b29ca37e78d0b8" FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`-- Name: recipe_snapshots FK_fff5d76d68111f4dea0927149ce; Type: FK CONSTRAINT; Schema: public; Owner: -
ALTER TABLE ONLY public.recipe_snapshots
    ADD CONSTRAINT "FK_fff5d76d68111f4dea0927149ce" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;`);

    // ── Other (2) ──
    await queryRunner.query(`SET default_tablespace = '';`);
    await queryRunner.query(`SET default_table_access_method = heap;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "work_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "website_configs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "washing_schedules" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouses" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouse_zones" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "warehouse_inventory" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouse_bins" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vat_rates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "validation_rules" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_quests" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_notification_settings" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_achievements" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "two_factor_auth" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trips" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_task_links" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_stops" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "trip_reconciliations" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_points" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_anomalies" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_items" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "transaction_daily_summaries" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "timesheets" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "time_off_requests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telegram_payments" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "telegram_message_logs" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "telegram_bot_analytics" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_photos" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_components" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_comments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sync_jobs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_takes" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "stock_reservations" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "stock_opening_balances" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_movements" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "spare_parts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "session_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "security_events" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "schema_definitions" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_reports" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "saved_report_filters" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_imports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "routes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "route_stops" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "report_subscriptions" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "report_definitions" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "referrals" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "reconciliation_runs" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "reconciliation_mismatches" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "recipes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recipe_snapshots" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "recipe_ingredients" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "quests" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "push_subscriptions" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_history" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_codes" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "promo_code_redemptions" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "product_price_history" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "positions" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "points_transactions" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "performance_reviews" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payrolls" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "payment_transactions" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_refunds" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_providers" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "password_reset_tokens" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "package_types" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "organization_invitations" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "organization_contracts" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "organization_audit_logs" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "orders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "operator_ratings" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "operator_inventory" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "notification_templates" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "notification_rules" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "notification_queue" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_logs" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "notification_campaigns" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "materials" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "material_requests" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "material_request_items" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "material_request_history" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "maintenance_work_logs" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "maintenance_schedules" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "maintenance_requests" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "maintenance_parts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machines" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_slots" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "machine_maintenance_schedules" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "machine_location_syncs" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "machine_location_history" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_inventory" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "machine_error_logs" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "machine_components" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_access" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "loyalty_promo_codes" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "loyalty_promo_code_usages" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "login_attempts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "locations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location_zones" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location_visits" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location_notes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location_events" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "location_contracts" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "location_contract_payments" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_requests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "investor_profiles" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "inventory_reservations" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "inventory_report_presets" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "inventory_movements" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "inventory_difference_thresholds" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_counts" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "inventory_count_items" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_batches" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "inventory_adjustments" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "integrations" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "integration_webhooks" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "integration_templates" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "integration_logs" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "ingredient_batches" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "incidents" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "import_templates" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "import_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "import_jobs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "import_audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ikpu_codes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hw_imported_sales" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "hopper_types" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goods_classifiers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "generated_reports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_shifts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_receipts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_queue" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fiscal_devices" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "files" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fcm_tokens" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "favorites" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "equipment_components" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "employees" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "employee_documents" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "dividend_payments" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "directory_sync_logs" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "directory_sources" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "directory_fields" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "directory_entry_audit" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "directory_entries" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "directories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "data_encryption" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dashboards" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dashboard_widgets" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_stats" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_reports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "counterparties" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contracts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contractors" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "contractor_invoices" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "containers" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "component_movements" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "component_maintenance" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "complaints" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "complaint_templates" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "complaint_refunds" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "complaint_qr_codes" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "complaint_comments" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "complaint_automation_rules" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "complaint_actions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commissions" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "commission_calculations" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "collections" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "collection_records" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "collection_history" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "cms_articles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_wallets" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "client_wallet_ledger" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "client_users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_payments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_orders" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "client_loyalty_ledger" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "client_loyalty_accounts" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "bin_content_history" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_payments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bank_deposits" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_snapshots" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_sessions" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "audit_retention_policies" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_reports" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_alerts" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "audit_alert_history" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "attendances" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "analytics_snapshots" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "alert_rules" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "alert_history" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_provider_keys" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_progress" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "achievements" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "access_templates" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "access_template_rows" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "access_requests" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "access_control_logs" CASCADE`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "access_control_logs_access_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "access_control_logs_decision_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "access_requests_source_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "access_requests_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "access_template_rows_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "achievements_category_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "achievements_condition_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "achievements_rarity_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "agent_progress_category_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "agent_progress_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "agent_sessions_agent_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "agent_sessions_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "alert_history_severity_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_history_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_rules_condition_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_rules_metric_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_rules_severity_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "analytics_snapshots_snapshot_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "api_keys_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "attendances_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_alerts_actions_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "audit_alerts_categories_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "audit_alerts_severities_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_logs_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_logs_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_logs_event_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_logs_severity_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "billing_payments_payment_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "billing_payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "client_loyalty_ledger_reason_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "client_orders_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "client_payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "client_wallet_ledger_transaction_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "collections_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "collections_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "commission_calculations_commission_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "commission_calculations_payment_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "commissions_commission_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "commissions_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "complaint_actions_action_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "complaint_comments_author_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "complaint_refunds_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "complaint_refunds_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "complaint_templates_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "complaint_templates_template_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "complaints_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "complaints_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "complaints_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "complaints_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "component_maintenance_maintenance_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "component_movements_from_location_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "component_movements_movement_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "component_movements_to_location_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "containers_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "contractor_invoices_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "contractors_service_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "contractors_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "contracts_commission_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "contracts_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "counterparties_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "custom_reports_format_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "custom_reports_report_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "custom_reports_schedule_frequency_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "dashboard_widgets_chart_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "dashboard_widgets_period_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "dashboard_widgets_time_range_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "dashboard_widgets_widget_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "dashboards_default_period_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "data_encryption_algorithm_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "data_encryption_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "directory_audit_action"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "directory_scope"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "directory_type"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "employees_employee_role_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "employees_employment_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "employees_salary_frequency_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "employees_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "entry_origin"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "entry_status"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "equipment_components_component_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "equipment_components_component_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "equipment_components_current_location_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "favorites_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "field_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "fiscal_devices_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "fiscal_queue_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "fiscal_receipts_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "fiscal_receipts_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "fiscal_shifts_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "generated_reports_period_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "generated_reports_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "generated_reports_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "hw_imported_sales_import_source_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "import_audit_logs_action_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "import_jobs_import_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "import_jobs_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "import_jobs_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "import_sessions_approval_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "import_sessions_domain_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "import_sessions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "import_templates_import_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "import_templates_source_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "incidents_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incidents_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "incidents_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "ingredient_batches_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "ingredient_batches_unit_of_measure_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "integration_templates_category_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "integrations_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "integrations_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "inventory_adjustments_adjustment_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "inventory_difference_thresholds_severity_level_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "inventory_difference_thresholds_threshold_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "inventory_movements_movement_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "inventory_reservations_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "invoices_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "leave_requests_leave_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "leave_requests_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "location_contract_payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "location_contracts_payment_frequency_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "location_contracts_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "location_contracts_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "location_events_event_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "location_notes_note_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "location_visits_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "location_visits_visit_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "location_zones_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "locations_contract_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "locations_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "locations_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "loyalty_promo_codes_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "machine_access_role_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_components_component_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_components_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_error_logs_severity_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_location_history_reason_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_location_syncs_sync_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_maintenance_schedules_maintenance_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machine_maintenance_schedules_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machines_connection_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machines_depreciation_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "machines_disposal_reason_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "machines_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "machines_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "maintenance_requests_maintenance_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "maintenance_requests_priority_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "maintenance_requests_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "maintenance_schedules_maintenance_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "maintenance_work_logs_work_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "material_request_history_from_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "material_request_history_to_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "material_requests_priority_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "material_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "materials_category_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_campaigns_audience_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_campaigns_channels_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_campaigns_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_logs_channel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_logs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_queue_channel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_queue_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_rules_channels_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_rules_event_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_rules_notification_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_rules_priority_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_rules_recipient_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_templates_default_channels_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_templates_default_priority_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notification_templates_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notifications_channels_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notifications_event_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "notifications_priority_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "organization_audit_logs_action_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "organization_contracts_commission_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "organization_contracts_contract_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "organization_contracts_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "organization_invitations_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "organizations_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "organizations_subscription_tier_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "organizations_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "payment_providers_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "payment_refunds_reason_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "payment_refunds_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "payment_transactions_provider_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "payment_transactions_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "payrolls_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "performance_reviews_review_period_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "performance_reviews_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "points_transactions_source_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "points_transactions_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "positions_level_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "products_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "products_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "products_unit_of_measure_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "promo_codes_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "promo_codes_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "purchase_history_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "quest_difficulty_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "quest_period_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "quest_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "quest_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "recipe_ingredients_unit_of_measure_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "recipes_type_code_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "reconciliation_mismatches_mismatch_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "reconciliation_runs_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "referrals_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "report_definitions_available_formats_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "report_definitions_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "report_definitions_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "report_subscriptions_delivery_channel_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "report_subscriptions_preferred_format_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "route_stops_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "routes_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "routes_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "sales_imports_file_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "sales_imports_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "saved_report_filters_period_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "scheduled_reports_format_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "scheduled_reports_period_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "schema_definitions_domain_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "security_events_event_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "security_events_severity_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "session_logs_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "source_type"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "stock_movements_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "stock_movements_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "stock_reservations_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "stock_takes_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_jobs_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_jobs_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_log_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_components_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tasks_type_code_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "telegram_bot_analytics_event_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "telegram_message_logs_message_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "telegram_message_logs_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "telegram_payments_currency_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "telegram_payments_provider_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "telegram_payments_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "telegram_settings_default_language_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "telegram_users_language_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "telegram_users_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "time_off_requests_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "time_off_requests_time_off_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "transactions_expense_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "transactions_payment_method_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transactions_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "trip_anomalies_severity_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "trip_anomalies_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "trip_task_links_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "trips_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "trips_task_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "trips_transport_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "two_factor_auth_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "user_notification_settings_digest_channels_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "user_notification_settings_digest_frequency_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "users_loyalty_level_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "validation_rules_domain_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "validation_rules_rule_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "validation_rules_severity_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "vehicles_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vehicles_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "warehouse_zones_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "warehouse_zones_storage_condition_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "warehouse_zones_zone_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "warehouses_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "work_logs_activity_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "work_logs_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "work_logs_work_type_enum"`);
  }
}
