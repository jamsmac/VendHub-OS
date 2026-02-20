/**
 * Machine Access Entities for VendHub OS
 * Управление доступом к автоматам
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Роль доступа к автомату
 */
export enum MachineAccessRole {
  FULL = "full",
  REFILL = "refill",
  COLLECTION = "collection",
  MAINTENANCE = "maintenance",
  VIEW = "view",
}

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * Доступ к автомату
 */
@Entity("machine_access")
@Index(["organizationId"])
@Index(["machineId"])
@Index(["userId"])
@Index("UQ_machine_access_machine_user", ["machineId", "userId"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class MachineAccess extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  machineId: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({
    type: "enum",
    enum: MachineAccessRole,
    default: MachineAccessRole.VIEW,
  })
  role: MachineAccessRole;

  @Column({ type: "uuid" })
  grantedByUserId: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  validFrom: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  validTo: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

/**
 * Шаблон доступа
 */
@Entity("access_templates")
@Index(["organizationId"])
@Index("UQ_access_templates_name_org", ["name", "organizationId"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class AccessTemplate extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // ===== Relations =====

  @OneToMany(() => AccessTemplateRow, (row) => row.template, { cascade: true })
  rows: AccessTemplateRow[];
}

/**
 * Строка шаблона доступа
 */
@Entity("access_template_rows")
@Index(["templateId"])
export class AccessTemplateRow extends BaseEntity {
  @Column({ type: "uuid" })
  templateId: string;

  @Column({
    type: "enum",
    enum: MachineAccessRole,
  })
  role: MachineAccessRole;

  @Column({ type: "jsonb", default: {} })
  permissions: Record<string, unknown>;

  // ===== Relations =====

  @ManyToOne(() => AccessTemplate, (template) => template.rows, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "template_id" })
  template: AccessTemplate;
}
