import { IsArray, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class BulkApproveWorkLogsDto {
  @ApiProperty({ description: "Work log IDs to approve", type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  ids: string[];
}
