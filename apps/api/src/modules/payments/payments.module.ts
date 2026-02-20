/**
 * Payments Module
 * Integrations with Uzbekistan payment systems:
 * - Payme (JSON-RPC webhook, Basic Auth) → PaymeHandler
 * - Click (REST webhook, MD5 signature) → ClickHandler
 * - Uzum Bank (REST API, HMAC SHA-256) → UzumHandler
 * - QR payments for vending machines
 * - Refund management
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymeHandler } from "./payme.handler";
import { ClickHandler } from "./click.handler";
import { UzumHandler } from "./uzum.handler";
import { PaymentTransaction } from "./entities/payment-transaction.entity";
import { PaymentRefund } from "./entities/payment-refund.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PaymentTransaction, PaymentRefund]),
  ],
  controllers: [PaymentsController],
  providers: [
    // Provider handlers (dependencies first)
    PaymeHandler,
    ClickHandler,
    UzumHandler,
    PaymentsService,
  ],
  exports: [PaymentsService, PaymeHandler, ClickHandler, UzumHandler],
})
export class PaymentsModule {}
