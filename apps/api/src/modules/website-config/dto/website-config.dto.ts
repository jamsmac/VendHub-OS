/**
 * Website Config DTOs
 */

import { IsString, IsEnum, IsOptional, MaxLength } from "class-validator";
import { WebsiteConfigSection } from "../entities/website-config.entity";

export class CreateWebsiteConfigDto {
  @IsString()
  @MaxLength(255)
  key: string;

  @IsString()
  value: string;

  @IsEnum(WebsiteConfigSection)
  @IsOptional()
  section?: WebsiteConfigSection;
}

export class UpdateWebsiteConfigDto {
  @IsString()
  @IsOptional()
  value?: string;

  @IsEnum(WebsiteConfigSection)
  @IsOptional()
  section?: WebsiteConfigSection;
}

export class BulkUpdateWebsiteConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsEnum(WebsiteConfigSection)
  @IsOptional()
  section?: WebsiteConfigSection;
}
