/**
 * User Achievement Entity
 * Достижения пользователей
 */

import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../users/entities/user.entity";
import { Achievement } from "./achievement.entity";

@Entity("user_achievements")
@Index(["userId", "unlockedAt"])
@Index(["achievementId"])
@Unique(["userId", "achievementId"])
export class UserAchievement extends BaseEntity {
  // ===== User =====

  @ApiProperty({ description: "User ID" })
  @Column({ type: "uuid" })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user: User;

  // ===== Achievement =====

  @ApiProperty({ description: "Achievement ID" })
  @Column({ type: "uuid" })
  achievementId: string;

  @ManyToOne(() => Achievement, (a) => a.userAchievements, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "achievement_id" })
  achievement: Achievement;

  // ===== Progress =====

  @ApiProperty({
    description: "Current progress value",
    example: 3,
  })
  @Column({ type: "int", default: 0 })
  currentValue: number;

  @ApiProperty({
    description: "Target value (copied from achievement)",
    example: 10,
  })
  @Column({ type: "int" })
  targetValue: number;

  @ApiProperty({
    description: "Whether achievement is unlocked",
    default: false,
  })
  @Column({ type: "boolean", default: false })
  isUnlocked: boolean;

  // ===== Timestamps =====

  @ApiProperty({ description: "When achievement was unlocked", nullable: true })
  @Column({ type: "timestamp with time zone", nullable: true })
  unlockedAt: Date | null;

  @ApiProperty({
    description: "When bonus points were claimed",
    nullable: true,
  })
  @Column({ type: "timestamp with time zone", nullable: true })
  claimedAt: Date | null;

  @ApiProperty({ description: "Points claimed amount", nullable: true })
  @Column({ type: "int", nullable: true })
  pointsClaimed: number | null;

  // ===== Progress Details =====

  @ApiProperty({
    description: "Detailed progress data",
    nullable: true,
  })
  @Column({ type: "jsonb", nullable: true })
  progressDetails: {
    // Для UNIQUE_PRODUCTS - список попробованных
    tried_products?: string[];
    // Для UNIQUE_MACHINES - посещенные автоматы
    visited_machines?: string[];
    // Для REFERRAL_COUNT - приглашенные
    referred_users?: string[];
    // История прогресса
    history?: Array<{
      date: string;
      value: number;
      source: string;
    }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } | null;

  // ===== Virtual =====

  get progressPercent(): number {
    if (this.targetValue === 0) return 100;
    return Math.min(
      100,
      Math.floor((this.currentValue / this.targetValue) * 100),
    );
  }

  get remaining(): number {
    return Math.max(0, this.targetValue - this.currentValue);
  }

  get canClaim(): boolean {
    return this.isUnlocked && !this.claimedAt;
  }
}
