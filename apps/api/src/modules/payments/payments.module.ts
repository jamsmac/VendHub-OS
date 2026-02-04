/**
 * Payments Module
 * Integrations with Uzbekistan payment systems:
 * - Payme (JSON-RPC webhook, Basic Auth)
 * - Click (REST webhook, MD5 signature)
 * - Uzum Bank (REST API, HMAC SHA-256)
 * - QR payments for vending machines
 * - Refund management
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { PaymentRefund } from './entities/payment-refund.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PaymentTransaction, PaymentRefund]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
