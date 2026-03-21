import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { EntityEventType, TrackedEntityType } from "@vendhub/shared";

@Entity("entity_events")
@Index(["organizationId"])
@Index(["entityId", "entityType"])
@Index(["entityType", "eventType"])
@Index(["eventDate"])
@Index(["performedBy"])
@Index(["organizationId", "entityId", "eventDate"])
export class EntityEvent extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  entityId: string;

  @Column({ type: "varchar", length: 50 })
  entityType: TrackedEntityType;

  @Column({ type: "varchar", length: 50 })
  eventType: EntityEventType;

  @Column({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  eventDate: Date;

  @Column({ type: "uuid" })
  performedBy: string;

  @Column({ type: "uuid", nullable: true })
  relatedEntityId: string | null;

  @Column({ type: "uuid", nullable: true })
  relatedEventId: string | null;

  @Column({ type: "decimal", precision: 15, scale: 3, nullable: true })
  quantity: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  documentNumber: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", nullable: true })
  photos: string[] | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
