import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IntegrationCategory,
  IntegrationStatus,
} from "../types/integration.types";

export class CreateIntegrationBodyDto {
  @ApiProperty({ description: "Integration unique name" })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ description: "Display name" })
  @IsString()
  @Length(1, 200)
  displayName: string;

  @ApiProperty({ enum: IntegrationCategory })
  @IsEnum(IntegrationCategory)
  category: IntegrationCategory;

  @ApiPropertyOptional({ description: "Description" })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ description: "Template ID to use" })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: "Documentation URL" })
  @IsOptional()
  @IsString()
  documentationUrl?: string;
}

export class UpdateIntegrationBodyDto {
  @ApiPropertyOptional({ description: "Display name" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  displayName?: string;

  @ApiPropertyOptional({ description: "Description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Priority order" })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: "Enable sandbox mode" })
  @IsOptional()
  @IsBoolean()
  sandboxMode?: boolean;
}

export class UpdateCredentialsDto {
  @ApiProperty({ description: "Credentials key-value pairs" })
  @IsObject()
  credentials: Record<string, string>;

  @ApiProperty({ description: "Whether these are sandbox credentials" })
  @IsBoolean()
  isSandbox: boolean;
}

export class UpdateIntegrationStatusDto {
  @ApiProperty({ enum: IntegrationStatus })
  @IsEnum(IntegrationStatus)
  status: IntegrationStatus;
}

export class StartAISessionDto {
  @ApiPropertyOptional({ description: "Documentation URL for AI to analyze" })
  @IsOptional()
  @IsString()
  documentationUrl?: string;
}

export class SendAIMessageDto {
  @ApiProperty({ description: "Message to AI" })
  @IsString()
  @Length(1, 5000)
  message: string;
}
