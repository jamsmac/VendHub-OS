import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Route } from "./route.entity";

// ============================================================================
// ROUTE POINT ENTITY (GPS coordinates along the route)
// ============================================================================

@Entity("route_points")
@Index(["routeId", "recordedAt"])
@Index(["routeId", "isFiltered"])
export class RoutePoint extends BaseEntity {
  @Column({ type: "uuid" })
  routeId: string;

  @ManyToOne(() => Route, (route) => route.points, { onDelete: "CASCADE" })
  @JoinColumn({ name: "route_id" })
  route: Route;

  // Coordinates
  @Column({ type: "decimal", precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: "decimal", precision: 11, scale: 8 })
  longitude: number;

  // GPS metadata
  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  accuracyMeters: number | null;

  @Column({ type: "decimal", precision: 8, scale: 2, nullable: true })
  speedMps: number | null;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  heading: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  altitude: number | null;

  // Calculated values
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  distanceFromPrevMeters: number;

  // Filtering (bad point rejection)
  @Column({ type: "boolean", default: false })
  isFiltered: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  filterReason: string | null;

  @Column({ type: "timestamp with time zone" })
  recordedAt: Date;
}
