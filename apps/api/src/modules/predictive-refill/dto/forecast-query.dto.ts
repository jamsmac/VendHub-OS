import { IsOptional, IsEnum, IsUUID, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { RefillAction } from "../entities/refill-recommendation.entity";

export class GetRecommendationsDto {
  @ApiPropertyOptional({ enum: RefillAction })
  @IsOptional()
  @IsEnum(RefillAction)
  action?: RefillAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
