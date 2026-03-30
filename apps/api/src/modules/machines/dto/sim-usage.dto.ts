import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export class CreateSimUsageDto {
  @ApiProperty({ description: "SIM component UUID" })
  @IsUUID()
  componentId: string;

  @ApiProperty({ description: "Period start date (YYYY-MM-DD)", example: "2026-03-01" })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: "Period end date (YYYY-MM-DD)", example: "2026-03-31" })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ description: "Data used in MB", example: 2300 })
  @IsNumber()
  @Min(0)
  dataUsedMb: number;

  @ApiPropertyOptional({ description: "Data limit in MB (from tariff)", example: 5120 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dataLimitMb?: number;

  @ApiProperty({ description: "Cost for the period in UZS", example: 50000 })
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiPropertyOptional({ description: "Notes", example: "Повышенный расход из-за обновления прошивки" })
  @IsOptional()
  @IsString()
  notes?: string;
}
