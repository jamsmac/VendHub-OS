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
  name_uz?: string;

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
  description_uz?: string;

  @ApiProperty({
    description: "Condition type",
    enum: AchievementConditionType,
  })
  @IsEnum(AchievementConditionType)
  condition_type: AchievementConditionType;

  @ApiProperty({ description: "Target value", example: 10 })
  @IsInt()
  @Min(1)
  condition_value: number;

  @ApiPropertyOptional({ description: "Additional condition metadata" })
  @IsOptional()
  @IsObject()
  condition_metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Bonus points reward", example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  bonus_points?: number;

  @ApiPropertyOptional({ description: "Icon emoji", example: "🏆" })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  icon?: string;

  @ApiPropertyOptional({ description: "Image URL" })
  @IsOptional()
  @IsString()
  image_url?: string;

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
  is_hidden?: boolean;

  @ApiPropertyOptional({ description: "Display order" })
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}

export class UpdateAchievementDto extends PartialType(CreateAchievementDto) {
  @ApiPropertyOptional({ description: "Is active" })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
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
  is_active?: boolean;
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
    name_uz: string | null;
    description: string;
    description_uz: string | null;
    icon: string;
    image_url: string | null;
    category: AchievementCategory;
    rarity: AchievementRarity;
    bonus_points: number;
    condition_type: AchievementConditionType;
    condition_value: number;
  };

  @ApiProperty({ description: "Current progress" })
  current_value: number;

  @ApiProperty({ description: "Target value" })
  target_value: number;

  @ApiProperty({ description: "Progress percentage (0-100)" })
  progress_percent: number;

  @ApiProperty({ description: "Whether achievement is unlocked" })
  is_unlocked: boolean;

  @ApiProperty({ description: "When unlocked", nullable: true })
  unlocked_at: Date | null;

  @ApiProperty({ description: "Whether bonus was claimed" })
  is_claimed: boolean;
}

export class UserAchievementsSummaryDto {
  @ApiProperty({ description: "Total achievements available" })
  total: number;

  @ApiProperty({ description: "Unlocked achievements count" })
  unlocked: number;

  @ApiProperty({ description: "Total bonus points from achievements" })
  total_points_earned: number;

  @ApiProperty({ description: "Unclaimed bonus points" })
  unclaimed_points: number;

  @ApiProperty({ description: "Achievements by category" })
  by_category: Record<string, { total: number; unlocked: number }>;

  @ApiProperty({ description: "Recently unlocked", type: [UserAchievementDto] })
  recent: UserAchievementDto[];

  @ApiProperty({ description: "In progress", type: [UserAchievementDto] })
  in_progress: UserAchievementDto[];
}

export class ClaimAchievementResultDto {
  @ApiProperty({ description: "Success" })
  success: boolean;

  @ApiProperty({ description: "Points claimed" })
  points_claimed: number;

  @ApiProperty({ description: "Achievement name" })
  achievement_name: string;

  @ApiProperty({ description: "New balance" })
  new_balance: number;
}

export class AchievementStatsDto {
  @ApiProperty({ description: "Total achievements defined" })
  total_achievements: number;

  @ApiProperty({ description: "Total unique users who unlocked at least one" })
  users_with_achievements: number;

  @ApiProperty({ description: "Most popular achievements" })
  most_popular: Array<{
    id: string;
    name: string;
    total_unlocked: number;
  }>;

  @ApiProperty({ description: "Rarest achievements" })
  rarest: Array<{
    id: string;
    name: string;
    total_unlocked: number;
  }>;

  @ApiProperty({ description: "Total bonus points distributed" })
  total_points_distributed: number;
}
