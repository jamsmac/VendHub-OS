import {
  Entity,
  Column,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { TripPoint } from './trip-point.entity';
import { TripStop } from './trip-stop.entity';
import { TripAnomaly } from './trip-anomaly.entity';
import { TripTaskLink } from './trip-task-link.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum TripStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  AUTO_CLOSED = 'auto_closed',
}

export enum TripTaskType {
  FILLING = 'filling',
  COLLECTION = 'collection',
  REPAIR = 'repair',
  MAINTENANCE = 'maintenance',
  INSPECTION = 'inspection',
  MERCHANDISING = 'merchandising',
  OTHER = 'other',
}

// ============================================================================
// TRIP ENTITY
// ============================================================================

@Entity('trips')
@Index(['organizationId'])
@Index(['employeeId'])
@Index(['vehicleId'])
@Index(['status'])
@Index(['startedAt'])
@Index(['employeeId', 'status'], { where: '"status" = \'active\' AND "deleted_at" IS NULL' })
export class Trip extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  employeeId: string;

  @Column({ type: 'uuid', nullable: true })
  vehicleId: string | null;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle | null;

  @Column({ type: 'enum', enum: TripTaskType, default: TripTaskType.OTHER })
  taskType: TripTaskType;

  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.ACTIVE })
  status: TripStatus;

  // Time
  @Column({ type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endedAt: Date | null;

  // Odometer
  @Column({ type: 'int', nullable: true })
  startOdometer: number | null;

  @Column({ type: 'int', nullable: true })
  endOdometer: number | null;

  @Column({ type: 'int', default: 0 })
  calculatedDistanceMeters: number;

  // Start/end coordinates
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  startLatitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  startLongitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  endLatitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  endLongitude: number | null;

  // Machine references (start/end locations)
  @Column({ type: 'uuid', nullable: true })
  startMachineId: string | null;

  @Column({ type: 'uuid', nullable: true })
  endMachineId: string | null;

  // Statistics
  @Column({ type: 'int', default: 0 })
  totalPoints: number;

  @Column({ type: 'int', default: 0 })
  totalStops: number;

  @Column({ type: 'int', default: 0 })
  totalAnomalies: number;

  @Column({ type: 'int', default: 0 })
  visitedMachinesCount: number;

  // Telegram Live Location
  @Column({ type: 'boolean', default: false })
  liveLocationActive: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLocationUpdate: Date | null;

  @Column({ type: 'bigint', nullable: true })
  telegramMessageId: number | null;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Relations
  @OneToMany(() => TripPoint, (point) => point.trip)
  points: TripPoint[];

  @OneToMany(() => TripStop, (stop) => stop.trip)
  stops: TripStop[];

  @OneToMany(() => TripAnomaly, (anomaly) => anomaly.trip)
  anomalies: TripAnomaly[];

  @OneToMany(() => TripTaskLink, (link) => link.trip)
  taskLinks: TripTaskLink[];
}
