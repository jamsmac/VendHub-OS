/**
 * DTOs for report definitions, scheduled reports, dashboards, and widgets
 * Replaces untyped Record<string, unknown> bodies with validated DTOs
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
  IsArray,
  Min,
  Max,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ReportType,
  ReportCategory,
  ExportFormat,
  ReportFrequency,
} from "../entities/report.entity";

// ============================================================================
// REPORT DEFINITION
// ============================================================================

export class CreateReportDefinitionDto {
  @ApiProperty({ description: "Report name" })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional({ description: "Report code (unique identifier)" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  code?: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({ enum: ReportCategory })
  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @ApiPropertyOptional({ description: "Report description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Query template (JSON)" })
  @IsOptional()
  @IsObject()
  queryTemplate?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Available parameters" })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Column definitions" })
  @IsOptional()
  @IsArray()
  columns?: Record<string, unknown>[];
}

// ============================================================================
// SCHEDULED REPORT UPDATE
// ============================================================================

export class UpdateScheduledReportDto {
  @ApiPropertyOptional({ description: "Schedule name" })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ description: "Active status" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Schedule configuration" })
  @IsOptional()
  @IsObject()
  schedule?: {
    frequency?: ReportFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
    time?: string;
    timezone?: string;
    deliveryChannels?: ("email" | "telegram" | "webhook")[];
    recipients?: { email?: string }[];
    format?: ExportFormat;
  };

  @ApiPropertyOptional({ description: "Report filters" })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ExportFormat })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @ApiPropertyOptional({ description: "Recipients" })
  @IsOptional()
  @IsArray()
  recipients?: { email?: string }[];
}

// ============================================================================
// DASHBOARD UPDATE
// ============================================================================

export class UpdateDashboardDto {
  @ApiPropertyOptional({ description: "Dashboard name" })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ description: "Dashboard description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Grid columns" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  gridColumns?: number;

  @ApiPropertyOptional({ description: "Public visibility" })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: "Active status" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// WIDGET UPDATE
// ============================================================================

export class UpdateWidgetDto {
  @ApiPropertyOptional({ description: "Widget title" })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @ApiPropertyOptional({ description: "Chart type" })
  @IsOptional()
  @IsString()
  chartType?: string;

  @ApiPropertyOptional({ description: "Position X" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  positionX?: number;

  @ApiPropertyOptional({ description: "Position Y" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  positionY?: number;

  @ApiPropertyOptional({ description: "Widget width" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ description: "Widget height" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ description: "Chart configuration" })
  @IsOptional()
  @IsObject()
  chartConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "KPI configuration" })
  @IsOptional()
  @IsObject()
  kpiConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Widget visibility" })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
