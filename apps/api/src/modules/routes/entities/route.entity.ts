import {
  Entity,
  Column,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Vehicle } from "../../vehicles/entities/vehicle.entity";
import { RoutePoint } from "./route-point.entity";
import { RouteAnomaly } from "./route-anomaly.entity";
import { RouteTaskLink } from "./route-task-link.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum RouteType {
  REFILL = "refill",
  COLLECTION = "collection",
  MAINTENANCE = "maintenance",
  MIXED = "mixed",
}

export enum RouteStatus {
  DRAFT = "draft",
  PLANNED = "planned",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  AUTO_CLOSED = "auto_closed",
}

export enum RouteStopStatus {
  PENDING = "pending",
  ARRIVED = "arrived",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  SKIPPED = "skipped",
}

export enum TransportType {
  CAR = "car",
  MOTORCYCLE = "motorcycle",
  BICYCLE = "bicycle",
  ON_FOOT = "on_foot",
  PUBLIC_TRANSPORT = "public_transport",
}

// ============================================================================
// ROUTE ENTITY
// ============================================================================

@Entity("routes")
@Index(["organizationId"])
@Index(["operatorId"])
@Index(["plannedDate"])
@Index(["status"])
@Index(["vehicleId"])
@Index(["operatorId", "status"], {
  where: '"status" = \'active\' AND "deleted_at" IS NULL',
})
export class Route extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  operatorId: string;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "enum", enum: RouteType, default: RouteType.REFILL })
  type: RouteType;

  @Column({ type: "enum", enum: RouteStatus, default: RouteStatus.PLANNED })
  status: RouteStatus;

  @Column({ type: "date" })
  plannedDate: Date;

  // ── Vehicle & Transport (from Trip) ──────────────────────────────

  @Column({ type: "uuid", nullable: true })
  vehicleId: string | null;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: "vehicle_id" })
  vehicle: Vehicle | null;

  @Column({
    type: "enum",
    enum: TransportType,
    nullable: true,
  })
  transportType: TransportType | null;

  // ── Planning Fields ──────────────────────────────────────────────

  @Column({ type: "int", nullable: true })
  estimatedDurationMinutes: number | null;

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  estimatedDistanceKm: number | null;

  // ── Execution Fields ─────────────────────────────────────────────

  @Column({ type: "timestamp with time zone", nullable: true })
  startedAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt: Date | null;

  @Column({ type: "int", nullable: true })
  actualDurationMinutes: number | null;

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  actualDistanceKm: number | null;

  // ── Odometer (from Trip) ─────────────────────────────────────────

  @Column({ type: "int", nullable: true })
  startOdometer: number | null;

  @Column({ type: "int", nullable: true })
  endOdometer: number | null;

  @Column({ type: "int", default: 0 })
  calculatedDistanceMeters: number;

  // ── GPS Start/End Coordinates (from Trip) ────────────────────────

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  startLatitude: number | null;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  startLongitude: number | null;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  endLatitude: number | null;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  endLongitude: number | null;

  // ── Live Tracking (from Trip) ────────────────────────────────────

  @Column({ type: "boolean", default: false })
  liveLocationActive: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastLocationUpdate: Date | null;

  @Column({ type: "bigint", nullable: true })
  telegramMessageId: number | null;

  // ── Statistics (from Trip) ───────────────────────────────────────

  @Column({ type: "int", default: 0 })
  totalPoints: number;

  @Column({ type: "int", default: 0 })
  totalStopsVisited: number;

  @Column({ type: "int", default: 0 })
  totalAnomalies: number;

  @Column({ type: "int", default: 0 })
  visitedMachinesCount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  taxiTotalAmount: number | null;

  // ── Notes & Metadata ─────────────────────────────────────────────

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // ── Relations ────────────────────────────────────────────────────

  @OneToMany(() => RouteStop, (stop) => stop.route, { cascade: true })
  stops: RouteStop[];

  @OneToMany(() => RoutePoint, (point) => point.route)
  points: RoutePoint[];

  @OneToMany(() => RouteAnomaly, (anomaly) => anomaly.route)
  anomalies: RouteAnomaly[];

  @OneToMany(() => RouteTaskLink, (link) => link.route)
  taskLinks: RouteTaskLink[];
}

// ============================================================================
// ROUTE STOP ENTITY
// ============================================================================

@Entity("route_stops")
@Index(["routeId"])
@Index(["machineId"])
@Index(["taskId"])
@Index(["routeId", "sequence"], { unique: true, where: '"deleted_at" IS NULL' })
export class RouteStop extends BaseEntity {
  @Column({ type: "uuid" })
  routeId: string;

  @ManyToOne(() => Route, (route) => route.stops, { onDelete: "CASCADE" })
  @JoinColumn({ name: "route_id" })
  route: Route;

  @Column({ type: "uuid" })
  machineId: string;

  @Column({ type: "int" })
  sequence: number;

  @Column({ type: "uuid", nullable: true })
  taskId: string | null;

  @Column({
    type: "enum",
    enum: RouteStopStatus,
    default: RouteStopStatus.PENDING,
  })
  status: RouteStopStatus;

  @Column({ type: "text", nullable: true })
  address: string | null;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  estimatedArrival: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  actualArrival: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  departedAt: Date | null;

  @Column({ type: "int", default: 15 })
  estimatedDurationMinutes: number;

  @Column({ type: "boolean", default: false })
  isPriority: boolean;

  // ── New fields from TripStop ─────────────────────────────────────

  @Column({ type: "varchar", length: 128, nullable: true })
  machineName: string | null;

  @Column({ type: "varchar", length: 256, nullable: true })
  machineAddress: string | null;

  @Column({ type: "int", nullable: true })
  distanceToMachineMeters: number | null;

  @Column({ type: "int", nullable: true })
  actualDurationSeconds: number | null;

  @Column({ type: "boolean", default: false })
  isVerified: boolean;

  @Column({ type: "boolean", default: false })
  isAnomaly: boolean;

  // ── Existing fields ──────────────────────────────────────────────

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", default: {} })
  completionData: {
    collectedCash?: number;
    refilledItems?: Record<string, number>;
    issues?: string[];
    photos?: string[];
  };

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
