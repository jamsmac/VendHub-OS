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
  IsInt,
  IsObject,
  Length,
  Min,
  Max,
} from "class-validator";

/**
 * DTO for creating a MXIK goods classifier entry.
 */
export class CreateGoodsClassifierDto {
  @ApiProperty({
    description: "MXIK code (unique identifier from Uzbekistan tax system)",
    example: "10820001001000000",
    maxLength: 20,
  })
  @IsString()
  @Length(1, 20)
  code: string;

  @ApiProperty({
    description: "Name in Russian",
    example: "Напитки безалкогольные",
    maxLength: 500,
  })
  @IsString()
  @Length(1, 500)
  nameRu: string;

  @ApiPropertyOptional({
    description: "Name in Uzbek",
    example: "Alkogolsiz ichimliklar",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  nameUz?: string;

  @ApiPropertyOptional({
    description: "Name in English",
    example: "Non-alcoholic beverages",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  nameEn?: string;

  @ApiPropertyOptional({
    description: "Group code from MXIK hierarchy",
    example: "108",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  groupCode?: string;

  @ApiPropertyOptional({
    description: "Group name",
    example: "Напитки",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  groupName?: string;

  @ApiPropertyOptional({
    description: "Subgroup code",
    example: "20001",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  subgroupCode?: string;

  @ApiPropertyOptional({
    description: "Subgroup name",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  subgroupName?: string;

  @ApiPropertyOptional({
    description: "Parent MXIK code for hierarchy navigation",
    example: "10820001000000000",
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  parentCode?: string;

  @ApiPropertyOptional({
    description: "Hierarchy depth level (1-5)",
    example: 3,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  level?: number;

  @ApiPropertyOptional({
    description: "Whether this classifier entry is active",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Additional metadata from Soliq.uz",
    example: { source: "soliq.uz", imported_at: "2024-01-01" },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating a MXIK goods classifier entry.
 * All fields optional except code (immutable).
 */
export class UpdateGoodsClassifierDto extends PartialType(
  OmitType(CreateGoodsClassifierDto, ["code"] as const),
) {}
