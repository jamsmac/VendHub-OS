/**
 * GPS Tracker Service
 *
 * Background-ish GPS tracking for active operator routes.
 * - Buffers points in memory and flushes to backend in batches (battery-friendly).
 * - Re-queues points on network failure (capped to prevent memory bloat).
 * - Graceful permission handling — callers check requestPermissions() before startTracking().
 */

import * as Location from "expo-location";
import { routesApi, GpsPoint } from "./api";

interface TrackerState {
  activeRouteId: string | null;
  subscription: Location.LocationSubscription | null;
  buffer: GpsPoint[];
  flushTimer: ReturnType<typeof setInterval> | null;
}

const state: TrackerState = {
  activeRouteId: null,
  subscription: null,
  buffer: [],
  flushTimer: null,
};

const FLUSH_INTERVAL_MS = 30_000; // Batch-send every 30s
const MAX_BUFFER = 20; // Or when 20 points collected
const MAX_QUEUED_POINTS = 200; // Hard cap on in-memory buffer

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

// Exposed for tests only — resets all module-level state between cases.
export function __resetForTesting(): void {
  state.activeRouteId = null;
  state.subscription = null;
  state.buffer = [];
  if (state.flushTimer) {
    clearInterval(state.flushTimer);
    state.flushTimer = null;
  }
}
