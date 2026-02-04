/**
 * Machine Access DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsDateString,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineAccessRole } from '../entities/machine-access.entity';

export class CreateMachineAccessDto {
  @ApiProperty({ description: 'Organization ID', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty({ description: 'Machine ID' })
  @IsUUID()
  @IsNotEmpty()
  machine_id: string;

  @ApiProperty({ description: 'User ID to grant access to' })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({
    description: 'Access role',
    enum: MachineAccessRole,
    example: MachineAccessRole.VIEW,
  })
  @IsEnum(MachineAccessRole)
  @IsNotEmpty()
  role: MachineAccessRole;

  @ApiPropertyOptional({ description: 'Start date for access validity' })
  @IsOptional()
  @IsDateString()
  valid_from?: string;

  @ApiPropertyOptional({ description: 'End date for access validity' })
  @IsOptional()
  @IsDateString()
  valid_to?: string;

  @ApiPropertyOptional({ description: 'Notes about this access grant' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RevokeMachineAccessDto {
  @ApiProperty({ description: 'Machine access record ID to revoke' })
  @IsUUID()
  @IsNotEmpty()
  access_id: string;

  @ApiPropertyOptional({ description: 'Reason for revoking access' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class BulkGrantAccessDto {
  @ApiProperty({ description: 'Machine ID' })
  @IsUUID()
  @IsNotEmpty()
  machine_id: string;

  @ApiProperty({ description: 'User IDs to grant access to', type: [String] })
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  user_ids: string[];

  @ApiProperty({
    description: 'Access role',
    enum: MachineAccessRole,
    example: MachineAccessRole.VIEW,
  })
  @IsEnum(MachineAccessRole)
  @IsNotEmpty()
  role: MachineAccessRole;

  @ApiPropertyOptional({ description: 'Start date for access validity' })
  @IsOptional()
  @IsDateString()
  valid_from?: string;

  @ApiPropertyOptional({ description: 'End date for access validity' })
  @IsOptional()
  @IsDateString()
  valid_to?: string;
}
