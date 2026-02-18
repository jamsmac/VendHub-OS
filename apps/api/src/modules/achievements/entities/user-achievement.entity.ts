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
@Index(["user_id", "unlocked_at"])
@Index(["achievement_id"])
@Unique(["user_id", "achievement_id"])
export class UserAchievement extends BaseEntity {
  // ===== User =====

  @ApiProperty({ description: "User ID" })
  @Column({ type: "uuid" })
  @Index()
  user_id: string;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user: User;

  // ===== Achievement =====

  @ApiProperty({ description: "Achievement ID" })
  @Column({ type: "uuid" })
  @Index()
  achievement_id: string;

  @ManyToOne(() => Achievement, (a) => a.user_achievements, {
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
  current_value: number;

  @ApiProperty({
    description: "Target value (copied from achievement)",
    example: 10,
  })
  @Column({ type: "int" })
  target_value: number;

  @ApiProperty({
    description: "Whether achievement is unlocked",
    default: false,
  })
  @Column({ type: "boolean", default: false })
  is_unlocked: boolean;

  // ===== Timestamps =====

  @ApiProperty({ description: "When achievement was unlocked", nullable: true })
  @Column({ type: "timestamp with time zone", nullable: true })
  unlocked_at: Date | null;

  @ApiProperty({
    description: "When bonus points were claimed",
    nullable: true,
  })
  @Column({ type: "timestamp with time zone", nullable: true })
  claimed_at: Date | null;

  @ApiProperty({ description: "Points claimed amount", nullable: true })
  @Column({ type: "int", nullable: true })
  points_claimed: number | null;

  // ===== Progress Details =====

  @ApiProperty({
    description: "Detailed progress data",
    nullable: true,
  })
  @Column({ type: "jsonb", nullable: true })
  progress_details: {
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

  get progress_percent(): number {
    if (this.target_value === 0) return 100;
    return Math.min(
      100,
      Math.floor((this.current_value / this.target_value) * 100),
    );
  }

  get remaining(): number {
    return Math.max(0, this.target_value - this.current_value);
  }

  get can_claim(): boolean {
    return this.is_unlocked && !this.claimed_at;
  }
}
