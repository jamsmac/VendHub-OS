import type { Machine } from "@/lib/types";

export type MachineWithDistance = Machine & { distance?: number };

const EARTH_RADIUS_KM = 6371;

/** Haversine distance between two GPS points in kilometres */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format km → "350 м" / "2.1 км" (ru) or "350 m" / "2.1 km" (uz) */
export function formatDistance(km: number, locale?: string): string {
  const m = locale === "uz" ? "m" : "м";
  const kmUnit = locale === "uz" ? "km" : "км";
  if (km < 1) {
    return `${Math.round(km * 1000)} ${m}`;
  }
  return `${km.toFixed(1)} ${kmUnit}`;
}

/** Return machines sorted by distance from user, with distance attached */
export function sortByDistance(
  machines: Machine[],
  userLat: number,
  userLng: number,
): MachineWithDistance[] {
  return machines
    .map((m) => ({
      ...m,
      distance:
        m.latitude != null && m.longitude != null
          ? calculateDistance(userLat, userLng, m.latitude, m.longitude)
          : undefined,
    }))
    .sort((a, b) => {
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
}
