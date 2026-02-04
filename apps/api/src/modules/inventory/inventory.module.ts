import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

// Import all inventory entities
import {
  WarehouseInventory,
  OperatorInventory,
  MachineInventory,
  InventoryMovement,
  InventoryReservation,
  InventoryAdjustment,
  InventoryCount,
  InventoryCountItem,
} from './entities/inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // 3-Level Inventory System
      WarehouseInventory,
      OperatorInventory,
      MachineInventory,

      // Movement tracking
      InventoryMovement,

      // Reservations & Adjustments
      InventoryReservation,
      InventoryAdjustment,

      // Counting/Stocktake
      InventoryCount,
      InventoryCountItem,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
