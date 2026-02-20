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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentType, IncidentPriority } from '../entities/incident.entity';

export class CreateIncidentDto {
  @ApiPropertyOptional({ description: 'Organization ID (auto-filled from token)' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty({ description: 'Machine ID where the incident occurred' })
  @IsUUID()
  @IsNotEmpty()
  machine_id: string;

  @ApiProperty({
    description: 'Type of incident',
    enum: IncidentType,
    example: IncidentType.MECHANICAL_FAILURE,
  })
  @IsEnum(IncidentType)
  @IsNotEmpty()
  type: IncidentType;

  @ApiPropertyOptional({
    description: 'Incident priority',
    enum: IncidentPriority,
    default: IncidentPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(IncidentPriority)
  priority?: IncidentPriority;

  @ApiProperty({
    description: 'Short title of the incident',
    example: 'Coin mechanism jammed',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the incident',
    example: 'The coin mechanism is stuck and not accepting coins. Customer reported at 14:30.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'User ID to assign the incident to' })
  @IsOptional()
  @IsUUID()
  assigned_to_user_id?: string;

  @ApiPropertyOptional({
    description: 'Estimated repair cost in UZS',
    example: 150000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  repair_cost?: number;

  @ApiPropertyOptional({ description: 'Whether an insurance claim is being filed' })
  @IsOptional()
  @IsBoolean()
  insurance_claim?: boolean;

  @ApiPropertyOptional({ description: 'Insurance claim reference number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  insurance_claim_number?: string;

  @ApiPropertyOptional({
    description: 'Photo URLs documenting the incident',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
