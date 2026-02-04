/**
 * Geo Service
 * Геолокация и интеграция с Google Maps
 */

import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Machine } from '../machines/entities/machine.entity';

// ============================================================================
// TYPES
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
  components: {
    country?: string;
    city?: string;
    district?: string;
    street?: string;
    building?: string;
    postalCode?: string;
  };
}

export interface NearbyMachine {
  machine: Machine;
  distance: number; // в метрах
  duration: number; // в секундах (пешком)
  walkingDirections?: string;
}

export interface DirectionsResult {
  distance: number; // в метрах
  duration: number; // в секундах
  polyline: string;
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
}

export interface PlaceAutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  // Tashkent center for default
  private readonly defaultCenter: Coordinates = {
    latitude: 41.2995,
    longitude: 69.2401,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
  ) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY', '');
  }

  // ============================================================================
  // GEOCODING
  // ============================================================================

  /**
   * Геокодирование адреса в координаты
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      this.logger.warn('Google Maps API key not configured');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/geocode/json`, {
          params: {
            address,
            key: this.apiKey,
            language: 'ru',
            region: 'uz',
          },
        }),
      );

      if (response.data.status !== 'OK' || !response.data.results?.length) {
        return null;
      }

      const result = response.data.results[0];
      return this.parseGeocodingResult(result);
    } catch (error: any) {
      this.logger.error(`Geocoding failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Обратное геокодирование координат в адрес
   */
  async reverseGeocode(coords: Coordinates): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/geocode/json`, {
          params: {
            latlng: `${coords.latitude},${coords.longitude}`,
            key: this.apiKey,
            language: 'ru',
          },
        }),
      );

      if (response.data.status !== 'OK' || !response.data.results?.length) {
        return null;
      }

      return this.parseGeocodingResult(response.data.results[0]);
    } catch (error: any) {
      this.logger.error(`Reverse geocoding failed: ${error.message}`);
      return null;
    }
  }

  // ============================================================================
  // NEARBY MACHINES
  // ============================================================================

  /**
   * Найти ближайшие автоматы
   */
  async findNearbyMachines(
    coords: Coordinates,
    organizationId: string,
    options: {
      maxDistance?: number; // метры
      limit?: number;
      onlyOnline?: boolean;
      productId?: string;
    } = {},
  ): Promise<NearbyMachine[]> {
    const {
      maxDistance = 5000, // 5 км по умолчанию
      limit = 10,
      onlyOnline = true,
      productId,
    } = options;

    // Используем формулу Haversine для расчета расстояния
    const haversineQuery = `
      (6371000 * acos(
        cos(radians(:lat)) * cos(radians(m.latitude)) *
        cos(radians(m.longitude) - radians(:lng)) +
        sin(radians(:lat)) * sin(radians(m.latitude))
      ))
    `;

    const qb = this.machineRepo
      .createQueryBuilder('m')
      .addSelect(haversineQuery, 'distance')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.latitude IS NOT NULL')
      .andWhere('m.longitude IS NOT NULL')
      .andWhere(`${haversineQuery} <= :maxDistance`, {
        lat: coords.latitude,
        lng: coords.longitude,
        maxDistance,
      })
      .setParameters({
        lat: coords.latitude,
        lng: coords.longitude,
      })
      .orderBy('distance', 'ASC')
      .limit(limit);

    if (onlyOnline) {
      qb.andWhere('m.isOnline = :isOnline', { isOnline: true });
    }

    // Filter by product if specified
    if (productId) {
      qb.innerJoin('m.inventory', 'inv', 'inv.productId = :productId AND inv.quantity > 0', {
        productId,
      });
    }

    const results = await qb.getRawAndEntities();

    return results.entities.map((machine, index) => ({
      machine,
      distance: Math.round(parseFloat(results.raw[index].distance)),
      duration: Math.round(parseFloat(results.raw[index].distance) / 1.4), // ~5 km/h walking
    }));
  }

  /**
   * Получить автоматы в радиусе с группировкой для кластеризации
   */
  async getMachinesInBounds(
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    organizationId: string,
    _zoom: number,
  ): Promise<Machine[]> {
    const machines = await this.machineRepo
      .createQueryBuilder('m')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.latitude BETWEEN :south AND :north', {
        south: bounds.south,
        north: bounds.north,
      })
      .andWhere('m.longitude BETWEEN :west AND :east', {
        west: bounds.west,
        east: bounds.east,
      })
      .andWhere('m.latitude IS NOT NULL')
      .andWhere('m.longitude IS NOT NULL')
      .getMany();

    return machines;
  }

  // ============================================================================
  // DIRECTIONS
  // ============================================================================

  /**
   * Получить маршрут до автомата
   */
  async getDirections(
    origin: Coordinates,
    destination: Coordinates,
    mode: 'walking' | 'driving' | 'transit' = 'walking',
  ): Promise<DirectionsResult | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/directions/json`, {
          params: {
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
            mode,
            key: this.apiKey,
            language: 'ru',
          },
        }),
      );

      if (response.data.status !== 'OK' || !response.data.routes?.length) {
        return null;
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.value,
        duration: leg.duration.value,
        polyline: route.overview_polyline.points,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.value,
          duration: step.duration.value,
        })),
      };
    } catch (error: any) {
      this.logger.error(`Directions failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Получить матрицу расстояний для нескольких автоматов
   */
  async getDistanceMatrix(
    origin: Coordinates,
    destinations: Coordinates[],
    mode: 'walking' | 'driving' = 'walking',
  ): Promise<Array<{ distance: number; duration: number }> | null> {
    if (!this.apiKey || destinations.length === 0) {
      return null;
    }

    try {
      const destinationsStr = destinations
        .map(d => `${d.latitude},${d.longitude}`)
        .join('|');

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/distancematrix/json`, {
          params: {
            origins: `${origin.latitude},${origin.longitude}`,
            destinations: destinationsStr,
            mode,
            key: this.apiKey,
          },
        }),
      );

      if (response.data.status !== 'OK') {
        return null;
      }

      const elements = response.data.rows[0]?.elements || [];
      return elements.map((el: any) => ({
        distance: el.status === 'OK' ? el.distance.value : -1,
        duration: el.status === 'OK' ? el.duration.value : -1,
      }));
    } catch (error: any) {
      this.logger.error(`Distance matrix failed: ${error.message}`);
      return null;
    }
  }

  // ============================================================================
  // PLACES AUTOCOMPLETE
  // ============================================================================

  /**
   * Автокомплит адресов
   */
  async autocompleteAddress(
    input: string,
    sessionToken?: string,
  ): Promise<PlaceAutocompleteResult[]> {
    if (!this.apiKey || input.length < 2) {
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/place/autocomplete/json`, {
          params: {
            input,
            key: this.apiKey,
            language: 'ru',
            components: 'country:uz',
            sessiontoken: sessionToken,
          },
        }),
      );

      if (response.data.status !== 'OK') {
        return [];
      }

      return response.data.predictions.map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text || p.description,
        secondaryText: p.structured_formatting?.secondary_text || '',
      }));
    } catch (error: any) {
      this.logger.error(`Autocomplete failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Получить детали места по place_id
   */
  async getPlaceDetails(placeId: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/place/details/json`, {
          params: {
            place_id: placeId,
            key: this.apiKey,
            language: 'ru',
            fields: 'formatted_address,geometry,address_components',
          },
        }),
      );

      if (response.data.status !== 'OK') {
        return null;
      }

      const result = response.data.result;
      return {
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        placeId,
        components: this.parseAddressComponents(result.address_components),
      };
    } catch (error: any) {
      this.logger.error(`Place details failed: ${error.message}`);
      return null;
    }
  }

  // ============================================================================
  // STATIC MAP
  // ============================================================================

  /**
   * Получить URL статичной карты
   */
  getStaticMapUrl(
    center: Coordinates,
    options: {
      zoom?: number;
      size?: string;
      markers?: Array<{ lat: number; lng: number; label?: string; color?: string }>;
      path?: string; // encoded polyline
    } = {},
  ): string {
    const { zoom = 15, size = '400x300', markers = [], path } = options;

    const params = new URLSearchParams({
      center: `${center.latitude},${center.longitude}`,
      zoom: zoom.toString(),
      size,
      key: this.apiKey,
      maptype: 'roadmap',
    });

    // Add markers
    for (const marker of markers) {
      const color = marker.color || 'red';
      const label = marker.label || '';
      params.append('markers', `color:${color}|label:${label}|${marker.lat},${marker.lng}`);
    }

    // Add path
    if (path) {
      params.append('path', `enc:${path}`);
    }

    return `${this.baseUrl}/staticmap?${params.toString()}`;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Рассчитать расстояние между двумя точками (формула Haversine)
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371000; // Радиус Земли в метрах
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);
    const deltaLat = this.toRadians(point2.latitude - point1.latitude);
    const deltaLng = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Проверить, находится ли точка в пределах Узбекистана
   */
  isInUzbekistan(coords: Coordinates): boolean {
    // Приблизительные границы Узбекистана
    const bounds = {
      north: 45.6,
      south: 37.2,
      east: 73.2,
      west: 55.9,
    };

    return (
      coords.latitude >= bounds.south &&
      coords.latitude <= bounds.north &&
      coords.longitude >= bounds.west &&
      coords.longitude <= bounds.east
    );
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private parseGeocodingResult(result: any): GeocodingResult {
    return {
      formattedAddress: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      placeId: result.place_id,
      components: this.parseAddressComponents(result.address_components),
    };
  }

  private parseAddressComponents(components: any[]): GeocodingResult['components'] {
    const result: GeocodingResult['components'] = {};

    for (const component of components || []) {
      const types = component.types || [];

      if (types.includes('country')) {
        result.country = component.long_name;
      } else if (types.includes('locality')) {
        result.city = component.long_name;
      } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        result.district = component.long_name;
      } else if (types.includes('route')) {
        result.street = component.long_name;
      } else if (types.includes('street_number')) {
        result.building = component.long_name;
      } else if (types.includes('postal_code')) {
        result.postalCode = component.long_name;
      }
    }

    return result;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
