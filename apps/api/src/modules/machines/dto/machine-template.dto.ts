import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { MachineType, ContentModel } from "@vendhub/shared";

// ── Sub-DTOs for JSONB arrays ──

class ContainerTemplateItem {
  @ApiProperty({ example: 1 })
  @IsNumber()
  slotNumber: number;

  @ApiProperty({ example: "Кофе зёрна" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(0)
  capacity: number;

  @ApiProperty({ example: "g" })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minLevel?: number;
}

class SlotTemplateItem {
  @ApiProperty({ example: "A1" })
  @IsString()
  @IsNotEmpty()
  slotNumber: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  capacity: number;
}

class ComponentTemplateItem {
  @ApiProperty({ example: "grinder" })
  @IsString()
  componentType: string;

  @ApiProperty({ example: "Встроенная кофемолка" })
  @IsString()
  name: string;
}

// ── Create DTO ──

export class CreateMachineTemplateDto {
  @ApiProperty({ example: "Necta Korinto Prime" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: MachineType })
  @IsEnum(MachineType)
  type: MachineType;

  @ApiProperty({ enum: ContentModel })
  @IsEnum(ContentModel)
  contentModel: ContentModel;

  @ApiPropertyOptional({ example: "Necta" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({ example: "Korinto Prime" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxProductSlots?: number;

  @ApiPropertyOptional({ type: [ContainerTemplateItem] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerTemplateItem)
  defaultContainers?: ContainerTemplateItem[];

  @ApiPropertyOptional({ type: [SlotTemplateItem] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlotTemplateItem)
  defaultSlots?: SlotTemplateItem[];

  @ApiPropertyOptional({ type: [ComponentTemplateItem] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentTemplateItem)
  defaultComponents?: ComponentTemplateItem[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  acceptsCash?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  acceptsCard?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  acceptsQr?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  acceptsNfc?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ── Update DTO ──

export class UpdateMachineTemplateDto extends PartialType(
  CreateMachineTemplateDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Create Machine from Template ──

export class CreateMachineFromTemplateDto {
  @ApiProperty({ description: "Template UUID to create machine from" })
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ example: "CF-016", description: "Unique machine number" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  machineNumber: string;

  @ApiProperty({ example: "Кофемашина Офис 3", description: "Display name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: "Serial number" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: "Location UUID" })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: "Purchase price" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;
}
