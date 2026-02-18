/**
 * Create Audit Log DTO
 * Used for creating manual audit log entries via the API
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
  IsEmail,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditContext,
  AuditDeviceInfo,
  AuditGeoLocation,
} from "../entities/audit.entity";

export class CreateAuditLogDto {
  @ApiPropertyOptional({
    description: "Organization ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({
    description: "ID of the user who performed the action",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: "Email of the user who performed the action",
    example: "admin@vendhub.uz",
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  user_email?: string;

  @ApiPropertyOptional({
    description: "Name of the user who performed the action",
    example: "Admin User",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  user_name?: string;

  @ApiPropertyOptional({
    description: "Role of the user who performed the action",
    example: "admin",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  user_role?: string;

  @ApiProperty({
    description: "Type of entity affected (table name)",
    example: "users",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  entity_type: string;

  @ApiPropertyOptional({
    description: "ID of the affected entity",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @ApiPropertyOptional({
    description: "Display name of the affected entity",
    example: "John Doe",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  entity_name?: string;

  @ApiProperty({
    description: "Audit action type",
    enum: AuditAction,
    example: AuditAction.UPDATE,
  })
  @IsEnum(AuditAction)
  @IsNotEmpty()
  action: AuditAction;

  @ApiPropertyOptional({
    description: "Audit category",
    enum: AuditCategory,
    default: AuditCategory.DATA_MODIFICATION,
    example: AuditCategory.DATA_MODIFICATION,
  })
  @IsOptional()
  @IsEnum(AuditCategory)
  category?: AuditCategory;

  @ApiPropertyOptional({
    description: "Severity level",
    enum: AuditSeverity,
    default: AuditSeverity.INFO,
    example: AuditSeverity.INFO,
  })
  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  @ApiPropertyOptional({
    description: "Human-readable description of the action",
    example: "Updated user profile settings",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    description: "Previous values of the changed fields",
    example: { name: "Old Name", status: "active" },
  })
  @IsOptional()
  @IsObject()
  old_values?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "New values of the changed fields",
    example: { name: "New Name", status: "inactive" },
  })
  @IsOptional()
  @IsObject()
  new_values?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Detailed list of field-level changes",
    type: "array",
    example: [
      { field: "name", oldValue: "Old", newValue: "New", fieldType: "string" },
    ],
  })
  @IsOptional()
  @IsArray()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes?: any[];

  @ApiPropertyOptional({
    description: "List of field names that were affected",
    type: [String],
    example: ["name", "status"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affected_fields?: string[];

  @ApiPropertyOptional({
    description: "Request context information",
    example: {
      module: "users",
      method: "update",
      endpoint: "/api/v1/users/123",
    },
  })
  @IsOptional()
  @IsObject()
  context?: AuditContext;

  @ApiPropertyOptional({
    description: "IP address of the request origin",
    example: "192.168.1.1",
  })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ip_address?: string;

  @ApiPropertyOptional({
    description: "Device information",
    example: { userAgent: "Mozilla/5.0", browser: "Chrome", os: "Windows" },
  })
  @IsOptional()
  @IsObject()
  device_info?: AuditDeviceInfo;

  @ApiPropertyOptional({
    description: "Geolocation information",
    example: { country: "Uzbekistan", city: "Tashkent" },
  })
  @IsOptional()
  @IsObject()
  geo_location?: AuditGeoLocation;

  @ApiPropertyOptional({
    description: "Additional metadata",
    example: { source: "admin_panel", version: "1.0" },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Tags for categorizing the log entry",
    type: [String],
    example: ["manual", "admin-action"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: "Whether the operation was successful",
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_success?: boolean;

  @ApiPropertyOptional({
    description: "Error message if the operation failed",
    example: "Permission denied",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  error_message?: string;
}
