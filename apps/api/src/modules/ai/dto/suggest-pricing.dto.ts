/**
 * Suggest Pricing DTO
 * Used for AI-powered optimal pricing suggestions for vending machine products
 */

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SuggestPricingDto {
  @ApiProperty({
    description: "Name of the product to price",
    example: "Americano",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  product_name: string;

  @ApiProperty({
    description: "Product category",
    example: "coffee",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiProperty({
    description: "Product cost price in UZS",
    example: 3500,
  })
  @IsNumber()
  @Min(0)
  cost_price: number;

  @ApiProperty({
    description: "Type of location where the vending machine is installed",
    example: "business_center",
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  location_type: string;
}
