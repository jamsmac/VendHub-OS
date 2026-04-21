import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class AddPurchaseItemDto {
  @ApiProperty({ description: "Product ID (UUID)" })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Quantity (positive integer)", example: 50 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: "Unit cost in UZS (non-negative)",
    example: 12500,
  })
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional({ description: "Optional item note" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
