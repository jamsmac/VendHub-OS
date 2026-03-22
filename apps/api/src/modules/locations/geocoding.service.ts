/**
 * Geocoding Service
 * Reverse geocoding via Nominatim (OpenStreetMap) — free, no API key needed.
 * Rate limit: 1 request per second (Nominatim policy).
 */

import { Injectable, Logger } from "@nestjs/common";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const THROTTLE_MS = 1000;

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface ReverseGeocodingResult {
  displayName: string;
  road?: string;
  houseNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private lastRequestTime = 0;

  /**
   * Forward geocode: address → coordinates
   */
  async geocode(address: string): Promise<GeocodingResult | null> {
    await this.throttle();

    try {
      const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=uz`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "VendHub24/1.0 (info@vendhub.uz)",
          "Accept-Language": "ru,uz,en",
        },
      });

      if (!response.ok) {
        this.logger.warn(`Geocoding failed: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (data.length === 0) return null;

      return {
        latitude: parseFloat(data[0]!.lat),
        longitude: parseFloat(data[0]!.lon),
        displayName: data[0]!.display_name,
      };
    } catch (error) {
      this.logger.error(
        `Geocoding error: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * Reverse geocode: coordinates → structured address
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodingResult | null> {
    await this.throttle();

    try {
      const url = `${NOMINATIM_BASE_URL}/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "VendHub24/1.0 (info@vendhub.uz)",
          "Accept-Language": "ru,uz,en",
        },
      });

      if (!response.ok) {
        this.logger.warn(`Reverse geocoding failed: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        display_name: string;
        address?: {
          road?: string;
          house_number?: string;
          city?: string;
          state?: string;
          country?: string;
          postcode?: string;
        };
      };

      return {
        displayName: data.display_name,
        road: data.address?.road,
        houseNumber: data.address?.house_number,
        city: data.address?.city,
        state: data.address?.state,
        country: data.address?.country,
        postcode: data.address?.postcode,
      };
    } catch (error) {
      this.logger.error(
        `Reverse geocoding error: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * Throttle to respect Nominatim's 1 req/sec policy
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < THROTTLE_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, THROTTLE_MS - elapsed),
      );
    }

    this.lastRequestTime = Date.now();
  }
}
