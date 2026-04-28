/**
 * Loyalty Module
 * Система лояльности VendHub с баллами, уровнями и бонусами
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { LoyaltyController } from "./loyalty.controller";
import { LoyaltyService } from "./loyalty.service";
import { PointsTransaction } from "./entities/points-transaction.entity";
import { Referral } from "./entities/referral.model";
import { Achievement } from "./entities/achievement.model";
import { UserAchievement } from "./entities/user-achievement.model";
import { Quest } from "./entities/quest.model";
import { UserQuest } from "./entities/user-quest.model";
import { LoyaltyPromoCode } from "./entities/promo-code.entity";
import { LoyaltyPromoCodeUsage } from "./entities/promo-code-usage.entity";
import { User } from "../users/entities/user.entity";
import { ReferralService } from "./services/referral.service";
import { ReferralController } from "./controllers/referral.controller";
import { AchievementService } from "./services/achievement.service";
import { AchievementController } from "./controllers/achievement.controller";
import { QuestService } from "./services/quest.service";
import { QuestController } from "./controllers/quest.controller";
import { LoyaltyAnalyticsService } from "./services/loyalty-analytics.service";
import { BonusEngineService } from "./services/bonus-engine.service";
import { LoyaltyEventListenerService } from "./services/loyalty-event-listener.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PointsTransaction,
      Referral,
      Achievement,
      UserAchievement,
      Quest,
      UserQuest,
      LoyaltyPromoCode,
      LoyaltyPromoCodeUsage,
      User,
    ]),
    // ScheduleModule and EventEmitterModule are configured globally in AppModule
  ],
  controllers: [
    LoyaltyController,
    ReferralController,
    AchievementController,
    QuestController,
  ],
  providers: [
    LoyaltyService,
    LoyaltyAnalyticsService,
    BonusEngineService,
    LoyaltyEventListenerService,
    ReferralService,
    AchievementService,
    QuestService,
  ],
  exports: [LoyaltyService, ReferralService, AchievementService, QuestService],
})
export class LoyaltyModule {}
