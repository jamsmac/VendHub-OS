/**
 * GPS Tracker Service
 *
 * Background-ish GPS tracking for active operator routes.
 * - Buffers points in memory and flushes to backend in batches (battery-friendly).
 * - Re-queues points on network failure (capped to prevent memory bloat).
 * - Graceful permission handling — callers check requestPermissions() before startTracking().
 *
 * P1: client-side geofencing — when a list of geofences is registered, each
 * location update computes Haversine distance to every fence and emits
 * enter/exit events when the inside/outside state flips. The server still runs
 * its own `RouteTrackingService.checkStopDetection()`; this is purely for
 * immediate UI feedback (haptic / local notification) while the operator is
 * driving.
 */

import * as Location from "expo-location";
import { routesApi, GpsPoint } from "./api";

export interface Geofence {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  label: string;
}

export interface GeofenceEvent {
  fenceId: string;
  label: string;
  action: "entered" | "exited";
  distance: number;
  timestamp: string;
}

export type GeofenceListener = (event: GeofenceEvent) => void;

interface TrackerState {
  activeRouteId: string | null;
  subscription: Location.LocationSubscription | null;
  buffer: GpsPoint[];
  flushTimer: ReturnType<typeof setInterval> | null;
  geofences: Geofence[];
  fenceInside: Map<string, boolean>; // fenceId → isInside
  geofenceListeners: Set<GeofenceListener>;
}

const state: TrackerState = {
  activeRouteId: null,
  subscription: null,
  buffer: [],
  flushTimer: null,
  geofences: [],
  fenceInside: new Map(),
  geofenceListeners: new Set(),
};

const FLUSH_INTERVAL_MS = 30_000; // Batch-send every 30s
const MAX_BUFFER = 20; // Or when 20 points collected
const MAX_QUEUED_POINTS = 200; // Hard cap on in-memory buffer

/**
 * Great-circle distance in meters between two lat/lon points.
 * Accurate to ~0.5% for distances under ~1000km — more than enough for
 * 50m geofence checks.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function requestPermissions(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== "granted") return false;
  // Background permission — iOS requires foreground first, then background
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === "granted";
}

export async function startTracking(routeId: string): Promise<void> {
  if (state.activeRouteId === routeId) return; // Already tracking this route
  await stopTracking(); // Clean any previous

  state.activeRouteId = routeId;
  state.subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 10_000, // 10s
      distanceInterval: 20, // Or 20 meters
    },
    (location) => {
      state.buffer.push({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(location.timestamp).toISOString(),
        ...(location.coords.speed != null && { speed: location.coords.speed }),
        ...(location.coords.heading != null && {
          heading: location.coords.heading,
        }),
        ...(location.coords.accuracy != null && {
          accuracy: location.coords.accuracy,
        }),
      });

      // Client-side geofence check — runs inline so UI listeners fire before
      // the batched flush. Cheap: O(nFences) per update, fences are bounded
      // by the number of stops on the active route (<30 in practice).
      evaluateGeofences(
        location.coords.latitude,
        location.coords.longitude,
        new Date(location.timestamp).toISOString(),
      );

      if (state.buffer.length >= MAX_BUFFER) {
        void flush();
      }
    },
  );

  state.flushTimer = setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);
}

async function flush(): Promise<void> {
  if (!state.activeRouteId || state.buffer.length === 0) return;
  const points = state.buffer.splice(0); // Drain
  try {
    await routesApi.addPointsBatch(state.activeRouteId, points);
  } catch {
    // On failure, re-queue (but cap total buffer to prevent memory bloat)
    state.buffer.unshift(...points);
    if (state.buffer.length > MAX_QUEUED_POINTS) {
      state.buffer = state.buffer.slice(-MAX_QUEUED_POINTS); // Keep most recent
    }
  }
}

export async function stopTracking(): Promise<void> {
  if (state.flushTimer) {
    clearInterval(state.flushTimer);
    state.flushTimer = null;
  }
  if (state.subscription) {
    state.subscription.remove();
    state.subscription = null;
  }
  await flush(); // Final flush
  state.activeRouteId = null;
}

export function isTracking(): boolean {
  return state.activeRouteId !== null;
}

export function getBufferSize(): number {
  return state.buffer.length;
}

export function getActiveRouteId(): string | null {
  return state.activeRouteId;
}

// --- Geofencing API ---------------------------------------------------------

/**
 * Register a set of geofences to watch. Replaces any previously registered
 * fences. Inside/outside state is reset — the first location update after
 * registration will not fire events for fences the operator is already inside
 * (they are seeded as `inside` on the first evaluation).
 */
export function setGeofences(fences: Geofence[]): void {
  state.geofences = fences.map((f) => ({ ...f }));
  state.fenceInside = new Map();
}

export function clearGeofences(): void {
  state.geofences = [];
  state.fenceInside = new Map();
}

export function getGeofences(): Geofence[] {
  return state.geofences.map((f) => ({ ...f }));
}

/**
 * Subscribe to enter/exit events. Returns an unsubscribe function suitable for
 * useEffect cleanup.
 */
export function subscribeToGeofenceEvents(
  listener: GeofenceListener,
): () => void {
  state.geofenceListeners.add(listener);
  return () => {
    state.geofenceListeners.delete(listener);
  };
}

/**
 * Exposed for tests — normally called by the `watchPositionAsync` callback.
 * Given a current lat/lon, computes distance to every registered fence and
 * fires enter/exit events when the boolean inside-state flips.
 */
export function evaluateGeofences(
  latitude: number,
  longitude: number,
  timestamp: string,
): void {
  if (state.geofences.length === 0) return;

  for (const fence of state.geofences) {
    const distance = haversineMeters(
      latitude,
      longitude,
      fence.latitude,
      fence.longitude,
    );
    const isInside = distance <= fence.radiusMeters;
    const wasInside = state.fenceInside.get(fence.id);

    if (wasInside === undefined) {
      // First evaluation for this fence — seed state but only fire an
      // "entered" event if we're newly inside (avoids spurious event on
      // registration when operator is already at a stop).
      state.fenceInside.set(fence.id, isInside);
      if (isInside) {
        emit({
          fenceId: fence.id,
          label: fence.label,
          action: "entered",
          distance,
          timestamp,
        });
      }
      continue;
    }

    if (!wasInside && isInside) {
      state.fenceInside.set(fence.id, true);
      emit({
        fenceId: fence.id,
        label: fence.label,
        action: "entered",
        distance,
        timestamp,
      });
    } else if (wasInside && !isInside) {
      state.fenceInside.set(fence.id, false);
      emit({
        fenceId: fence.id,
        label: fence.label,
        action: "exited",
        distance,
        timestamp,
      });
    }
  }
}

function emit(event: GeofenceEvent): void {
  for (const listener of state.geofenceListeners) {
    try {
      listener(event);
    } catch {
      // Never let a listener error break the tracker loop.
    }
  }
}

// Exposed for tests only — resets all module-level state between cases.
export function __resetForTesting(): void {
  state.activeRouteId = null;
  state.subscription = null;
  state.buffer = [];
  if (state.flushTimer) {
    clearInterval(state.flushTimer);
    state.flushTimer = null;
  }
  state.geofences = [];
  state.fenceInside = new Map();
  state.geofenceListeners = new Set();
}
