/**
 * Geo Constants
 * VendHub Google Maps Integration
 */

export const GEO_CONSTANTS = {
  // Default search radius in meters
  DEFAULT_RADIUS: 5000,
  MAX_RADIUS: 50000,
  
  // Tashkent center coordinates (default)
  DEFAULT_CENTER: {
    lat: 41.2995,
    lng: 69.2401,
  },
  
  // Uzbekistan bounds
  UZBEKISTAN_BOUNDS: {
    northeast: { lat: 45.5908, lng: 73.1488 },
    southwest: { lat: 37.1821, lng: 55.9983 },
  },
  
  // Earth radius for Haversine formula
  EARTH_RADIUS_KM: 6371,
  EARTH_RADIUS_M: 6371000,
};

export enum TravelMode {
  DRIVING = 'driving',
  WALKING = 'walking',
  BICYCLING = 'bicycling',
  TRANSIT = 'transit',
}

export enum PlaceType {
  VENDING_MACHINE = 'vending_machine',
  CONVENIENCE_STORE = 'convenience_store',
  SHOPPING_MALL = 'shopping_mall',
  BUSINESS_CENTER = 'business_center',
  METRO_STATION = 'subway_station',
  BUS_STATION = 'bus_station',
}

export const GOOGLE_MAPS_API_ERRORS = {
  INVALID_COORDINATES: 'Invalid coordinates',
  GEOCODING_FAILED: 'Geocoding failed',
  DIRECTIONS_FAILED: 'Failed to get directions',
  PLACE_NOT_FOUND: 'Place not found',
  API_KEY_MISSING: 'Google Maps API key not configured',
  QUOTA_EXCEEDED: 'API quota exceeded',
};
