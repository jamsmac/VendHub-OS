import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ManualVerifyDto {
  @ApiProperty({ enum: ["verified", "skipped"] })
  @IsEnum(["verified", "skipped"])
  status: "verified" | "skipped";

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
