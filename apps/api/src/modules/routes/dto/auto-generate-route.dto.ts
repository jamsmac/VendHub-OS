import { IsOptional, IsBoolean, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class AutoGenerateRouteDto {
  @ApiPropertyOptional({ description: "Include REFILL_SOON recommendations" })
  @IsOptional()
  @IsBoolean()
  includeRefillSoon?: boolean;

  @ApiPropertyOptional({ description: "Override operator ID", format: "uuid" })
  @IsOptional()
  @IsUUID()
  operatorId?: string;
}
