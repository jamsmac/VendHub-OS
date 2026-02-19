/**
 * LocationVisit Entity for VendHub OS
 * Посещения локации
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Location } from "./location.entity";

@Entity("location_visits")
@Index(["locationId", "visitDate"])
@Index(["userId", "visitDate"])
export class LocationVisit extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, { onDelete: "SET NULL" })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column()
  organizationId: string;

  @Column()
  userId: string;

  @Column({ length: 255, nullable: true })
  userName: string;

  // Время
  @Column({ type: "date" })
  visitDate: Date;

  @Column({ type: "time", nullable: true })
  checkInTime: string;

  @Column({ type: "time", nullable: true })
  checkOutTime: string;

  @Column({ type: "int", nullable: true })
  durationMinutes: number;

  // Тип визита
  @Column({
    type: "enum",
    enum: [
      "routine",
      "service",
      "inspection",
      "meeting",
      "installation",
      "collection",
      "complaint",
    ],
    default: "routine",
  })
  visitType:
    | "routine"
    | "service"
    | "inspection"
    | "meeting"
    | "installation"
    | "collection"
    | "complaint";

  // Геолокация
  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  checkInLatitude: number;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  checkInLongitude: number;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  checkOutLatitude: number;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  checkOutLongitude: number;

  // Результат
  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "jsonb", default: [] })
  tasks: {
    description: string;
    completed: boolean;
  }[];

  @Column({ type: "jsonb", default: [] })
  photos: {
    url: string;
    description?: string;
    takenAt: Date;
  }[];

  @Column({
    type: "enum",
    enum: ["scheduled", "in_progress", "completed", "cancelled"],
    default: "scheduled",
  })
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}
