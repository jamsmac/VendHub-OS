import {
  Entity,
  Column,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum RouteType {
  REFILL = 'refill',
  COLLECTION = 'collection',
  MAINTENANCE = 'maintenance',
  MIXED = 'mixed',
}

export enum RouteStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RouteStopStatus {
  PENDING = 'pending',
  ARRIVED = 'arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

// ============================================================================
// ROUTE ENTITY
// ============================================================================

@Entity('routes')
@Index(['organizationId'])
@Index(['operatorId'])
@Index(['plannedDate'])
@Index(['status'])
export class Route extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  operatorId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'enum', enum: RouteType, default: RouteType.REFILL })
  type: RouteType;

  @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.PLANNED })
  status: RouteStatus;

  @Column({ type: 'date' })
  plannedDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  estimatedDurationMinutes: number | null;

  @Column({ type: 'int', nullable: true })
  actualDurationMinutes: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedDistanceKm: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  actualDistanceKm: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @OneToMany(() => RouteStop, (stop) => stop.route, { cascade: true })
  stops: RouteStop[];
}

// ============================================================================
// ROUTE STOP ENTITY
// ============================================================================

@Entity('route_stops')
@Index(['routeId'])
@Index(['machineId'])
@Index(['taskId'])
@Index(['routeId', 'sequence'], { unique: true, where: '"deleted_at" IS NULL' })
export class RouteStop extends BaseEntity {
  @Column({ type: 'uuid' })
  routeId: string;

  @ManyToOne(() => Route, (route) => route.stops, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ type: 'uuid' })
  machineId: string;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'uuid', nullable: true })
  taskId: string | null;

  @Column({ type: 'enum', enum: RouteStopStatus, default: RouteStopStatus.PENDING })
  status: RouteStopStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  estimatedArrival: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actualArrival: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  departedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
