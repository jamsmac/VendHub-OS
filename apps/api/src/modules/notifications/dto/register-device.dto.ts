import { IsEnum, IsString, IsOptional, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DeviceType } from "../entities/device-token.entity";

export class RegisterDeviceDto {
  @ApiProperty({ description: "Expo push token" })
  @IsString()
  @MaxLength(255)
  token: string;

  @ApiProperty({ enum: DeviceType })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  platformVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appVersion?: string;
}
