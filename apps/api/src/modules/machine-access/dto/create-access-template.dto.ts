/**
 * Access Template DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MachineAccessRole } from '../entities/machine-access.entity';

export class AccessTemplateRowDto {
  @ApiProperty({
    description: 'Access role for this template row',
    enum: MachineAccessRole,
    example: MachineAccessRole.REFILL,
  })
  @IsEnum(MachineAccessRole)
  @IsNotEmpty()
  role: MachineAccessRole;

  @ApiPropertyOptional({
    description: 'Permissions JSON for this role',
    example: { can_view_sales: true, can_export: false },
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>;
}

export class CreateAccessTemplateDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Standard Operator Access',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Default access template for field operators',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the template is active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description: 'Template rows defining roles and permissions',
    type: [AccessTemplateRowDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AccessTemplateRowDto)
  rows: AccessTemplateRowDto[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateAccessTemplateDto extends PartialType(CreateAccessTemplateDto) {}

export class ApplyTemplateDto {
  @ApiProperty({ description: 'Template ID to apply' })
  @IsUUID()
  @IsNotEmpty()
  template_id: string;

  @ApiProperty({ description: 'Machine ID to apply template to' })
  @IsUUID()
  @IsNotEmpty()
  machine_id: string;

  @ApiProperty({ description: 'User IDs to apply template for', type: [String] })
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  user_ids: string[];
}
