import { IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AdjustQuantityDto {
  @ApiProperty({ description: "Quantity adjustment (positive or negative)" })
  @IsNumber()
  adjustment: number;
}
