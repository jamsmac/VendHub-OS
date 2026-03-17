import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsString,
  Min,
  Max,
} from "class-validator";

export class UpdateTelemetryDto {
  @ApiPropertyOptional({ example: 5.2, description: "Temperature in °C" })
  @IsOptional()
  @IsNumber()
  @Min(-50)
  @Max(80)
  temperature?: number;

  @ApiPropertyOptional({ example: 45, description: "Humidity %" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  doorOpen?: boolean;

  @ApiPropertyOptional({ example: ["E001"], description: "Active error codes" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errorCodes?: string[];

  @ApiPropertyOptional({ example: -65, description: "Signal strength in dBm" })
  @IsOptional()
  @IsNumber()
  signalStrength?: number;

  @ApiPropertyOptional({ example: 220, description: "Power voltage" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  powerVoltage?: number;

  @ApiPropertyOptional({ example: 75, description: "Water level %" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  waterLevel?: number;

  @ApiPropertyOptional({ example: 60, description: "Coffee beans level %" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  coffeeBeansLevel?: number;

  @ApiPropertyOptional({ example: 80, description: "Milk level %" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  milkLevel?: number;

  @ApiPropertyOptional({ example: 150, description: "Remaining cups" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cupCount?: number;
}
