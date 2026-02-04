import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDate,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ComponentType } from '../entities/machine.entity';

export class InstallComponentDto {
  @ApiProperty({ enum: ComponentType, description: 'Type of the component' })
  @IsEnum(ComponentType)
  componentType: ComponentType;

  @ApiProperty({ example: 'Hopper 1.2L', description: 'Component name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Serial number of the component' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Manufacturer name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Model name/number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: 'Purchase price in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'Warranty expiration date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  warrantyUntil?: Date;

  @ApiPropertyOptional({ description: 'Expected life in operational hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedLifeHours?: number;
}
