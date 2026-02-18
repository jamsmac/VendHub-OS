/**
 * Filter Fiscal Receipts DTO
 * For querying fiscal receipts with pagination, date range, device, shift, type, and status filters.
 */

import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import {
  FiscalReceiptType,
  FiscalReceiptStatus,
} from "../entities/fiscal.entity";

export class FilterFiscalReceiptsDto {
  @ApiPropertyOptional({
    description: "Filter by fiscal device ID",
  })
  @IsOptional()
  @IsUUID()
  device_id?: string;

  @ApiPropertyOptional({
    description: "Filter by shift ID",
  })
  @IsOptional()
  @IsUUID()
  shift_id?: string;

  @ApiPropertyOptional({
    description: "Filter by receipt type",
    enum: FiscalReceiptType,
  })
  @IsOptional()
  @IsEnum(FiscalReceiptType)
  type?: FiscalReceiptType;

  @ApiPropertyOptional({
    description: "Filter by receipt status",
    enum: FiscalReceiptStatus,
  })
  @IsOptional()
  @IsEnum(FiscalReceiptStatus)
  status?: FiscalReceiptStatus;

  @ApiPropertyOptional({
    description: "Filter receipts created on or after this date (ISO 8601)",
    example: "2026-01-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: "Filter receipts created on or before this date (ISO 8601)",
    example: "2026-01-31T23:59:59.999Z",
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: "Number of items to return",
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: "Number of items to skip (for pagination)",
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
