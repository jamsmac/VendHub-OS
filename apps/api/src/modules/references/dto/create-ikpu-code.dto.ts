import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  Length,
  Min,
  Max,
} from "class-validator";

/**
 * DTO for creating an IKPU code entry.
 */
export class CreateIkpuCodeDto {
  @ApiProperty({
    description: "IKPU code (unique tax identification code)",
    example: "11014001001000001",
    maxLength: 20,
  })
  @IsString()
  @Length(1, 20)
  code: string;

  @ApiProperty({
    description: "Name in Russian",
    example: "Coca-Cola",
    maxLength: 500,
  })
  @IsString()
  @Length(1, 500)
  nameRu: string;

  @ApiPropertyOptional({
    description: "Name in Uzbek",
    example: "Coca-Cola",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  nameUz?: string;

  @ApiPropertyOptional({
    description: "Related MXIK code (foreign key to goods_classifiers)",
    example: "10820001001000000",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  mxikCode?: string;

  @ApiPropertyOptional({
    description: "VAT rate percentage",
    example: 12,
    minimum: 0,
    maximum: 100,
    default: 12,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional({
    description: "Whether this product requires mandatory marking",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isMarked?: boolean;

  @ApiPropertyOptional({
    description: "Package code reference",
    example: "BOTTLE",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  packageCode?: string;

  @ApiPropertyOptional({
    description: "Whether this IKPU code is active",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Additional metadata",
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating an IKPU code entry.
 * All fields optional except code (immutable).
 */
export class UpdateIkpuCodeDto extends PartialType(
  OmitType(CreateIkpuCodeDto, ["code"] as const),
) {}
