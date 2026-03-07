/**
 * Achievement Entity
 * Определения достижений/бейджей программы лояльности
 */

import { Entity, Column, OneToMany, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserAchievement } from "./user-achievement.entity";

/**
 * Категории достижений
 */
export enum AchievementCategory {
  BEGINNER = "beginner",
  EXPLORER = "explorer",
  LOYAL = "loyal",
  SOCIAL = "social",
  COLLECTOR = "collector",
  SPECIAL = "special",
}

/**
 * Редкость достижения
 */
export enum AchievementRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary",
}

/**
 * Типы условий для разблокировки
 */
export enum AchievementConditionType {
  TOTAL_ORDERS = "total_orders",
  TOTAL_SPENT = "total_spent",
  TOTAL_POINTS_EARNED = "total_points_earned",
  STREAK_DAYS = "streak_days",
  UNIQUE_MACHINES = "unique_machines",
  UNIQUE_PRODUCTS = "unique_products",
  REFERRALS_COUNT = "referrals_count",
  REVIEWS_COUNT = "reviews_count",
  QUESTS_COMPLETED = "quests_completed",
  LEVEL_REACHED = "level_reached",
  FIRST_ORDER = "first_order",
  NIGHT_ORDER = "night_order",
  WEEKEND_ORDER = "weekend_order",
}

@Entity("achievements")
@Index(["organizationId"])
@Index(["category"])
@Index(["isActive"])
@Index(["sortOrder"])
export class Achievement extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  // ===== Basic Info =====

  @ApiProperty({
    description: "Achievement title (Russian)",
    example: "Первый заказ",
  })
  @Column({ type: "varchar", length: 255 })
  title: string;

  @ApiPropertyOptional({
    description: "Achievement title (Uzbek)",
    example: "Birinchi buyurtma",
  })
  @Column({ type: "varchar", length: 255, nullable: true })
  titleUz: string;

  @ApiProperty({
    description: "Achievement description (Russian)",
    example: "Сделайте свой первый заказ",
  })
  @Column({ type: "text" })
  description: string;

  @ApiPropertyOptional({
    description: "Achievement description (Uzbek)",
    example: "Birinchi buyurtmangizni bering",
  })
  @Column({ type: "text", nullable: true })
  descriptionUz: string;

  @ApiProperty({
    description: "Icon (emoji or lucide icon name)",
    example: "trophy",
  })
  @Column({ type: "varchar", length: 100, default: "trophy" })
  icon: string;

  // ===== Classification =====

  @ApiProperty({
    description: "Achievement category",
    enum: AchievementCategory,
    example: AchievementCategory.BEGINNER,
  })
  @Column({
    type: "varchar",
    length: 50,
    default: AchievementCategory.BEGINNER,
  })
  category: AchievementCategory;

  @ApiProperty({
    description: "Achievement rarity",
    enum: AchievementRarity,
    example: AchievementRarity.COMMON,
  })
  @Column({
    type: "varchar",
    length: 50,
    default: AchievementRarity.COMMON,
  })
  rarity: AchievementRarity;

  // ===== Conditions =====

  @ApiProperty({
    description: "Condition type for unlocking",
    enum: AchievementConditionType,
    example: AchievementConditionType.TOTAL_ORDERS,
  })
  @Column({ type: "varchar", length: 50 })
  conditionType: AchievementConditionType;

  @ApiProperty({
    description: "Condition threshold value",
    example: 10,
  })
  @Column({ type: "int" })
  conditionValue: number;

  @ApiPropertyOptional({
    description: "Additional conditions as JSONB",
    example: { timeRange: "night", minAmount: 5000 },
  })
  @Column({ type: "jsonb", nullable: true })
  conditions: Record<string, unknown>;

  // ===== Reward =====

  @ApiProperty({
    description: "Points reward for unlocking",
    example: 50,
  })
  @Column({ type: "int", default: 0 })
  pointsReward: number;

  // ===== Display =====

  @ApiProperty({
    description: "Whether the achievement is active",
    default: true,
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: "Whether the achievement is hidden (secret)",
    default: false,
  })
  @Column({ default: false })
  isHidden: boolean;

  @ApiProperty({
    description: "Sort order for display",
    default: 0,
  })
  @Column({ type: "int", default: 0 })
  sortOrder: number;

  // ===== Relations =====

  @OneToMany(() => UserAchievement, (ua) => ua.achievement)
  userAchievements: UserAchievement[];
}
