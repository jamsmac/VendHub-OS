/**
 * Telegram Payments Module
 * VendHub Telegram Bot Payments Integration
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TelegramPayment } from './entities/telegram-payment.entity';
import { Order } from '../orders/entities/order.entity';
import { TelegramPaymentsService } from './telegram-payments.service';
import { TelegramPaymentsController } from './telegram-payments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramPayment, Order]),
    ConfigModule,
  ],
  controllers: [TelegramPaymentsController],
  providers: [TelegramPaymentsService],
  exports: [TelegramPaymentsService],
})
export class TelegramPaymentsModule {}
