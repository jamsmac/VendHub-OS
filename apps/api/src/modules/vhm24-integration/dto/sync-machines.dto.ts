import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SyncMachineItemDto {
  @ApiProperty({ description: "Machine ID from VHM24 system" })
  @IsString()
  machineId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  machineName?: string;

  @ApiProperty()
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  longitude: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;
}

export class SyncMachinesDto {
  @ApiProperty({ type: [SyncMachineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncMachineItemDto)
  machines: SyncMachineItemDto[];
}
