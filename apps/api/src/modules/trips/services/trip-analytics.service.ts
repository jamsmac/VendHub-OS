import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Trip, TripStatus } from "../entities/trip.entity";
import { TripStop } from "../entities/trip-stop.entity";

@Injectable()
export class TripAnalyticsService {
  private readonly logger = new Logger(TripAnalyticsService.name);

  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,

    @InjectRepository(TripStop)
    private readonly stopRepository: Repository<TripStop>,
  ) {}

  async getEmployeeStats(input: {
    organizationId: string;
    employeeId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const result = await this.tripRepository
      .createQueryBuilder("trip")
      .select("COUNT(*)", "totalTrips")
      .addSelect(
        'SUM("trip"."calculated_distance_meters")',
        "totalDistanceMeters",
      )
      .addSelect('SUM("trip"."visited_machines_count")', "totalMachinesVisited")
      .addSelect('SUM("trip"."total_stops")', "totalStops")
      .addSelect('SUM("trip"."total_anomalies")', "totalAnomalies")
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM ("trip"."ended_at" - "trip"."started_at")))',
        "avgDurationSeconds",
      )
      .where("trip.organizationId = :organizationId", {
        organizationId: input.organizationId,
      })
      .andWhere("trip.employeeId = :employeeId", {
        employeeId: input.employeeId,
      })
      .andWhere("trip.startedAt >= :dateFrom", { dateFrom: input.dateFrom })
      .andWhere("trip.startedAt <= :dateTo", { dateTo: input.dateTo })
      .andWhere("trip.status IN (:...statuses)", {
        statuses: [TripStatus.COMPLETED, TripStatus.AUTO_CLOSED],
      })
      .getRawOne();

    return {
      totalTrips: parseInt(result.totalTrips) || 0,
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
      .leftJoin("stop.trip", "trip")
      .select("stop.machineId", "machineId")
      .addSelect("stop.machineName", "machineName")
      .addSelect("COUNT(*)", "visitCount")
      .addSelect('SUM("stop"."duration_seconds")', "totalDurationSeconds")
      .where("trip.organizationId = :organizationId", {
        organizationId: input.organizationId,
      })
      .andWhere("stop.machineId IS NOT NULL")
      .andWhere("stop.startedAt >= :dateFrom", { dateFrom: input.dateFrom })
      .andWhere("stop.startedAt <= :dateTo", { dateTo: input.dateTo })
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

  async getTripsSummary(input: {
    organizationId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const result = await this.tripRepository
      .createQueryBuilder("trip")
      .select("COUNT(*)", "totalTrips")
      .addSelect(
        `COUNT(*) FILTER (WHERE trip.status = 'completed')`,
        "completedTrips",
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE trip.status = 'auto_closed')`,
        "autoClosedTrips",
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE trip.status = 'cancelled')`,
        "cancelledTrips",
      )
      .addSelect(
        'SUM("trip"."calculated_distance_meters")',
        "totalDistanceMeters",
      )
      .addSelect('SUM("trip"."visited_machines_count")', "totalMachinesVisited")
      .addSelect('SUM("trip"."total_anomalies")', "totalAnomalies")
      .addSelect('COUNT(DISTINCT "trip"."employee_id")', "uniqueEmployees")
      .addSelect('COUNT(DISTINCT "trip"."vehicle_id")', "uniqueVehicles")
      .where("trip.organizationId = :organizationId", {
        organizationId: input.organizationId,
      })
      .andWhere("trip.startedAt >= :dateFrom", { dateFrom: input.dateFrom })
      .andWhere("trip.startedAt <= :dateTo", { dateTo: input.dateTo })
      .getRawOne();

    return {
      totalTrips: parseInt(result.totalTrips) || 0,
      completedTrips: parseInt(result.completedTrips) || 0,
      autoClosedTrips: parseInt(result.autoClosedTrips) || 0,
      cancelledTrips: parseInt(result.cancelledTrips) || 0,
      totalDistanceKm: Math.round(
        (Number(result.totalDistanceMeters) || 0) / 1000,
      ),
      totalMachinesVisited: parseInt(result.totalMachinesVisited) || 0,
      totalAnomalies: parseInt(result.totalAnomalies) || 0,
      uniqueEmployees: parseInt(result.uniqueEmployees) || 0,
      uniqueVehicles: parseInt(result.uniqueVehicles) || 0,
    };
  }
}
