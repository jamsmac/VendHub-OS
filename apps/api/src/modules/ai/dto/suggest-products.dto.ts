/**
 * Suggest Products DTO
 * Used for AI-powered product suggestions based on location type and audience
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SuggestProductsDto {
  @ApiProperty({
    description: "Type of location where the vending machine is installed",
    example: "university",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  location_type: string;

  @ApiProperty({
    description: "List of product names already available in the machine",
    example: ["Coca-Cola 0.5л", "Lay's Классические"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  existing_products: string[];

  @ApiPropertyOptional({
    description: "Target audience for product selection",
    example: "students",
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  target_audience?: string;
}
