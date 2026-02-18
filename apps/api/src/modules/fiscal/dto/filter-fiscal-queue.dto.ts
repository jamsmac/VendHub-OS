/**
 * Filter Fiscal Queue DTO
 * For querying fiscal queue items by status.
 */

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum } from "class-validator";
import { FiscalQueueStatus } from "../entities/fiscal.entity";

export class FilterFiscalQueueDto {
  @ApiPropertyOptional({
    description: "Filter by queue item status",
    enum: FiscalQueueStatus,
  })
  @IsOptional()
  @IsEnum(FiscalQueueStatus)
  status?: FiscalQueueStatus;
}
