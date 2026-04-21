import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class StartReconciliationDto {
  @ApiProperty({ description: "Location ID where physical count is performed" })
  @IsUUID()
  locationId: string;
}
