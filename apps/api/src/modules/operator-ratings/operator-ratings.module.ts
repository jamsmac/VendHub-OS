/**
 * Operator Ratings Module for VendHub OS
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorRatingsController } from './operator-ratings.controller';
import { OperatorRatingsService } from './operator-ratings.service';
import { OperatorRating } from './entities/operator-rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OperatorRating])],
  controllers: [OperatorRatingsController],
  providers: [OperatorRatingsService],
  exports: [OperatorRatingsService],
})
export class OperatorRatingsModule {}
