/**
 * Suggest Response DTO
 * Used for AI-generated complaint response suggestions
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum ResponseLanguage {
  RU = "ru",
  UZ = "uz",
  EN = "en",
}

export class SuggestResponseDto {
  @ApiProperty({
    description: "Complaint subject line",
    example: "Автомат не выдал товар",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    description: "Full complaint description",
    example: "Оплатил 15000 сум, но кофе не получил",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: "Complaint category",
    example: "product_not_dispensed",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({
    description: "Customer name for personalized response",
    example: "Алишер",
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customer_name?: string;

  @ApiPropertyOptional({
    description: "Language for the generated response",
    enum: ResponseLanguage,
    default: ResponseLanguage.RU,
    example: ResponseLanguage.RU,
  })
  @IsOptional()
  @IsEnum(ResponseLanguage)
  language?: ResponseLanguage;
}
