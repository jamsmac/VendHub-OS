import { IsInt, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { SuccessfulPaymentDto } from "./telegram-payment.dto";

export class HandleSuccessfulPaymentBodyDto {
  @ApiProperty({ description: "Telegram user ID" })
  @IsInt()
  telegramUserId: number;

  @ApiProperty({ description: "Payment data", type: SuccessfulPaymentDto })
  @ValidateNested()
  @Type(() => SuccessfulPaymentDto)
  payment: SuccessfulPaymentDto;
}
