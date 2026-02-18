/**
 * DTO for logging a security event (used internally by services).
 *
 * NOTE: This DTO uses camelCase property names to match the SecurityEvent
 * entity fields directly, since it is spread into repository.create().
 * External-facing DTOs (FilterSecurityEventsDto, ResolveSecurityEventDto)
 * use snake_case per project convention.
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsIP,
  IsObject,
  MaxLength,
} from "class-validator";
import {
  SecurityEventType,
  SecuritySeverity,
} from "../entities/security-event.entity";

export class LogSecurityEventDto {
  @ApiProperty({
    description: "Type of security event",
    enum: SecurityEventType,
    example: SecurityEventType.LOGIN_FAILED,
  })
  @IsEnum(SecurityEventType)
  eventType: SecurityEventType;

  @ApiPropertyOptional({
    description: "Severity level (auto-determined if not provided)",
    enum: SecuritySeverity,
    example: SecuritySeverity.MEDIUM,
  })
  @IsOptional()
  @IsEnum(SecuritySeverity)
  severity?: SecuritySeverity;

  @ApiPropertyOptional({
    description: "User ID associated with the event",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: "Organization ID associated with the event",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description: "IP address where the event originated",
    example: "192.168.1.100",
  })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: "User agent string from the request",
    example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userAgent?: string;

  @ApiPropertyOptional({
    description: "Resource type affected (e.g., machine, user, organization)",
    example: "machine",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  resource?: string;

  @ApiPropertyOptional({
    description: "ID of the affected resource",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @ApiProperty({
    description: "Human-readable description of the security event",
    example: "Failed login attempt from unknown IP address",
  })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    description: "Additional metadata as key-value pairs",
    example: { attempts: 3, blocked: true },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Session ID associated with the event",
    example: "sess_abc123def456",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;
}
