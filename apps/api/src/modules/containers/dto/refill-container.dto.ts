/**
 * Refill Container DTO
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RefillContainerDto {
  @ApiProperty({
    description: "Quantity to add to the container",
    example: 500,
    minimum: 0.001,
  })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: "Notes about the refill" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: "Batch number of the refilled product",
    example: "BATCH-2026-001",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNumber?: string;
}
