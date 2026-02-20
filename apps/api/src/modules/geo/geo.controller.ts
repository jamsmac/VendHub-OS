/**
 * Geo Controller
 * API endpoints для геолокации и карт
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../users/entities/user.entity';
import { GeoService } from './geo.service';
import {
  CoordinatesDto,
  NearbyMachinesQueryDto,
  MapBoundsDto,
  DirectionsQueryDto,
  AddressAutocompleteDto,
  GeocodeAddressDto,
  GeocodingResultDto,
  NearbyMachinesResultDto,
  DirectionsResultDto,
  AutocompleteResultDto,
  MapMachinesResultDto,
  StaticMapResultDto,
} from './dto/geo.dto';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  // ============================================================================
  // PUBLIC ENDPOINTS
  // ============================================================================

  @Get('autocomplete')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests/min -- protects Google Maps API quota
  @ApiOperation({
    summary: 'Address autocomplete',
    description: 'Автокомплит адресов в Узбекистане',
  })
  @ApiResponse({ status: 200, type: [AutocompleteResultDto] })
  async autocomplete(
    @Query() query: AddressAutocompleteDto,
  ): Promise<AutocompleteResultDto[]> {
    return this.geoService.autocompleteAddress(query.input, query.sessionToken);
  }

  @Post('geocode')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests/min -- protects Google Maps API quota
  @ApiOperation({
    summary: 'Geocode address',
    description: 'Преобразовать адрес в координаты',
  })
  @ApiResponse({ status: 200, type: GeocodingResultDto })
  async geocode(@Body() dto: GeocodeAddressDto) {
    const result = await this.geoService.geocodeAddress(dto.address);
    if (!result) return null;
    return {
      formattedAddress: result.formattedAddress,
      coordinates: { lat: result.latitude, lng: result.longitude },
      placeId: result.placeId,
      city: result.components.city,
      street: result.components.street,
      country: result.components.country,
      postalCode: result.components.postalCode,
      region: result.components.district,
    };
  }

  @Post('reverse-geocode')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests/min -- protects Google Maps API quota
  @ApiOperation({
    summary: 'Reverse geocode',
    description: 'Преобразовать координаты в адрес',
  })
  @ApiResponse({ status: 200, type: GeocodingResultDto })
  async reverseGeocode(@Body() dto: CoordinatesDto) {
    const result = await this.geoService.reverseGeocode({ latitude: dto.lat, longitude: dto.lng });
    if (!result) return null;
    return {
      formattedAddress: result.formattedAddress,
      coordinates: { lat: result.latitude, lng: result.longitude },
      placeId: result.placeId,
      city: result.components.city,
      street: result.components.street,
      country: result.components.country,
      postalCode: result.components.postalCode,
      region: result.components.district,
    };
  }

  // ============================================================================
  // AUTHENTICATED ENDPOINTS
  // ============================================================================

  @Get('nearby-machines')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Find nearby machines',
    description: 'Найти ближайшие автоматы',
  })
  @ApiResponse({ status: 200, type: NearbyMachinesResultDto })
  async findNearbyMachines(
    @CurrentUser() user: User,
    @Query() query: NearbyMachinesQueryDto,
  ) {
    const nearbyMachines = await this.geoService.findNearbyMachines(
      { latitude: query.latitude, longitude: query.longitude },
      user.organizationId,
      {
        maxDistance: query.maxDistance,
        limit: query.limit,
        onlyOnline: query.onlyOnline,
        productId: query.productId,
      },
    );

    const machines = nearbyMachines.map((nm: any) => ({
      id: nm.machine.id,
      name: nm.machine.name,
      code: nm.machine.code || nm.machine.serialNumber,
      address: nm.machine.address,
      coordinates: { lat: nm.machine.latitude, lng: nm.machine.longitude },
      distance: nm.distance,
      distanceText: this.formatDistance(nm.distance),
      isOnline: nm.machine.isOnline,
    }));

    return {
      machines,
      total: machines.length,
      searchCenter: { lat: query.latitude, lng: query.longitude },
      searchRadius: query.maxDistance || 5000,
    };
  }

  @Get('machines-in-bounds')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get machines in map bounds',
    description: 'Получить автоматы в видимой области карты',
  })
  @ApiResponse({ status: 200, type: MapMachinesResultDto })
  async getMachinesInBounds(
    @CurrentUser() user: User,
    @Query() bounds: MapBoundsDto,
  ) {
    const machines = await this.geoService.getMachinesInBounds(
      { north: bounds.neLat, south: bounds.swLat, east: bounds.neLng, west: bounds.swLng },
      user.organizationId,
      bounds.zoom || 12,
    );

    return {
      machines: machines.map((m: any) => ({
        id: m.id,
        name: m.name,
        code: m.code || m.serialNumber,
        latitude: m.latitude,
        longitude: m.longitude,
        isOnline: m.isOnline,
        productsCount: 0,
      })),
      total: machines.length,
      bounds,
      shouldCluster: machines.length > 50 && (bounds.zoom || 12) < 14,
    };
  }

  @Get('directions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get directions',
    description: 'Получить маршрут до точки',
  })
  @ApiResponse({ status: 200, type: DirectionsResultDto })
  async getDirections(
    @Query() query: DirectionsQueryDto,
  ) {
    const result = await this.geoService.getDirections(
      { latitude: query.originLat, longitude: query.originLng },
      { latitude: query.destLat, longitude: query.destLng },
      query.mode || 'walking',
    );

    if (!result) {
      return null;
    }

    return {
      distanceMeters: result.distance,
      distanceText: this.formatDistance(result.distance),
      durationSeconds: result.duration,
      durationText: this.formatDuration(result.duration),
      polyline: result.polyline,
      startLocation: { lat: query.originLat, lng: query.originLng },
      endLocation: { lat: query.destLat, lng: query.destLng },
      steps: result.steps || [],
    };
  }

  @Get('static-map')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get static map URL',
    description: 'Получить URL статичной карты',
  })
  @ApiResponse({ status: 200, type: StaticMapResultDto })
  getStaticMap(
    @Query() coords: CoordinatesDto,
    @Query('zoom') zoom?: number,
    @Query('size') size?: string,
  ) {
    const mapSize = size || '400x300';
    const [width, height] = mapSize.split('x').map(Number);

    return {
      url: this.geoService.getStaticMapUrl({ latitude: coords.lat, longitude: coords.lng }, {
        zoom: zoom || 15,
        size: mapSize,
      }),
      width: width || 400,
      height: height || 300,
    };
  }

  @Post('distance')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Calculate distance',
    description: 'Рассчитать расстояние между двумя точками',
  })
  async calculateDistance(
    @Body() body: { from: CoordinatesDto; to: CoordinatesDto },
  ) {
    const distance = this.geoService.calculateDistance(
      { latitude: body.from.lat, longitude: body.from.lng },
      { latitude: body.to.lat, longitude: body.to.lng },
    );
    return {
      distance,
      distanceText: this.formatDistance(distance),
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} м`;
    }
    return `${(meters / 1000).toFixed(1)} км`;
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)} сек`;
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} мин`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ч ${mins} мин`;
  }
}
