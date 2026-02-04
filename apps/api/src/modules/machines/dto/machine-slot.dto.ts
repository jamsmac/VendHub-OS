import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMachineSlotDto {
  @ApiProperty({ example: 'A1', description: 'Slot number identifier (e.g. A1, B2)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  slotNumber: string;

  @ApiPropertyOptional({ description: 'UUID of the product assigned to this slot' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ example: 50, description: 'Maximum capacity of the slot' })
  @IsNumber()
  @Min(0)
  capacity: number;

  @ApiPropertyOptional({ example: 0, description: 'Current quantity in the slot' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentQuantity?: number;

  @ApiPropertyOptional({ description: 'Sale price in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Cost price in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum quantity threshold for low stock alert' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;
}

export class UpdateMachineSlotDto {
  @ApiPropertyOptional({ description: 'UUID of the product assigned to this slot' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Maximum capacity of the slot' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Current quantity in the slot' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentQuantity?: number;

  @ApiPropertyOptional({ description: 'Sale price in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Cost price in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Whether the slot is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Minimum quantity threshold for low stock alert' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;
}

export class RefillSlotDto {
  @ApiProperty({ example: 30, description: 'Quantity to add to the slot' })
  @IsNumber()
  @Min(1)
  quantity: number;
}
