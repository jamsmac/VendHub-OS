import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Purchase } from "./entities/purchase.entity";
import { PurchaseItem } from "./entities/purchase-item.entity";
import {
  Product,
  ProductPriceHistory,
  Supplier,
} from "../products/entities/product.entity";
import { PurchasesService } from "./services/purchases.service";
import { PurchasesController } from "./purchases.controller";
import { StockMovementsModule } from "../stock-movements/stock-movements.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Purchase,
      PurchaseItem,
      Product,
      ProductPriceHistory,
      Supplier,
    ]),
    StockMovementsModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
