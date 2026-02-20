import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Trip } from './trip.entity';

// ============================================================================
// TRIP STOP ENTITY (Detected stops during a trip)
// ============================================================================

@Entity('trip_stops')
@Index(['tripId'])
@Index(['machineId'])
@Index(['startedAt'])
export class TripStop extends BaseEntity {
  @Column({ type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, (trip) => trip.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  // Stop center coordinates
  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  // Machine association (if stop is near a machine geofence)
  @Column({ type: 'uuid', nullable: true })
  machineId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  machineName: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  machineAddress: string | null;

  @Column({ type: 'int', nullable: true })
  distanceToMachineMeters: number | null;

  // Stop duration
  @Column({ type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number | null;

  // Flags
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isAnomaly: boolean;

  @Column({ type: 'boolean', default: false })
  notificationSent: boolean;

  // Employee notes
  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
