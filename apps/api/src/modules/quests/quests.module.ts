/**
 * Quests Module
 * Система квестов и достижений VendHub
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quest } from './entities/quest.entity';
import { UserQuest } from './entities/user-quest.entity';
import { User } from '../users/entities/user.entity';
import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quest, UserQuest, User]),
    // ScheduleModule and EventEmitterModule are configured in AppModule
    forwardRef(() => LoyaltyModule),
  ],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
