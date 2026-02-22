import { IsInt, Min, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CleanupNotificationsDto {
  @ApiPropertyOptional({
    description: "Delete notifications older than N days",
    default: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  olderThanDays?: number;
}
