import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import {
  Route,
  RouteType,
  RouteStatus,
  RouteStop,
  RouteStopStatus,
} from "../entities/route.entity";
import {
  RefillRecommendation,
  RefillAction,
} from "../../predictive-refill/entities/refill-recommendation.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { GpsProcessingService } from "./gps-processing.service";

interface MachineStop {
  machineId: string;
  machineName: string;
  machineAddress: string | null;
  latitude: number;
  longitude: number;
  priorityScore: number;
}

@Injectable()
export class RouteOptimizerService {
  private readonly logger = new Logger(RouteOptimizerService.name);

  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,

    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,

    @InjectRepository(RefillRecommendation)
    private readonly recommendationRepository: Repository<RefillRecommendation>,

    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,

    private readonly gpsProcessingService: GpsProcessingService,
  ) {}

  /**
   * Generate an optimal refill route from active recommendations.
   *
   * 1. Fetch REFILL_NOW (optionally + REFILL_SOON) recommendations
   * 2. Join with Machine for coordinates
   * 3. Filter machines without GPS
   * 4. Start from highest priorityScore machine
   * 5. Greedy nearest-neighbor to order remaining stops
   * 6. Create a DRAFT Route with ordered stops
   */
  async generateOptimalRoute(
    organizationId: string,
    operatorId: string,
    includeRefillSoon: boolean,
  ): Promise<Route> {
    // 1. Fetch recommendations
    const actions: RefillAction[] = [RefillAction.REFILL_NOW];
    if (includeRefillSoon) {
      actions.push(RefillAction.REFILL_SOON);
    }

    const recommendations = await this.recommendationRepository.find({
      where: {
        organizationId,
        recommendedAction: In(actions),
      },
      order: { priorityScore: "DESC" },
    });

    if (recommendations.length === 0) {
      throw new BadRequestException(
        "No active refill recommendations found for this organization",
      );
    }

    // 2. Deduplicate by machineId — keep highest priorityScore per machine
    const machineMap = new Map<string, RefillRecommendation>();
    for (const rec of recommendations) {
      const existing = machineMap.get(rec.machineId);
      if (
        !existing ||
        Number(rec.priorityScore) > Number(existing.priorityScore)
      ) {
        machineMap.set(rec.machineId, rec);
      }
    }

    const uniqueMachineIds = Array.from(machineMap.keys());

    // 3. Load machines with coordinates
    const machines = await this.machineRepository.find({
      where: { id: In(uniqueMachineIds) },
    });

    const machineById = new Map(machines.map((m) => [m.id, m]));

    // 4. Build stop list — filter out machines without coordinates
    const stops: MachineStop[] = [];
    for (const [machineId, rec] of machineMap) {
      const machine = machineById.get(machineId);
      if (!machine) continue;

      const lat = Number(machine.latitude);
      const lng = Number(machine.longitude);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

      stops.push({
        machineId: machine.id,
        machineName: machine.name,
        machineAddress: machine.address ?? null,
        latitude: lat,
        longitude: lng,
        priorityScore: Number(rec.priorityScore),
      });
    }

    if (stops.length === 0) {
      throw new BadRequestException(
        "No machines with GPS coordinates found among recommendations",
      );
    }

    this.logger.log(
      `Generating route for org ${organizationId}: ${stops.length} machines with coordinates`,
    );

    // 5. Nearest-neighbor ordering starting from highest priority
    const ordered = this.nearestNeighborOrder(stops);

    // 6. Calculate total estimated distance
    let totalDistanceKm = 0;
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1]!;
      const curr = ordered[i]!;
      const distMeters = this.gpsProcessingService.haversineDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude,
      );
      totalDistanceKm += distMeters / 1000;
    }
    totalDistanceKm = Math.round(totalDistanceKm * 100) / 100;

    // Estimate ~40 km/h avg speed in urban Tashkent + 10 min per stop
    const travelMinutes = (totalDistanceKm / 40) * 60;
    const stopMinutes = ordered.length * 10;
    const estimatedDuration = Math.round(travelMinutes + stopMinutes);

    // 7. Create DRAFT route
    const today = new Date().toISOString().split("T")[0];
    const route = this.routeRepository.create({
      organizationId,
      operatorId,
      name: `Auto-refill ${today} (${ordered.length} stops)`,
      type: RouteType.REFILL,
      status: RouteStatus.DRAFT,
      plannedDate: new Date(),
      estimatedDistanceKm: totalDistanceKm,
      estimatedDurationMinutes: estimatedDuration,
      metadata: {
        autoGenerated: true,
        includeRefillSoon,
        generatedAt: new Date().toISOString(),
        totalRecommendations: recommendations.length,
        machinesWithCoordinates: ordered.length,
      },
    });

    const savedRoute = await this.routeRepository.save(route);

    // 8. Create ordered stops
    const routeStops = ordered.map((stop, index) =>
      this.routeStopRepository.create({
        routeId: savedRoute.id,
        machineId: stop.machineId,
        sequence: index + 1,
        status: RouteStopStatus.PENDING,
        latitude: stop.latitude,
        longitude: stop.longitude,
        machineName: stop.machineName,
        machineAddress: stop.machineAddress,
        isPriority: stop.priorityScore >= 80,
        metadata: { priorityScore: stop.priorityScore },
      }),
    );

    await this.routeStopRepository.save(routeStops);

    this.logger.log(
      `Route ${savedRoute.id} created: ${ordered.length} stops, ${totalDistanceKm} km, ~${estimatedDuration} min`,
    );

    // Return full route with stops
    return this.routeRepository.findOne({
      where: { id: savedRoute.id },
      relations: ["stops"],
      order: { stops: { sequence: "ASC" } },
    }) as Promise<Route>;
  }

  /**
   * Nearest-neighbor heuristic starting from highest-priority machine.
   * Stops are already sorted by priorityScore DESC, so index 0 is the start.
   */
  private nearestNeighborOrder(stops: MachineStop[]): MachineStop[] {
    if (stops.length <= 1) return [...stops];

    const remaining = [...stops];
    const ordered: MachineStop[] = [];

    // Start from highest priority (already first due to sort)
    ordered.push(remaining.shift()!);

    while (remaining.length > 0) {
      const current = ordered[ordered.length - 1]!;
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]!;
        const dist = this.gpsProcessingService.haversineDistance(
          current.latitude,
          current.longitude,
          candidate.latitude,
          candidate.longitude,
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      ordered.push(remaining.splice(nearestIdx, 1)[0]!);
    }

    return ordered;
  }
}
