/**
 * Query Entity History DTO
 * Used for querying audit history of a specific entity
 */

import { IsOptional, IsBoolean, IsInt, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";

export class QueryEntityHistoryDto {
  @ApiPropertyOptional({
    description: "Maximum number of log entries to return",
    minimum: 1,
    maximum: 500,
    default: 100,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;

  @ApiPropertyOptional({
    description: "Whether to include entity snapshots in the response",
    default: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  include_snapshots?: boolean = false;
}
