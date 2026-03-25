/**
 * Query Statistics DTO
 * Used for querying audit statistics for the dashboard
 */

import { IsOptional, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryStatisticsDto {
  @ApiPropertyOptional({
    description: "Start date for statistics period (ISO 8601)",
    example: "2025-01-01T00:00:00.000Z",
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: "End date for statistics period (ISO 8601)",
    example: "2025-12-31T23:59:59.999Z",
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
