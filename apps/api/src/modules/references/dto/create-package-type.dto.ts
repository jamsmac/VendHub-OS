import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Length,
  Min,
} from 'class-validator';

/**
 * DTO for creating a package type entry.
 */
export class CreatePackageTypeDto {
  @ApiProperty({
    description: 'Package type code (unique identifier)',
    example: 'BOTTLE',
    maxLength: 50,
  })
  @IsString()
  @Length(1, 50)
  code: string;

  @ApiProperty({
    description: 'Name in Russian',
    example: 'Бутылка',
    maxLength: 255,
  })
  @IsString()
  @Length(1, 255)
  name_ru: string;

  @ApiPropertyOptional({
    description: 'Name in Uzbek',
    example: 'Shisha',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name_uz?: string;

  @ApiPropertyOptional({
    description: 'Name in English',
    example: 'Bottle',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name_en?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of this package type',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this package type is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}

/**
 * DTO for updating a package type entry.
 * All fields optional except code (immutable).
 */
export class UpdatePackageTypeDto extends PartialType(
  OmitType(CreatePackageTypeDto, ['code'] as const),
) {}
