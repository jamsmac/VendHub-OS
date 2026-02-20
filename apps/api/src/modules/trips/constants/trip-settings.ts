export const TRIP_SETTINGS = {
  /** Geofence radius for machine visit verification (meters) */
  GEOFENCE_RADIUS_METERS: 100,

  /** Minimum duration to detect a stop (seconds) */
  STOP_MIN_DURATION_SECONDS: 300, // 5 minutes

  /** Radius for stop clustering (meters) */
  STOP_DETECTION_RADIUS_METERS: 40,

  /** Auto-close trips without GPS updates after N hours */
  AUTO_CLOSE_AFTER_HOURS: 8,

  /** Mileage discrepancy threshold (km) */
  MILEAGE_THRESHOLD_KM: 50,

  /** Maximum allowed speed (km/h) */
  MAX_SPEED_KMH: 120,

  /** Minimum GPS accuracy to accept a point (meters) */
  MIN_GPS_ACCURACY_METERS: 100,

  /** Long stop threshold for anomaly detection (seconds) */
  LONG_STOP_THRESHOLD_SECONDS: 1800, // 30 minutes
} as const;
