import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { InventoryReconciliationStatus } from "../entities/inventory-reconciliation.entity";

export class QueryReconciliationsDto {
  @ApiPropertyOptional({ enum: InventoryReconciliationStatus })
  @IsOptional()
  @IsEnum(InventoryReconciliationStatus)
  status?: InventoryReconciliationStatus;

  @ApiPropertyOptional({ description: "Filter by location ID" })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: "Page size (1..200)", default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ description: "Offset", default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
