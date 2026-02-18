/**
 * Achievements Module
 * Система достижений VendHub
 */

import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Achievement } from "./entities/achievement.entity";
import { UserAchievement } from "./entities/user-achievement.entity";
import { User } from "../users/entities/user.entity";
import { AchievementsService } from "./achievements.service";
import { AchievementsController } from "./achievements.controller";
import { LoyaltyModule } from "../loyalty/loyalty.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserAchievement, User]),
    forwardRef(() => LoyaltyModule),
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
