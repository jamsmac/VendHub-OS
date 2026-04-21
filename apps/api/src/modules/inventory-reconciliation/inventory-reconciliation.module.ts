import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryReconciliation } from "./entities/inventory-reconciliation.entity";
import { InventoryReconciliationItem } from "./entities/inventory-reconciliation-item.entity";
import { Product } from "../products/entities/product.entity";
import { InventoryReconciliationService } from "./services/inventory-reconciliation.service";
import { InventoryReconciliationController } from "./inventory-reconciliation.controller";
import { StockMovementsModule } from "../stock-movements/stock-movements.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryReconciliation,
      InventoryReconciliationItem,
      Product,
    ]),
    StockMovementsModule,
  ],
  controllers: [InventoryReconciliationController],
  providers: [InventoryReconciliationService],
  exports: [InventoryReconciliationService],
})
export class InventoryReconciliationModule {}
