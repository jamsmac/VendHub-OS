import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Route, RouteStatus, RouteStop } from "../entities/route.entity";
import { RouteAnomaly } from "../entities/route-anomaly.entity";

@Injectable()
export class RouteAnalyticsService {
  private readonly logger = new Logger(RouteAnalyticsService.name);

  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,

    @InjectRepository(RouteStop)
    private readonly stopRepository: Repository<RouteStop>,

    @InjectRepository(RouteAnomaly)
    private readonly anomalyRepository: Repository<RouteAnomaly>,
  ) {}

  // ============================================================================
  // SIMPLE ANALYTICS (from trips/services/trip-analytics.service.ts)
  // ============================================================================

  async getEmployeeStats(input: {
    organizationId: string;
    employeeId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const result = await this.routeRepository
      .createQueryBuilder("route")
      .select("COUNT(*)", "totalRoutes")
      .addSelect(
        'SUM("route"."calculated_distance_meters")',
        "totalDistanceMeters",
      )
      .addSelect(
        'SUM("route"."visited_machines_count")',
        "totalMachinesVisited",
      )
      .addSelect('SUM("route"."total_stops_visited")', "totalStops")
      .addSelect('SUM("route"."total_anomalies")', "totalAnomalies")
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM ("route"."completed_at" - "route"."started_at")))',
        "avgDurationSeconds",
      )
      .where("route.organizationId = :organizationId", {
        organizationId: input.organizationId,
      })
      .andWhere("route.operatorId = :operatorId", {
        operatorId: input.employeeId,
      })
      .andWhere("route.startedAt >= :dateFrom", { dateFrom: input.dateFrom })
      .andWhere("route.startedAt <= :dateTo", { dateTo: input.dateTo })
      .andWhere("route.status IN (:...statuses)", {
        statuses: [RouteStatus.COMPLETED, RouteStatus.AUTO_CLOSED],
      })
      .getRawOne();

    return {
      totalRoutes: parseInt(result.totalRoutes) || 0,
      totalDistanceKm: Math.round(
        (Number(result.totalDistanceMeters) || 0) / 1000,
      ),
      totalMachinesVisited: parseInt(result.totalMachinesVisited) || 0,
      totalStops: parseInt(result.totalStops) || 0,
      totalAnomalies: parseInt(result.totalAnomalies) || 0,
      avgDurationMinutes: Math.round(
        (Number(result.avgDurationSeconds) || 0) / 60,
      ),
    };
  }

  async getMachineVisitStats(input: {
    organizationId: string;
    machineId?: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const query = this.stopRepository
      .createQueryBuilder("stop")
      .leftJoin("stop.route", "route")
      .select("stop.machineId", "machineId")
      .addSelect("stop.machineName", "machineName")
      .addSelect("COUNT(*)", "visitCount")
      .addSelect(
        'SUM("stop"."actual_duration_seconds")',
        "totalDurationSeconds",
      )
      .where("route.organizationId = :organizationId", {
        organizationId: input.organizationId,
      })
      .andWhere("stop.machineId IS NOT NULL")
      .andWhere("stop.actualArrival >= :dateFrom", {
        dateFrom: input.dateFrom,
      })
      .andWhere("stop.actualArrival <= :dateTo", { dateTo: input.dateTo })
      .groupBy("stop.machineId")
      .addGroupBy("stop.machineName")
      .orderBy("COUNT(*)", "DESC");

    if (input.machineId) {
      query.andWhere("stop.machineId = :machineId", {
        machineId: input.machineId,
      });
    }

    return query.getRawMany();
  }

  async getRoutesSummary(input: {
    organizationId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const result = await this.routeRepository
      .createQueryBuilder("route")
      .select("COUNT(*)", "totalRoutes")
      .addSelect(
        `COUNT(*) FILTER (WHERE route.status = 'completed')`,
        "completedRoutes",
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE route.status = 'auto_closed')`,
        "autoClosedRoutes",
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE route.status = 'cancelled')`,
        "cancelledRoutes",
      )
      .addSelect(
        'SUM("route"."calculated_distance_meters")',
        "totalDistanceMeters",
      )
      .addSelect(
        'SUM("route"."visited_machines_count")',
        "totalMachinesVisited",
      )
      .addSelect('SUM("route"."total_anomalies")', "totalAnomalies")
      .addSelect('COUNT(DISTINCT "route"."operator_id")', "uniqueOperators")
      .addSelect('COUNT(DISTINCT "route"."vehicle_id")', "uniqueVehicles")
      .where("route.organizationId = :organizationId", {
        organizationId: input.organizationId,
      })
      .andWhere("route.startedAt >= :dateFrom", { dateFrom: input.dateFrom })
      .andWhere("route.startedAt <= :dateTo", { dateTo: input.dateTo })
      .getRawOne();

    return {
      totalRoutes: parseInt(result.totalRoutes) || 0,
      completedRoutes: parseInt(result.completedRoutes) || 0,
      autoClosedRoutes: parseInt(result.autoClosedRoutes) || 0,
      cancelledRoutes: parseInt(result.cancelledRoutes) || 0,
      totalDistanceKm: Math.round(
        (Number(result.totalDistanceMeters) || 0) / 1000,
      ),
      totalMachinesVisited: parseInt(result.totalMachinesVisited) || 0,
      totalAnomalies: parseInt(result.totalAnomalies) || 0,
      uniqueOperators: parseInt(result.uniqueOperators) || 0,
      uniqueVehicles: parseInt(result.uniqueVehicles) || 0,
    };
  }

  // ============================================================================
  // DASHBOARD ANALYTICS (from trip-analytics module)
  // ============================================================================

  async getMainDashboard(organizationId: string, from: Date, to: Date) {
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
      avgRouteDistance:
        current.totalRoutes > 0
          ? Math.round(current.totalDistance / current.totalRoutes)
          : 0,
      previousPeriod: previous,
      changePercent: {
        routes: calcChange(current.totalRoutes, previous.totalRoutes),
        distance: calcChange(current.totalDistance, previous.totalDistance),
        anomalies: calcChange(current.totalAnomalies, previous.totalAnomalies),
      },
    };
  }

  async getActivityDashboard(organizationId: string, from: Date, to: Date) {
    const distanceByDay = await this.routeRepository
      .createQueryBuilder("r")
      .select("DATE(r.startedAt)", "date")
      .addSelect("SUM(r.calculatedDistanceMeters)", "distance")
      .addSelect("COUNT(*)", "routes")
      .where("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.startedAt BETWEEN :from AND :to", { from, to })
      .andWhere("r.status = :status", { status: RouteStatus.COMPLETED })
      .groupBy("DATE(r.startedAt)")
      .orderBy("date", "ASC")
      .getRawMany();

    const routesByHour = await this.routeRepository
      .createQueryBuilder("r")
      .select("EXTRACT(HOUR FROM r.startedAt)", "hour")
      .addSelect("COUNT(*)", "count")
      .where("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.startedAt BETWEEN :from AND :to", { from, to })
      .groupBy("EXTRACT(HOUR FROM r.startedAt)")
      .orderBy("hour", "ASC")
      .getRawMany();

    return {
      distanceByDay: distanceByDay.map((d) => ({
        date: d.date,
        distance: parseInt(d.distance ?? "0", 10),
        routes: parseInt(d.routes ?? "0", 10),
      })),
      routesByHour: routesByHour.map((h) => ({
        hour: parseInt(h.hour, 10),
        count: parseInt(h.count, 10),
      })),
    };
  }

  async getEmployeeDashboard(organizationId: string, from: Date, to: Date) {
    const results = await this.routeRepository
      .createQueryBuilder("r")
      .select("r.operatorId", "operatorId")
      .addSelect("COUNT(*)", "routeCount")
      .addSelect(
        "COALESCE(SUM(r.calculatedDistanceMeters), 0)",
        "totalDistance",
      )
      .addSelect("COALESCE(SUM(r.totalAnomalies), 0)", "totalAnomalies")
      .where("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.startedAt BETWEEN :from AND :to", { from, to })
      .andWhere("r.status = :status", { status: RouteStatus.COMPLETED })
      .groupBy("r.operatorId")
      .orderBy('"totalDistance"', "DESC")
      .getRawMany();

    return results.map((r) => {
      const routeCount = parseInt(r.routeCount, 10);
      const totalDistance = parseInt(r.totalDistance, 10);
      return {
        operatorId: r.operatorId,
        routeCount,
        totalDistance,
        totalAnomalies: parseInt(r.totalAnomalies, 10),
        avgRouteDistance:
          routeCount > 0 ? Math.round(totalDistance / routeCount) : 0,
      };
    });
  }

  async getVehiclesDashboard(organizationId: string, from: Date, to: Date) {
    const results = await this.routeRepository
      .createQueryBuilder("r")
      .select("r.vehicleId", "vehicleId")
      .addSelect("COUNT(*)", "routeCount")
      .addSelect(
        "COALESCE(SUM(r.calculatedDistanceMeters), 0)",
        "totalDistance",
      )
      .addSelect("COALESCE(SUM(r.totalStopsVisited), 0)", "totalStops")
      .where("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.startedAt BETWEEN :from AND :to", { from, to })
      .andWhere("r.vehicleId IS NOT NULL")
      .groupBy("r.vehicleId")
      .orderBy('"totalDistance"', "DESC")
      .getRawMany();

    return results.map((r) => ({
      vehicleId: r.vehicleId,
      routeCount: parseInt(r.routeCount, 10),
      totalDistance: parseInt(r.totalDistance, 10),
      totalStops: parseInt(r.totalStops, 10),
    }));
  }

  async getAnomaliesDashboard(organizationId: string, from: Date, to: Date) {
    const anomalies = await this.anomalyRepository
      .createQueryBuilder("a")
      .innerJoin("a.route", "r")
      .where("r.organizationId = :organizationId", { organizationId })
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

  async getTaxiDashboard(organizationId: string, from: Date, to: Date) {
    const topUsers = await this.routeRepository
      .createQueryBuilder("r")
      .select("r.operatorId", "operatorId")
      .addSelect("COUNT(*)", "routeCount")
      .addSelect("COALESCE(SUM(r.taxiTotalAmount), 0)", "totalAmount")
      .where("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.taxiTotalAmount IS NOT NULL")
      .andWhere("r.taxiTotalAmount > 0")
      .andWhere("r.startedAt BETWEEN :from AND :to", { from, to })
      .groupBy("r.operatorId")
      .orderBy('"totalAmount"', "DESC")
      .limit(10)
      .getRawMany();

    const totalRoutes = topUsers.reduce(
      (sum, u) => sum + parseInt(u.routeCount, 10),
      0,
    );
    const totalAmount = topUsers.reduce(
      (sum, u) => sum + parseFloat(u.totalAmount),
      0,
    );

    return {
      totalRoutes,
      totalAmount,
      avgPerRoute: totalRoutes > 0 ? Math.round(totalAmount / totalRoutes) : 0,
      topUsers: topUsers.map((u) => ({
        operatorId: u.operatorId,
        routeCount: parseInt(u.routeCount, 10),
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
    totalRoutes: number;
    totalDistance: number;
    totalAnomalies: number;
  }> {
    const result = await this.routeRepository
      .createQueryBuilder("r")
      .select("COUNT(*)", "totalRoutes")
      .addSelect(
        "COALESCE(SUM(r.calculatedDistanceMeters), 0)",
        "totalDistance",
      )
      .addSelect("COALESCE(SUM(r.totalAnomalies), 0)", "totalAnomalies")
      .where("r.organizationId = :organizationId", { organizationId })
      .andWhere("r.startedAt BETWEEN :from AND :to", { from, to })
      .andWhere("r.status = :status", { status: RouteStatus.COMPLETED })
      .getRawOne();

    return {
      totalRoutes: parseInt(result?.totalRoutes ?? "0", 10),
      totalDistance: parseInt(result?.totalDistance ?? "0", 10),
      totalAnomalies: parseInt(result?.totalAnomalies ?? "0", 10),
    };
  }
}
