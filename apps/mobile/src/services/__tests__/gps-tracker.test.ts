/**
 * GPS Tracker Tests
 * Verify buffer accumulation, batch flushing, and lifecycle cleanup.
 */

// Mock expo-location BEFORE importing the module under test
jest.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

// Mock the API
jest.mock("../api", () => ({
  routesApi: {
    addPointsBatch: jest.fn(),
  },
}));

import * as Location from "expo-location";
import { routesApi } from "../api";
import {
  requestPermissions,
  startTracking,
  stopTracking,
  isTracking,
  getBufferSize,
  getActiveRouteId,
  setGeofences,
  clearGeofences,
  getGeofences,
  subscribeToGeofenceEvents,
  evaluateGeofences,
  haversineMeters,
  __resetForTesting,
  type GeofenceEvent,
} from "../gps-tracker";

type LocationCallback = (loc: {
  coords: {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    accuracy: number | null;
  };
  timestamp: number;
}) => void;

const ROUTE_ID = "route-abc-123";

function makeSubscription() {
  return { remove: jest.fn() } as unknown as Location.LocationSubscription;
}

function makePoint(lat = 41.3, lon = 69.2) {
  return {
    coords: {
      latitude: lat,
      longitude: lon,
      speed: 10,
      heading: 45,
      accuracy: 5,
    },
    timestamp: Date.parse("2026-04-20T12:00:00Z"),
  };
}

describe("gps-tracker", () => {
  let capturedCallback: LocationCallback | null = null;
  let subscription: Location.LocationSubscription;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    __resetForTesting();
    capturedCallback = null;

    subscription = makeSubscription();
    (Location.watchPositionAsync as jest.Mock).mockImplementation(
      async (_opts, cb: LocationCallback) => {
        capturedCallback = cb;
        return subscription;
      },
    );
    (routesApi.addPointsBatch as jest.Mock).mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("requestPermissions", () => {
    it("returns true when both foreground and background are granted", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({ status: "granted" });
      (
        Location.requestBackgroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({ status: "granted" });

      await expect(requestPermissions()).resolves.toBe(true);
    });

    it("returns false when foreground is denied", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({ status: "denied" });

      await expect(requestPermissions()).resolves.toBe(false);
      expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it("returns false when background is denied", async () => {
      (
        Location.requestForegroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({ status: "granted" });
      (
        Location.requestBackgroundPermissionsAsync as jest.Mock
      ).mockResolvedValue({ status: "denied" });

      await expect(requestPermissions()).resolves.toBe(false);
    });
  });

  describe("startTracking", () => {
    it("sets active route and subscribes to location updates", async () => {
      await startTracking(ROUTE_ID);

      expect(isTracking()).toBe(true);
      expect(getActiveRouteId()).toBe(ROUTE_ID);
      expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    it("accumulates GPS points in the buffer on each location update", async () => {
      await startTracking(ROUTE_ID);

      capturedCallback?.(makePoint(41.3, 69.2));
      capturedCallback?.(makePoint(41.31, 69.21));
      capturedCallback?.(makePoint(41.32, 69.22));

      expect(getBufferSize()).toBe(3);
    });

    it("flushes buffer to backend when threshold (20 points) is reached", async () => {
      await startTracking(ROUTE_ID);

      for (let i = 0; i < 20; i++) {
        capturedCallback?.(makePoint(41 + i * 0.001, 69 + i * 0.001));
      }

      // flush is scheduled as a microtask via void — flush it
      await Promise.resolve();
      await Promise.resolve();

      expect(routesApi.addPointsBatch).toHaveBeenCalledWith(
        ROUTE_ID,
        expect.arrayContaining([
          expect.objectContaining({
            latitude: expect.any(Number),
            longitude: expect.any(Number),
            timestamp: expect.any(String),
          }),
        ]),
      );
      expect(getBufferSize()).toBe(0);
    });

    it("is idempotent: second call with same routeId is a no-op", async () => {
      await startTracking(ROUTE_ID);
      await startTracking(ROUTE_ID);
      expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    it("replaces tracking when called with a different routeId", async () => {
      await startTracking(ROUTE_ID);
      await startTracking("route-xyz-999");

      expect(subscription.remove).toHaveBeenCalledTimes(1);
      expect(getActiveRouteId()).toBe("route-xyz-999");
    });
  });

  describe("stopTracking", () => {
    it("removes the subscription and clears active route", async () => {
      await startTracking(ROUTE_ID);
      await stopTracking();

      expect(subscription.remove).toHaveBeenCalledTimes(1);
      expect(isTracking()).toBe(false);
      expect(getActiveRouteId()).toBeNull();
    });

    it("performs a final flush before clearing state", async () => {
      await startTracking(ROUTE_ID);
      capturedCallback?.(makePoint());
      capturedCallback?.(makePoint());

      await stopTracking();

      expect(routesApi.addPointsBatch).toHaveBeenCalledWith(
        ROUTE_ID,
        expect.arrayContaining([
          expect.objectContaining({ latitude: expect.any(Number) }),
        ]),
      );
      expect(getBufferSize()).toBe(0);
    });

    it("is safe to call when not tracking", async () => {
      await expect(stopTracking()).resolves.toBeUndefined();
      expect(routesApi.addPointsBatch).not.toHaveBeenCalled();
    });
  });

  describe("geofencing", () => {
    // Tashkent city center — Chorsu area.
    const TASHKENT_LAT = 41.3264;
    const TASHKENT_LON = 69.2285;

    it("haversineMeters returns ~0 for identical points", () => {
      expect(haversineMeters(41.3, 69.2, 41.3, 69.2)).toBeLessThan(0.01);
    });

    it("haversineMeters returns expected distance for known points", () => {
      // 0.001° latitude ≈ 111 meters
      const d = haversineMeters(41.3, 69.2, 41.301, 69.2);
      expect(d).toBeGreaterThan(100);
      expect(d).toBeLessThan(125);
    });

    it("setGeofences registers fences; clearGeofences empties them", () => {
      setGeofences([
        {
          id: "f1",
          latitude: TASHKENT_LAT,
          longitude: TASHKENT_LON,
          radiusMeters: 50,
          label: "Machine 1",
        },
      ]);
      expect(getGeofences()).toHaveLength(1);
      expect(getGeofences()[0]?.id).toBe("f1");

      clearGeofences();
      expect(getGeofences()).toHaveLength(0);
    });

    it("emits `entered` when location moves into radius", () => {
      const events: GeofenceEvent[] = [];
      subscribeToGeofenceEvents((e) => events.push(e));

      setGeofences([
        {
          id: "f1",
          latitude: TASHKENT_LAT,
          longitude: TASHKENT_LON,
          radiusMeters: 50,
          label: "Machine 1",
        },
      ]);

      // Start far away (>1km) — seeds as outside, no event.
      evaluateGeofences(TASHKENT_LAT + 0.02, TASHKENT_LON, "t0");
      expect(events).toHaveLength(0);

      // Move inside (same lat/lon as fence center → 0m).
      evaluateGeofences(TASHKENT_LAT, TASHKENT_LON, "t1");
      expect(events).toHaveLength(1);
      expect(events[0]?.action).toBe("entered");
      expect(events[0]?.fenceId).toBe("f1");
      expect(events[0]?.label).toBe("Machine 1");
    });

    it("emits `exited` when location moves out of radius", () => {
      const events: GeofenceEvent[] = [];
      subscribeToGeofenceEvents((e) => events.push(e));

      setGeofences([
        {
          id: "f1",
          latitude: TASHKENT_LAT,
          longitude: TASHKENT_LON,
          radiusMeters: 50,
          label: "Machine 1",
        },
      ]);

      // Seed inside.
      evaluateGeofences(TASHKENT_LAT, TASHKENT_LON, "t0");
      expect(events).toHaveLength(1);
      expect(events[0]?.action).toBe("entered");

      // Move far away — ~2.2km.
      evaluateGeofences(TASHKENT_LAT + 0.02, TASHKENT_LON, "t1");
      expect(events).toHaveLength(2);
      expect(events[1]?.action).toBe("exited");
    });

    it("does not emit duplicate events while remaining inside the fence", () => {
      const events: GeofenceEvent[] = [];
      subscribeToGeofenceEvents((e) => events.push(e));

      setGeofences([
        {
          id: "f1",
          latitude: TASHKENT_LAT,
          longitude: TASHKENT_LON,
          radiusMeters: 50,
          label: "Machine 1",
        },
      ]);

      // Start outside, then step inside and stay there.
      evaluateGeofences(TASHKENT_LAT + 0.02, TASHKENT_LON, "t0");
      evaluateGeofences(TASHKENT_LAT, TASHKENT_LON, "t1");
      evaluateGeofences(TASHKENT_LAT + 0.0001, TASHKENT_LON, "t2"); // ~11m offset, still inside
      evaluateGeofences(TASHKENT_LAT, TASHKENT_LON, "t3");

      expect(events).toHaveLength(1);
      expect(events[0]?.action).toBe("entered");
    });

    it("handles multiple fences independently", () => {
      const events: GeofenceEvent[] = [];
      subscribeToGeofenceEvents((e) => events.push(e));

      setGeofences([
        {
          id: "fA",
          latitude: 41.3,
          longitude: 69.2,
          radiusMeters: 50,
          label: "Stop A",
        },
        {
          id: "fB",
          latitude: 41.4,
          longitude: 69.3,
          radiusMeters: 50,
          label: "Stop B",
        },
      ]);

      // Seed both as outside.
      evaluateGeofences(41.5, 69.5, "t0");
      expect(events).toHaveLength(0);

      // Enter A only.
      evaluateGeofences(41.3, 69.2, "t1");
      expect(events).toHaveLength(1);
      expect(events[0]?.fenceId).toBe("fA");
      expect(events[0]?.action).toBe("entered");

      // Enter B (still inside A).
      evaluateGeofences(41.4, 69.3, "t2");
      // A fires "exited" (we moved ~13km away), B fires "entered"
      const byFence = events.reduce<Record<string, GeofenceEvent[]>>(
        (acc, e) => {
          (acc[e.fenceId] ||= []).push(e);
          return acc;
        },
        {},
      );
      expect(byFence.fA?.map((e) => e.action)).toEqual(["entered", "exited"]);
      expect(byFence.fB?.map((e) => e.action)).toEqual(["entered"]);
    });

    it("subscribeToGeofenceEvents returns an unsubscribe fn", () => {
      const events: GeofenceEvent[] = [];
      const unsubscribe = subscribeToGeofenceEvents((e) => events.push(e));

      setGeofences([
        {
          id: "f1",
          latitude: TASHKENT_LAT,
          longitude: TASHKENT_LON,
          radiusMeters: 50,
          label: "M",
        },
      ]);

      evaluateGeofences(TASHKENT_LAT, TASHKENT_LON, "t0");
      expect(events).toHaveLength(1);

      unsubscribe();
      // Move out then back in — listener should not receive these.
      evaluateGeofences(TASHKENT_LAT + 0.02, TASHKENT_LON, "t1");
      evaluateGeofences(TASHKENT_LAT, TASHKENT_LON, "t2");
      expect(events).toHaveLength(1);
    });

    it("setGeofences resets inside state so enter fires again after re-registration", () => {
      const events: GeofenceEvent[] = [];
      subscribeToGeofenceEvents((e) => events.push(e));

      const fence = {
        id: "f1",
        latitude: TASHKENT_LAT,
        longitude: TASHKENT_LON,
        radiusMeters: 50,
        label: "M",
      };
      setGeofences([fence]);

      evaluateGeofences(TASHKENT_LAT + 0.02, TASHKENT_LON, "t0");
      evaluateGeofences(TASHKENT_LAT, TASHKENT_LON, "t1");
      expect(events.filter((e) => e.action === "entered")).toHaveLength(1);

      // Re-register → inside state wiped → first evaluation at the fence
      // counts as a fresh "entered" (seeded inside).
      setGeofences([fence]);
      evaluateGeofences(TASHKENT_LAT, TASHKENT_LON, "t2");
      expect(events.filter((e) => e.action === "entered")).toHaveLength(2);
    });
  });

  describe("flush resilience", () => {
    it("re-queues points when backend call fails", async () => {
      (routesApi.addPointsBatch as jest.Mock).mockRejectedValueOnce(
        new Error("network down"),
      );

      await startTracking(ROUTE_ID);
      // Fill to threshold so flush is triggered
      for (let i = 0; i < 20; i++) {
        capturedCallback?.(makePoint(41 + i * 0.001, 69));
      }

      // Let the failing flush settle
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // Points should be re-queued in the buffer
      expect(getBufferSize()).toBe(20);
    });
  });
});
