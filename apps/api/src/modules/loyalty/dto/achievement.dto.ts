/**
 * Achievement DTOs
 * Data Transfer Objects for achievements/badges
 */

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  Length,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  AchievementCategory,
  AchievementConditionType,
  AchievementRarity,
} from "../entities/achievement.entity";

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * DTO for creating an achievement
 */
export class LoyaltyCreateAchievementDto {
  @ApiProperty({
    description: "Achievement title (Russian)",
    example: "Первый заказ",
  })
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional({
    description: "Achievement title (Uzbek)",
    example: "Birinchi buyurtma",
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  titleUz?: string;

  @ApiProperty({
    description: "Achievement description (Russian)",
    example: "Сделайте свой первый заказ",
  })
  @IsString()
  @Length(1, 1000)
  description: string;

  @ApiPropertyOptional({
    description: "Achievement description (Uzbek)",
    example: "Birinchi buyurtmangizni bering",
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  descriptionUz?: string;

  @ApiPropertyOptional({
    description: "Icon (emoji or lucide icon name)",
    example: "trophy",
    default: "trophy",
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  icon?: string;

  @ApiPropertyOptional({
    description: "Achievement category",
    enum: AchievementCategory,
    default: AchievementCategory.BEGINNER,
  })
  @IsOptional()
  @IsEnum(AchievementCategory)
  category?: AchievementCategory;

  @ApiPropertyOptional({
    description: "Achievement rarity",
    enum: AchievementRarity,
    default: AchievementRarity.COMMON,
  })
  @IsOptional()
  @IsEnum(AchievementRarity)
  rarity?: AchievementRarity;

  @ApiProperty({
    description: "Condition type for unlocking",
    enum: AchievementConditionType,
    example: AchievementConditionType.TOTAL_ORDERS,
  })
  @IsEnum(AchievementConditionType)
  conditionType: AchievementConditionType;

  @ApiProperty({
    description: "Condition threshold value",
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Max(1000000)
  conditionValue: number;

  @ApiPropertyOptional({
    description: "Additional conditions as JSON",
    example: { timeRange: "night" },
  })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Points reward for unlocking",
    example: 50,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  pointsReward?: number;

  @ApiPropertyOptional({
    description: "Whether the achievement is active",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Whether the achievement is hidden (secret)",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({
    description: "Sort order for display",
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * DTO for updating an achievement (all fields optional)
 */
export class LoyaltyUpdateAchievementDto extends PartialType(
  LoyaltyCreateAchievementDto,
) {}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Response DTO for a single achievement
 */
export class AchievementResponseDto {
  @ApiProperty({ description: "Achievement ID" })
  id: string;

  @ApiProperty({ description: "Title (Russian)" })
  title: string;

  @ApiProperty({ description: "Title (Uzbek)", nullable: true })
  titleUz: string | null;

  @ApiProperty({ description: "Description (Russian)" })
  description: string;

  @ApiProperty({ description: "Description (Uzbek)", nullable: true })
  descriptionUz: string | null;

  @ApiProperty({ description: "Icon" })
  icon: string;

  @ApiProperty({ description: "Category", enum: AchievementCategory })
  category: AchievementCategory;

  @ApiProperty({ description: "Rarity", enum: AchievementRarity })
  rarity: AchievementRarity;

  @ApiProperty({
    description: "Condition type",
    enum: AchievementConditionType,
  })
  conditionType: AchievementConditionType;

  @ApiProperty({ description: "Condition value" })
  conditionValue: number;

  @ApiProperty({ description: "Points reward" })
  pointsReward: number;

  @ApiProperty({ description: "Is active" })
  isActive: boolean;

  @ApiProperty({ description: "Is hidden" })
  isHidden: boolean;

  @ApiProperty({ description: "Sort order" })
  sortOrder: number;

  @ApiProperty({
    description: "Number of users who unlocked this",
    required: false,
  })
  unlockedCount?: number;

  @ApiProperty({
    description: "Whether the current user has unlocked this",
    required: false,
  })
  unlocked?: boolean;

  @ApiProperty({
    description: "When the current user unlocked this",
    nullable: true,
    required: false,
  })
  unlockedAt?: Date | null;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;
}

/**
 * Response DTO for user's unlocked achievement
 */
export class UserAchievementResponseDto {
  @ApiProperty({ description: "User achievement record ID" })
  id: string;

  @ApiProperty({ description: "Achievement details" })
  achievement: AchievementResponseDto;

  @ApiProperty({ description: "When the achievement was unlocked" })
  unlockedAt: Date;

  @ApiProperty({ description: "Points awarded" })
  pointsAwarded: number;
}

/**
 * Achievement stats response (admin)
 */
export class LoyaltyAchievementStatsDto {
  @ApiProperty({ description: "Total achievements defined" })
  totalAchievements: number;

  @ApiProperty({ description: "Total times achievements have been unlocked" })
  totalUnlocked: number;

  @ApiProperty({ description: "Total reward points claimed via achievements" })
  totalRewardsClaimed: number;
}
