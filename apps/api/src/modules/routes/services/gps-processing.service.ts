import { Injectable } from "@nestjs/common";

@Injectable()
export class GpsProcessingService {
  /**
   * Calculate distance between two GPS points using the Haversine formula.
   * @returns distance in meters
   */
  haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6_371_000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Check if a point is within a radius of another point.
   */
  isWithinRadius(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusMeters: number,
  ): boolean {
    return this.haversineDistance(lat1, lon1, lat2, lon2) <= radiusMeters;
  }
}
