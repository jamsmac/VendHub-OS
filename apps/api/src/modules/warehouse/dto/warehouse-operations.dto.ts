import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsInt,
  Min,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TransferStockDto {
  @ApiProperty({ description: "Target warehouse ID" })
  @IsUUID()
  toWarehouseId: string;

  @ApiProperty({ description: "Product ID" })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Quantity to transfer" })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: "Reference number" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  referenceNumber?: string;

  @ApiPropertyOptional({ description: "Transfer cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ description: "Notes" })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class DepleteFromBatchDto {
  @ApiProperty({ description: "Product ID to deplete" })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: "Quantity to deplete" })
  @IsInt()
  @Min(1)
  quantity: number;
}
