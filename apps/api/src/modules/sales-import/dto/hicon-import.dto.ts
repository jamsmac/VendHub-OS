import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from "class-validator";
import { SalesImportFormat } from "../entities/sales-import.entity";

export class UploadSalesImportDto {
  @ApiProperty({ description: "Original filename" })
  @IsString()
  @Length(1, 255)
  fileName: string;

  @ApiProperty({ description: "Raw file content (UTF-8 text)" })
  @IsString()
  fileContent: string;

  @ApiPropertyOptional({
    description: "Import format hint (auto-detected if omitted)",
    enum: SalesImportFormat,
  })
  @IsOptional()
  @IsEnum(SalesImportFormat)
  format?: SalesImportFormat;
}

export class ConfirmMappingDto {
  @ApiProperty({ description: "Parse session ID", format: "uuid" })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: "Target machine ID", format: "uuid" })
  @IsUUID()
  machineId: string;

  @ApiProperty({ description: "Report day (YYYY-MM-DD)" })
  @IsDateString()
  reportDay: string;

  @ApiPropertyOptional({ description: "Column index for product name" })
  @IsOptional()
  @IsInt()
  @Min(0)
  productCol?: number;

  @ApiPropertyOptional({ description: "Column index for quantity" })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityCol?: number;

  @ApiPropertyOptional({ description: "Column index for total amount" })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalAmountCol?: number;

  @ApiPropertyOptional({ description: "Column index for txn ID (L2 dedup)" })
  @IsOptional()
  @IsInt()
  @Min(-1)
  txnIdCol?: number;
}

export class ExecuteImportDto {
  @ApiProperty({ description: "Parse session ID", format: "uuid" })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: "Target machine ID", format: "uuid" })
  @IsUUID()
  machineId: string;

  @ApiProperty({ description: "Report day (YYYY-MM-DD)" })
  @IsDateString()
  reportDay: string;

  @ApiProperty({
    description:
      "Mapping of CSV productName → productId. Missing entries are counted as unmapped.",
  })
  productMap: Record<string, string>;

  @ApiPropertyOptional({ description: "Column index for product name" })
  @IsOptional()
  @IsInt()
  @Min(0)
  productCol?: number;

  @ApiPropertyOptional({ description: "Column index for txn ID" })
  @IsOptional()
  @IsInt()
  @Min(-1)
  txnIdCol?: number;

  @ApiPropertyOptional({
    description: "Additional product names to treat as unmapped",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unmappedNames?: string[];
}
