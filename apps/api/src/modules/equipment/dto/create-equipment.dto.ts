/**
 * Equipment Component DTOs
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  IsDate,
  IsArray,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  EquipmentComponentType,
  EquipmentComponentStatus,
  ComponentMaintenanceType,
} from '../entities/equipment-component.entity';

// ============================================================================
// EQUIPMENT COMPONENT DTOs
// ============================================================================

export class CreateEquipmentComponentDto {
  @ApiPropertyOptional({ description: 'Machine ID where component is installed' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiProperty({ enum: EquipmentComponentType, description: 'Type of component' })
  @IsEnum(EquipmentComponentType)
  componentType: EquipmentComponentType;

  @ApiProperty({ enum: EquipmentComponentStatus, default: EquipmentComponentStatus.NEW })
  @IsEnum(EquipmentComponentStatus)
  @IsOptional()
  componentStatus?: EquipmentComponentStatus = EquipmentComponentStatus.NEW;

  @ApiProperty({ description: 'Component name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Manufacturer' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Model' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'Purchase date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  purchaseDate?: Date;

  @ApiPropertyOptional({ description: 'Purchase price' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'Warranty end date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  warrantyUntil?: Date;

  @ApiPropertyOptional({ description: 'Installation date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  installedAt?: Date;

  @ApiPropertyOptional({ description: 'Expected life in hours' })
  @IsInt()
  @Min(1)
  @IsOptional()
  expectedLifeHours?: number;

  @ApiPropertyOptional({ description: 'Current operating hours' })
  @IsInt()
  @Min(0)
  @IsOptional()
  currentHours?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateEquipmentComponentDto extends PartialType(CreateEquipmentComponentDto) {}

export class CreateComponentMaintenanceDto {
  @ApiProperty({ description: 'Component ID' })
  @IsUUID()
  componentId: string;

  @ApiProperty({ enum: ComponentMaintenanceType })
  @IsEnum(ComponentMaintenanceType)
  maintenanceType: ComponentMaintenanceType;

  @ApiPropertyOptional({ description: 'Description of work' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Cost' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiPropertyOptional({ description: 'Date/time performed' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  performedAt?: Date;

  @ApiPropertyOptional({ description: 'Parts used', type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartUsedDto)
  @IsOptional()
  partsUsed?: PartUsedDto[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PartUsedDto {
  @ApiProperty({ description: 'Spare part ID' })
  @IsUUID()
  sparePartId: string;

  @ApiProperty({ description: 'Quantity used' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateComponentMovementDto {
  @ApiProperty({ description: 'Component ID' })
  @IsUUID()
  componentId: string;

  @ApiPropertyOptional({ description: 'Source machine ID' })
  @IsUUID()
  @IsOptional()
  fromMachineId?: string;

  @ApiPropertyOptional({ description: 'Destination machine ID' })
  @IsUUID()
  @IsOptional()
  toMachineId?: string;

  @ApiPropertyOptional({ description: 'Reason for movement' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class EquipmentQueryDto {
  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ enum: EquipmentComponentType })
  @IsEnum(EquipmentComponentType)
  @IsOptional()
  componentType?: EquipmentComponentType;

  @ApiPropertyOptional({ enum: EquipmentComponentStatus })
  @IsEnum(EquipmentComponentStatus)
  @IsOptional()
  componentStatus?: EquipmentComponentStatus;

  @ApiPropertyOptional({ description: 'Search by name or serial number' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class MaintenanceHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by component ID' })
  @IsUUID()
  @IsOptional()
  componentId?: string;

  @ApiPropertyOptional({ enum: ComponentMaintenanceType })
  @IsEnum(ComponentMaintenanceType)
  @IsOptional()
  maintenanceType?: ComponentMaintenanceType;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

export class MovementQueryDto {
  @ApiPropertyOptional({ description: 'Filter by component ID' })
  @IsUUID()
  @IsOptional()
  componentId?: string;

  @ApiPropertyOptional({ description: 'Filter by machine ID (from or to)' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
