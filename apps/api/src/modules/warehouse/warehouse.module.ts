import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseService } from './warehouse.service';
import { StockTakeService } from './stock-take.service';
import { WarehouseController } from './warehouse.controller';
import {
  Warehouse,
  StockMovement,
  InventoryBatch,
} from './entities/warehouse.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      StockMovement,
      InventoryBatch,
    ]),
  ],
  controllers: [WarehouseController],
  providers: [WarehouseService, StockTakeService],
  exports: [WarehouseService, StockTakeService],
})
export class WarehouseModule {}
