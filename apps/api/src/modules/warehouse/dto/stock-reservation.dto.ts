import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsInt,
  Min,
  Length,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateReservationDto {
  @ApiProperty({ description: "Product ID" })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Quantity to reserve" })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ description: "Unit of measure", example: "pcs" })
  @IsString()
  @MaxLength(20)
  unit: string;

  @ApiProperty({
    description: "Purpose of reservation (e.g. order ID, route number)",
    example: "ORDER-2024-0042",
  })
  @IsString()
  @Length(1, 100)
  reservedFor: string;

  @ApiPropertyOptional({ description: "Specific batch to reserve from" })
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiPropertyOptional({
    description: "Hours until reservation expires (default: no expiry)",
    example: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInHours?: number;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class FulfillReservationDto {
  @ApiProperty({ description: "Quantity to fulfill" })
  @IsNumber()
  @Min(0.001)
  quantity: number;
}

export class CancelReservationDto {
  @ApiPropertyOptional({ description: "Cancellation reason" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class QuarantineBatchDto {
  @ApiProperty({ description: "Reason for quarantine" })
  @IsString()
  @Length(1, 500)
  reason: string;
}
