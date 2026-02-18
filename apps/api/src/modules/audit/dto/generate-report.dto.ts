/**
 * Generate Report DTO
 * Used for generating audit reports for compliance and analysis
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
  IsDateString,
  IsIn,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GenerateReportDto {
  @ApiProperty({
    description: "Organization ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @ApiProperty({
    description: "Type of report to generate",
    example: "activity",
    enum: ["activity", "security", "compliance", "access", "changes"],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(["activity", "security", "compliance", "access", "changes"])
  @MaxLength(50)
  report_type: string;

  @ApiProperty({
    description: "Start date for the report period (ISO 8601)",
    example: "2025-01-01T00:00:00.000Z",
  })
  @IsDateString()
  @IsNotEmpty()
  date_from: string;

  @ApiProperty({
    description: "End date for the report period (ISO 8601)",
    example: "2025-12-31T23:59:59.999Z",
  })
  @IsDateString()
  @IsNotEmpty()
  date_to: string;

  @ApiPropertyOptional({
    description: "Additional filters to apply to the report",
    example: { actions: ["create", "update"], entity_type: "users" },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
