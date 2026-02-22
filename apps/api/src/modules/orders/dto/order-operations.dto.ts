import { IsString, IsOptional, Length } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CancelOrderDto {
  @ApiPropertyOptional({ description: "Cancellation reason" })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;
}
