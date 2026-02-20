/**
 * Update Incident DTO
 */

import {
  IsString,
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
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IncidentType,
  IncidentStatus,
  IncidentPriority,
} from "../entities/incident.entity";

export class UpdateIncidentDto {
  @ApiPropertyOptional({
    description: "Updated incident type",
    enum: IncidentType,
  })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @ApiPropertyOptional({
    description: "Updated incident status",
    enum: IncidentStatus,
  })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({
    description: "Updated incident priority",
    enum: IncidentPriority,
  })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;

  @ApiPropertyOptional({ description: "Updated title" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ description: "Updated description" })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: "Assign to user" })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: "Updated repair cost in UZS" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  repairCost?: number;

  @ApiPropertyOptional({ description: "Insurance claim flag" })
  @IsOptional()
  @IsBoolean()
  insuranceClaim?: boolean;

  @ApiPropertyOptional({ description: "Insurance claim reference number" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  insuranceClaimNumber?: string;

  @ApiPropertyOptional({ description: "Photo URLs", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({
    description: "Resolution description (when resolving)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  resolution?: string;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class QueryIncidentsDto {
  @ApiPropertyOptional({ description: "Organization ID" })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: "Machine ID filter" })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: "Status filter", enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ description: "Type filter", enum: IncidentType })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @ApiPropertyOptional({
    description: "Priority filter",
    enum: IncidentPriority,
  })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;

  @ApiPropertyOptional({ description: "Assigned user ID filter" })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: "Search by title or description" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter from date (ISO)" })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: "Filter to date (ISO)" })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "Items per page", default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
