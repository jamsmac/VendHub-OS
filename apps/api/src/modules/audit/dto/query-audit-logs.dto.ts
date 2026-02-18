/**
 * Query/Filter DTO for Audit Logs
 * Used to filter, search, and paginate audit log queries
 */

import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
  Max,
  IsIn,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from "../entities/audit.entity";

export class QueryAuditLogsDto {
  @ApiPropertyOptional({
    description: "Filter by organization ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({
    description: "Filter by user ID who performed the action",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: "Filter by entity type (table name)",
    example: "users",
  })
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiPropertyOptional({
    description: "Filter by specific entity ID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @ApiPropertyOptional({
    description: "Filter by audit action types",
    enum: AuditAction,
    isArray: true,
    example: [AuditAction.CREATE, AuditAction.UPDATE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AuditAction, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  actions?: AuditAction[];

  @ApiPropertyOptional({
    description: "Filter by audit categories",
    enum: AuditCategory,
    isArray: true,
    example: [AuditCategory.DATA_MODIFICATION],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AuditCategory, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  categories?: AuditCategory[];

  @ApiPropertyOptional({
    description: "Filter by severity levels",
    enum: AuditSeverity,
    isArray: true,
    example: [AuditSeverity.WARNING, AuditSeverity.ERROR],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AuditSeverity, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  severities?: AuditSeverity[];

  @ApiPropertyOptional({
    description: "Start date for date range filter (ISO 8601)",
    example: "2025-01-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({
    description: "End date for date range filter (ISO 8601)",
    example: "2025-12-31T23:59:59.999Z",
  })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({
    description:
      "Free-text search (matches description, entity name, user email)",
    example: "password change",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by tags",
    type: [String],
    example: ["security", "suspicious"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  @ApiPropertyOptional({
    description: "Filter by operation success/failure",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  is_success?: boolean;

  @ApiPropertyOptional({
    description: "Page number (1-based)",
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    minimum: 1,
    maximum: 200,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: "Sort field",
    example: "created_at",
    default: "created_at",
  })
  @IsOptional()
  @IsString()
  sort_by?: string = "created_at";

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["ASC", "DESC"],
    default: "DESC",
    example: "DESC",
  })
  @IsOptional()
  @IsIn(["ASC", "DESC"])
  sort_order?: "ASC" | "DESC" = "DESC";
}
