import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from "class-validator";
import { PayoutMethod } from "../entities/payout-request.entity";

export class CreatePayoutRequestDto {
  @ApiProperty({
    description: "Payout amount in UZS",
    example: 500000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: "Amount must be at least 1 UZS" })
  amount: number;

  @ApiPropertyOptional({
    description: "Payout method",
    enum: PayoutMethod,
    default: PayoutMethod.BANK_TRANSFER,
  })
  @IsOptional()
  @IsEnum(PayoutMethod)
  payoutMethod?: PayoutMethod;

  @ApiPropertyOptional({
    description: "Reason for the payout request",
    example: "Monthly profit withdrawal",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({
    description: "Bank account or card (masked)",
    example: "HUMO **** 1234",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  payoutDestination?: string;
}
