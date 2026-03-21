/**
 * Entity Event Types for VendHub OS
 * Unified business event tracking across all entities
 * Based on Full Spec v2 Section 2.2
 */

// ============================================================================
// ENTITY EVENT TYPE — 30 business event types
// ============================================================================

export enum EntityEventType {
  // Procurement & Logistics
  CONTRACT_SIGNED = "contract_signed",
  PAYMENT_MADE = "payment_made",
  SHIPPED = "shipped",
  CUSTOMS_CLEARED = "customs_cleared",
  RECEIVED_AT_WAREHOUSE = "received_at_warehouse",
  QUALITY_CHECKED = "quality_checked",

  // Configuration & Setup
  CONFIGURED = "configured",

  // Inventory & Stock
  ISSUED_FROM_WAREHOUSE = "issued_from_warehouse",
  LOADED_TO_BUNKER = "loaded_to_bunker",
  BUNKER_MIXED = "bunker_mixed",
  LOADED_TO_SLOT = "loaded_to_slot",

  // Installation & Location
  INSTALLED_IN_MACHINE = "installed_in_machine",
  REMOVED_FROM_MACHINE = "removed_from_machine",
  RELOCATED = "relocated",

  // Sales & Operations
  SOLD = "sold",
  ENCASHMENT = "encashment",
  REFILLED = "refilled",

  // Cleaning & Maintenance
  CLEANING_DAILY = "cleaning_daily",
  CLEANING_DEEP = "cleaning_deep",
  CLEANING_FULL = "cleaning_full",
  FLUSH_CYCLE = "flush_cycle",
  MAINTENANCE_SCHEDULED = "maintenance_scheduled",
  MAINTENANCE_UNSCHEDULED = "maintenance_unscheduled",
  SPARE_PART_REPLACED = "spare_part_replaced",

  // Lifecycle
  DEACTIVATED = "deactivated",
  REACTIVATED = "reactivated",
  WRITTEN_OFF = "written_off",

  // Accountability
  TRANSFERRED_TO_OPERATOR = "transferred_to_operator",
  RETURNED_FROM_OPERATOR = "returned_from_operator",
  INVENTORY_CHECK = "inventory_check",
}

// ============================================================================
// ENTITY TYPE — what kind of entity is being tracked
// ============================================================================

export enum TrackedEntityType {
  MACHINE = "machine",
  BUNKER = "bunker",
  MIXER = "mixer",
  GRINDER = "grinder",
  BREWER = "brewer",
  DOSER = "doser",
  CAMERA = "camera",
  WASTE_BIN = "waste_bin",
  INGREDIENT_BATCH = "ingredient_batch",
  RESALE_BATCH = "resale_batch",
  SPARE_BATCH = "spare_batch",
  CONSUMABLE_BATCH = "consumable_batch",
  CLEANING_BATCH = "cleaning_batch",
  PRODUCT = "product",
  CONTAINER = "container",
  EQUIPMENT_COMPONENT = "equipment_component",
}

// ============================================================================
// BATCH MOVEMENT TYPE — how a batch moves through the system
// ============================================================================

export enum BatchMovementType {
  ISSUE = "issue", // Issued from warehouse to operator
  LOAD = "load", // Loaded into bunker/container
  CONSUME = "consume", // Consumed by a sale
  RETURN = "return", // Returned to warehouse
  WRITE_OFF = "write_off", // Written off (expired, damaged)
  MIX = "mix", // Mixed with another batch in bunker
  TRANSFER = "transfer", // Transferred between locations
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface EntityEventCreate {
  entityId: string;
  entityType: TrackedEntityType;
  eventType: EntityEventType;
  eventDate?: Date;
  performedBy: string;
  organizationId: string;
  relatedEntityId?: string;
  relatedEventId?: string;
  quantity?: number;
  documentNumber?: string;
  notes?: string;
  photos?: string[];
  metadata?: Record<string, unknown>;
}

export interface BatchMovementCreate {
  batchId: string;
  eventId?: string;
  movementType: BatchMovementType;
  quantity: number;
  containerId?: string;
  machineId?: string;
  mixedWithBatchId?: string;
  mixRatio?: Record<string, number>;
  performedBy: string;
  organizationId: string;
  notes?: string;
}

export interface SaleIngredientCreate {
  transactionId: string;
  ingredientId: string;
  batchId: string;
  containerId?: string;
  quantityUsed: number;
  unitCostAtTime: number;
  organizationId: string;
}
