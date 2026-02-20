/**
 * Distance and Geolocation Utilities for VendHub OS
 */

/**
 * Earth's radius in meters
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Coordinate point interface
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Bounding box interface
 */
export interface GeoBoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLng = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate distance in kilometers
 */
export function calculateDistanceKm(point1: GeoPoint, point2: GeoPoint): number {
  return calculateDistance(point1, point2) / 1000;
}

/**
 * Check if point is within radius of center
 */
export function isWithinRadius(
  point: GeoPoint,
  center: GeoPoint,
  radiusMeters: number
): boolean {
  return calculateDistance(point, center) <= radiusMeters;
}

/**
 * Calculate bounding box for a center point and radius
 * Useful for database queries to filter by approximate area first
 */
export function getBoundingBox(center: GeoPoint, radiusMeters: number): GeoBoundingBox {
  // Angular distance in radians
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;

  const lat = toRadians(center.latitude);
  const lng = toRadians(center.longitude);

  // Calculate min/max latitudes
  const minLat = lat - angularDistance;
  const maxLat = lat + angularDistance;

  // Calculate min/max longitudes
  const deltaLng = Math.asin(Math.sin(angularDistance) / Math.cos(lat));
  const minLng = lng - deltaLng;
  const maxLng = lng + deltaLng;

  return {
    south: toDegrees(minLat),
    north: toDegrees(maxLat),
    west: toDegrees(minLng),
    east: toDegrees(maxLng),
  };
}

/**
 * Check if point is within bounding box
 */
export function isWithinBoundingBox(point: GeoPoint, box: GeoBoundingBox): boolean {
  return (
    point.latitude >= box.south &&
    point.latitude <= box.north &&
    point.longitude >= box.west &&
    point.longitude <= box.east
  );
}

/**
 * Sort points by distance from center
 */
export function sortByDistance<T extends GeoPoint>(
  points: T[],
  center: GeoPoint
): Array<T & { distance: number }> {
  return points
    .map((point) => ({
      ...point,
      distance: calculateDistance(point, center),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Filter and sort points within radius
 */
export function filterWithinRadius<T extends GeoPoint>(
  points: T[],
  center: GeoPoint,
  radiusMeters: number
): Array<T & { distance: number }> {
  return sortByDistance(points, center).filter((p) => p.distance <= radiusMeters);
}

/**
 * Find nearest point to center
 */
export function findNearest<T extends GeoPoint>(
  points: T[],
  center: GeoPoint
): (T & { distance: number }) | null {
  if (points.length === 0) return null;

  const sorted = sortByDistance(points, center);
  return sorted[0] ?? null;
}

/**
 * Find K nearest points to center
 */
export function findKNearest<T extends GeoPoint>(
  points: T[],
  center: GeoPoint,
  k: number
): Array<T & { distance: number }> {
  return sortByDistance(points, center).slice(0, k);
}

/**
 * Calculate center point of multiple points (centroid)
 */
export function calculateCentroid(points: GeoPoint[]): GeoPoint | null {
  if (points.length === 0) return null;

  let x = 0;
  let y = 0;
  let z = 0;

  for (const point of points) {
    const lat = toRadians(point.latitude);
    const lng = toRadians(point.longitude);

    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }

  const total = points.length;
  x /= total;
  y /= total;
  z /= total;

  const lng = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);

  return {
    latitude: toDegrees(lat),
    longitude: toDegrees(lng),
  };
}

/**
 * Calculate bearing from point1 to point2
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);

  const x = Math.sin(deltaLng) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const bearing = toDegrees(Math.atan2(x, y));

  return (bearing + 360) % 360;
}

/**
 * Get compass direction from bearing
 */
export function bearingToDirection(bearing: number): string {
  const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index] || 'С';
}

/**
 * Calculate destination point given start, bearing and distance
 */
export function calculateDestination(
  start: GeoPoint,
  bearingDegrees: number,
  distanceMeters: number
): GeoPoint {
  const lat1 = toRadians(start.latitude);
  const lng1 = toRadians(start.longitude);
  const bearing = toRadians(bearingDegrees);
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: toDegrees(lat2),
    longitude: toDegrees(lng2),
  };
}

/**
 * Parse coordinates from string (various formats)
 */
export function parseCoordinates(input: string): GeoPoint | null {
  // Format: "41.2995, 69.2401" or "41.2995 69.2401"
  const match = input.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);

  if (!match) return null;

  const latitude = parseFloat(match[1] || '0');
  const longitude = parseFloat(match[2] || '0');

  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(point: GeoPoint, precision = 6): string {
  return `${point.latitude.toFixed(precision)}, ${point.longitude.toFixed(precision)}`;
}

/**
 * Generate Google Maps URL for a location
 */
export function getGoogleMapsUrl(point: GeoPoint, label?: string): string {
  const coords = `${point.latitude},${point.longitude}`;
  if (label) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}&query_place_id=${coords}`;
  }
  return `https://www.google.com/maps?q=${coords}`;
}

/**
 * Generate Google Maps directions URL
 */
export function getGoogleMapsDirectionsUrl(destination: GeoPoint, origin?: GeoPoint): string {
  const dest = `${destination.latitude},${destination.longitude}`;
  let url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;

  if (origin) {
    const orig = `${origin.latitude},${origin.longitude}`;
    url += `&origin=${orig}`;
  }

  return url;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
