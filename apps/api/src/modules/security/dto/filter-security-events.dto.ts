/**
 * DTO for filtering / querying security events with pagination
 */

import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  IsDateString,
  IsIP,
  IsBoolean,
  IsString,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import {
  SecurityEventType,
  SecuritySeverity,
} from "../entities/security-event.entity";

export class FilterSecurityEventsDto {
  @ApiPropertyOptional({
    description: "Filter by organization ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({
    description: "Filter by user ID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: "Filter by security event type",
    enum: SecurityEventType,
    example: SecurityEventType.LOGIN_FAILED,
  })
  @IsOptional()
  @IsEnum(SecurityEventType)
  event_type?: SecurityEventType;

  @ApiPropertyOptional({
    description: "Filter by severity level",
    enum: SecuritySeverity,
    example: SecuritySeverity.HIGH,
  })
  @IsOptional()
  @IsEnum(SecuritySeverity)
  severity?: SecuritySeverity;

  @ApiPropertyOptional({
    description: "Filter by IP address",
    example: "192.168.1.1",
  })
  @IsOptional()
  @IsIP()
  ip_address?: string;

  @ApiPropertyOptional({
    description: "Filter by resource type (e.g., machine, user, organization)",
    example: "machine",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  resource?: string;

  @ApiPropertyOptional({
    description: "Filter by resource ID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsOptional()
  @IsUUID()
  resource_id?: string;

  @ApiPropertyOptional({
    description: "Filter by resolution status",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_resolved?: boolean;

  @ApiPropertyOptional({
    description: "Start date for date range filter (ISO 8601)",
    example: "2025-01-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: "End date for date range filter (ISO 8601)",
    example: "2025-12-31T23:59:59.999Z",
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: "Page number (1-based)",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of items per page",
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}
