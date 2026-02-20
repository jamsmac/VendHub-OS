/**
 * Achievement DTOs
 * Validation and transfer objects for achievements
 */

import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  IsObject,
  Length,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  AchievementConditionType,
  AchievementCategory,
  AchievementRarity,
} from "../constants/achievement.constants";

// ============================================================================
// ADMIN DTOs
// ============================================================================

export class CreateAchievementDto {
  @ApiProperty({ description: "Achievement name", example: "Первый глоток" })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: "Name in Uzbek" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  nameUz?: string;

  @ApiProperty({
    description: "Achievement description",
    example: "Сделайте свой первый заказ",
  })
  @IsString()
  @Length(1, 500)
  description: string;

  @ApiPropertyOptional({ description: "Description in Uzbek" })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  descriptionUz?: string;

  @ApiProperty({
    description: "Condition type",
    enum: AchievementConditionType,
  })
  @IsEnum(AchievementConditionType)
  conditionType: AchievementConditionType;

  @ApiProperty({ description: "Target value", example: 10 })
  @IsInt()
  @Min(1)
  conditionValue: number;

  @ApiPropertyOptional({ description: "Additional condition metadata" })
  @IsOptional()
  @IsObject()
  conditionMetadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Bonus points reward", example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  bonusPoints?: number;

  @ApiPropertyOptional({ description: "Icon emoji", example: "🏆" })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  icon?: string;

  @ApiPropertyOptional({ description: "Image URL" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Category", enum: AchievementCategory })
  @IsOptional()
  @IsEnum(AchievementCategory)
  category?: AchievementCategory;

  @ApiPropertyOptional({ description: "Rarity", enum: AchievementRarity })
  @IsOptional()
  @IsEnum(AchievementRarity)
  rarity?: AchievementRarity;

  @ApiPropertyOptional({ description: "Is hidden until unlocked" })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({ description: "Display order" })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateAchievementDto extends PartialType(CreateAchievementDto) {
  @ApiPropertyOptional({ description: "Is active" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AchievementFilterDto {
  @ApiPropertyOptional({
    description: "Filter by category",
    enum: AchievementCategory,
  })
  @IsOptional()
  @IsEnum(AchievementCategory)
  category?: AchievementCategory;

  @ApiPropertyOptional({
    description: "Filter by rarity",
    enum: AchievementRarity,
  })
  @IsOptional()
  @IsEnum(AchievementRarity)
  rarity?: AchievementRarity;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

// ============================================================================
// USER DTOs
// ============================================================================

export class UserAchievementDto {
  @ApiProperty({ description: "User achievement ID" })
  id: string;

  @ApiProperty({ description: "Achievement details" })
  achievement: {
    id: string;
    name: string;
    nameUz: string | null;
    description: string;
    descriptionUz: string | null;
    icon: string;
    imageUrl: string | null;
    category: AchievementCategory;
    rarity: AchievementRarity;
    bonusPoints: number;
    conditionType: AchievementConditionType;
    conditionValue: number;
  };

  @ApiProperty({ description: "Current progress" })
  currentValue: number;

  @ApiProperty({ description: "Target value" })
  targetValue: number;

  @ApiProperty({ description: "Progress percentage (0-100)" })
  progressPercent: number;

  @ApiProperty({ description: "Whether achievement is unlocked" })
  isUnlocked: boolean;

  @ApiProperty({ description: "When unlocked", nullable: true })
  unlockedAt: Date | null;

  @ApiProperty({ description: "Whether bonus was claimed" })
  isClaimed: boolean;
}

export class UserAchievementsSummaryDto {
  @ApiProperty({ description: "Total achievements available" })
  total: number;

  @ApiProperty({ description: "Unlocked achievements count" })
  unlocked: number;

  @ApiProperty({ description: "Total bonus points from achievements" })
  totalPointsEarned: number;

  @ApiProperty({ description: "Unclaimed bonus points" })
  unclaimedPoints: number;

  @ApiProperty({ description: "Achievements by category" })
  byCategory: Record<string, { total: number; unlocked: number }>;

  @ApiProperty({ description: "Recently unlocked", type: [UserAchievementDto] })
  recent: UserAchievementDto[];

  @ApiProperty({ description: "In progress", type: [UserAchievementDto] })
  inProgress: UserAchievementDto[];
}

export class ClaimAchievementResultDto {
  @ApiProperty({ description: "Success" })
  success: boolean;

  @ApiProperty({ description: "Points claimed" })
  pointsClaimed: number;

  @ApiProperty({ description: "Achievement name" })
  achievementName: string;

  @ApiProperty({ description: "New balance" })
  newBalance: number;
}

export class AchievementStatsDto {
  @ApiProperty({ description: "Total achievements defined" })
  totalAchievements: number;

  @ApiProperty({ description: "Total unique users who unlocked at least one" })
  usersWithAchievements: number;

  @ApiProperty({ description: "Most popular achievements" })
  mostPopular: Array<{
    id: string;
    name: string;
    totalUnlocked: number;
  }>;

  @ApiProperty({ description: "Rarest achievements" })
  rarest: Array<{
    id: string;
    name: string;
    totalUnlocked: number;
  }>;

  @ApiProperty({ description: "Total bonus points distributed" })
  totalPointsDistributed: number;
}
