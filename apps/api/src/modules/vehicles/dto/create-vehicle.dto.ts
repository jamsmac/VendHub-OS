import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
  MaxLength,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { VehicleType, VehicleStatus } from '../entities/vehicle.entity';

export class CreateVehicleDto {
  @ApiPropertyOptional({ description: 'Organization ID (defaults to user org)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Owner employee ID (for personal vehicles)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerEmployeeId?: string;

  @ApiProperty({ description: 'Vehicle type', enum: VehicleType })
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty({ description: 'Vehicle brand', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand: string;

  @ApiPropertyOptional({ description: 'Vehicle model', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiProperty({ description: 'License plate number', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plateNumber: string;

  @ApiPropertyOptional({ description: 'Current odometer reading (km)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentOdometer?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional({ description: 'Owner employee ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerEmployeeId?: string;

  @ApiPropertyOptional({ description: 'Vehicle type', enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @ApiPropertyOptional({ description: 'Vehicle brand', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: 'Vehicle model', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: 'License plate number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  plateNumber?: string;

  @ApiPropertyOptional({ description: 'Vehicle status', enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ description: 'Current odometer reading (km)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentOdometer?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOdometerDto {
  @ApiProperty({ description: 'New odometer reading (km)' })
  @IsNumber()
  @Min(0)
  odometer: number;
}
