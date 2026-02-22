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
  IsUUID,
  IsDateString,
  IsInt,
  IsIn,
  Min,
  Max,
  Length,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
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

// ============================================================================
// REPORT GENERATION (replaces interface GenerateReportDto from service)
// ============================================================================

class DeliveryConfigDto {
  @ApiProperty({ enum: ["download", "email", "storage"] })
  @IsIn(["download", "email", "storage"])
  method: "download" | "email" | "storage";

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emails?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storagePath?: string;
}

export class GenerateReportBodyDto {
  @ApiPropertyOptional({ description: "Report definition ID" })
  @IsOptional()
  @IsUUID()
  reportDefinitionId?: string;

  @ApiPropertyOptional({ description: "Organization ID (owner only)" })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({ description: "Report name" })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({ description: "Report parameters" })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Start date" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: "End date" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: "Delivery configuration" })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryConfigDto)
  delivery?: DeliveryConfigDto;
}

// ============================================================================
// SCHEDULED REPORT CREATE (replaces interface CreateScheduledReportDto)
// ============================================================================

class ScheduleConfigDto {
  @ApiPropertyOptional({ description: "Time of day (HH:mm)" })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ description: "Day of week (0=Sun, 6=Sat)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: "Day of month (1-31)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: "Timezone" })
  @IsOptional()
  @IsString()
  timezone?: string;
}

class ScheduleDeliveryConfigDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emails?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  telegramChatIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  webhookUrl?: string;
}

export class CreateScheduledReportBodyDto {
  @ApiPropertyOptional({ description: "Organization ID (owner only)" })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: "Report definition ID" })
  @IsUUID()
  reportDefinitionId: string;

  @ApiProperty({ description: "Schedule name" })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({ enum: ReportFrequency })
  @IsEnum(ReportFrequency)
  frequency: ReportFrequency;

  @ApiProperty({ description: "Schedule configuration" })
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  scheduleConfig: ScheduleConfigDto;

  @ApiPropertyOptional({ description: "Report parameters" })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiProperty({ enum: ExportFormat })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiProperty({ enum: ["email", "telegram", "webhook"] })
  @IsIn(["email", "telegram", "webhook"])
  deliveryMethod: "email" | "telegram" | "webhook";

  @ApiProperty({ description: "Delivery configuration" })
  @ValidateNested()
  @Type(() => ScheduleDeliveryConfigDto)
  deliveryConfig: ScheduleDeliveryConfigDto;
}

// ============================================================================
// DASHBOARD CREATE (replaces interface CreateDashboardDto)
// ============================================================================

export class CreateDashboardBodyDto {
  @ApiPropertyOptional({ description: "Organization ID (owner only)" })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: "Dashboard name" })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional({ description: "Dashboard description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ["grid", "freeform"] })
  @IsOptional()
  @IsIn(["grid", "freeform"])
  layout?: "grid" | "freeform";

  @ApiPropertyOptional({ description: "Grid columns (1-24)" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  columns?: number;

  @ApiPropertyOptional({ description: "Public visibility" })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// ============================================================================
// WIDGET CREATE (replaces interface CreateWidgetDto)
// ============================================================================

export class CreateWidgetBodyDto {
  @ApiProperty({ description: "Dashboard ID" })
  @IsUUID()
  dashboardId: string;

  @ApiProperty({ description: "Widget title" })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional({ description: "Chart type" })
  @IsOptional()
  @IsString()
  chartType?: string;

  @ApiProperty({ description: "Position X" })
  @IsNumber()
  @Min(0)
  positionX: number;

  @ApiProperty({ description: "Position Y" })
  @IsNumber()
  @Min(0)
  positionY: number;

  @ApiProperty({ description: "Widget width" })
  @IsNumber()
  @Min(1)
  width: number;

  @ApiProperty({ description: "Widget height" })
  @IsNumber()
  @Min(1)
  height: number;

  @ApiPropertyOptional({ description: "Report definition ID" })
  @IsOptional()
  @IsUUID()
  definitionId?: string;

  @ApiPropertyOptional({ description: "Chart configuration" })
  @IsOptional()
  @IsObject()
  chartConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "KPI configuration" })
  @IsOptional()
  @IsObject()
  kpiConfig?: Record<string, unknown>;
}

// ============================================================================
// SAVED FILTER (replaces inline body type in controller)
// ============================================================================

export class SaveFilterDto {
  @ApiProperty({ description: "Report definition ID" })
  @IsUUID()
  reportDefinitionId: string;

  @ApiProperty({ description: "Filter name" })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({ description: "Filter configuration" })
  @IsObject()
  filters: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Set as default filter" })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// ============================================================================
// REORDER WIDGETS
// ============================================================================

export class ReorderWidgetsDto {
  @ApiProperty({ description: "Ordered array of widget UUIDs" })
  @IsArray()
  @IsUUID("4", { each: true })
  widgetIds: string[];
}
