/**
 * Quest DTOs
 * Data Transfer Objects for quest/challenge system
 */

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  IsUUID,
  IsDateString,
  Min,
  Max,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  QuestPeriod,
  QuestType,
  QuestDifficulty,
} from "../entities/quest.model";
import { UserQuestStatus } from "../entities/user-quest.model";

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * Create a new quest (admin)
 */
export class LoyaltyCreateQuestDto {
  @ApiProperty({
    description: "Quest title (Russian)",
    example: "Сделать 3 заказа",
  })
  @IsString()
  @Length(1, 100)
  title: string;

  @ApiPropertyOptional({
    description: "Quest title (Uzbek)",
    example: "3 ta buyurtma bering",
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  titleUz?: string;

  @ApiProperty({
    description: "Quest description (Russian)",
    example: "Совершите 3 покупки через вендинговые автоматы",
  })
  @IsString()
  @Length(1, 500)
  description: string;

  @ApiPropertyOptional({ description: "Quest description (Uzbek)" })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  descriptionUz?: string;

  @ApiProperty({
    description: "Quest period",
    enum: QuestPeriod,
    example: QuestPeriod.DAILY,
  })
  @IsEnum(QuestPeriod)
  period: QuestPeriod;

  @ApiProperty({
    description: "Quest type",
    enum: QuestType,
    example: QuestType.ORDER_COUNT,
  })
  @IsEnum(QuestType)
  type: QuestType;

  @ApiPropertyOptional({
    description: "Difficulty",
    enum: QuestDifficulty,
    default: QuestDifficulty.MEDIUM,
  })
  @IsOptional()
  @IsEnum(QuestDifficulty)
  difficulty?: QuestDifficulty;

  @ApiProperty({ description: "Target value to complete", example: 3 })
  @IsInt()
  @Min(1)
  @Max(100000)
  targetValue: number;

  @ApiProperty({ description: "Points reward", example: 50 })
  @IsInt()
  @Min(1)
  @Max(100000)
  rewardPoints: number;

  @ApiPropertyOptional({ description: "Additional rewards (JSON)" })
  @IsOptional()
  @IsObject()
  additionalRewards?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Metadata (JSON)" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Requirements to unlock (JSON)" })
  @IsOptional()
  @IsObject()
  requirements?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Icon emoji", example: "🎯" })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  icon?: string;

  @ApiPropertyOptional({ description: "Color hex", example: "#4CAF50" })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  color?: string;

  @ApiPropertyOptional({ description: "Image URL" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Start date (null = immediate)" })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: "End date (null = permanent)" })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({
    description: "Whether quest is active",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Featured on top", default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: "Display order", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

/**
 * Update an existing quest (admin)
 */
export class LoyaltyUpdateQuestDto extends PartialType(LoyaltyCreateQuestDto) {}

/**
 * Query params for listing quests
 */
export class QuestQueryDto {
  @ApiPropertyOptional({ description: "Filter by period", enum: QuestPeriod })
  @IsOptional()
  @IsEnum(QuestPeriod)
  period?: QuestPeriod;

  @ApiPropertyOptional({ description: "Filter by type", enum: QuestType })
  @IsOptional()
  @IsEnum(QuestType)
  type?: QuestType;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

/**
 * Claim quest reward
 */
export class ClaimQuestDto {
  @ApiProperty({ description: "User quest ID to claim" })
  @IsUUID()
  userQuestId: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Quest response (admin view)
 */
export class QuestResponseDto {
  @ApiProperty({ description: "Quest ID" })
  id: string;

  @ApiProperty({ description: "Title (Russian)" })
  title: string;

  @ApiPropertyOptional({ description: "Title (Uzbek)" })
  titleUz: string;

  @ApiProperty({ description: "Description (Russian)" })
  description: string;

  @ApiPropertyOptional({ description: "Description (Uzbek)" })
  descriptionUz: string;

  @ApiProperty({ description: "Period", enum: QuestPeriod })
  period: QuestPeriod;

  @ApiProperty({ description: "Type", enum: QuestType })
  type: QuestType;

  @ApiProperty({ description: "Difficulty", enum: QuestDifficulty })
  difficulty: QuestDifficulty;

  @ApiProperty({ description: "Target value" })
  targetValue: number;

  @ApiProperty({ description: "Points reward" })
  rewardPoints: number;

  @ApiPropertyOptional({ description: "Additional rewards" })
  additionalRewards: Record<string, unknown>;

  @ApiProperty({ description: "Icon emoji" })
  icon: string;

  @ApiProperty({ description: "Color" })
  color: string;

  @ApiPropertyOptional({ description: "Image URL" })
  imageUrl: string;

  @ApiPropertyOptional({ description: "Start date" })
  startsAt: Date;

  @ApiPropertyOptional({ description: "End date" })
  endsAt: Date;

  @ApiProperty({ description: "Is active" })
  isActive: boolean;

  @ApiProperty({ description: "Is featured" })
  isFeatured: boolean;

  @ApiProperty({ description: "Display order" })
  displayOrder: number;

  @ApiProperty({ description: "Total users started" })
  totalStarted: number;

  @ApiProperty({ description: "Total users completed" })
  totalCompleted: number;

  @ApiProperty({ description: "Created at" })
  createdAt: Date;
}

/**
 * User quest progress response
 */
export class LoyaltyUserQuestProgressDto {
  @ApiProperty({ description: "User quest ID" })
  id: string;

  @ApiProperty({ description: "Quest ID" })
  questId: string;

  @ApiProperty({ description: "Quest title" })
  title: string;

  @ApiPropertyOptional({ description: "Quest title (Uzbek)" })
  titleUz: string;

  @ApiProperty({ description: "Quest description" })
  description: string;

  @ApiPropertyOptional({ description: "Quest description (Uzbek)" })
  descriptionUz: string;

  @ApiProperty({ description: "Quest icon" })
  icon: string;

  @ApiProperty({ description: "Quest color" })
  color: string;

  @ApiProperty({ description: "Period", enum: QuestPeriod })
  period: QuestPeriod;

  @ApiProperty({ description: "Type", enum: QuestType })
  type: QuestType;

  @ApiProperty({ description: "Difficulty", enum: QuestDifficulty })
  difficulty: QuestDifficulty;

  @ApiProperty({ description: "Current progress" })
  currentValue: number;

  @ApiProperty({ description: "Target value" })
  targetValue: number;

  @ApiProperty({ description: "Progress percentage" })
  progressPercent: number;

  @ApiProperty({ description: "Points reward" })
  rewardPoints: number;

  @ApiProperty({ description: "Status", enum: UserQuestStatus })
  status: UserQuestStatus;

  @ApiPropertyOptional({ description: "Period start" })
  periodStart: Date;

  @ApiPropertyOptional({ description: "Period end" })
  periodEnd: Date;

  @ApiPropertyOptional({ description: "Completed at" })
  completedAt: Date;

  @ApiPropertyOptional({ description: "Claimed at" })
  claimedAt: Date;
}

/**
 * Paginated quests list
 */
export class QuestsListResponseDto {
  @ApiProperty({ type: [QuestResponseDto] })
  data: QuestResponseDto[];

  @ApiProperty({ description: "Total count" })
  total: number;

  @ApiProperty({ description: "Page" })
  page: number;

  @ApiProperty({ description: "Limit" })
  limit: number;

  @ApiProperty({ description: "Total pages" })
  totalPages: number;
}

/**
 * Claim reward result
 */
export class ClaimRewardResultDto {
  @ApiProperty({ description: "Whether claim was successful" })
  success: boolean;

  @ApiProperty({ description: "Points earned from quest" })
  pointsEarned: number;

  @ApiProperty({ description: "New balance after claim" })
  newBalance: number;

  @ApiProperty({ description: "Message" })
  message: string;
}

/**
 * Quest stats for admin
 */
export class LoyaltyQuestStatsDto {
  @ApiProperty({ description: "Total quests" })
  totalQuests: number;

  @ApiProperty({ description: "Active quests" })
  activeQuests: number;

  @ApiProperty({ description: "Total completions" })
  totalCompleted: number;

  @ApiProperty({ description: "Total points rewarded" })
  totalPointsRewarded: number;

  @ApiProperty({ description: "Completion rate (%)" })
  completionRate: number;

  @ApiProperty({ description: "Stats by period" })
  byPeriod: { period: string; count: number; completions: number }[];
}
