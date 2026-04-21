import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PaymentMethod } from "../entities/purchase.entity";

export class CreateDraftPurchaseDto {
  @ApiPropertyOptional({
    description: "Supplier ID (UUID)",
    example: "b21c1d8e-0c3a-4a7a-b2cf-1a2b3c4d5e6f",
  })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({
    description: "Destination warehouse location ID (UUID)",
  })
  @IsUUID()
  warehouseLocationId: string;

  @ApiPropertyOptional({
    description: "Payment method",
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: "Optional note" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
