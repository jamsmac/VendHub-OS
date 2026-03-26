/**
 * Container Entity for VendHub OS
 * Represents hoppers/bunkers within vending machines that hold ingredients or products
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum ContainerStatus {
  ACTIVE = "active",
  EMPTY = "empty",
  MAINTENANCE = "maintenance",
}

// ============================================================================
// CONTAINER ENTITY
// ============================================================================

@Entity("containers")
@Index(["organizationId"])
@Index(["machineId", "slotNumber"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index(["machineId"])
@Index(["nomenclatureId"])
@Index(["status"])
export class Container extends BaseEntity {
  @ApiProperty({ description: "Organization UUID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({ description: "Machine UUID this container belongs to" })
  @Column({ type: "uuid" })
  machineId: string;

  @ApiPropertyOptional({
    description: "Product/nomenclature UUID loaded in this container",
  })
  @Column({ type: "uuid", nullable: true })
  nomenclatureId: string | null;

  @ApiProperty({
    description: "Slot number within the machine (1-50)",
    example: 1,
  })
  @Column({ type: "int" })
  slotNumber: number;

  @ApiPropertyOptional({
    description: "Human-readable container name",
    example: "Hopper A1 - Coffee beans",
  })
  @Column({ type: "varchar", length: 100, nullable: true })
  name: string | null;

  @ApiProperty({
    description: "Maximum capacity of this container",
    example: 1000,
  })
  @Column({ type: "decimal", precision: 10, scale: 3 })
  capacity: number;

  @ApiProperty({
    description: "Current quantity in the container",
    example: 750,
  })
  @Column({ type: "decimal", precision: 10, scale: 3, default: 0 })
  currentQuantity: number;

  @ApiProperty({
    description: "Unit of measurement (g, ml, pcs, etc.)",
    example: "g",
  })
  @Column({ type: "varchar", length: 20, default: "g" })
  unit: string;

  @ApiPropertyOptional({
    description: "Minimum level threshold for low-stock alerts",
    example: 100,
  })
  @Column({ type: "decimal", precision: 10, scale: 3, nullable: true })
  minLevel: number | null;

  @ApiPropertyOptional({ description: "Date of last refill" })
  @Column({ type: "timestamp with time zone", nullable: true })
  lastRefillDate: Date | null;

  @ApiProperty({
    description: "Container status",
    enum: ContainerStatus,
    example: ContainerStatus.ACTIVE,
  })
  @Column({
    type: "enum",
    enum: ContainerStatus,
    default: ContainerStatus.ACTIVE,
  })
  status: ContainerStatus;

  @ApiPropertyOptional({
    description:
      "Current batch UUID loaded in this container (for batch traceability)",
  })
  @Column({ type: "uuid", nullable: true })
  currentBatchId: string | null;

  @ApiPropertyOptional({ description: "Additional metadata (JSON)" })
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: "Free-text notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  // ============================================================================
  // RELATIONS
  // ============================================================================

  @ManyToOne("Machine", { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: unknown;

  @ManyToOne("Product", { onDelete: "SET NULL" })
  @JoinColumn({ name: "nomenclature_id" })
  nomenclature: unknown;

  @ManyToOne("IngredientBatch", { onDelete: "SET NULL" })
  @JoinColumn({ name: "current_batch_id" })
  currentBatch: unknown;

  // ============================================================================
  // COMPUTED PROPERTIES
  // ============================================================================

  get fillPercentage(): number {
    if (!this.capacity || Number(this.capacity) <= 0) return 0;
    return Math.round(
      (Number(this.currentQuantity) / Number(this.capacity)) * 100,
    );
  }

  get isLow(): boolean {
    if (this.minLevel === null || this.minLevel === undefined) return false;
    return Number(this.currentQuantity) <= Number(this.minLevel);
  }

  get deficit(): number {
    if (!this.capacity) return 0;
    return Math.max(0, Number(this.capacity) - Number(this.currentQuantity));
  }
}
