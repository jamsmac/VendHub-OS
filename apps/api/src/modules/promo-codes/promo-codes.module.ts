/**
 * Promo Codes Module for VendHub OS
 * Promotional codes for discounts, fixed amounts, and loyalty bonuses
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PromoCodesController } from './promo-codes.controller';
import { PromoCodesService } from './promo-codes.service';
import { PromoCode } from './entities/promo-code.entity';
import { PromoCodeRedemption } from './entities/promo-code-redemption.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromoCode, PromoCodeRedemption]),
    ConfigModule,
    ScheduleModule,
  ],
  controllers: [PromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
