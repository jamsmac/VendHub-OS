/**
 * Create Incident DTO
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IncidentType, IncidentPriority } from "../entities/incident.entity";

export class CreateIncidentDto {
  @ApiPropertyOptional({
    description: "Organization ID (auto-filled from token)",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: "Machine ID where the incident occurred" })
  @IsUUID()
  @IsNotEmpty()
  machineId: string;

  @ApiProperty({
    description: "Type of incident",
    enum: IncidentType,
    example: IncidentType.MECHANICAL_FAILURE,
  })
  @IsEnum(IncidentType)
  @IsNotEmpty()
  type: IncidentType;

  @ApiPropertyOptional({
    description: "Incident priority",
    enum: IncidentPriority,
    default: IncidentPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;

  @ApiProperty({
    description: "Short title of the incident",
    example: "Coin mechanism jammed",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({
    description: "Detailed description of the incident",
    example:
      "The coin mechanism is stuck and not accepting coins. Customer reported at 14:30.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: "User ID to assign the incident to" })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional({
    description: "Estimated repair cost in UZS",
    example: 150000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  repairCost?: number;

  @ApiPropertyOptional({
    description: "Whether an insurance claim is being filed",
  })
  @IsOptional()
  @IsBoolean()
  insuranceClaim?: boolean;

  @ApiPropertyOptional({ description: "Insurance claim reference number" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  insuranceClaimNumber?: string;

  @ApiPropertyOptional({
    description: "Photo URLs documenting the incident",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
