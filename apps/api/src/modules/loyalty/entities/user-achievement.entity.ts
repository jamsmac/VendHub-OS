/**
 * User Achievement Entity
 * Разблокированные достижения пользователей
 */

import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty } from "@nestjs/swagger";
import { Achievement } from "./achievement.entity";
import { User } from "../../users/entities/user.entity";

@Entity("user_achievements")
@Unique("UQ_user_achievement", ["userId", "achievementId"])
@Index(["organizationId"])
@Index(["userId"])
@Index(["achievementId"])
@Index(["unlockedAt"])
export class UserAchievement extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  // ===== User =====

  @ApiProperty({ description: "User ID who unlocked the achievement" })
  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  // ===== Achievement =====

  @ApiProperty({ description: "Achievement ID" })
  @Column({ type: "uuid" })
  achievementId: string;

  @ManyToOne(() => Achievement, (a) => a.userAchievements, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "achievement_id" })
  achievement: Achievement;

  // ===== Unlock Info =====

  @ApiProperty({ description: "When the achievement was unlocked" })
  @Column({ type: "timestamp with time zone", default: () => "NOW()" })
  unlockedAt: Date;

  @ApiProperty({
    description: "Points awarded for this unlock",
    example: 50,
  })
  @Column({ type: "int", default: 0 })
  pointsAwarded: number;
}
