import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUrl,
  IsDateString,
  MaxLength,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BannerPosition, BannerStatus } from "../entities/cms-banner.entity";

export class CreateCmsBannerDto {
  @ApiProperty({ description: "Banner title (Russian)", maxLength: 255 })
  @IsString()
  @MaxLength(255)
  titleRu: string;

  @ApiPropertyOptional({ description: "Banner description (Russian)" })
  @IsOptional()
  @IsString()
  descriptionRu?: string;

  @ApiPropertyOptional({ description: "Banner title (Uzbek)", maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleUz?: string;

  @ApiPropertyOptional({ description: "Banner description (Uzbek)" })
  @IsOptional()
  @IsString()
  descriptionUz?: string;

  @ApiPropertyOptional({ description: "Banner image URL" })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Mobile banner image URL" })
  @IsOptional()
  @IsUrl()
  imageUrlMobile?: string;

  @ApiPropertyOptional({ description: "Link URL for CTA" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @ApiPropertyOptional({ description: "Button text (Russian)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonTextRu?: string;

  @ApiPropertyOptional({ description: "Button text (Uzbek)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonTextUz?: string;

  @ApiPropertyOptional({
    description: "Banner position",
    enum: BannerPosition,
    default: BannerPosition.HERO,
  })
  @IsOptional()
  @IsEnum(BannerPosition)
  position?: BannerPosition;

  @ApiPropertyOptional({
    description: "Banner status",
    enum: BannerStatus,
    default: BannerStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;

  @ApiPropertyOptional({ description: "Sort order", default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "Active from date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: "Active until date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description: "Background color (hex)",
    example: "#FF5733",
  })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  backgroundColor?: string;

  @ApiPropertyOptional({ description: "Text color (hex)", example: "#FFFFFF" })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  textColor?: string;
}

export class UpdateCmsBannerDto {
  @ApiPropertyOptional({ description: "Banner title (Russian)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleRu?: string;

  @ApiPropertyOptional({ description: "Banner description (Russian)" })
  @IsOptional()
  @IsString()
  descriptionRu?: string;

  @ApiPropertyOptional({ description: "Banner title (Uzbek)" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleUz?: string;

  @ApiPropertyOptional({ description: "Banner description (Uzbek)" })
  @IsOptional()
  @IsString()
  descriptionUz?: string;

  @ApiPropertyOptional({ description: "Banner image URL" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Mobile banner image URL" })
  @IsOptional()
  @IsString()
  imageUrlMobile?: string;

  @ApiPropertyOptional({ description: "Link URL for CTA" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @ApiPropertyOptional({ description: "Button text (Russian)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonTextRu?: string;

  @ApiPropertyOptional({ description: "Button text (Uzbek)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonTextUz?: string;

  @ApiPropertyOptional({ description: "Banner position", enum: BannerPosition })
  @IsOptional()
  @IsEnum(BannerPosition)
  position?: BannerPosition;

  @ApiPropertyOptional({ description: "Banner status", enum: BannerStatus })
  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;

  @ApiPropertyOptional({ description: "Sort order" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: "Active from date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: "Active until date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: "Background color (hex)" })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  backgroundColor?: string;

  @ApiPropertyOptional({ description: "Text color (hex)" })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  textColor?: string;
}
