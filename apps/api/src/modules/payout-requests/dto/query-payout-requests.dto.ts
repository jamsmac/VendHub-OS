import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { PayoutRequestStatus } from "../entities/payout-request.entity";

export class QueryPayoutRequestsDto {
  @ApiPropertyOptional({
    description: "Filter by status",
    enum: PayoutRequestStatus,
  })
  @IsOptional()
  @IsEnum(PayoutRequestStatus)
  status?: PayoutRequestStatus;

  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
