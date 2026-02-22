import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendNotificationBodyDto {
  @ApiProperty({ description: "Notification message" })
  @IsString()
  @Length(1, 2000)
  message: string;
}
