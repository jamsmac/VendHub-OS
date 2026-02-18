/**
 * Shared Enums - Single Source of Truth
 *
 * All shared enums that are used across multiple modules MUST be defined here.
 * Do NOT define duplicate enums in entity files or service files.
 */

// ============================================================================
// USER ROLE
// ============================================================================

/**
 * User roles - 7 level hierarchy
 * Used in: users, auth, RBAC, telegram-bot, and all controllers
 */
export enum UserRole {
  OWNER = "owner", // Platform owner (full access)
  ADMIN = "admin", // Organization admin
  MANAGER = "manager", // Team manager
  OPERATOR = "operator", // Field operator (refill, collection, repair, cleaning)
  WAREHOUSE = "warehouse", // Warehouse manager
  ACCOUNTANT = "accountant", // Accountant
  VIEWER = "viewer", // Read-only access
}

// ============================================================================
// PAYMENT METHOD
// ============================================================================

/**
 * Payment methods supported by VendHub
 * Merged from transactions and orders modules
 * Used in: transactions, orders, integrations
 */
export enum PaymentMethod {
  CASH = "cash",
  CARD = "card",
  PAYME = "payme",
  CLICK = "click",
  QR = "qr",
  UZCARD = "uzcard",
  HUMO = "humo",
  VISA = "visa",
  MASTERCARD = "mastercard",
  NFC = "nfc",
  UZUM = "uzum",
  TELEGRAM = "telegram",
  BONUS = "bonus",
  MIXED = "mixed",
}

// ============================================================================
// COMMISSION TYPE
// ============================================================================

/**
 * Commission calculation types
 * Used in: organizations, transactions, contractors
 */
export enum CommissionType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
  TIERED = "tiered",
  HYBRID = "hybrid",
}

// ============================================================================
// CONTRACT TYPE
// ============================================================================

/**
 * Contract types
 * Merged from organizations and locations modules
 * Used in: organizations, locations, contractors
 */
export enum ContractType {
  FRANCHISE = "franchise",
  PARTNERSHIP = "partnership",
  LEASE = "lease",
  SERVICE = "service",
  RENT = "rent",
  REVENUE_SHARE = "revenue_share",
  HYBRID = "hybrid",
  FREE = "free",
  COMMISSION = "commission",
}

// ============================================================================
// CONTRACT STATUS
// ============================================================================

/**
 * Contract status values
 * Merged from organizations, locations, and contractors modules
 * Used in: organizations, locations, contractors
 */
export enum ContractStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  EXPIRING_SOON = "expiring_soon",
  EXPIRED = "expired",
  TERMINATED = "terminated",
  RENEWED = "renewed",
}
