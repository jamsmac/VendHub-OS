/**
 * Shared Enums - Re-exported from @vendhub/shared
 *
 * All shared enums are now defined in @vendhub/shared package (packages/shared)
 * and re-exported here to maintain backwards compatibility with existing imports.
 *
 * Do NOT define duplicate enums in entity files or service files.
 */

// Re-export from shared package — single source of truth
export { UserRole } from "@vendhub/shared";
export { PaymentMethod } from "@vendhub/shared";
export { CommissionType, ContractType, ContractStatus } from "@vendhub/shared";
