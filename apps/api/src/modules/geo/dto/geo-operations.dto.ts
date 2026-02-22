import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { CoordinatesDto } from "./geo.dto";

export class CalculateDistanceDto {
  @ApiProperty({
    description: "Starting point coordinates",
    type: CoordinatesDto,
  })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  from: CoordinatesDto;

  @ApiProperty({
    description: "Ending point coordinates",
    type: CoordinatesDto,
  })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  to: CoordinatesDto;
}
