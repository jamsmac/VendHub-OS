/**
 * Referrals Module
 * Реферальная программа VendHub
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Referral } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Referral, User]),
    ConfigModule,
    // EventEmitterModule is configured globally in AppModule
    forwardRef(() => LoyaltyModule),
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
