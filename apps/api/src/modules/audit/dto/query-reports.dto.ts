/**
 * Query Reports DTO
 * Used for querying audit reports for an organization
 */

import {
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class QueryReportsDto {
  @ApiProperty({
    description: "Organization ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @ApiPropertyOptional({
    description: "Maximum number of reports to return",
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
