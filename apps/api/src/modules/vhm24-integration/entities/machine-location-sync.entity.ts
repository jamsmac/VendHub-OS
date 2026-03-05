/**
 * Machine Location Sync Entity
 * Syncs VendHub machine locations with TripBot geofences.
 * Auto-creates geofence when a machine location is synced.
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum SyncStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  DISABLED = "disabled",
  ERROR = "error",
}

@Entity("machine_location_syncs")
@Index(["vhm24MachineId"])
@Index(["locationId"])
@Index(["syncStatus"])
export class MachineLocationSync extends BaseEntity {
  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  // VendHub (source) data
  @Column({ type: "varchar", length: 100 })
  vhm24MachineId: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  vhm24MachineNumber: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  vhm24MachineName: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  vhm24LocationId: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  vhm24LocationName: string | null;

  @Column({ type: "text", nullable: true })
  vhm24Address: string | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  vhm24Latitude: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  vhm24Longitude: number | null;

  // TripBot (target) geofence
  @Column({ type: "uuid", nullable: true })
  locationId: string | null; // FK → locations table (geofence)

  @Column({
    type: "enum",
    enum: SyncStatus,
    default: SyncStatus.ACTIVE,
  })
  syncStatus: SyncStatus;

  @Column({ type: "boolean", default: true })
  autoCreateGeofence: boolean;

  @Column({ type: "int", default: 50 })
  defaultGeofenceRadiusM: number;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: "text", nullable: true })
  lastSyncError: string | null;
}
