/**
 * Filter/Query Webhooks DTO
 */

import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import { WebhookEvent } from "../webhooks.service";

export class FilterWebhooksDto {
  @ApiPropertyOptional({
    enum: WebhookEvent,
    description: "Filter by subscribed event type",
  })
  @IsOptional()
  @IsEnum(WebhookEvent)
  event?: WebhookEvent;

  @ApiPropertyOptional({
    description: "Filter by active status",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  is_active?: boolean;

  @ApiPropertyOptional({
    description: "Search by URL or description",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Sort by field",
    example: "created_at",
    default: "created_at",
  })
  @IsOptional()
  @IsString()
  sort_by?: string = "created_at";

  @ApiPropertyOptional({
    description: "Sort direction",
    enum: ["ASC", "DESC"],
    default: "DESC",
  })
  @IsOptional()
  @IsEnum(["ASC", "DESC"] as const)
  sort_order?: "ASC" | "DESC" = "DESC";

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
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class WebhookLogsQueryDto {
  @ApiPropertyOptional({
    description: "Filter from date (ISO 8601)",
    example: "2025-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiPropertyOptional({
    description: "Filter to date (ISO 8601)",
    example: "2025-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsString()
  date_to?: string;

  @ApiPropertyOptional({
    description: "Filter by HTTP status code of delivery attempt",
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status_code?: number;

  @ApiPropertyOptional({
    description: "Filter by success/failure",
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  success?: boolean;

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
