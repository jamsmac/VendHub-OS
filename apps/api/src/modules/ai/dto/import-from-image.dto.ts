/**
 * Import From Image DTO
 * Used for parsing products from base64-encoded images
 */

import { IsString, IsNotEmpty, IsOptional, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ImportFromImageDto {
  @ApiProperty({
    description: "Base64-encoded image data (menu, price list, invoice)",
    example: "iVBORw0KGgoAAAANSUhEUg...",
  })
  @IsString()
  @IsNotEmpty()
  image_base64: string;

  @ApiPropertyOptional({
    description:
      'Additional context for AI parsing (e.g., "vending machine menu")',
    example: "Vending machine product price list",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string;
}
