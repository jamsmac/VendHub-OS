import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Route, RouteStatus, RouteStop } from "../entities/route.entity";
import { RoutePoint } from "../entities/route-point.entity";
import { AnomalyType, AnomalySeverity } from "../entities/route-anomaly.entity";
import {
  RouteTaskLink,
  RouteTaskLinkStatus,
} from "../entities/route-task-link.entity";
import { ROUTE_SETTINGS } from "../constants/route-settings";
import { RoutesService } from "../routes.service";

@Injectable()
export class RouteTrackingService {
  private readonly logger = new Logger(RouteTrackingService.name);

  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,

    @InjectRepository(RoutePoint)
    private readonly pointRepository: Repository<RoutePoint>,

    @InjectRepository(RouteStop)
    private readonly stopRepository: Repository<RouteStop>,

    @InjectRepository(RouteTaskLink)
    private readonly taskLinkRepository: Repository<RouteTaskLink>,

    @Inject(forwardRef(() => RoutesService))
    private readonly routesService: RoutesService,
  ) {}

  // ============================================================================
  // GPS TRACKING
  // ============================================================================

  async addPoint(
    routeId: string,
    organizationId: string,
    input: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      altitude?: number;
      recordedAt?: string;
    },
  ): Promise<{ id: string; isFiltered: boolean; filterReason: string | null }> {
    const route = await this.routeRepository.findOne({
      where: { id: routeId, organizationId },
    });
    if (!route) throw new NotFoundException(`Route ${routeId} not found`);
    if (route.status !== RouteStatus.ACTIVE) {
      throw new BadRequestException("Cannot add points to a non-active route");
    }

    let isFiltered = false;
    let filterReason: string | null = null;

    // Check GPS accuracy
    if (
      input.accuracy &&
      input.accuracy > ROUTE_SETTINGS.MIN_GPS_ACCURACY_METERS
    ) {
      isFiltered = true;
      filterReason = "LOW_ACCURACY";
    }

    // Get previous valid point
    const prevPoint = await this.pointRepository.findOne({
      where: { routeId, isFiltered: false },
      order: { recordedAt: "DESC" },
    });

    let distanceFromPrev = 0;

    if (prevPoint && !isFiltered) {
      distanceFromPrev = this.calculateHaversineDistance(
        Number(prevPoint.latitude),
        Number(prevPoint.longitude),
        input.latitude,
        input.longitude,
      );

      // GPS jump detection
      if (distanceFromPrev > 1000) {
        const recordedAt = input.recordedAt
          ? new Date(input.recordedAt)
          : new Date();
        const timeDiff =
          (recordedAt.getTime() - new Date(prevPoint.recordedAt).getTime()) /
          1000;
        const speedKmh =
          timeDiff > 0 ? (distanceFromPrev / timeDiff) * 3.6 : 999;

        if (speedKmh > ROUTE_SETTINGS.MAX_SPEED_KMH * 1.5) {
          isFiltered = true;
          filterReason = "GPS_JUMP";

          await this.routesService.createAnomaly(
            routeId,
            route.organizationId,
            {
              type: AnomalyType.GPS_JUMP,
              severity: AnomalySeverity.INFO,
              latitude: input.latitude,
              longitude: input.longitude,
              details: {
                previousPoint: {
                  lat: Number(prevPoint.latitude),
                  lng: Number(prevPoint.longitude),
                },
                distanceMeters: distanceFromPrev,
                timeSeconds: timeDiff,
              },
            },
          );
        }
      }

      // Speed violation check
      if (!isFiltered && input.speed) {
        const speedKmh = input.speed * 3.6;
        if (speedKmh > ROUTE_SETTINGS.MAX_SPEED_KMH) {
          await this.routesService.createAnomaly(
            routeId,
            route.organizationId,
            {
              type: AnomalyType.SPEED_VIOLATION,
              severity: AnomalySeverity.WARNING,
              latitude: input.latitude,
              longitude: input.longitude,
              details: {
                speedKmh: Math.round(speedKmh),
                maxAllowedKmh: ROUTE_SETTINGS.MAX_SPEED_KMH,
              },
            },
          );
        }
      }
    }

    // Save point
    const point = this.pointRepository.create({
      routeId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracy ?? null,
      speedMps: input.speed ?? null,
      heading: input.heading ?? null,
      altitude: input.altitude ?? null,
      distanceFromPrevMeters: distanceFromPrev,
      isFiltered,
      filterReason,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
    });

    const savedPoint = await this.pointRepository.save(point);

    // Update route counters
    await this.routeRepository
      .createQueryBuilder()
      .update(Route)
      .set({
        totalPoints: () => '"total_points" + 1',
        lastLocationUpdate: new Date(),
      })
      .where("id = :routeId", { routeId })
      .execute();

    // If this is the first point, set start coordinates
    if (!prevPoint && !isFiltered) {
      await this.routeRepository.update(routeId, {
        startLatitude: input.latitude,
        startLongitude: input.longitude,
      });
    }

    // Check for stops
    if (!isFiltered) {
      await this.checkForStop(
        routeId,
        route.organizationId,
        input.latitude,
        input.longitude,
      );
    }

    return { id: savedPoint.id, isFiltered, filterReason };
  }

  async addPointsBatch(
    routeId: string,
    organizationId: string,
    points: Array<{
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      altitude?: number;
      recordedAt?: string;
    }>,
  ) {
    const results = [];
    for (const point of points) {
      const result = await this.addPoint(routeId, organizationId, point);
      results.push(result);
    }
    return results;
  }

  async updateLiveLocationStatus(
    routeId: string,
    isActive: boolean,
    telegramMessageId?: number,
  ): Promise<void> {
    await this.routeRepository.update(routeId, {
      liveLocationActive: isActive,
      ...(telegramMessageId !== undefined && { telegramMessageId }),
      lastLocationUpdate: new Date(),
    });
  }

  // ============================================================================
  // ROUTE & STOPS
  // ============================================================================

  async getRouteTrack(routeId: string): Promise<RoutePoint[]> {
    return this.pointRepository.find({
      where: { routeId, isFiltered: false },
      order: { recordedAt: "ASC" },
    });
  }

  // ============================================================================
  // STOP DETECTION
  // ============================================================================

  private async checkForStop(
    routeId: string,
    organizationId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    const thresholdTime = new Date(
      Date.now() - ROUTE_SETTINGS.STOP_MIN_DURATION_SECONDS * 1000,
    );

    const recentPoints = await this.pointRepository.find({
      where: {
        routeId,
        isFiltered: false,
      },
      order: { recordedAt: "DESC" },
      take: 50,
    });

    // Filter to points within the time window
    const pointsInWindow = recentPoints.filter(
      (p) => new Date(p.recordedAt) >= thresholdTime,
    );

    if (pointsInWindow.length < 2) return;

    // Check if all points are within stop detection radius
    const allInRadius = pointsInWindow.every((point) => {
      const dist = this.calculateHaversineDistance(
        Number(point.latitude),
        Number(point.longitude),
        lat,
        lng,
      );
      return dist <= ROUTE_SETTINGS.STOP_DETECTION_RADIUS_METERS;
    });

    if (!allInRadius) {
      // Close any open stop (operator started moving)
      await this.closeOpenStop(routeId);
      return;
    }

    // Check for existing open stop
    const existingStop = await this.stopRepository.findOne({
      where: { routeId, departedAt: IsNull(), status: "arrived" as never },
    });

    if (existingStop) return; // Stop already tracked

    // Find the nearest planned stop that hasn't been visited
    const nearestPlannedStop = await this.findNearestPlannedStop(
      routeId,
      lat,
      lng,
    );

    // Also find nearest machine for unplanned stops
    const nearestMachine = await this.findNearestMachine(
      lat,
      lng,
      organizationId,
    );

    if (
      nearestPlannedStop &&
      nearestPlannedStop.distance <= ROUTE_SETTINGS.GEOFENCE_RADIUS_METERS
    ) {
      // Mark planned stop as arrived
      nearestPlannedStop.stop.status = "arrived" as never;
      nearestPlannedStop.stop.actualArrival = new Date();
      nearestPlannedStop.stop.distanceToMachineMeters =
        nearestPlannedStop.distance;
      nearestPlannedStop.stop.isVerified = true;
      nearestPlannedStop.stop.machineName = nearestMachine?.machineName ?? null;
      nearestPlannedStop.stop.machineAddress =
        nearestMachine?.machineAddress ?? null;
      await this.stopRepository.save(nearestPlannedStop.stop);

      // Update route stats
      await this.routeRepository
        .createQueryBuilder()
        .update(Route)
        .set({ totalStopsVisited: () => '"total_stops_visited" + 1' })
        .where("id = :routeId", { routeId })
        .execute();

      // Verify tasks at this machine
      if (nearestPlannedStop.stop.machineId) {
        await this.verifyTaskAtMachine(
          routeId,
          nearestPlannedStop.stop.machineId,
        );
      }
    } else if (nearestMachine) {
      // Unplanned stop near a machine — update route stats
      await this.routeRepository
        .createQueryBuilder()
        .update(Route)
        .set({ totalStopsVisited: () => '"total_stops_visited" + 1' })
        .where("id = :routeId", { routeId })
        .execute();

      if (nearestMachine.isWithinRadius && nearestMachine.machineId) {
        await this.verifyTaskAtMachine(routeId, nearestMachine.machineId);
      }
    }
  }

  private async closeOpenStop(routeId: string): Promise<void> {
    // Close any planned stops that were arrived but not completed/departed
    const arrivedStops = await this.stopRepository.find({
      where: { routeId, departedAt: IsNull() },
    });

    for (const stop of arrivedStops) {
      if (
        stop.status === ("arrived" as never) ||
        stop.status === ("in_progress" as never)
      ) {
        stop.departedAt = new Date();
        stop.actualDurationSeconds = Math.round(
          (stop.departedAt.getTime() -
            new Date(stop.actualArrival ?? stop.createdAt).getTime()) /
            1000,
        );
        await this.stopRepository.save(stop);
      }
    }
  }

  // ============================================================================
  // PLANNED STOP MATCHING
  // ============================================================================

  private async findNearestPlannedStop(
    routeId: string,
    lat: number,
    lng: number,
  ): Promise<{ stop: RouteStop; distance: number } | null> {
    const pendingStops = await this.stopRepository.find({
      where: { routeId, status: "pending" as never },
      order: { sequence: "ASC" },
    });

    let nearest: { stop: RouteStop; distance: number } | null = null;

    for (const stop of pendingStops) {
      if (stop.latitude == null || stop.longitude == null) continue;

      const dist = this.calculateHaversineDistance(
        lat,
        lng,
        Number(stop.latitude),
        Number(stop.longitude),
      );

      if (!nearest || dist < nearest.distance) {
        nearest = { stop, distance: Math.round(dist) };
      }
    }

    return nearest;
  }

  // ============================================================================
  // MACHINE GEOFENCING
  // ============================================================================

  private async findNearestMachine(
    lat: number,
    lng: number,
    organizationId: string,
  ): Promise<{
    machineId: string;
    machineName: string;
    machineAddress: string;
    distance: number;
    isWithinRadius: boolean;
  } | null> {
    // Bounding box for performance (~2km search radius)
    const latDelta = 2 / 111.32;
    const lngDelta = 2 / (111.32 * Math.cos((lat * Math.PI) / 180));

    const machines = await this.routeRepository.manager
      .createQueryBuilder()
      .select([
        "id",
        "machine_number",
        "name",
        "address",
        "latitude",
        "longitude",
      ])
      .from("machines", "m")
      .where("m.organization_id = :organizationId", { organizationId })
      .andWhere("m.status = :status", { status: "active" })
      .andWhere("m.latitude IS NOT NULL")
      .andWhere("m.longitude IS NOT NULL")
      .andWhere("m.deleted_at IS NULL")
      .andWhere("m.latitude BETWEEN :latMin AND :latMax", {
        latMin: lat - latDelta,
        latMax: lat + latDelta,
      })
      .andWhere("m.longitude BETWEEN :lngMin AND :lngMax", {
        lngMin: lng - lngDelta,
        lngMax: lng + lngDelta,
      })
      .getRawMany();

    let nearest: {
      machineId: string;
      machineName: string;
      machineAddress: string;
      distance: number;
      isWithinRadius: boolean;
    } | null = null;

    for (const machine of machines) {
      const dist = this.calculateHaversineDistance(
        lat,
        lng,
        Number(machine.latitude),
        Number(machine.longitude),
      );

      if (!nearest || dist < nearest.distance) {
        nearest = {
          machineId: machine.id,
          machineName: machine.name || machine.machine_number || "",
          machineAddress: machine.address || "",
          distance: Math.round(dist),
          isWithinRadius: dist <= ROUTE_SETTINGS.GEOFENCE_RADIUS_METERS,
        };
      }
    }

    return nearest;
  }

  private async verifyTaskAtMachine(
    routeId: string,
    machineId: string,
  ): Promise<void> {
    const taskLinks = await this.taskLinkRepository.find({
      where: { routeId, status: RouteTaskLinkStatus.PENDING },
    });

    if (taskLinks.length === 0) return;

    const taskIds = taskLinks.map((link) => link.taskId);
    const matchingTasks = await this.routeRepository.manager
      .createQueryBuilder()
      .select(["id"])
      .from("tasks", "t")
      .where("t.id IN (:...taskIds)", { taskIds })
      .andWhere("t.machine_id = :machineId", { machineId })
      .andWhere("t.deleted_at IS NULL")
      .getRawMany();

    const matchingTaskIds = new Set(matchingTasks.map((t) => t.id));
    const linksToUpdate = taskLinks.filter((link) =>
      matchingTaskIds.has(link.taskId),
    );

    if (linksToUpdate.length === 0) return;

    const now = new Date();
    for (const link of linksToUpdate) {
      link.status = RouteTaskLinkStatus.IN_PROGRESS;
      link.verifiedByGps = true;
      link.verifiedAt = now;
      link.startedAt = now;
    }

    await this.taskLinkRepository.save(linksToUpdate);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
