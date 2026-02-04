import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route, RouteStop } from './entities/route.entity';

/**
 * Route Optimization Service
 *
 * Placeholder for future route optimization algorithms.
 * Will implement TSP (Travelling Salesman Problem) heuristics
 * to optimize the order of stops on a route for minimum
 * travel distance/time.
 *
 * Planned features:
 * - Nearest-neighbor heuristic for initial solution
 * - 2-opt improvement algorithm
 * - Time-window constraints (machine availability hours)
 * - Google Maps / OSRM distance matrix integration
 * - Priority-based ordering (low-stock machines first)
 * - Multi-route optimization across operators
 */
@Injectable()
export class RouteOptimizationService {
  private readonly logger = new Logger(RouteOptimizationService.name);

  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,

    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
  ) {}

  /**
   * Optimize the order of stops on a route using nearest-neighbor + 2-opt.
   *
   * @param routeId - The route to optimize
   * @returns The optimized route with reordered stops
   */
  async optimizeRoute(routeId: string): Promise<{
    route: Route;
    optimized: boolean;
    estimatedSavingsMinutes: number;
    estimatedSavingsKm: number;
  }> {
    this.logger.log(`Optimization requested for route ${routeId}`);

    const route = await this.routeRepository.findOne({
      where: { id: routeId },
      relations: ['stops'],
    });

    if (!route) {
      throw new Error(`Route with ID ${routeId} not found`);
    }

    const stops = route.stops || [];
    const validStops = stops.filter(
      (s) => s.latitude !== null && s.longitude !== null,
    );

    if (validStops.length < 3) {
      return { route, optimized: false, estimatedSavingsMinutes: 0, estimatedSavingsKm: 0 };
    }

    // Calculate original distance
    const originalDistance = await this.estimateRouteDistance(validStops);

    // Build distance matrix
    const n = validStops.length;
    const distMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = this.haversineDistance(
          validStops[i].latitude!, validStops[i].longitude!,
          validStops[j].latitude!, validStops[j].longitude!,
        );
        distMatrix[i][j] = d;
        distMatrix[j][i] = d;
      }
    }

    // Nearest-neighbor heuristic starting from first stop
    let order = this.nearestNeighbor(distMatrix, n);

    // 2-opt improvement
    order = this.twoOpt(order, distMatrix);

    // Reorder stops and update sequence numbers
    const reorderedStops = order.map((idx, seq) => {
      const stop = validStops[idx];
      stop.sequence = seq + 1;
      return stop;
    });

    // Save reordered stops
    await this.routeStopRepository.save(reorderedStops);

    // Recalculate optimized distance
    const optimizedDistance = await this.estimateRouteDistance(reorderedStops);
    const savedKm = Math.max(0, originalDistance - optimizedDistance);
    // Estimate ~40 km/h average speed in urban Uzbekistan
    const savedMinutes = (savedKm / 40) * 60;

    // Reload route with updated stops
    const updatedRoute = await this.routeRepository.findOne({
      where: { id: routeId },
      relations: ['stops'],
    });

    this.logger.log(
      `Route ${routeId} optimized: saved ${savedKm.toFixed(1)} km, ~${savedMinutes.toFixed(0)} min`,
    );

    return {
      route: updatedRoute || route,
      optimized: savedKm > 0.1,
      estimatedSavingsMinutes: Math.round(savedMinutes * 10) / 10,
      estimatedSavingsKm: Math.round(savedKm * 100) / 100,
    };
  }

  /**
   * Nearest-neighbor heuristic for TSP.
   * Starts from index 0, always picks the closest unvisited stop.
   */
  private nearestNeighbor(distMatrix: number[][], n: number): number[] {
    const visited = new Set<number>();
    const order: number[] = [0];
    visited.add(0);

    for (let step = 1; step < n; step++) {
      const current = order[order.length - 1];
      let nearest = -1;
      let nearestDist = Infinity;

      for (let j = 0; j < n; j++) {
        if (!visited.has(j) && distMatrix[current][j] < nearestDist) {
          nearest = j;
          nearestDist = distMatrix[current][j];
        }
      }

      if (nearest !== -1) {
        order.push(nearest);
        visited.add(nearest);
      }
    }

    return order;
  }

  /**
   * 2-opt improvement: repeatedly reverse segments to reduce total distance.
   */
  private twoOpt(order: number[], distMatrix: number[][]): number[] {
    const n = order.length;
    let improved = true;

    while (improved) {
      improved = false;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 2; j < n; j++) {
          const a = order[i], b = order[i + 1];
          const c = order[j], d = order[(j + 1) % n];

          const currentDist = distMatrix[a][b] + distMatrix[c][d];
          const newDist = distMatrix[a][c] + distMatrix[b][d];

          if (newDist < currentDist - 0.001) {
            // Reverse the segment between i+1 and j
            const segment = order.slice(i + 1, j + 1);
            segment.reverse();
            order.splice(i + 1, segment.length, ...segment);
            improved = true;
          }
        }
      }
    }

    return order;
  }

  /**
   * Calculate the estimated total distance for a route's stops.
   * Stub: will integrate with Google Maps Distance Matrix API or OSRM.
   *
   * @param stops - Array of route stops with lat/lng
   * @returns Estimated total distance in kilometers
   */
  async estimateRouteDistance(
    stops: Array<{ latitude: number | null; longitude: number | null }>,
  ): Promise<number> {
    // Filter stops with valid coordinates
    const validStops = stops.filter(
      (s) => s.latitude !== null && s.longitude !== null,
    );

    if (validStops.length < 2) {
      return 0;
    }

    // Simple haversine approximation for now
    let totalDistance = 0;
    for (let i = 1; i < validStops.length; i++) {
      totalDistance += this.haversineDistance(
        validStops[i - 1].latitude!,
        validStops[i - 1].longitude!,
        validStops[i].latitude!,
        validStops[i].longitude!,
      );
    }

    return Math.round(totalDistance * 100) / 100;
  }

  /**
   * Calculate the Haversine distance between two points in kilometers.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
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

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
