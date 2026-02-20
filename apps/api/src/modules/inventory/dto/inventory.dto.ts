/**
 * Inventory DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsDate,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum InventoryLevel {
  WAREHOUSE = 'warehouse',
  OPERATOR = 'operator',
  MACHINE = 'machine',
}

export enum MovementType {
  PURCHASE = 'purchase',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  SALE = 'sale',
  REPLENISHMENT = 'replenishment',
  COLLECTION = 'collection',
  ADJUSTMENT = 'adjustment',
  WRITE_OFF = 'write_off',
  RETURN = 'return',
  LOSS = 'loss',
  FOUND = 'found',
}

export class CreateInventoryDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ enum: InventoryLevel })
  @IsEnum(InventoryLevel)
  @IsNotEmpty()
  level: InventoryLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumQuantity?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumQuantity?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  slotNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  slotCapacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expirationDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class UpdateInventoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  reservedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expirationDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TransferInventoryDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ enum: InventoryLevel })
  @IsEnum(InventoryLevel)
  @IsNotEmpty()
  fromLevel: InventoryLevel;

  @ApiProperty({ enum: InventoryLevel })
  @IsEnum(InventoryLevel)
  @IsNotEmpty()
  toLevel: InventoryLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fromMachineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toMachineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fromOperatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toOperatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fromWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdjustInventoryDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  inventoryId: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  newQuantity: number;

  @ApiProperty({ example: 'Коррекция после инвентаризации' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class WriteOffInventoryDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  inventoryId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'Истек срок годности' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryInventoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ enum: InventoryLevel })
  @IsOptional()
  @IsEnum(InventoryLevel)
  level?: InventoryLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Show only low stock items' })
  @IsOptional()
  lowStock?: boolean;

  @ApiPropertyOptional({ description: 'Show only items expiring soon' })
  @IsOptional()
  expiringSoon?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 50;
}

export class QueryMovementsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ enum: MovementType })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 50;
}
