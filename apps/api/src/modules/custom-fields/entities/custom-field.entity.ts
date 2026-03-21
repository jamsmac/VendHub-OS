import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum CustomFieldType {
  TEXT = "text",
  NUMBER = "number",
  DATE = "date",
  SELECT = "select",
  FILE = "file",
  BOOLEAN = "boolean",
  URL = "url",
  EMAIL = "email",
  PHONE = "phone",
  TEXTAREA = "textarea",
}

// ============================================================================
// ENTITY CUSTOM TAB (Spec v2 Section 7.8)
// ============================================================================

@Entity("entity_custom_tabs")
@Index(["organizationId"])
@Index(["organizationId", "entityType"])
@Index(["organizationId", "entityType", "sortOrder"])
export class EntityCustomTab extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  /** Which entity type this tab appears on (machine, product, batch, etc.) */
  @Column({ type: "varchar", length: 50 })
  entityType: string;

  @Column({ type: "varchar", length: 100 })
  tabName: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  tabNameUz: string | null;

  /** Lucide icon name (e.g., "file-text", "image", "settings") */
  @Column({ type: "varchar", length: 50, nullable: true })
  tabIcon: string | null;

  @Column({ type: "int", default: 100 })
  sortOrder: number;

  /** Which roles can see this tab. Empty array = all roles. */
  @Column({ type: "jsonb", default: [] })
  visibilityRoles: string[];

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// ENTITY CUSTOM FIELD (Spec v2 Section 7.8)
// ============================================================================

@Entity("entity_custom_fields")
@Index(["organizationId"])
@Index(["organizationId", "entityType"])
@Index(["organizationId", "entityType", "tabName"])
@Index(["organizationId", "entityType", "sortOrder"])
export class EntityCustomField extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  /** Which entity type (machine, product, batch, etc.) */
  @Column({ type: "varchar", length: 50 })
  entityType: string;

  /** Machine-readable field key (stored as key in metadata JSONB) */
  @Column({ type: "varchar", length: 100 })
  fieldKey: string;

  /** Human-readable label */
  @Column({ type: "varchar", length: 200 })
  fieldLabel: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  fieldLabelUz: string | null;

  @Column({
    type: "enum",
    enum: CustomFieldType,
    default: CustomFieldType.TEXT,
  })
  fieldType: CustomFieldType;

  /** Tab name where this field is rendered (null = default tab) */
  @Column({ type: "varchar", length: 100, nullable: true })
  tabName: string | null;

  @Column({ type: "boolean", default: false })
  isRequired: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  /** For SELECT type: list of options */
  @Column({ type: "jsonb", nullable: true })
  options: string[] | null;

  /** Default value (stored as string, parsed by fieldType) */
  @Column({ type: "varchar", length: 500, nullable: true })
  defaultValue: string | null;

  /** Placeholder text */
  @Column({ type: "varchar", length: 200, nullable: true })
  placeholder: string | null;

  /** Help text shown below the field */
  @Column({ type: "varchar", length: 500, nullable: true })
  helpText: string | null;

  /** Validation: min value for NUMBER, min length for TEXT */
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  validationMin: number | null;

  /** Validation: max value for NUMBER, max length for TEXT */
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  validationMax: number | null;

  /** Regex pattern for TEXT validation */
  @Column({ type: "varchar", length: 500, nullable: true })
  validationPattern: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
