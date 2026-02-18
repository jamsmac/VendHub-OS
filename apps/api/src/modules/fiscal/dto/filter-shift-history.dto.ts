/**
 * Filter Shift History DTO
 * For querying shift history with optional limit.
 */

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class FilterShiftHistoryDto {
  @ApiPropertyOptional({
    description: "Maximum number of shifts to return",
    default: 30,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number = 30;
}
