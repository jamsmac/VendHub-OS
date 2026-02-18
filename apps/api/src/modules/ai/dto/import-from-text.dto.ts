/**
 * Import From Text DTO
 * Used for parsing products from raw text input (CSV, JSON, plain text)
 */

import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum TextImportFormat {
  CSV = "csv",
  JSON = "json",
  PLAIN = "plain",
}

export class ImportFromTextDto {
  @ApiProperty({
    description: "Raw text containing product data to parse",
    example: "Coca-Cola 0.5l, 8000 UZS\nFanta 0.5l, 8000 UZS",
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({
    description: "Format hint for the text data",
    enum: TextImportFormat,
    example: TextImportFormat.PLAIN,
  })
  @IsOptional()
  @IsEnum(TextImportFormat)
  format?: TextImportFormat;
}
