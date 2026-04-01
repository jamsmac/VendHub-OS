import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Route } from "./route.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum RouteTaskLinkStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  SKIPPED = "skipped",
}

// ============================================================================
// ROUTE-TASK LINK ENTITY (Many-to-many between routes and tasks)
// ============================================================================

@Entity("route_task_links")
@Index(["routeId", "taskId"], { unique: true, where: '"deleted_at" IS NULL' })
export class RouteTaskLink extends BaseEntity {
  @Column({ type: "uuid" })
  routeId: string;

  @ManyToOne(() => Route, (route) => route.taskLinks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "route_id" })
  route: Route;

  @Column({ type: "uuid" })
  taskId: string;

  @Column({
    type: "enum",
    enum: RouteTaskLinkStatus,
    default: RouteTaskLinkStatus.PENDING,
  })
  status: RouteTaskLinkStatus;

  // GPS verification
  @Column({ type: "boolean", default: false })
  verifiedByGps: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  verifiedAt: Date | null;

  // Execution timing
  @Column({ type: "timestamp with time zone", nullable: true })
  startedAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  // GPS verification coordinates
  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  expectedLatitude: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  expectedLongitude: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  actualLatitude: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  actualLongitude: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  distanceFromExpectedM: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 100 })
  verificationRadiusM: number;

  @Column({ type: "int", nullable: true })
  stopDurationSeconds: number | null;

  @Column({ type: "uuid", nullable: true })
  routeStopId: string | null;

  @Column({ type: "uuid", nullable: true })
  overriddenById: string | null;

  // VHM24 integration fields
  @Column({ type: "varchar", length: 50, nullable: true })
  verificationStatus: string | null;

  @Column({ type: "varchar", nullable: true })
  vhm24TaskId: string | null;

  @Column({ type: "varchar", nullable: true })
  vhm24TaskType: string | null;

  @Column({ type: "varchar", nullable: true })
  vhm24MachineId: string | null;
}
