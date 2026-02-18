/**
 * Query Statistics DTO
 * Used for querying audit statistics for the dashboard
 */

import { IsNotEmpty, IsUUID, IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class QueryStatisticsDto {
  @ApiProperty({
    description: "Organization ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @ApiProperty({
    description: "Start date for statistics period (ISO 8601)",
    example: "2025-01-01T00:00:00.000Z",
  })
  @IsDateString()
  @IsNotEmpty()
  date_from: string;

  @ApiProperty({
    description: "End date for statistics period (ISO 8601)",
    example: "2025-12-31T23:59:59.999Z",
  })
  @IsDateString()
  @IsNotEmpty()
  date_to: string;
}
