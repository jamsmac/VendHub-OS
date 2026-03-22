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
import { Trip, TripStatus } from "../entities/trip.entity";
import { TripPoint } from "../entities/trip-point.entity";
import { TripStop } from "../entities/trip-stop.entity";
import { AnomalyType, AnomalySeverity } from "../entities/trip-anomaly.entity";
import {
  TripTaskLink,
  TripTaskLinkStatus,
} from "../entities/trip-task-link.entity";
import { TRIP_SETTINGS } from "../constants/trip-settings";
import { TripsService } from "../trips.service";

@Injectable()
export class TripRouteService {
  private readonly logger = new Logger(TripRouteService.name);

  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,

    @InjectRepository(TripPoint)
    private readonly pointRepository: Repository<TripPoint>,

    @InjectRepository(TripStop)
    private readonly stopRepository: Repository<TripStop>,

    @InjectRepository(TripTaskLink)
    private readonly taskLinkRepository: Repository<TripTaskLink>,

    @Inject(forwardRef(() => TripsService))
    private readonly tripsService: TripsService,
  ) {}

  // ============================================================================
  // GPS TRACKING
  // ============================================================================

  async addPoint(
    tripId: string,
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
    // Fetch and validate trip once at the start
    const trip = await this.tripRepository.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException(`Trip ${tripId} not found`);
    if (trip.status !== TripStatus.ACTIVE) {
      throw new BadRequestException("Cannot add points to a non-active trip");
    }

    let isFiltered = false;
    let filterReason: string | null = null;

    // Check GPS accuracy
    if (
      input.accuracy &&
      input.accuracy > TRIP_SETTINGS.MIN_GPS_ACCURACY_METERS
    ) {
      isFiltered = true;
      filterReason = "LOW_ACCURACY";
    }

    // Get previous valid point
    const prevPoint = await this.pointRepository.findOne({
      where: { tripId, isFiltered: false },
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

        if (speedKmh > TRIP_SETTINGS.MAX_SPEED_KMH * 1.5) {
          isFiltered = true;
          filterReason = "GPS_JUMP";

          await this.tripsService.createAnomaly(tripId, trip.organizationId, {
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
          });
        }
      }

      // Speed violation check (non-jump, valid movement)
      if (!isFiltered && input.speed) {
        const speedKmh = input.speed * 3.6;
        if (speedKmh > TRIP_SETTINGS.MAX_SPEED_KMH) {
          await this.tripsService.createAnomaly(tripId, trip.organizationId, {
            type: AnomalyType.SPEED_VIOLATION,
            severity: AnomalySeverity.WARNING,
            latitude: input.latitude,
            longitude: input.longitude,
            details: {
              speedKmh: Math.round(speedKmh),
              maxAllowedKmh: TRIP_SETTINGS.MAX_SPEED_KMH,
            },
          });
        }
      }
    }

    // Save point
    const point = this.pointRepository.create({
      tripId,
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

    // Update trip counters
    await this.tripRepository
      .createQueryBuilder()
      .update(Trip)
      .set({
        totalPoints: () => '"total_points" + 1',
        lastLocationUpdate: new Date(),
      })
      .where("id = :tripId", { tripId })
      .execute();

    // If this is the first point, set start coordinates
    if (!prevPoint && !isFiltered) {
      await this.tripRepository.update(tripId, {
        startLatitude: input.latitude,
        startLongitude: input.longitude,
      });
    }

    // Check for stops
    if (!isFiltered) {
      await this.checkForStop(
        tripId,
        trip.organizationId,
        input.latitude,
        input.longitude,
      );
    }

    return { id: savedPoint.id, isFiltered, filterReason };
  }

  async addPointsBatch(
    tripId: string,
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
      const result = await this.addPoint(tripId, point);
      results.push(result);
    }
    return results;
  }

  async updateLiveLocationStatus(
    tripId: string,
    isActive: boolean,
    telegramMessageId?: number,
  ): Promise<void> {
    await this.tripRepository.update(tripId, {
      liveLocationActive: isActive,
      telegramMessageId: telegramMessageId ?? undefined,
      lastLocationUpdate: new Date(),
    });
  }

  // ============================================================================
  // ROUTE & STOPS
  // ============================================================================

  async getTripRoute(tripId: string): Promise<TripPoint[]> {
    return this.pointRepository.find({
      where: { tripId, isFiltered: false },
      order: { recordedAt: "ASC" },
    });
  }

  async getTripStops(tripId: string): Promise<TripStop[]> {
    return this.stopRepository.find({
      where: { tripId },
      order: { startedAt: "ASC" },
    });
  }

  // ============================================================================
  // STOP DETECTION
  // ============================================================================

  private async checkForStop(
    tripId: string,
    organizationId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    const thresholdTime = new Date(
      Date.now() - TRIP_SETTINGS.STOP_MIN_DURATION_SECONDS * 1000,
    );

    const recentPoints = await this.pointRepository.find({
      where: {
        tripId,
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
      return dist <= TRIP_SETTINGS.STOP_DETECTION_RADIUS_METERS;
    });

    if (!allInRadius) {
      // Close any open stop (employee started moving)
      await this.closeOpenStop(tripId);
      return;
    }

    // Check for existing open stop
    const existingStop = await this.stopRepository.findOne({
      where: { tripId, endedAt: IsNull() },
    });

    if (existingStop) return; // Stop already tracked

    // Create new stop
    const firstPoint = pointsInWindow[pointsInWindow.length - 1]!;
    const centerLat = Number(firstPoint.latitude);
    const centerLng = Number(firstPoint.longitude);

    // Find nearest machine within this organization
    const nearestMachine = await this.findNearestMachine(
      centerLat,
      centerLng,
      organizationId,
    );

    const stop = this.stopRepository.create({
      tripId,
      latitude: centerLat,
      longitude: centerLng,
      machineId: nearestMachine?.machineId ?? null,
      machineName: nearestMachine?.machineName ?? null,
      machineAddress: nearestMachine?.machineAddress ?? null,
      distanceToMachineMeters: nearestMachine?.distance ?? null,
      startedAt: new Date(firstPoint.recordedAt),
      isVerified: nearestMachine?.isWithinRadius ?? false,
    });

    await this.stopRepository.save(stop);

    // Update trip stop counter
    await this.tripRepository
      .createQueryBuilder()
      .update(Trip)
      .set({ totalStops: () => '"total_stops" + 1' })
      .where("id = :tripId", { tripId })
      .execute();

    // Verify tasks at this machine
    if (nearestMachine?.isWithinRadius && nearestMachine.machineId) {
      await this.verifyTaskAtMachine(tripId, nearestMachine.machineId);
    }
  }

  private async closeOpenStop(tripId: string): Promise<void> {
    const openStop = await this.stopRepository.findOne({
      where: { tripId, endedAt: IsNull() },
    });

    if (openStop) {
      openStop.endedAt = new Date();
      openStop.durationSeconds = Math.round(
        (openStop.endedAt.getTime() - new Date(openStop.startedAt).getTime()) /
          1000,
      );
      await this.stopRepository.save(openStop);
    }
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

    // Query machines within bounding box, filtered by organization
    const machines = await this.tripRepository.manager
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
      .andWhere("m.deletedAt IS NULL")
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
          isWithinRadius: dist <= TRIP_SETTINGS.GEOFENCE_RADIUS_METERS,
        };
      }
    }

    return nearest;
  }

  private async verifyTaskAtMachine(
    tripId: string,
    machineId: string,
  ): Promise<void> {
    // Find tasks linked to this trip that are for this machine
    const taskLinks = await this.taskLinkRepository.find({
      where: { tripId, status: TripTaskLinkStatus.PENDING },
    });

    if (taskLinks.length === 0) return;

    // Batch query: find which of these tasks belong to this machine
    const taskIds = taskLinks.map((link) => link.taskId);
    const matchingTasks = await this.tripRepository.manager
      .createQueryBuilder()
      .select(["id"])
      .from("tasks", "t")
      .where("t.id IN (:...taskIds)", { taskIds })
      .andWhere("t.machine_id = :machineId", { machineId })
      .andWhere("t.deletedAt IS NULL")
      .getRawMany();

    const matchingTaskIds = new Set(matchingTasks.map((t) => t.id));

    // Update matching links in batch
    const linksToUpdate = taskLinks.filter((link) =>
      matchingTaskIds.has(link.taskId),
    );

    if (linksToUpdate.length === 0) return;

    const now = new Date();
    for (const link of linksToUpdate) {
      link.status = TripTaskLinkStatus.IN_PROGRESS;
      link.verifiedByGps = true;
      link.verifiedAt = now;
      link.startedAt = now;
    }

    await this.taskLinkRepository.save(linksToUpdate);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * @returns Distance in meters
   */
  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
