import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
} from "class-validator";
import {
  WidgetType,
  ChartType,
  TimeRange,
  SnapshotType,
} from "../entities/analytics.entity";

export class DateRangeQueryDto {
  @ApiProperty({ example: "2025-01-01", description: "Start date" })
  @IsDateString()
  from: string;

  @ApiProperty({ example: "2025-01-31", description: "End date" })
  @IsDateString()
  to: string;
}

export class SnapshotQueryDto extends DateRangeQueryDto {
  @ApiProperty({ enum: SnapshotType })
  @IsEnum(SnapshotType)
  type: SnapshotType;
}

export class CreateWidgetDto {
  @ApiProperty({ example: "Revenue Overview" })
  @IsString()
  title: string;

  @ApiProperty({ enum: WidgetType })
  @IsEnum(WidgetType)
  widgetType: WidgetType;

  @ApiPropertyOptional({ enum: ChartType })
  @IsOptional()
  @IsEnum(ChartType)
  chartType?: ChartType;

  @ApiPropertyOptional({ enum: TimeRange })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange;

  @ApiPropertyOptional({ description: "Widget position" })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ description: "Grid width (1-12)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  width?: number;

  @ApiPropertyOptional({ description: "Grid height" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  height?: number;

  @ApiPropertyOptional({ description: "Widget config" })
  @IsOptional()
  config?: Record<string, unknown>;
}

export class UpdateWidgetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: TimeRange })
  @IsOptional()
  @IsEnum(TimeRange)
  timeRange?: TimeRange;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  config?: Record<string, unknown>;
}

export class ReorderWidgetsDto {
  @ApiProperty({ description: "Ordered array of widget UUIDs" })
  @IsArray()
  @IsUUID("4", { each: true })
  widgetIds: string[];
}
