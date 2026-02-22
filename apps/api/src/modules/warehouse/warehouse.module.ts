import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WarehouseService } from "./warehouse.service";
import { StockTakeService } from "./stock-take.service";
import { InventoryBatchService } from "./services/inventory-batch.service";
import { StockReservationService } from "./services/stock-reservation.service";
import { WarehouseController } from "./warehouse.controller";
import {
  Warehouse,
  StockMovement,
  InventoryBatch,
  WarehouseZone,
  StockTake,
  StockReservation,
} from "./entities/warehouse.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      StockMovement,
      InventoryBatch,
      WarehouseZone,
      StockTake,
      StockReservation,
    ]),
  ],
  controllers: [WarehouseController],
  providers: [
    WarehouseService,
    StockTakeService,
    InventoryBatchService,
    StockReservationService,
  ],
  exports: [
    WarehouseService,
    StockTakeService,
    InventoryBatchService,
    StockReservationService,
  ],
})
export class WarehouseModule {}
