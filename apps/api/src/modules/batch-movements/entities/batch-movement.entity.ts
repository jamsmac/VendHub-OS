import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { BatchMovementType } from "@vendhub/shared";
import type { IngredientBatch } from "../../products/entities/product.entity";
import type { EntityEvent } from "../../entity-events/entities/entity-event.entity";
import type { Container } from "../../containers/entities/container.entity";

@Entity("batch_movements")
@Index(["organizationId"])
@Index(["batchId"])
@Index(["batchId", "movementType"])
@Index(["containerId"])
@Index(["machineId"])
@Index(["eventId"])
@Index(["organizationId", "batchId", "createdAt"])
export class BatchMovement extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  batchId: string;

  @Column({ type: "uuid", nullable: true })
  eventId: string | null; // FK → entity_events

  @Column({ type: "varchar", length: 30 })
  movementType: BatchMovementType;

  @Column({ type: "decimal", precision: 12, scale: 3 })
  quantity: number;

  @Column({ type: "uuid", nullable: true })
  containerId: string | null; // FK → containers (bunker/slot)

  @Column({ type: "uuid", nullable: true })
  machineId: string | null;

  @Column({ type: "uuid", nullable: true })
  mixedWithBatchId: string | null;

  @Column({ type: "jsonb", nullable: true })
  mixRatio: Record<string, number> | null;

  @Column({ type: "uuid" })
  performedBy: string;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // Relations
  @ManyToOne("IngredientBatch", { onDelete: "RESTRICT" })
  @JoinColumn({ name: "batch_id" })
  batch: IngredientBatch;

  @ManyToOne("EntityEvent", { onDelete: "SET NULL" })
  @JoinColumn({ name: "event_id" })
  event: EntityEvent;

  @ManyToOne("Container", { onDelete: "SET NULL" })
  @JoinColumn({ name: "container_id" })
  container: Container;
}
