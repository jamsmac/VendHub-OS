/**
 * Create Machine DTO
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineType, MachineStatus } from '../entities/machine.entity';

export class CreateMachineDto {
  @ApiProperty({ example: 'Кофе-автомат Mega #1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'VH-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'CF-2024-001-TAS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serialNumber: string;

  @ApiPropertyOptional({ enum: MachineType, default: MachineType.COMBO })
  @IsOptional()
  @IsEnum(MachineType)
  type?: MachineType = MachineType.COMBO;

  @ApiPropertyOptional({ enum: MachineStatus, default: MachineStatus.DISABLED })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus = MachineStatus.DISABLED;

  @ApiPropertyOptional({ example: 'Necta' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'Krea Touch' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @IsNumber()
  @Min(1990)
  @Max(2100)
  yearManufactured?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  slotCount?: number;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedOperatorId?: string;

  @ApiPropertyOptional({ example: { temperature: { coffee: 85 } } })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ example: ['cash', 'card', 'payme'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentMethods?: string[];

  @ApiPropertyOptional({ example: 'https://vendhub.uz/c/VH-001' })
  @IsOptional()
  @IsString()
  qrCodeComplaint?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateMachineDto {
  @ApiPropertyOptional({ example: 'Кофе-автомат Mega #1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: MachineType })
  @IsOptional()
  @IsEnum(MachineType)
  type?: MachineType;

  @ApiPropertyOptional({ enum: MachineStatus })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  slotCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedOperatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentMethods?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCodeComplaint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryMachinesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional({ enum: MachineType })
  @IsOptional()
  @IsEnum(MachineType)
  type?: MachineType;

  @ApiPropertyOptional({ enum: MachineStatus })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
