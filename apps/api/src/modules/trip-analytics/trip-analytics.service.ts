/**
 * Trip Analytics Service
 * 7 dashboards for trip/logistics data analysis.
 *
 * Dashboards: main, activity, employees, vehicles, locations, anomalies, taxi
 * All support period filtering and comparison with previous period.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Trip, TripStatus } from "../trips/entities/trip.entity";
import { TripAnomaly } from "../trips/entities/trip-anomaly.entity";
import { TripStop } from "../trips/entities/trip-stop.entity";

@Injectable()
export class TripAnalyticsService {
  private readonly logger = new Logger(TripAnalyticsService.name);

  constructor(
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(TripAnomaly)
    private readonly anomalyRepo: Repository<TripAnomaly>,
    @InjectRepository(TripStop)
    private readonly stopRepo: Repository<TripStop>,
  ) {}

  /**
   * Main dashboard: KPI cards with period comparison
   */
  async getMainDashboard(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{
    totalTrips: number;
    totalDistance: number;
    totalAnomalies: number;
    avgTripDistance: number;
    previousPeriod: {
      totalTrips: number;
      totalDistance: number;
      totalAnomalies: number;
    };
    changePercent: {
      trips: number;
      distance: number;
      anomalies: number;
    };
  }> {
    const periodMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodMs);
    const prevTo = from;

    const [current, previous] = await Promise.all([
      this.getPeriodStats(organizationId, from, to),
      this.getPeriodStats(organizationId, prevFrom, prevTo),
    ]);

    const calcChange = (cur: number, prev: number) =>
      prev === 0
        ? cur > 0
          ? 100
          : 0
        : Math.round(((cur - prev) / prev) * 100);

    return {
      ...current,
      avgTripDistance:
        current.totalTrips > 0
          ? Math.round(current.totalDistance / current.totalTrips)
          : 0,
      previousPeriod: previous,
      changePercent: {
        trips: calcChange(current.totalTrips, previous.totalTrips),
        distance: calcChange(current.totalDistance, previous.totalDistance),
        anomalies: calcChange(current.totalAnomalies, previous.totalAnomalies),
      },
    };
  }

  /**
   * Activity dashboard: distance by day/week, trips by hour
   */
  async getActivityDashboard(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{
    distanceByDay: Array<{ date: string; distance: number; trips: number }>;
    tripsByHour: Array<{ hour: number; count: number }>;
  }> {
    const distanceByDay = await this.tripRepo
      .createQueryBuilder("t")
      .select("DATE(t.startedAt)", "date")
      .addSelect("SUM(t.calculatedDistanceMeters)", "distance")
      .addSelect("COUNT(*)", "trips")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("t.startedAt BETWEEN :from AND :to", { from, to })
      .andWhere("t.status = :status", { status: TripStatus.COMPLETED })
      .groupBy("DATE(t.startedAt)")
      .orderBy("date", "ASC")
      .getRawMany();

    const tripsByHour = await this.tripRepo
      .createQueryBuilder("t")
      .select("EXTRACT(HOUR FROM t.startedAt)", "hour")
      .addSelect("COUNT(*)", "count")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("t.startedAt BETWEEN :from AND :to", { from, to })
      .groupBy("EXTRACT(HOUR FROM t.startedAt)")
      .orderBy("hour", "ASC")
      .getRawMany();

    return {
      distanceByDay: distanceByDay.map((d) => ({
        date: d.date,
        distance: parseInt(d.distance ?? "0", 10),
        trips: parseInt(d.trips ?? "0", 10),
      })),
      tripsByHour: tripsByHour.map((h) => ({
        hour: parseInt(h.hour, 10),
        count: parseInt(h.count, 10),
      })),
    };
  }

  /**
   * Employee dashboard: ranking by distance, time, anomalies
   */
  async getEmployeeDashboard(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<
    Array<{
      employeeId: string;
      tripCount: number;
      totalDistance: number;
      totalAnomalies: number;
      avgTripDistance: number;
    }>
  > {
    const results = await this.tripRepo
      .createQueryBuilder("t")
      .select("t.employeeId", "employeeId")
      .addSelect("COUNT(*)", "tripCount")
      .addSelect(
        "COALESCE(SUM(t.calculatedDistanceMeters), 0)",
        "totalDistance",
      )
      .addSelect("COALESCE(SUM(t.totalAnomalies), 0)", "totalAnomalies")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("t.startedAt BETWEEN :from AND :to", { from, to })
      .andWhere("t.status = :status", { status: TripStatus.COMPLETED })
      .groupBy("t.employeeId")
      .orderBy('"totalDistance"', "DESC")
      .getRawMany();

    return results.map((r) => {
      const tripCount = parseInt(r.tripCount, 10);
      const totalDistance = parseInt(r.totalDistance, 10);
      return {
        employeeId: r.employeeId,
        tripCount,
        totalDistance,
        totalAnomalies: parseInt(r.totalAnomalies, 10),
        avgTripDistance:
          tripCount > 0 ? Math.round(totalDistance / tripCount) : 0,
      };
    });
  }

  /**
   * Vehicles dashboard: stats per vehicle
   */
  async getVehiclesDashboard(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<
    Array<{
      vehicleId: string;
      tripCount: number;
      totalDistance: number;
      totalStops: number;
    }>
  > {
    const results = await this.tripRepo
      .createQueryBuilder("t")
      .select("t.vehicleId", "vehicleId")
      .addSelect("COUNT(*)", "tripCount")
      .addSelect(
        "COALESCE(SUM(t.calculatedDistanceMeters), 0)",
        "totalDistance",
      )
      .addSelect("COALESCE(SUM(t.totalStops), 0)", "totalStops")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("t.startedAt BETWEEN :from AND :to", { from, to })
      .andWhere("t.vehicleId IS NOT NULL")
      .groupBy("t.vehicleId")
      .orderBy('"totalDistance"', "DESC")
      .getRawMany();

    return results.map((r) => ({
      vehicleId: r.vehicleId,
      tripCount: parseInt(r.tripCount, 10),
      totalDistance: parseInt(r.totalDistance, 10),
      totalStops: parseInt(r.totalStops, 10),
    }));
  }

  /**
   * Anomalies dashboard: breakdown by type, severity, recent
   */
  async getAnomaliesDashboard(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: TripAnomaly[];
  }> {
    const anomalies = await this.anomalyRepo
      .createQueryBuilder("a")
      .innerJoin("a.trip", "t")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("a.createdAt BETWEEN :from AND :to", { from, to })
      .orderBy("a.createdAt", "DESC")
      .getMany();

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const a of anomalies) {
      byType[a.type] = (byType[a.type] ?? 0) + 1;
      bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
    }

    return {
      byType,
      bySeverity,
      recent: anomalies.slice(0, 50),
    };
  }

  /**
   * Taxi dashboard: expense tracking and top users
   */
  async getTaxiDashboard(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{
    totalTrips: number;
    totalAmount: number;
    avgPerTrip: number;
    topUsers: Array<{
      employeeId: string;
      tripCount: number;
      totalAmount: number;
    }>;
  }> {
    const trips = await this.tripRepo
      .createQueryBuilder("t")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("t.isTaxi = true")
      .andWhere("t.startedAt BETWEEN :from AND :to", { from, to })
      .getMany();

    const totalTrips = trips.length;
    const totalAmount = trips.reduce(
      (sum, t) => sum + Number(t.taxiTotalAmount ?? 0),
      0,
    );

    const topUsers = await this.tripRepo
      .createQueryBuilder("t")
      .select("t.employeeId", "employeeId")
      .addSelect("COUNT(*)", "tripCount")
      .addSelect("COALESCE(SUM(t.taxiTotalAmount), 0)", "totalAmount")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("t.isTaxi = true")
      .andWhere("t.startedAt BETWEEN :from AND :to", { from, to })
      .groupBy("t.employeeId")
      .orderBy('"totalAmount"', "DESC")
      .limit(10)
      .getRawMany();

    return {
      totalTrips,
      totalAmount,
      avgPerTrip: totalTrips > 0 ? Math.round(totalAmount / totalTrips) : 0,
      topUsers: topUsers.map((u) => ({
        employeeId: u.employeeId,
        tripCount: parseInt(u.tripCount, 10),
        totalAmount: parseFloat(u.totalAmount),
      })),
    };
  }

  // ── Internal ─────────────────────────────────────────

  private async getPeriodStats(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{
    totalTrips: number;
    totalDistance: number;
    totalAnomalies: number;
  }> {
    const result = await this.tripRepo
      .createQueryBuilder("t")
      .select("COUNT(*)", "totalTrips")
      .addSelect(
        "COALESCE(SUM(t.calculatedDistanceMeters), 0)",
        "totalDistance",
      )
      .addSelect("COALESCE(SUM(t.totalAnomalies), 0)", "totalAnomalies")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("t.startedAt BETWEEN :from AND :to", { from, to })
      .andWhere("t.status = :status", { status: TripStatus.COMPLETED })
      .getRawOne();

    return {
      totalTrips: parseInt(result?.totalTrips ?? "0", 10),
      totalDistance: parseInt(result?.totalDistance ?? "0", 10),
      totalAnomalies: parseInt(result?.totalAnomalies ?? "0", 10),
    };
  }
}
