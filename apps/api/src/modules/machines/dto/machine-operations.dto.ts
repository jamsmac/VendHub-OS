import { IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { MachineStatus } from "../entities/machine.entity";

export class UpdateMachineStatusDto {
  @ApiProperty({ enum: MachineStatus })
  @IsEnum(MachineStatus)
  status: MachineStatus;
}
