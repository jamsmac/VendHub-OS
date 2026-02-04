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
// ENUMS
// ============================================================================

export enum AnomalyType {
  LONG_STOP = 'long_stop',
  SPEED_VIOLATION = 'speed_violation',
  ROUTE_DEVIATION = 'route_deviation',
  GPS_JUMP = 'gps_jump',
  MISSED_LOCATION = 'missed_location',
  UNPLANNED_STOP = 'unplanned_stop',
  MILEAGE_DISCREPANCY = 'mileage_discrepancy',
}

export enum AnomalySeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface AnomalyDetails {
  // LONG_STOP
  durationMinutes?: number;
  expectedMaxMinutes?: number;

  // SPEED_VIOLATION
  speedKmh?: number;
  maxAllowedKmh?: number;

  // ROUTE_DEVIATION
  deviationMeters?: number;
  nearestPlannedPoint?: { lat: number; lng: number };

  // GPS_JUMP
  previousPoint?: { lat: number; lng: number };
  distanceMeters?: number;
  timeSeconds?: number;

  // MISSED_LOCATION
  machineId?: string;
  machineName?: string;

  // MILEAGE_DISCREPANCY
  expectedKm?: number;
  actualKm?: number;
  differenceKm?: number;
}

// ============================================================================
// TRIP ANOMALY ENTITY
// ============================================================================

@Entity('trip_anomalies')
@Index(['tripId'])
@Index(['type'])
@Index(['resolved'])
export class TripAnomaly extends BaseEntity {
  @Column({ type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, (trip) => trip.anomalies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @Column({ type: 'enum', enum: AnomalyType })
  type: AnomalyType;

  @Column({ type: 'enum', enum: AnomalySeverity, default: AnomalySeverity.WARNING })
  severity: AnomalySeverity;

  // Location where anomaly occurred
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  // Type-specific details
  @Column({ type: 'jsonb', default: {} })
  details: AnomalyDetails;

  // Notification
  @Column({ type: 'boolean', default: false })
  notificationSent: boolean;

  // Resolution
  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Column({ type: 'uuid', nullable: true })
  resolvedById: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  detectedAt: Date;
}
