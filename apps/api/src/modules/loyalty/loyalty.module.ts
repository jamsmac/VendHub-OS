/**
 * Loyalty Module
 * Система лояльности VendHub с баллами, уровнями и бонусами
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { PointsTransaction } from './entities/points-transaction.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PointsTransaction, User]),
    // ScheduleModule and EventEmitterModule are configured globally in AppModule
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
