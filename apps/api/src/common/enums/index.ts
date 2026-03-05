/**
 * Shared Enums — defined locally for the API app.
 *
 * These are kept in sync with @vendhub/shared (packages/shared/src/types/).
 * Defined locally because tsup bundling loses barrel re-exports from the
 * shared package's main entry point (dist/index.d.ts).
 */

export enum UserRole {
  OWNER = "owner",
  ADMIN = "admin",
  MANAGER = "manager",
  OPERATOR = "operator",
  WAREHOUSE = "warehouse",
  ACCOUNTANT = "accountant",
  VIEWER = "viewer",
}

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

export enum CommissionType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
  TIERED = "tiered",
  HYBRID = "hybrid",
}

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
