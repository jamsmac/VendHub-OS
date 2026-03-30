import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Length,
  Min,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ConnectivityType, ConnectivityStatus } from "@vendhub/shared";

export class CreateConnectivityDto {
  @ApiProperty({ enum: ConnectivityType })
  @IsEnum(ConnectivityType)
  connectivityType: ConnectivityType;

  @ApiProperty({ example: "Beeline" })
  @IsString()
  @Length(1, 200)
  providerName: string;

  @ApiPropertyOptional({ example: "+998901234567" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  accountNumber?: string;

  @ApiPropertyOptional({ example: "Безлимит 50GB" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  tariffName?: string;

  @ApiPropertyOptional({ description: "Link to SIM card component" })
  @IsOptional()
  @IsUUID()
  componentId?: string;

  @ApiProperty({ example: 50000, description: "Monthly cost in UZS" })
  @IsNumber()
  @Min(0)
  monthlyCost: number;

  @ApiProperty({ example: "2025-01-15" })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: "2026-01-14" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateConnectivityDto {
  @ApiPropertyOptional({ enum: ConnectivityStatus })
  @IsOptional()
  @IsEnum(ConnectivityStatus)
  status?: ConnectivityStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  providerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  tariffName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
