/**
 * Loyalty Module
 * Система лояльности VendHub с баллами, уровнями и бонусами
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { LoyaltyController } from "./loyalty.controller";
import { LoyaltyService } from "./loyalty.service";
import { PointsTransaction } from "./entities/points-transaction.entity";
import { Referral } from "./entities/referral.entity";
import { Achievement } from "./entities/achievement.entity";
import { UserAchievement } from "./entities/user-achievement.entity";
import { Quest } from "./entities/quest.entity";
import { UserQuest } from "./entities/user-quest.entity";
import { LoyaltyPromoCode } from "./entities/promo-code.entity";
import { LoyaltyPromoCodeUsage } from "./entities/promo-code-usage.entity";
import { User } from "../users/entities/user.entity";
import { ReferralService } from "./services/referral.service";
import { ReferralController } from "./controllers/referral.controller";
import { AchievementService } from "./services/achievement.service";
import { AchievementController } from "./controllers/achievement.controller";
import { QuestService } from "./services/quest.service";
import { QuestController } from "./controllers/quest.controller";

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
    ReferralService,
    AchievementService,
    QuestService,
  ],
  exports: [LoyaltyService, ReferralService, AchievementService, QuestService],
})
export class LoyaltyModule {}
