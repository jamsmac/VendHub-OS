/**
 * Inventory Module Barrel Export
 */

export * from './inventory.module';
export * from './inventory.service';
export * from './inventory.controller';

// Entities - explicit exports to avoid duplication
export {
  InventoryLevel,
  MovementType,
  InventoryMovement,
} from './entities/inventory.entity';
export { WarehouseZone, ZoneType } from './entities/warehouse-zone.entity';

// DTOs - explicit exports to avoid duplication
export {
  CreateInventoryDto,
  UpdateInventoryDto,
  AdjustInventoryDto,
  TransferInventoryDto,
  QueryInventoryDto,
  QueryMovementsDto,
} from './dto/inventory.dto';
export * from './dto/warehouse-zone.dto';
