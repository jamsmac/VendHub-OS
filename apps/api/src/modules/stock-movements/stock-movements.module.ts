import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StockMovement } from "./entities/stock-movement.entity";
import { InventoryBalance } from "./entities/inventory-balance.entity";
import { StockMovementsService } from "./services/stock-movements.service";

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement, InventoryBalance])],
  providers: [StockMovementsService],
  exports: [StockMovementsService, TypeOrmModule],
})
export class StockMovementsModule {}
