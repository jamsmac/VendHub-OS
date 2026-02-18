/**
 * Open Shift DTO
 * For opening a fiscal shift on a device.
 */

import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class OpenShiftDto {
  @ApiProperty({
    description: "Cashier name who is opening the shift",
    example: "Abdullayev Jasur",
  })
  @IsString()
  @MaxLength(255)
  cashier_name: string;
}
