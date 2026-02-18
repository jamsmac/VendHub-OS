/**
 * Query Location DTOs
 * Validates query parameters for listing and searching locations
 */

import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsLatitude,
  IsLongitude,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { LocationType, LocationStatus } from "../entities/location.entity";

export class QueryLocationsDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: "Page number" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 50,
    default: 50,
    description: "Items per page",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    example: "Mega Planet",
    description: "Search by name or address",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: LocationType,
    description: "Filter by location type",
  })
  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @ApiPropertyOptional({
    enum: LocationStatus,
    description: "Filter by status",
  })
  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  @ApiPropertyOptional({ example: "Toshkent", description: "Filter by city" })
  @IsOptional()
  @IsString()
  city?: string;
}

export class QueryNearbyLocationsDto {
  @ApiProperty({ example: 41.311081, description: "Latitude of center point" })
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 69.279737, description: "Longitude of center point" })
  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @ApiPropertyOptional({
    example: 5,
    default: 5,
    description: "Search radius in kilometers",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radius?: number = 5;
}
