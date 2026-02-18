/**
 * Detect Anomaly DTO
 * Used for AI-powered sales anomaly detection for vending machines
 */

import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsNumber,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class SalesDataPointDto {
  @ApiProperty({
    description: "Date of the sales data point (ISO 8601)",
    example: "2025-01-15",
  })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: "Total sales amount in UZS for the date",
    example: 450000,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: "Number of transactions for the date",
    example: 52,
  })
  @IsNumber()
  @Min(0)
  transactions: number;
}

export class HistoricalAverageDto {
  @ApiProperty({
    description: "Average daily sales amount in UZS",
    example: 500000,
  })
  @IsNumber()
  @Min(0)
  avg_amount: number;

  @ApiProperty({
    description: "Average daily number of transactions",
    example: 60,
  })
  @IsNumber()
  @Min(0)
  avg_transactions: number;
}

export class DetectAnomalyDto {
  @ApiProperty({
    description: "UUID of the vending machine to analyze",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsNotEmpty()
  machine_id: string;

  @ApiProperty({
    description: "Array of daily sales data points",
    type: [SalesDataPointDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesDataPointDto)
  sales_data: SalesDataPointDto[];

  @ApiProperty({
    description: "Historical average metrics for comparison",
    type: HistoricalAverageDto,
  })
  @ValidateNested()
  @Type(() => HistoricalAverageDto)
  historical_average: HistoricalAverageDto;
}
