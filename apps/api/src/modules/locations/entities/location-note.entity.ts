/**
 * LocationNote Entity for VendHub OS
 * Заметки по локации
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Location } from "./location.entity";

@Entity("location_notes")
@Index(["locationId", "isPinned"])
export class LocationNote extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, (location) => location.notes, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column()
  organizationId: string;

  @Column({ type: "text" })
  content: string;

  @Column({
    type: "enum",
    enum: ["general", "important", "warning", "contact", "meeting", "todo"],
    default: "general",
  })
  noteType:
    | "general"
    | "important"
    | "warning"
    | "contact"
    | "meeting"
    | "todo";

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isPrivate: boolean; // Видно только автору

  // Напоминание
  @Column({ type: "timestamp", nullable: true })
  reminderAt: Date;

  @Column({ default: false })
  reminderSent: boolean;

  // Вложения
  @Column({ type: "jsonb", default: [] })
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];

  @Column({ length: 255, nullable: true })
  createdByName: string;
}
