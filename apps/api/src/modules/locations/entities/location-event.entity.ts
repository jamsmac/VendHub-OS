/**
 * LocationEvent Entity for VendHub OS
 * События/история локации
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { LocationEventType } from "./location-enums";
import { Location } from "./location.entity";

@Entity("location_events")
@Index(["locationId", "eventType"])
@Index(["organizationId", "createdAt"])
export class LocationEvent extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, (location) => location.events, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column()
  organizationId: string;

  @Column({
    type: "enum",
    enum: LocationEventType,
  })
  eventType: LocationEventType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // Связанные данные
  @Column({ type: "uuid", nullable: true })
  relatedEntityId: string; // ID связанной сущности

  @Column({ length: 50, nullable: true })
  relatedEntityType: string; // "machine", "contract", "complaint"

  // Изменения (для status_changed и т.д.)
  @Column({ type: "jsonb", nullable: true })
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];

  // Метаданные
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // Пользователь
  @Column({ type: "uuid", nullable: true })
  userId: string;

  @Column({ length: 255, nullable: true })
  userName: string;
}
