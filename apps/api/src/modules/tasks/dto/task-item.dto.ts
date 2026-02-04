import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 10, description: 'Planned quantity to load' })
  @IsNumber()
  @Min(0)
  plannedQuantity: number;

  @ApiPropertyOptional({ description: 'Slot number in machine' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  slotNumber?: string;

  @ApiPropertyOptional({ description: 'Unit of measure code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unitOfMeasure?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTaskItemDto {
  @ApiPropertyOptional({ description: 'Planned quantity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedQuantity?: number;

  @ApiPropertyOptional({ description: 'Actual quantity (filled on completion)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualQuantity?: number;

  @ApiPropertyOptional({ description: 'Slot number in machine' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  slotNumber?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
