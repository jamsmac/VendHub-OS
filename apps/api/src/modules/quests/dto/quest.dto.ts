/**
 * Quest DTOs
 * Data Transfer Objects для системы квестов
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  IsUUID,
  Min,
  IsObject,
} from "class-validator";
import { Transform } from "class-transformer";
import {
  QuestPeriod,
  QuestType,
  QuestDifficulty,
  QuestStatus,
} from "../constants/quest.constants";

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * Создание квеста
 */
export class CreateQuestDto {
  @ApiProperty({ description: "Quest title", example: "Первый заказ дня" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "Quest title in Uzbek" })
  @IsString()
  @IsOptional()
  titleUz?: string;

  @ApiProperty({ description: "Quest description" })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: "Quest description in Uzbek" })
  @IsString()
  @IsOptional()
  descriptionUz?: string;

  @ApiProperty({ enum: QuestPeriod, example: QuestPeriod.DAILY })
  @IsEnum(QuestPeriod)
  period: QuestPeriod;

  @ApiProperty({ enum: QuestType, example: QuestType.ORDER_COUNT })
  @IsEnum(QuestType)
  type: QuestType;

  @ApiPropertyOptional({
    enum: QuestDifficulty,
    default: QuestDifficulty.MEDIUM,
  })
  @IsEnum(QuestDifficulty)
  @IsOptional()
  difficulty?: QuestDifficulty;

  @ApiProperty({ description: "Target value", example: 3 })
  @IsInt()
  @Min(1)
  targetValue: number;

  @ApiProperty({ description: "Points reward", example: 50 })
  @IsInt()
  @Min(1)
  rewardPoints: number;

  @ApiPropertyOptional({ description: "Additional rewards" })
  @IsArray()
  @IsOptional()
  additionalRewards?: unknown[];

  @ApiPropertyOptional({ description: "Quest metadata" })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Unlock requirements" })
  @IsObject()
  @IsOptional()
  requirements?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Icon emoji", default: "🎯" })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: "Badge color", default: "#4CAF50" })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: "Image URL" })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "Quest starts at" })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({ description: "Quest ends at" })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional({ description: "Is active", default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Is featured", default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: "Display order", default: 0 })
  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

/**
 * Обновление квеста
 */
export class UpdateQuestDto extends PartialType(CreateQuestDto) {}

/**
 * Фильтр квестов
 */
export class QuestFilterDto {
  @ApiPropertyOptional({ enum: QuestPeriod })
  @IsEnum(QuestPeriod)
  @IsOptional()
  period?: QuestPeriod;

  @ApiPropertyOptional({ enum: QuestType })
  @IsEnum(QuestType)
  @IsOptional()
  type?: QuestType;

  @ApiPropertyOptional({ enum: QuestDifficulty })
  @IsEnum(QuestDifficulty)
  @IsOptional()
  difficulty?: QuestDifficulty;

  @ApiPropertyOptional({ description: "Show only active" })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Show only featured" })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: "Include expired" })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  includeExpired?: boolean;
}

/**
 * Фильтр квестов пользователя
 */
export class UserQuestFilterDto {
  @ApiPropertyOptional({ enum: QuestStatus })
  @IsEnum(QuestStatus)
  @IsOptional()
  status?: QuestStatus;

  @ApiPropertyOptional({ enum: QuestPeriod })
  @IsEnum(QuestPeriod)
  @IsOptional()
  period?: QuestPeriod;

  @ApiPropertyOptional({ description: "Show only claimable" })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  claimable?: boolean;
}

/**
 * Claim rewards DTO
 */
export class ClaimQuestRewardDto {
  @ApiProperty({ description: "User quest ID" })
  @IsUUID()
  userQuestId: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Информация о квесте
 */
export class QuestInfoDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() titleUz: string;
  @ApiProperty() description: string;
  @ApiProperty() descriptionUz: string;
  @ApiProperty({ enum: QuestPeriod }) period: QuestPeriod;
  @ApiProperty({ enum: QuestType }) type: QuestType;
  @ApiProperty({ enum: QuestDifficulty }) difficulty: QuestDifficulty;
  @ApiProperty() targetValue: number;
  @ApiProperty() rewardPoints: number;
  @ApiProperty() additionalRewards: unknown[];
  @ApiProperty() icon: string;
  @ApiProperty() color: string;
  @ApiProperty() imageUrl: string;
  @ApiProperty() startsAt: Date;
  @ApiProperty() endsAt: Date;
  @ApiProperty() isFeatured: boolean;
  @ApiProperty() completionRate: number;
}

/**
 * Прогресс квеста для пользователя
 */
export class UserQuestProgressDto {
  @ApiProperty() id: string;
  @ApiProperty() questId: string;
  @ApiProperty() quest: QuestInfoDto;
  @ApiProperty({ enum: QuestStatus }) status: QuestStatus;
  @ApiProperty() currentValue: number;
  @ApiProperty() targetValue: number;
  @ApiProperty() progressPercent: number;
  @ApiProperty() remaining: number;
  @ApiProperty() rewardPoints: number;
  @ApiProperty() startedAt: Date;
  @ApiProperty() completedAt: Date;
  @ApiProperty() claimedAt: Date;
  @ApiProperty() periodStart: Date;
  @ApiProperty() periodEnd: Date;
  @ApiProperty() canClaim: boolean;
}

/**
 * Сводка квестов пользователя
 */
export class UserQuestsSummaryDto {
  @ApiProperty({ description: "Total active quests" })
  totalActive: number;

  @ApiProperty({ description: "Completed today" })
  completedToday: number;

  @ApiProperty({ description: "Ready to claim" })
  readyToClaim: number;

  @ApiProperty({ description: "Total points available" })
  pointsAvailable: number;

  @ApiProperty({ description: "Daily quests" })
  daily: UserQuestProgressDto[];

  @ApiProperty({ description: "Weekly quests" })
  weekly: UserQuestProgressDto[];

  @ApiProperty({ description: "Monthly quests" })
  monthly: UserQuestProgressDto[];

  @ApiProperty({ description: "Achievements (one-time)" })
  achievements: UserQuestProgressDto[];

  @ApiProperty({ description: "Special/seasonal quests" })
  special: UserQuestProgressDto[];
}

/**
 * Результат claim
 */
export class ClaimResultDto {
  @ApiProperty() success: boolean;
  @ApiProperty() pointsEarned: number;
  @ApiProperty() newBalance: number;
  @ApiProperty() additionalRewards: unknown[];
  @ApiProperty() message: string;
}

/**
 * Результат обновления прогресса
 */
export class ProgressUpdateResultDto {
  @ApiProperty() questId: string;
  @ApiProperty() previousValue: number;
  @ApiProperty() currentValue: number;
  @ApiProperty() targetValue: number;
  @ApiProperty() isCompleted: boolean;
  @ApiProperty() canClaim: boolean;
}

/**
 * Статистика квестов (для админов)
 */
export class QuestStatsDto {
  @ApiProperty() period: { from: Date; to: Date };
  @ApiProperty() totalQuests: number;
  @ApiProperty() activeQuests: number;
  @ApiProperty() totalParticipants: number;
  @ApiProperty() totalCompleted: number;
  @ApiProperty() totalPointsAwarded: number;
  @ApiProperty() completionRate: number;

  @ApiProperty()
  byPeriod: Array<{
    period: QuestPeriod;
    count: number;
    completed: number;
    rate: number;
  }>;

  @ApiProperty()
  byType: Array<{
    type: QuestType;
    count: number;
    completed: number;
    rate: number;
  }>;

  @ApiProperty()
  topQuests: Array<{
    quest: QuestInfoDto;
    completedCount: number;
    participantCount: number;
    rate: number;
  }>;
}

// ============================================================================
// INTERNAL DTOs
// ============================================================================

/**
 * Событие прогресса квеста (внутреннее)
 */
export class QuestProgressEventDto {
  userId: string;
  organizationId: string;
  eventType: QuestType;
  value: number;
  metadata?: {
    orderId?: string;
    productId?: string;
    machineId?: string;
    categoryId?: string;
    amount?: number;
    hour?: number;
    referredUserId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

/**
 * Обновление прогресса (внутреннее)
 */
export class UpdateProgressDto {
  userQuestId: string;
  incrementBy: number;
  details?: Record<string, unknown>;
}
