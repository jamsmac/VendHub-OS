import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CancelMaintenanceDto {
  @ApiProperty({ description: "Cancellation reason" })
  @IsString()
  @Length(1, 500)
  reason: string;
}
