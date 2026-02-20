/**
 * Directory Hierarchy & Inline Create DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MoveEntryDto {
  @ApiProperty({ description: 'New parent entry ID (null to move to root)', nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.newParentId !== null)
  @IsUUID()
  newParentId?: string | null;
}

export class InlineCreateEntryDto {
  @ApiProperty({ description: 'Entry name', example: 'Новая единица' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  name: string;

  @ApiPropertyOptional({ description: 'Entry code' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  code?: string;

  @ApiPropertyOptional({ description: 'Parent entry ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Field values (JSONB)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
