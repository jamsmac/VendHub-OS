/**
 * LocationZone Entity for VendHub OS
 * Зона в локации - конкретное место установки автомата
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { LocationZoneType } from "./location-enums";
import { Location } from "./location.entity";

@Entity("location_zones")
@Index(["locationId", "isActive"])
export class LocationZone extends BaseEntity {
  @Column()
  locationId: string;

  @ManyToOne(() => Location, (location) => location.zones, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column({ length: 100 })
  name: string; // "Вход A", "2 этаж у лифта"

  @Column({ length: 50, unique: true })
  code: string; // "LOC-TAS-001-Z01"

  @Column({
    type: "enum",
    enum: LocationZoneType,
    default: LocationZoneType.OTHER,
  })
  type: LocationZoneType;

  @Column({ type: "text", nullable: true })
  description: string;

  // Позиция в здании
  @Column({ nullable: true })
  floor: string;

  @Column({ nullable: true })
  section: string;

  @Column({ nullable: true })
  spot: string; // Конкретное место

  // Координаты внутри здания (опционально)
  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  internalX: number;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  internalY: number;

  // Характеристики
  @Column({ type: "jsonb", default: {} })
  characteristics: {
    hasElectricity: boolean;
    hasWifi: boolean;
    hasCCTV: boolean;
    footTraffic?: number; // Проходимость
    visibility?: number; // Видимость 1-10
    accessibility?: number; // Доступность 1-10
  };

  // Размеры доступного места
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  availableWidth: number; // см

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  availableDepth: number; // см

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  availableHeight: number; // см

  // Аренда для конкретной зоны
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  monthlyRent: number;

  // Установленный автомат
  @Column({ type: "uuid", nullable: true })
  machineId: string;

  @Column({ default: false })
  isOccupied: boolean;

  // Флаги
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPremium: boolean; // Премиум место

  @Column({ default: false })
  isReserved: boolean; // Зарезервировано

  // Медиа
  @Column({ type: "jsonb", default: [] })
  photos: {
    url: string;
    description?: string;
    uploadedAt: Date;
  }[];
}
