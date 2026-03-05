import {
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from "class-validator";

export class CreateDepositDto {
  @IsNumber()
  @Min(1)
  @Max(1_000_000_000)
  amount: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
