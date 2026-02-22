import { IsArray, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CheckProductStatusBulkDto {
  @ApiProperty({ description: "Product IDs to check", type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  productIds: string[];
}

export class CheckMachineStatusBulkDto {
  @ApiProperty({ description: "Machine IDs to check", type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  machineIds: string[];
}
