/**
 * Orders Module
 * Управление заказами VendHub
 */

import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order, OrderItem } from "./entities/order.entity";
import { Product } from "../products/entities/product.entity";
import { User } from "../users/entities/user.entity";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { PromoCodesModule } from "../promo-codes/promo-codes.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, User]),
    forwardRef(() => PromoCodesModule),
    // EventEmitterModule is configured in AppModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
