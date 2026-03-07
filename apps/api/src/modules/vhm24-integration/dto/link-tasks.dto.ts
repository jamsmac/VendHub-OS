import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LinkTaskItemDto {
  @ApiProperty({ description: "Task ID from VHM24 system" })
  @IsString()
  vhm24TaskId: string;

  @ApiProperty({ description: "Task type from VHM24 system" })
  @IsString()
  vhm24TaskType: string;

  @ApiProperty({ description: "Machine ID from VHM24 system" })
  @IsString()
  vhm24MachineId: string;

  @ApiProperty()
  @IsNumber()
  expectedLatitude: number;

  @ApiProperty()
  @IsNumber()
  expectedLongitude: number;

  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsNumber()
  verificationRadiusM?: number;
}

export class LinkTasksDto {
  @ApiProperty({ type: [LinkTaskItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkTaskItemDto)
  tasks: LinkTaskItemDto[];
}
