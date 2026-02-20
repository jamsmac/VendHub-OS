/**
 * Inventory Reservation DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsDate,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InventoryLevel, ReservationStatus } from '../entities/inventory.entity';

/**
 * Create Reservation Request DTO
 * Used when creating a new inventory reservation
 */
export class CreateReservationRequestDto {
  @ApiProperty({ description: 'Task ID that triggers the reservation' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ description: 'Product/Nomenclature ID to reserve' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 15.5, description: 'Quantity to reserve (min 0.001)' })
  @IsNumber()
  @Min(0.001)
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ enum: InventoryLevel, description: 'Inventory level (warehouse/operator/machine)' })
  @IsEnum(InventoryLevel)
  @IsNotEmpty()
  inventoryLevel: InventoryLevel;

  @ApiProperty({ description: 'Reference ID (warehouse/operator/machine ID depending on level)' })
  @IsUUID()
  @IsNotEmpty()
  referenceId: string;

  @ApiPropertyOptional({ description: 'Expiration date for reservation' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({ example: 'Refill task for machine ABC-123', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/**
 * Fulfill Reservation DTO
 * Used when fulfilling a reservation (marking quantity as fulfilled)
 */
export class FulfillReservationDto {
  @ApiProperty({ example: 15.5, description: 'Quantity that was fulfilled (min 0.001)' })
  @IsNumber()
  @Min(0.001)
  @IsNotEmpty()
  fulfilledQuantity: number;
}

/**
 * Confirm Reservation DTO
 * Used when confirming a pending reservation
 */
export class ConfirmReservationDto {
  @ApiPropertyOptional({ example: 15.5, description: 'Adjusted quantity (optional, min 0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adjustedQuantity?: number;
}

/**
 * Cancel Reservation DTO
 * Used when cancelling a reservation
 */
export class CancelReservationDto {
  @ApiPropertyOptional({ example: 'Task was cancelled', description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/**
 * Query Reservations DTO
 * Used for filtering and paginating reservation lists
 */
export class QueryReservationsDto {
  @ApiPropertyOptional({ description: 'Filter by task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ enum: ReservationStatus, description: 'Filter by reservation status' })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({ enum: InventoryLevel, description: 'Filter by inventory level' })
  @IsOptional()
  @IsEnum(InventoryLevel)
  inventoryLevel?: InventoryLevel;

  @ApiPropertyOptional({ description: 'Show only active (non-expired, non-fulfilled, non-cancelled) reservations' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;

  @ApiPropertyOptional({ default: 1, description: 'Page number (default 1)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, description: 'Items per page (default 50)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 50;
}
