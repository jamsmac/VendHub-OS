/**
 * Geo DTOs
 * VendHub Google Maps Integration
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TravelMode } from '../geo.constants';

// ============================================================================
// REQUEST DTOs
// ============================================================================

export class CoordinatesDto {
  @ApiProperty({ description: 'Latitude', example: 41.2995 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude', example: 69.2401 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class GeocodeAddressDto {
  @ApiProperty({ description: 'Address to geocode' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Language for results' })
  @IsString()
  @IsOptional()
  language?: string = 'ru';
}

export class ReverseGeocodeDto {
  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  @Type(() => Number)
  lng: number;

  @ApiPropertyOptional({ description: 'Language for results' })
  @IsString()
  @IsOptional()
  language?: string = 'ru';
}

export class NearbyMachinesDto {
  @ApiProperty({ description: 'User latitude' })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ description: 'User longitude' })
  @IsNumber()
  @Type(() => Number)
  lng: number;

  @ApiPropertyOptional({ description: 'Search radius in meters', default: 5000 })
  @IsNumber()
  @Type(() => Number)
  @Min(100)
  @Max(50000)
  @IsOptional()
  radius?: number = 5000;

  @ApiPropertyOptional({ description: 'Maximum number of results', default: 20 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Only show online machines' })
  @IsOptional()
  onlyOnline?: boolean = false;
}

export class DirectionsDto {
  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  origin: CoordinatesDto;

  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  destination: CoordinatesDto;

  @ApiPropertyOptional({ enum: TravelMode, default: TravelMode.DRIVING })
  @IsEnum(TravelMode)
  @IsOptional()
  mode?: TravelMode = TravelMode.DRIVING;

  @ApiPropertyOptional({ description: 'Language for results' })
  @IsString()
  @IsOptional()
  language?: string = 'ru';
}

export class DistanceMatrixDto {
  @ApiProperty({ type: [CoordinatesDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinatesDto)
  origins: CoordinatesDto[];

  @ApiProperty({ type: [CoordinatesDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinatesDto)
  destinations: CoordinatesDto[];

  @ApiPropertyOptional({ enum: TravelMode, default: TravelMode.DRIVING })
  @IsEnum(TravelMode)
  @IsOptional()
  mode?: TravelMode = TravelMode.DRIVING;
}

export class AutocompleteDto {
  @ApiProperty({ description: 'Search input' })
  @IsString()
  input: string;

  @ApiPropertyOptional({ description: 'Session token for billing' })
  @IsString()
  @IsOptional()
  sessionToken?: string;

  @ApiPropertyOptional({ description: 'Language for results' })
  @IsString()
  @IsOptional()
  language?: string = 'ru';
}

export class PlaceDetailsDto {
  @ApiProperty({ description: 'Google Place ID' })
  @IsString()
  placeId: string;

  @ApiPropertyOptional({ description: 'Session token' })
  @IsString()
  @IsOptional()
  sessionToken?: string;
}

export class StaticMapDto {
  @ApiProperty({ description: 'Center latitude' })
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @ApiProperty({ description: 'Center longitude' })
  @IsNumber()
  @Type(() => Number)
  lng: number;

  @ApiPropertyOptional({ description: 'Zoom level', default: 15 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(21)
  @IsOptional()
  zoom?: number = 15;

  @ApiPropertyOptional({ description: 'Map width in pixels', default: 600 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  width?: number = 600;

  @ApiPropertyOptional({ description: 'Map height in pixels', default: 400 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  height?: number = 400;

  @ApiPropertyOptional({ description: 'Map type', default: 'roadmap' })
  @IsString()
  @IsOptional()
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid' = 'roadmap';
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class GeocodingResultDto {
  @ApiProperty()
  formattedAddress: string;

  @ApiProperty({ type: CoordinatesDto })
  coordinates: CoordinatesDto;

  @ApiPropertyOptional()
  placeId?: string;

  @ApiPropertyOptional()
  streetNumber?: string;

  @ApiPropertyOptional()
  street?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  postalCode?: string;
}

export class NearbyMachineDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  address: string;

  @ApiProperty({ type: CoordinatesDto })
  coordinates: CoordinatesDto;

  @ApiProperty({ description: 'Distance in meters' })
  distance: number;

  @ApiProperty({ description: 'Distance formatted' })
  distanceText: string;

  @ApiProperty()
  isOnline: boolean;

  @ApiPropertyOptional()
  productsCount?: number;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class NearbyMachinesResultDto {
  @ApiProperty({ type: [NearbyMachineDto] })
  machines: NearbyMachineDto[];

  @ApiProperty()
  total: number;

  @ApiProperty({ type: CoordinatesDto })
  searchCenter: CoordinatesDto;

  @ApiProperty()
  searchRadius: number;
}

export class DirectionsResultDto {
  @ApiProperty({ description: 'Total distance in meters' })
  distanceMeters: number;

  @ApiProperty({ description: 'Total distance formatted' })
  distanceText: string;

  @ApiProperty({ description: 'Total duration in seconds' })
  durationSeconds: number;

  @ApiProperty({ description: 'Total duration formatted' })
  durationText: string;

  @ApiProperty({ type: CoordinatesDto })
  startLocation: CoordinatesDto;

  @ApiProperty({ type: CoordinatesDto })
  endLocation: CoordinatesDto;

  @ApiProperty({ description: 'Encoded polyline' })
  polyline: string;

  @ApiProperty({ description: 'Navigation steps' })
  steps: {
    instruction: string;
    distanceMeters: number;
    distanceText: string;
    durationSeconds: number;
    durationText: string;
    startLocation: CoordinatesDto;
    endLocation: CoordinatesDto;
  }[];
}

export class DistanceMatrixResultDto {
  @ApiProperty()
  rows: {
    elements: {
      distanceMeters: number;
      distanceText: string;
      durationSeconds: number;
      durationText: string;
      status: string;
    }[];
  }[];
}

export class PlaceAutocompleteResultDto {
  @ApiProperty()
  placeId: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  mainText: string;

  @ApiProperty()
  secondaryText: string;
}

export class PlaceDetailsResultDto {
  @ApiProperty()
  placeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  formattedAddress: string;

  @ApiProperty({ type: CoordinatesDto })
  coordinates: CoordinatesDto;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  openingHours?: string[];

  @ApiPropertyOptional()
  rating?: number;
}

// ============================================================================
// ALIASES FOR CONTROLLER COMPATIBILITY
// ============================================================================

export class NearbyMachinesQueryDto {
  @ApiProperty({ description: 'User latitude' })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ description: 'User longitude' })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ description: 'Maximum distance in meters', default: 5000 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  maxDistance?: number;

  @ApiPropertyOptional({ description: 'Maximum number of results', default: 20 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Only show online machines' })
  @IsOptional()
  onlyOnline?: boolean;

  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsUUID()
  @IsOptional()
  productId?: string;
}

export class MapBoundsDto {
  @ApiProperty({ description: 'North-East latitude' })
  @IsNumber()
  @Type(() => Number)
  neLat: number;

  @ApiProperty({ description: 'North-East longitude' })
  @IsNumber()
  @Type(() => Number)
  neLng: number;

  @ApiProperty({ description: 'South-West latitude' })
  @IsNumber()
  @Type(() => Number)
  swLat: number;

  @ApiProperty({ description: 'South-West longitude' })
  @IsNumber()
  @Type(() => Number)
  swLng: number;

  @ApiPropertyOptional({ description: 'Map zoom level' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  zoom?: number;
}

export class DirectionsQueryDto {
  @ApiProperty({ description: 'Origin latitude' })
  @IsNumber()
  @Type(() => Number)
  originLat: number;

  @ApiProperty({ description: 'Origin longitude' })
  @IsNumber()
  @Type(() => Number)
  originLng: number;

  @ApiProperty({ description: 'Destination latitude' })
  @IsNumber()
  @Type(() => Number)
  destLat: number;

  @ApiProperty({ description: 'Destination longitude' })
  @IsNumber()
  @Type(() => Number)
  destLng: number;

  @ApiPropertyOptional({ description: 'Travel mode', default: 'walking' })
  @IsString()
  @IsOptional()
  mode?: 'walking' | 'driving' | 'transit';
}

export class AddressAutocompleteDto {
  @ApiProperty({ description: 'Search input' })
  @IsString()
  input: string;

  @ApiPropertyOptional({ description: 'Session token' })
  @IsString()
  @IsOptional()
  sessionToken?: string;
}

// Alias for PlaceAutocompleteResultDto
export { PlaceAutocompleteResultDto as AutocompleteResultDto };

export class MapMachinesResultDto {
  @ApiProperty()
  machines: {
    id: string;
    name: string;
    code: string;
    latitude: number;
    longitude: number;
    isOnline: boolean;
    productsCount?: number;
  }[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  bounds: MapBoundsDto;

  @ApiProperty()
  shouldCluster: boolean;
}

export class StaticMapResultDto {
  @ApiProperty()
  url: string;

  @ApiProperty()
  width: number;

  @ApiProperty()
  height: number;
}
