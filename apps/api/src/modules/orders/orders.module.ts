/**
 * Orders Module
 * Управление заказами VendHub
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    forwardRef(() => PromoCodesModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => UsersModule),
    // EventEmitterModule is configured in AppModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
