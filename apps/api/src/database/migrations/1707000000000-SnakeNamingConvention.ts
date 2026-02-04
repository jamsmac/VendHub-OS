import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: SnakeNamingConvention
 *
 * Renames ALL camelCase DB columns to snake_case across all tables.
 * This aligns with MASTER_PROMPT Rule 3 and the SnakeNamingStrategy
 * configured in TypeORM.
 *
 * Entity TypeScript properties STAY camelCase — SnakeNamingStrategy
 * automatically converts them to snake_case in SQL.
 */
export class SnakeNamingConvention1707000000000 implements MigrationInterface {
  name = 'SnakeNamingConvention1707000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // Helper: safely rename column if old exists and new doesn't
    // ============================================================
    const rename = async (table: string, oldCol: string, newCol: string) => {
      const hasOld = await queryRunner.hasColumn(table, oldCol);
      if (hasOld) {
        const hasNew = await queryRunner.hasColumn(table, newCol);
        if (!hasNew) {
          await queryRunner.query(
            `ALTER TABLE "${table}" RENAME COLUMN "${oldCol}" TO "${newCol}"`,
          );
        }
      }
    };

    // ============================================================
    // 1. USERS
    // ============================================================
    await rename('users', 'firstName', 'first_name');
    await rename('users', 'lastName', 'last_name');
    await rename('users', 'organizationId', 'organization_id');
    await rename('users', 'telegramId', 'telegram_id');
    await rename('users', 'telegramUsername', 'telegram_username');
    await rename('users', 'twoFactorEnabled', 'two_factor_enabled');
    await rename('users', 'lastLoginAt', 'last_login_at');
    await rename('users', 'lastLoginIp', 'last_login_ip');
    await rename('users', 'loginAttempts', 'login_attempts');
    await rename('users', 'lockedUntil', 'locked_until');
    await rename('users', 'passwordChangedAt', 'password_changed_at');
    await rename('users', 'mustChangePassword', 'must_change_password');
    await rename('users', 'ipWhitelist', 'ip_whitelist');
    await rename('users', 'approvedAt', 'approved_at');
    await rename('users', 'approvedById', 'approved_by_id');
    await rename('users', 'pointsBalance', 'points_balance');
    await rename('users', 'loyaltyLevel', 'loyalty_level');
    await rename('users', 'totalPointsEarned', 'total_points_earned');
    await rename('users', 'totalSpent', 'total_spent');
    await rename('users', 'totalOrders', 'total_orders');
    await rename('users', 'welcomeBonusReceived', 'welcome_bonus_received');
    await rename('users', 'firstOrderBonusReceived', 'first_order_bonus_received');
    await rename('users', 'currentStreak', 'current_streak');
    await rename('users', 'longestStreak', 'longest_streak');
    await rename('users', 'lastOrderDate', 'last_order_date');
    await rename('users', 'referralCode', 'referral_code');
    await rename('users', 'referredById', 'referred_by_id');

    // ============================================================
    // 2. USER_SESSIONS
    // ============================================================
    await rename('user_sessions', 'userId', 'user_id');
    await rename('user_sessions', 'refreshTokenHash', 'refresh_token_hash');
    await rename('user_sessions', 'refreshTokenHint', 'refresh_token_hint');
    await rename('user_sessions', 'deviceInfo', 'device_info');
    await rename('user_sessions', 'ipAddress', 'ip_address');
    await rename('user_sessions', 'lastActivityAt', 'last_activity_at');
    await rename('user_sessions', 'expiresAt', 'expires_at');
    await rename('user_sessions', 'isRevoked', 'is_revoked');
    await rename('user_sessions', 'revokedAt', 'revoked_at');
    await rename('user_sessions', 'revokedReason', 'revoked_reason');

    // ============================================================
    // 3. TWO_FACTOR_AUTH
    // ============================================================
    await rename('two_factor_auth', 'userId', 'user_id');
    await rename('two_factor_auth', 'totpSecret', 'totp_secret');
    await rename('two_factor_auth', 'totpSecretIv', 'totp_secret_iv');
    await rename('two_factor_auth', 'smsPhone', 'sms_phone');
    await rename('two_factor_auth', 'emailAddress', 'email_address');
    await rename('two_factor_auth', 'backupCodes', 'backup_codes');
    await rename('two_factor_auth', 'usedBackupCodes', 'used_backup_codes');
    await rename('two_factor_auth', 'failedAttempts', 'failed_attempts');
    await rename('two_factor_auth', 'lockedUntil', 'locked_until');
    await rename('two_factor_auth', 'lastUsedAt', 'last_used_at');

    // ============================================================
    // 4. PASSWORD_RESET_TOKENS
    // ============================================================
    await rename('password_reset_tokens', 'userId', 'user_id');
    await rename('password_reset_tokens', 'expiresAt', 'expires_at');
    await rename('password_reset_tokens', 'usedAt', 'used_at');
    await rename('password_reset_tokens', 'ipAddress', 'ip_address');
    await rename('password_reset_tokens', 'userAgent', 'user_agent');

    // ============================================================
    // 5. LOGIN_ATTEMPTS
    // ============================================================
    await rename('login_attempts', 'ipAddress', 'ip_address');
    await rename('login_attempts', 'userAgent', 'user_agent');
    await rename('login_attempts', 'failureReason', 'failure_reason');
    await rename('login_attempts', 'userId', 'user_id');

    // ============================================================
    // 6. ACCESS_REQUESTS
    // ============================================================
    await rename('access_requests', 'userId', 'user_id');
    await rename('access_requests', 'requestedRole', 'requested_role');
    await rename('access_requests', 'processedAt', 'processed_at');
    await rename('access_requests', 'processedById', 'processed_by_id');
    await rename('access_requests', 'rejectionReason', 'rejection_reason');

    // ============================================================
    // 7. ORGANIZATIONS
    // ============================================================
    await rename('organizations', 'nameUz', 'name_uz');
    await rename('organizations', 'parentId', 'parent_id');
    await rename('organizations', 'hierarchyLevel', 'hierarchy_level');
    await rename('organizations', 'hierarchyPath', 'hierarchy_path');
    await rename('organizations', 'phoneSecondary', 'phone_secondary');
    await rename('organizations', 'bankAccount', 'bank_account');
    await rename('organizations', 'bankName', 'bank_name');
    await rename('organizations', 'subscriptionTier', 'subscription_tier');
    await rename('organizations', 'subscriptionExpiresAt', 'subscription_expires_at');
    await rename('organizations', 'trialEndsAt', 'trial_ends_at');
    await rename('organizations', 'isActive', 'is_active');
    await rename('organizations', 'maxUsers', 'max_users');
    await rename('organizations', 'maxMachines', 'max_machines');
    await rename('organizations', 'maxLocations', 'max_locations');

    // ============================================================
    // 8. ORGANIZATION_CONTRACTS
    // ============================================================
    const hasOrgContracts = await queryRunner.hasTable('organization_contracts');
    if (hasOrgContracts) {
      await rename('organization_contracts', 'organizationId', 'organization_id');
      await rename('organization_contracts', 'contractNumber', 'contract_number');
      await rename('organization_contracts', 'startDate', 'start_date');
      await rename('organization_contracts', 'endDate', 'end_date');
      await rename('organization_contracts', 'uploadedBy', 'uploaded_by');
    }

    // ============================================================
    // 9. ORGANIZATION_INVITATIONS
    // ============================================================
    const hasOrgInvitations = await queryRunner.hasTable('organization_invitations');
    if (hasOrgInvitations) {
      await rename('organization_invitations', 'organizationId', 'organization_id');
      await rename('organization_invitations', 'invitedBy', 'invited_by');
      await rename('organization_invitations', 'expiresAt', 'expires_at');
      await rename('organization_invitations', 'acceptedAt', 'accepted_at');
    }

    // ============================================================
    // 10. ORGANIZATION_AUDIT_LOGS
    // ============================================================
    const hasOrgAuditLogs = await queryRunner.hasTable('organization_audit_logs');
    if (hasOrgAuditLogs) {
      await rename('organization_audit_logs', 'organizationId', 'organization_id');
      await rename('organization_audit_logs', 'performedBy', 'performed_by');
    }

    // ============================================================
    // 11. LOCATIONS
    // ============================================================
    await rename('locations', 'organizationId', 'organization_id');
    await rename('locations', 'parentId', 'parent_id');
    await rename('locations', 'postalCode', 'postal_code');
    await rename('locations', 'isActive', 'is_active');
    await rename('locations', 'contactPerson', 'contact_person');
    await rename('locations', 'contactPhone', 'contact_phone');
    await rename('locations', 'contactEmail', 'contact_email');

    // Location sub-tables
    const locationSubTables = [
      'location_zones', 'location_contracts', 'location_contract_payments',
      'location_events', 'location_notes', 'location_visits',
    ];
    for (const tbl of locationSubTables) {
      const exists = await queryRunner.hasTable(tbl);
      if (exists) {
        await rename(tbl, 'locationId', 'location_id');
        await rename(tbl, 'organizationId', 'organization_id');
      }
    }

    // ============================================================
    // 12. MACHINES
    // ============================================================
    await rename('machines', 'organizationId', 'organization_id');
    await rename('machines', 'machineNumber', 'machine_number');
    await rename('machines', 'serialNumber', 'serial_number');
    await rename('machines', 'locationId', 'location_id');
    await rename('machines', 'installationDate', 'installation_date');
    await rename('machines', 'lastMaintenanceDate', 'last_maintenance_date');
    await rename('machines', 'nextMaintenanceDate', 'next_maintenance_date');
    await rename('machines', 'warrantyExpiresAt', 'warranty_expires_at');
    await rename('machines', 'maxProductSlots', 'max_product_slots');
    await rename('machines', 'hasCamera', 'has_camera');
    await rename('machines', 'hasCashAcceptor', 'has_cash_acceptor');
    await rename('machines', 'hasCardReader', 'has_card_reader');
    await rename('machines', 'telemetryUrl', 'telemetry_url');
    await rename('machines', 'lastPingAt', 'last_ping_at');
    await rename('machines', 'isActive', 'is_active');

    // Machine sub-tables
    const machineSubTables = [
      'machine_slots', 'machine_location_history', 'machine_components', 'machine_error_logs',
    ];
    for (const tbl of machineSubTables) {
      const exists = await queryRunner.hasTable(tbl);
      if (exists) {
        await rename(tbl, 'machineId', 'machine_id');
        await rename(tbl, 'organizationId', 'organization_id');
      }
    }

    const hasMachineSlots = await queryRunner.hasTable('machine_slots');
    if (hasMachineSlots) {
      await rename('machine_slots', 'slotNumber', 'slot_number');
      await rename('machine_slots', 'productId', 'product_id');
      await rename('machine_slots', 'maxCapacity', 'max_capacity');
      await rename('machine_slots', 'currentQuantity', 'current_quantity');
      await rename('machine_slots', 'minThreshold', 'min_threshold');
      await rename('machine_slots', 'lastRestockedAt', 'last_restocked_at');
      await rename('machine_slots', 'isActive', 'is_active');
    }

    const hasMachineLocationHistory = await queryRunner.hasTable('machine_location_history');
    if (hasMachineLocationHistory) {
      await rename('machine_location_history', 'fromLocationId', 'from_location_id');
      await rename('machine_location_history', 'toLocationId', 'to_location_id');
      await rename('machine_location_history', 'movedBy', 'moved_by');
      await rename('machine_location_history', 'movedAt', 'moved_at');
    }

    const hasMachineComponents = await queryRunner.hasTable('machine_components');
    if (hasMachineComponents) {
      await rename('machine_components', 'componentType', 'component_type');
      await rename('machine_components', 'lastReplacedAt', 'last_replaced_at');
      await rename('machine_components', 'replacedBy', 'replaced_by');
    }

    const hasMachineErrorLogs = await queryRunner.hasTable('machine_error_logs');
    if (hasMachineErrorLogs) {
      await rename('machine_error_logs', 'errorCode', 'error_code');
      await rename('machine_error_logs', 'errorMessage', 'error_message');
      await rename('machine_error_logs', 'resolvedAt', 'resolved_at');
      await rename('machine_error_logs', 'resolvedBy', 'resolved_by');
    }

    // ============================================================
    // 13. PRODUCTS
    // ============================================================
    await rename('products', 'organizationId', 'organization_id');
    await rename('products', 'isIngredient', 'is_ingredient');
    await rename('products', 'isActive', 'is_active');
    await rename('products', 'purchasePrice', 'purchase_price');
    await rename('products', 'sellingPrice', 'selling_price');
    await rename('products', 'vatRate', 'vat_rate');

    // Product sub-tables
    const hasRecipes = await queryRunner.hasTable('recipes');
    if (hasRecipes) {
      await rename('recipes', 'organizationId', 'organization_id');
      await rename('recipes', 'productId', 'product_id');
      await rename('recipes', 'isActive', 'is_active');
    }

    const hasRecipeIngredients = await queryRunner.hasTable('recipe_ingredients');
    if (hasRecipeIngredients) {
      await rename('recipe_ingredients', 'recipeId', 'recipe_id');
      await rename('recipe_ingredients', 'ingredientId', 'ingredient_id');
    }

    const hasSuppliers = await queryRunner.hasTable('suppliers');
    if (hasSuppliers) {
      await rename('suppliers', 'organizationId', 'organization_id');
      await rename('suppliers', 'contactPerson', 'contact_person');
      await rename('suppliers', 'paymentTerms', 'payment_terms');
      await rename('suppliers', 'isActive', 'is_active');
    }

    // ============================================================
    // 14. INVENTORY TABLES
    // ============================================================
    const inventoryTables = [
      'warehouse_inventory', 'operator_inventory', 'machine_inventory',
    ];
    for (const tbl of inventoryTables) {
      const exists = await queryRunner.hasTable(tbl);
      if (exists) {
        await rename(tbl, 'organizationId', 'organization_id');
        await rename(tbl, 'productId', 'product_id');
        await rename(tbl, 'currentQuantity', 'current_quantity');
        await rename(tbl, 'lastRestockedAt', 'last_restocked_at');
      }
    }

    const hasWarehouseInv = await queryRunner.hasTable('warehouse_inventory');
    if (hasWarehouseInv) {
      await rename('warehouse_inventory', 'warehouseId', 'warehouse_id');
      await rename('warehouse_inventory', 'reservedQuantity', 'reserved_quantity');
      await rename('warehouse_inventory', 'minStockLevel', 'min_stock_level');
      await rename('warehouse_inventory', 'maxStockLevel', 'max_stock_level');
    }

    const hasOperatorInv = await queryRunner.hasTable('operator_inventory');
    if (hasOperatorInv) {
      await rename('operator_inventory', 'operatorId', 'operator_id');
      await rename('operator_inventory', 'assignedAt', 'assigned_at');
    }

    const hasMachineInv = await queryRunner.hasTable('machine_inventory');
    if (hasMachineInv) {
      await rename('machine_inventory', 'machineId', 'machine_id');
      await rename('machine_inventory', 'slotNumber', 'slot_number');
      await rename('machine_inventory', 'maxCapacity', 'max_capacity');
    }

    // Inventory movements
    const hasInvMovements = await queryRunner.hasTable('inventory_movements');
    if (hasInvMovements) {
      await rename('inventory_movements', 'organizationId', 'organization_id');
      await rename('inventory_movements', 'productId', 'product_id');
      await rename('inventory_movements', 'fromLocationId', 'from_location_id');
      await rename('inventory_movements', 'fromLocationType', 'from_location_type');
      await rename('inventory_movements', 'toLocationId', 'to_location_id');
      await rename('inventory_movements', 'toLocationType', 'to_location_type');
      await rename('inventory_movements', 'executedBy', 'executed_by');
      await rename('inventory_movements', 'executedAt', 'executed_at');
    }

    // ============================================================
    // 15. TRANSACTIONS
    // ============================================================
    await rename('transactions', 'organizationId', 'organization_id');
    await rename('transactions', 'machineId', 'machine_id');
    await rename('transactions', 'transactionNumber', 'transaction_number');
    await rename('transactions', 'paymentMethod', 'payment_method');
    await rename('transactions', 'totalAmount', 'total_amount');
    await rename('transactions', 'cashAmount', 'cash_amount');
    await rename('transactions', 'cardAmount', 'card_amount');
    await rename('transactions', 'changeAmount', 'change_amount');
    await rename('transactions', 'fiscalReceiptNumber', 'fiscal_receipt_number');
    await rename('transactions', 'fiscalUrl', 'fiscal_url');
    await rename('transactions', 'completedAt', 'completed_at');
    await rename('transactions', 'refundedAt', 'refunded_at');

    const hasTransactionItems = await queryRunner.hasTable('transaction_items');
    if (hasTransactionItems) {
      await rename('transaction_items', 'transactionId', 'transaction_id');
      await rename('transaction_items', 'productId', 'product_id');
      await rename('transaction_items', 'unitPrice', 'unit_price');
      await rename('transaction_items', 'totalPrice', 'total_price');
    }

    // ============================================================
    // 16. ORDERS
    // ============================================================
    await rename('orders', 'organizationId', 'organization_id');
    await rename('orders', 'orderNumber', 'order_number');
    await rename('orders', 'userId', 'user_id');
    await rename('orders', 'machineId', 'machine_id');
    await rename('orders', 'paymentStatus', 'payment_status');
    await rename('orders', 'paymentMethod', 'payment_method');
    await rename('orders', 'totalAmount', 'total_amount');
    await rename('orders', 'paidAmount', 'paid_amount');
    await rename('orders', 'refundedAmount', 'refunded_amount');
    await rename('orders', 'expiresAt', 'expires_at');
    await rename('orders', 'paidAt', 'paid_at');
    await rename('orders', 'completedAt', 'completed_at');
    await rename('orders', 'cancelledAt', 'cancelled_at');
    await rename('orders', 'refundedAt', 'refunded_at');

    const hasOrderItems = await queryRunner.hasTable('order_items');
    if (hasOrderItems) {
      await rename('order_items', 'orderId', 'order_id');
      await rename('order_items', 'productId', 'product_id');
      await rename('order_items', 'slotNumber', 'slot_number');
      await rename('order_items', 'unitPrice', 'unit_price');
      await rename('order_items', 'totalPrice', 'total_price');
      await rename('order_items', 'dispensedAt', 'dispensed_at');
    }

    // ============================================================
    // 17. TASKS
    // ============================================================
    await rename('tasks', 'organizationId', 'organization_id');
    await rename('tasks', 'taskNumber', 'task_number');
    await rename('tasks', 'typeCode', 'type_code');
    await rename('tasks', 'machineId', 'machine_id');
    await rename('tasks', 'assignedToUserId', 'assigned_to_user_id');
    await rename('tasks', 'createdByUserId', 'created_by_user_id');
    await rename('tasks', 'completedByUserId', 'completed_by_user_id');
    await rename('tasks', 'scheduledDate', 'scheduled_date');
    await rename('tasks', 'dueDate', 'due_date');
    await rename('tasks', 'startedAt', 'started_at');
    await rename('tasks', 'completedAt', 'completed_at');
    await rename('tasks', 'verifiedAt', 'verified_at');
    await rename('tasks', 'verifiedByUserId', 'verified_by_user_id');
    await rename('tasks', 'hasPhotosBefore', 'has_photos_before');
    await rename('tasks', 'hasPhotosAfter', 'has_photos_after');
    await rename('tasks', 'photosBeforeCount', 'photos_before_count');
    await rename('tasks', 'photosAfterCount', 'photos_after_count');

    // Task sub-tables
    const taskSubTables = ['task_items', 'task_comments', 'task_components', 'task_photos'];
    for (const tbl of taskSubTables) {
      const exists = await queryRunner.hasTable(tbl);
      if (exists) {
        await rename(tbl, 'taskId', 'task_id');
      }
    }

    const hasTaskItems = await queryRunner.hasTable('task_items');
    if (hasTaskItems) {
      await rename('task_items', 'itemType', 'item_type');
      await rename('task_items', 'productId', 'product_id');
      await rename('task_items', 'plannedQuantity', 'planned_quantity');
      await rename('task_items', 'actualQuantity', 'actual_quantity');
    }

    const hasTaskComments = await queryRunner.hasTable('task_comments');
    if (hasTaskComments) {
      await rename('task_comments', 'userId', 'user_id');
    }

    const hasTaskPhotos = await queryRunner.hasTable('task_photos');
    if (hasTaskPhotos) {
      await rename('task_photos', 'uploadedBy', 'uploaded_by');
    }

    // ============================================================
    // 18. EMPLOYEES
    // ============================================================
    const hasEmployees = await queryRunner.hasTable('employees');
    if (hasEmployees) {
      await rename('employees', 'organizationId', 'organization_id');
      await rename('employees', 'userId', 'user_id');
      await rename('employees', 'employeeNumber', 'employee_number');
      await rename('employees', 'firstName', 'first_name');
      await rename('employees', 'lastName', 'last_name');
      await rename('employees', 'middleName', 'middle_name');
      await rename('employees', 'employeeRole', 'employee_role');
      await rename('employees', 'telegramUserId', 'telegram_user_id');
      await rename('employees', 'telegramUsername', 'telegram_username');
      await rename('employees', 'hireDate', 'hire_date');
      await rename('employees', 'terminationDate', 'termination_date');
      await rename('employees', 'terminationReason', 'termination_reason');
      await rename('employees', 'salaryFrequency', 'salary_frequency');
      await rename('employees', 'emergencyContactName', 'emergency_contact_name');
      await rename('employees', 'emergencyContactPhone', 'emergency_contact_phone');
      await rename('employees', 'emergencyContactRelation', 'emergency_contact_relation');
    }

    // ============================================================
    // 19. CONTRACTORS
    // ============================================================
    const hasContractors = await queryRunner.hasTable('contractors');
    if (hasContractors) {
      await rename('contractors', 'organizationId', 'organization_id');
      await rename('contractors', 'companyName', 'company_name');
      await rename('contractors', 'contactPerson', 'contact_person');
      await rename('contractors', 'serviceType', 'service_type');
      await rename('contractors', 'contractStart', 'contract_start');
      await rename('contractors', 'contractEnd', 'contract_end');
      await rename('contractors', 'contractNumber', 'contract_number');
      await rename('contractors', 'paymentTerms', 'payment_terms');
      await rename('contractors', 'isActive', 'is_active');
      await rename('contractors', 'bankDetails', 'bank_details');
    }

    const hasContractorInvoices = await queryRunner.hasTable('contractor_invoices');
    if (hasContractorInvoices) {
      await rename('contractor_invoices', 'organizationId', 'organization_id');
      await rename('contractor_invoices', 'contractorId', 'contractor_id');
      await rename('contractor_invoices', 'invoiceNumber', 'invoice_number');
      await rename('contractor_invoices', 'paidAmount', 'paid_amount');
      await rename('contractor_invoices', 'issueDate', 'issue_date');
      await rename('contractor_invoices', 'dueDate', 'due_date');
      await rename('contractor_invoices', 'paidDate', 'paid_date');
      await rename('contractor_invoices', 'approvedBy', 'approved_by');
      await rename('contractor_invoices', 'approvedAt', 'approved_at');
      await rename('contractor_invoices', 'attachmentUrls', 'attachment_urls');
    }

    // ============================================================
    // 20. MAINTENANCE
    // ============================================================
    const hasMaintenanceRequests = await queryRunner.hasTable('maintenance_requests');
    if (hasMaintenanceRequests) {
      await rename('maintenance_requests', 'organizationId', 'organization_id');
      await rename('maintenance_requests', 'requestNumber', 'request_number');
      await rename('maintenance_requests', 'maintenanceType', 'maintenance_type');
      await rename('maintenance_requests', 'machineId', 'machine_id');
      await rename('maintenance_requests', 'assignedTechnicianId', 'assigned_technician_id');
      await rename('maintenance_requests', 'createdByUserId', 'created_by_user_id');
      await rename('maintenance_requests', 'scheduledDate', 'scheduled_date');
      await rename('maintenance_requests', 'estimatedDuration', 'estimated_duration');
      await rename('maintenance_requests', 'startedAt', 'started_at');
      await rename('maintenance_requests', 'completedAt', 'completed_at');
      await rename('maintenance_requests', 'actualDuration', 'actual_duration');
      await rename('maintenance_requests', 'approvedByUserId', 'approved_by_user_id');
      await rename('maintenance_requests', 'approvedAt', 'approved_at');
      await rename('maintenance_requests', 'rejectionReason', 'rejection_reason');
      await rename('maintenance_requests', 'verifiedByUserId', 'verified_by_user_id');
      await rename('maintenance_requests', 'verifiedAt', 'verified_at');
      await rename('maintenance_requests', 'estimatedCost', 'estimated_cost');
      await rename('maintenance_requests', 'laborCost', 'labor_cost');
      await rename('maintenance_requests', 'partsCost', 'parts_cost');
      await rename('maintenance_requests', 'totalCost', 'total_cost');
      await rename('maintenance_requests', 'completionNotes', 'completion_notes');
      await rename('maintenance_requests', 'rootCause', 'root_cause');
      await rename('maintenance_requests', 'actionsTaken', 'actions_taken');
      await rename('maintenance_requests', 'hasPhotosBefore', 'has_photos_before');
      await rename('maintenance_requests', 'hasPhotosAfter', 'has_photos_after');
      await rename('maintenance_requests', 'slaDueDate', 'sla_due_date');
      await rename('maintenance_requests', 'slaBreached', 'sla_breached');
      await rename('maintenance_requests', 'downtimeStart', 'downtime_start');
      await rename('maintenance_requests', 'downtimeEnd', 'downtime_end');
      await rename('maintenance_requests', 'downtimeMinutes', 'downtime_minutes');
      await rename('maintenance_requests', 'relatedTaskId', 'related_task_id');
      await rename('maintenance_requests', 'isScheduled', 'is_scheduled');
      await rename('maintenance_requests', 'maintenanceScheduleId', 'maintenance_schedule_id');
    }

    const hasMaintenanceParts = await queryRunner.hasTable('maintenance_parts');
    if (hasMaintenanceParts) {
      await rename('maintenance_parts', 'maintenanceRequestId', 'maintenance_request_id');
      await rename('maintenance_parts', 'productId', 'product_id');
      await rename('maintenance_parts', 'partName', 'part_name');
      await rename('maintenance_parts', 'partNumber', 'part_number');
      await rename('maintenance_parts', 'quantityNeeded', 'quantity_needed');
      await rename('maintenance_parts', 'quantityUsed', 'quantity_used');
      await rename('maintenance_parts', 'unitPrice', 'unit_price');
      await rename('maintenance_parts', 'totalPrice', 'total_price');
      await rename('maintenance_parts', 'serialNumber', 'serial_number');
      await rename('maintenance_parts', 'oldSerialNumber', 'old_serial_number');
      await rename('maintenance_parts', 'warrantyUntil', 'warranty_until');
    }

    const hasMaintenanceSchedules = await queryRunner.hasTable('maintenance_schedules');
    if (hasMaintenanceSchedules) {
      await rename('maintenance_schedules', 'organizationId', 'organization_id');
      await rename('maintenance_schedules', 'maintenanceType', 'maintenance_type');
      await rename('maintenance_schedules', 'machineId', 'machine_id');
      await rename('maintenance_schedules', 'machineModel', 'machine_model');
      await rename('maintenance_schedules', 'frequencyType', 'frequency_type');
      await rename('maintenance_schedules', 'frequencyValue', 'frequency_value');
      await rename('maintenance_schedules', 'daysOfWeek', 'days_of_week');
      await rename('maintenance_schedules', 'dayOfMonth', 'day_of_month');
      await rename('maintenance_schedules', 'lastExecutedDate', 'last_executed_date');
      await rename('maintenance_schedules', 'nextDueDate', 'next_due_date');
      await rename('maintenance_schedules', 'timesExecuted', 'times_executed');
      await rename('maintenance_schedules', 'checklistTemplate', 'checklist_template');
      await rename('maintenance_schedules', 'estimatedDuration', 'estimated_duration');
      await rename('maintenance_schedules', 'estimatedCost', 'estimated_cost');
      await rename('maintenance_schedules', 'notifyDaysBefore', 'notify_days_before');
      await rename('maintenance_schedules', 'autoCreateRequest', 'auto_create_request');
      await rename('maintenance_schedules', 'isActive', 'is_active');
      await rename('maintenance_schedules', 'createdByUserId', 'created_by_user_id');
    }

    // ============================================================
    // 21. COMPLAINTS
    // ============================================================
    await rename('complaints', 'organizationId', 'organization_id');
    await rename('complaints', 'complaintNumber', 'complaint_number');
    await rename('complaints', 'userId', 'user_id');
    await rename('complaints', 'machineId', 'machine_id');
    await rename('complaints', 'orderId', 'order_id');
    await rename('complaints', 'complaintType', 'complaint_type');
    await rename('complaints', 'reportedVia', 'reported_via');
    await rename('complaints', 'assignedTo', 'assigned_to');
    await rename('complaints', 'resolvedBy', 'resolved_by');
    await rename('complaints', 'resolvedAt', 'resolved_at');
    await rename('complaints', 'resolutionNotes', 'resolution_notes');

    // ============================================================
    // 22. NOTIFICATIONS
    // ============================================================
    await rename('notifications', 'organizationId', 'organization_id');
    await rename('notifications', 'userId', 'user_id');
    await rename('notifications', 'isRead', 'is_read');
    await rename('notifications', 'readAt', 'read_at');
    await rename('notifications', 'actionUrl', 'action_url');
    await rename('notifications', 'expiresAt', 'expires_at');

    // ============================================================
    // 23. REPORTS
    // ============================================================
    await rename('reports', 'organizationId', 'organization_id');
    await rename('reports', 'reportType', 'report_type');
    await rename('reports', 'generatedBy', 'generated_by');
    await rename('reports', 'startDate', 'start_date');
    await rename('reports', 'endDate', 'end_date');
    await rename('reports', 'generatedAt', 'generated_at');
    await rename('reports', 'expiresAt', 'expires_at');

    // ============================================================
    // 24. LOYALTY - POINTS_TRANSACTIONS
    // ============================================================
    const hasPointsTxns = await queryRunner.hasTable('points_transactions');
    if (hasPointsTxns) {
      await rename('points_transactions', 'organizationId', 'organization_id');
      await rename('points_transactions', 'userId', 'user_id');
      await rename('points_transactions', 'balanceAfter', 'balance_after');
      await rename('points_transactions', 'referenceId', 'reference_id');
      await rename('points_transactions', 'referenceType', 'reference_type');
      await rename('points_transactions', 'descriptionUz', 'description_uz');
      await rename('points_transactions', 'expiresAt', 'expires_at');
      await rename('points_transactions', 'isExpired', 'is_expired');
      await rename('points_transactions', 'remainingAmount', 'remaining_amount');
      await rename('points_transactions', 'adminId', 'admin_id');
      await rename('points_transactions', 'adminReason', 'admin_reason');
    }

    // ============================================================
    // 25. QUESTS
    // ============================================================
    const hasQuests = await queryRunner.hasTable('quests');
    if (hasQuests) {
      await rename('quests', 'organizationId', 'organization_id');
      await rename('quests', 'titleUz', 'title_uz');
      await rename('quests', 'descriptionUz', 'description_uz');
      await rename('quests', 'targetValue', 'target_value');
      await rename('quests', 'rewardPoints', 'reward_points');
      await rename('quests', 'additionalRewards', 'additional_rewards');
      await rename('quests', 'startsAt', 'starts_at');
      await rename('quests', 'endsAt', 'ends_at');
      await rename('quests', 'isActive', 'is_active');
      await rename('quests', 'isFeatured', 'is_featured');
      await rename('quests', 'displayOrder', 'display_order');
      await rename('quests', 'totalStarted', 'total_started');
      await rename('quests', 'totalCompleted', 'total_completed');
    }

    // ============================================================
    // 26. USER_QUESTS
    // ============================================================
    const hasUserQuests = await queryRunner.hasTable('user_quests');
    if (hasUserQuests) {
      await rename('user_quests', 'userId', 'user_id');
      await rename('user_quests', 'questId', 'quest_id');
      await rename('user_quests', 'currentValue', 'current_value');
      await rename('user_quests', 'targetValue', 'target_value');
      await rename('user_quests', 'progressDetails', 'progress_details');
      await rename('user_quests', 'periodStart', 'period_start');
      await rename('user_quests', 'periodEnd', 'period_end');
      await rename('user_quests', 'rewardPoints', 'reward_points');
      await rename('user_quests', 'pointsClaimed', 'points_claimed');
      await rename('user_quests', 'rewardsClaimed', 'rewards_claimed');
      await rename('user_quests', 'completedAt', 'completed_at');
      await rename('user_quests', 'claimedAt', 'claimed_at');
      await rename('user_quests', 'expiredAt', 'expired_at');
    }

    // ============================================================
    // 27. REFERRALS
    // ============================================================
    const hasReferrals = await queryRunner.hasTable('referrals');
    if (hasReferrals) {
      await rename('referrals', 'organizationId', 'organization_id');
      await rename('referrals', 'referrerId', 'referrer_id');
      await rename('referrals', 'referredId', 'referred_id');
      await rename('referrals', 'referralCode', 'referral_code');
      await rename('referrals', 'completedAt', 'completed_at');
      await rename('referrals', 'rewardPoints', 'reward_points');
      await rename('referrals', 'rewardClaimed', 'reward_claimed');
    }

    // ============================================================
    // 28. FAVORITES
    // ============================================================
    const hasFavorites = await queryRunner.hasTable('favorites');
    if (hasFavorites) {
      await rename('favorites', 'userId', 'user_id');
      await rename('favorites', 'productId', 'product_id');
    }

    // ============================================================
    // 29. TELEGRAM_PAYMENTS
    // ============================================================
    const hasTgPayments = await queryRunner.hasTable('telegram_payments');
    if (hasTgPayments) {
      await rename('telegram_payments', 'organizationId', 'organization_id');
      await rename('telegram_payments', 'userId', 'user_id');
      await rename('telegram_payments', 'telegramUserId', 'telegram_user_id');
      await rename('telegram_payments', 'telegramPaymentChargeId', 'telegram_payment_charge_id');
      await rename('telegram_payments', 'providerPaymentChargeId', 'provider_payment_charge_id');
      await rename('telegram_payments', 'totalAmount', 'total_amount');
      await rename('telegram_payments', 'invoicePayload', 'invoice_payload');
      await rename('telegram_payments', 'paidAt', 'paid_at');
    }

    // ============================================================
    // 30. WORK_LOGS
    // ============================================================
    const hasWorkLogs = await queryRunner.hasTable('work_logs');
    if (hasWorkLogs) {
      await rename('work_logs', 'organizationId', 'organization_id');
      await rename('work_logs', 'userId', 'user_id');
      await rename('work_logs', 'machineId', 'machine_id');
      await rename('work_logs', 'clockIn', 'clock_in');
      await rename('work_logs', 'clockOut', 'clock_out');
      await rename('work_logs', 'totalMinutes', 'total_minutes');
    }

    // ============================================================
    // 31. IMPORTS
    // ============================================================
    const hasImports = await queryRunner.hasTable('imports');
    if (hasImports) {
      await rename('imports', 'organizationId', 'organization_id');
      await rename('imports', 'uploadedBy', 'uploaded_by');
      await rename('imports', 'startedAt', 'started_at');
      await rename('imports', 'completedAt', 'completed_at');
      await rename('imports', 'totalRows', 'total_rows');
      await rename('imports', 'successRows', 'success_rows');
      await rename('imports', 'errorRows', 'error_rows');
      await rename('imports', 'isProcessed', 'is_processed');
    }

    // ============================================================
    // 32. FISCAL_RECEIPTS
    // ============================================================
    const hasFiscalReceipts = await queryRunner.hasTable('fiscal_receipts');
    if (hasFiscalReceipts) {
      await rename('fiscal_receipts', 'organizationId', 'organization_id');
      await rename('fiscal_receipts', 'transactionId', 'transaction_id');
      await rename('fiscal_receipts', 'fiscalNumber', 'fiscal_number');
      await rename('fiscal_receipts', 'fiscalUrl', 'fiscal_url');
      await rename('fiscal_receipts', 'fiscalDate', 'fiscal_date');
      await rename('fiscal_receipts', 'terminalId', 'terminal_id');
    }

    // ============================================================
    // 33. INTEGRATIONS
    // ============================================================
    const hasIntegrations = await queryRunner.hasTable('integrations');
    if (hasIntegrations) {
      await rename('integrations', 'organizationId', 'organization_id');
      await rename('integrations', 'lastSyncAt', 'last_sync_at');
      await rename('integrations', 'isActive', 'is_active');
    }

    // ============================================================
    // 34. MATERIAL_REQUESTS
    // ============================================================
    const hasMaterialRequests = await queryRunner.hasTable('material_requests');
    if (hasMaterialRequests) {
      await rename('material_requests', 'organizationId', 'organization_id');
      await rename('material_requests', 'requestNumber', 'request_number');
      await rename('material_requests', 'requestedBy', 'requested_by');
      await rename('material_requests', 'approvedBy', 'approved_by');
      await rename('material_requests', 'fulfilledBy', 'fulfilled_by');
    }

    // ============================================================
    // 35. WAREHOUSE_ZONES
    // ============================================================
    const hasWarehouseZones = await queryRunner.hasTable('warehouse_zones');
    if (hasWarehouseZones) {
      await rename('warehouse_zones', 'organizationId', 'organization_id');
      await rename('warehouse_zones', 'isActive', 'is_active');
      await rename('warehouse_zones', 'maxCapacity', 'max_capacity');
      await rename('warehouse_zones', 'currentOccupancy', 'current_occupancy');
    }

    // ============================================================
    // 36. AUDIT TABLES (BaseEntity fields handled already)
    // ============================================================
    const auditTables = [
      'audit_logs', 'audit_retention_policies', 'audit_alerts',
      'audit_trail_snapshots', 'audit_config',
    ];
    for (const tbl of auditTables) {
      const exists = await queryRunner.hasTable(tbl);
      if (exists) {
        await rename(tbl, 'organizationId', 'organization_id');
        await rename(tbl, 'userId', 'user_id');
        await rename(tbl, 'entityId', 'entity_id');
        await rename(tbl, 'entityType', 'entity_type');
        await rename(tbl, 'ipAddress', 'ip_address');
        await rename(tbl, 'userAgent', 'user_agent');
      }
    }

    // ============================================================
    // 37. COLLECTION_RECORDS
    // ============================================================
    const hasCollectionRecords = await queryRunner.hasTable('collection_records');
    if (hasCollectionRecords) {
      await rename('collection_records', 'organizationId', 'organization_id');
      await rename('collection_records', 'machineId', 'machine_id');
      await rename('collection_records', 'collectorId', 'collector_id');
      await rename('collection_records', 'collectionNumber', 'collection_number');
      await rename('collection_records', 'totalCash', 'total_cash');
      await rename('collection_records', 'totalCard', 'total_card');
      await rename('collection_records', 'openingCash', 'opening_cash');
      await rename('collection_records', 'closingCash', 'closing_cash');
      await rename('collection_records', 'actualCash', 'actual_cash');
      await rename('collection_records', 'collectedAt', 'collected_at');
    }

    // ============================================================
    // 38. REFERENCE TABLES
    // ============================================================
    const refTables = [
      'goods_classifiers', 'ikpu_codes', 'package_types',
      'payment_providers', 'vat_rates',
    ];
    for (const tbl of refTables) {
      const exists = await queryRunner.hasTable(tbl);
      if (exists) {
        await rename(tbl, 'isActive', 'is_active');
      }
    }

    // ============================================================
    // DONE - All BaseEntity fields (created_at, updated_at,
    // deleted_at, created_by_id, updated_by_id) are already
    // snake_case in the base entity definition, so no rename needed.
    // ============================================================
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting a naming convention migration is impractical
    // since it would require reversing every rename.
    // If needed, restore from a database backup.
    console.warn(
      'SnakeNamingConvention migration down() is a no-op. Restore from backup if needed.',
    );
  }
}
