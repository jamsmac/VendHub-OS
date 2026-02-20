/**
 * Loyalty DTOs
 * Data Transfer Objects для системы лояльности
 */

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PointsTransactionType, PointsSource, LoyaltyLevel } from '../constants/loyalty.constants';

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * Запрос на использование баллов
 */
export class SpendPointsDto {
  @ApiProperty({
    description: 'Количество баллов для списания',
    minimum: 1,
    example: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100000)
  points: number;

  @ApiProperty({
    description: 'ID заказа',
    example: 'uuid',
  })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({
    description: 'Описание списания',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Админская корректировка баллов
 */
export class AdjustPointsDto {
  @ApiProperty({
    description: 'ID пользователя',
    example: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Количество баллов (положительное - начисление, отрицательное - списание)',
    example: 100,
  })
  @IsInt()
  @Min(-100000)
  @Max(100000)
  amount: number;

  @ApiProperty({
    description: 'Причина корректировки',
    example: 'Компенсация за технический сбой',
  })
  @IsString()
  reason: string;
}

/**
 * Запрос на применение промокода
 */
export class ApplyPromoCodeDto {
  @ApiProperty({
    description: 'Промокод',
    example: 'SUMMER2025',
  })
  @IsString()
  code: string;
}

/**
 * Фильтры для истории транзакций
 */
export class PointsHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Тип транзакции',
    enum: PointsTransactionType,
  })
  @IsOptional()
  @IsEnum(PointsTransactionType)
  type?: PointsTransactionType;

  @ApiPropertyOptional({
    description: 'Источник баллов',
    enum: PointsSource,
  })
  @IsOptional()
  @IsEnum(PointsSource)
  source?: PointsSource;

  @ApiPropertyOptional({
    description: 'Дата начала',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Дата окончания',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Страница',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Количество на странице',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Фильтры для админской статистики
 */
export class LoyaltyStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Дата начала периода',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Дата окончания периода',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Группировка',
    enum: ['day', 'week', 'month'],
  })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month';
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Информация об уровне лояльности
 */
export class LoyaltyLevelInfoDto {
  @ApiProperty({ description: 'Код уровня', enum: LoyaltyLevel })
  level: LoyaltyLevel;

  @ApiProperty({ description: 'Название уровня', example: 'Золото' })
  name: string;

  @ApiProperty({ description: 'Название на узбекском', example: 'Oltin' })
  nameUz: string;

  @ApiProperty({ description: 'Процент кэшбэка', example: 3 })
  cashbackPercent: number;

  @ApiProperty({ description: 'Множитель бонусов', example: 1.5 })
  bonusMultiplier: number;

  @ApiProperty({ description: 'Минимум баллов для уровня', example: 5000 })
  minPoints: number;

  @ApiProperty({ description: 'Цвет уровня', example: '#FFD700' })
  color: string;

  @ApiProperty({ description: 'Иконка уровня', example: '🥇' })
  icon: string;
}

/**
 * Текущий баланс и статус лояльности
 */
export class LoyaltyBalanceDto {
  @ApiProperty({ description: 'Текущий баланс баллов', example: 1500 })
  balance: number;

  @ApiProperty({ description: 'Текущий уровень' })
  currentLevel: LoyaltyLevelInfoDto;

  @ApiProperty({ description: 'Следующий уровень (null если максимальный)', nullable: true })
  nextLevel: LoyaltyLevelInfoDto | null;

  @ApiProperty({ description: 'Баллов до следующего уровня', example: 3500 })
  pointsToNextLevel: number;

  @ApiProperty({ description: 'Прогресс до следующего уровня (%)', example: 30 })
  progressPercent: number;

  @ApiProperty({ description: 'Всего заработано баллов', example: 5000 })
  totalEarned: number;

  @ApiProperty({ description: 'Всего потрачено баллов', example: 3500 })
  totalSpent: number;

  @ApiProperty({ description: 'Баллов сгорает в ближайшие 30 дней', example: 100 })
  expiringIn30Days: number;

  @ApiProperty({ description: 'Текущая серия дней', example: 5 })
  currentStreak: number;

  @ApiProperty({ description: 'Лучшая серия дней', example: 14 })
  longestStreak: number;

  @ApiProperty({ description: 'Получен приветственный бонус' })
  welcomeBonusReceived: boolean;
}

/**
 * Элемент истории транзакций
 */
export class PointsTransactionDto {
  @ApiProperty({ description: 'ID транзакции' })
  id: string;

  @ApiProperty({ description: 'Тип транзакции', enum: PointsTransactionType })
  type: PointsTransactionType;

  @ApiProperty({ description: 'Количество баллов', example: 100 })
  amount: number;

  @ApiProperty({ description: 'Баланс после транзакции', example: 1600 })
  balanceAfter: number;

  @ApiProperty({ description: 'Источник', enum: PointsSource })
  source: PointsSource;

  @ApiProperty({ description: 'Описание', example: 'За заказ #ORD-2025-00123' })
  description: string;

  @ApiProperty({ description: 'Дата транзакции' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата истечения (для начислений)', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ description: 'Иконка типа', example: '💰' })
  icon: string;

  @ApiProperty({ description: 'Цвет (green/red/gray)', example: 'green' })
  color: string;
}

/**
 * Список истории с пагинацией
 */
export class PointsHistoryResponseDto {
  @ApiProperty({ type: [PointsTransactionDto] })
  items: PointsTransactionDto[];

  @ApiProperty({ description: 'Общее количество записей' })
  total: number;

  @ApiProperty({ description: 'Текущая страница' })
  page: number;

  @ApiProperty({ description: 'Количество на странице' })
  limit: number;

  @ApiProperty({ description: 'Всего страниц' })
  totalPages: number;
}

/**
 * Информация обо всех уровнях
 */
export class AllLevelsInfoDto {
  @ApiProperty({ type: [LoyaltyLevelInfoDto] })
  levels: LoyaltyLevelInfoDto[];

  @ApiProperty({ description: 'Текущий уровень пользователя', enum: LoyaltyLevel })
  currentLevel: LoyaltyLevel;

  @ApiProperty({ description: 'Текущие баллы' })
  currentPoints: number;
}

/**
 * Результат начисления баллов
 */
export class EarnPointsResultDto {
  @ApiProperty({ description: 'Начислено баллов', example: 50 })
  earned: number;

  @ApiProperty({ description: 'Новый баланс', example: 1550 })
  newBalance: number;

  @ApiProperty({ description: 'Достигнут новый уровень', nullable: true })
  levelUp: LoyaltyLevelInfoDto | null;

  @ApiProperty({ description: 'Достигнут milestone серии', nullable: true })
  streakBonus: { bonus: number; message: string } | null;

  @ApiProperty({ description: 'Сообщение пользователю' })
  message: string;
}

/**
 * Результат списания баллов
 */
export class SpendPointsResultDto {
  @ApiProperty({ description: 'Списано баллов', example: 100 })
  spent: number;

  @ApiProperty({ description: 'Новый баланс', example: 1400 })
  newBalance: number;

  @ApiProperty({ description: 'Скидка в сумах', example: 100 })
  discountAmount: number;

  @ApiProperty({ description: 'ID транзакции' })
  transactionId: string;
}

/**
 * Статистика программы лояльности (для админов)
 */
export class LoyaltyStatsDto {
  @ApiProperty({ description: 'Период' })
  period: { from: Date; to: Date };

  @ApiProperty({ description: 'Общее количество участников' })
  totalMembers: number;

  @ApiProperty({ description: 'Активных за период' })
  activeMembers: number;

  @ApiProperty({ description: 'Новых за период' })
  newMembers: number;

  @ApiProperty({ description: 'Распределение по уровням' })
  levelDistribution: {
    level: LoyaltyLevel;
    count: number;
    percent: number;
  }[];

  @ApiProperty({ description: 'Всего начислено баллов за период' })
  totalEarned: number;

  @ApiProperty({ description: 'Всего потрачено баллов за период' })
  totalSpent: number;

  @ApiProperty({ description: 'Средний баланс' })
  averageBalance: number;

  @ApiProperty({ description: 'Redemption rate (% использованных баллов)' })
  redemptionRate: number;

  @ApiProperty({ description: 'Топ источников начисления' })
  topEarnSources: { source: PointsSource; total: number; percent: number }[];

  @ApiProperty({ description: 'Динамика по дням/неделям/месяцам' })
  timeline: {
    date: string;
    earned: number;
    spent: number;
    newMembers: number;
  }[];
}

/**
 * Доступные награды для обмена на баллы
 */
export class AvailableRewardDto {
  @ApiProperty({ description: 'ID награды' })
  id: string;

  @ApiProperty({ description: 'Название' })
  name: string;

  @ApiProperty({ description: 'Описание' })
  description: string;

  @ApiProperty({ description: 'Стоимость в баллах' })
  pointsCost: number;

  @ApiProperty({ description: 'Тип награды' })
  type: 'discount' | 'product' | 'promo';

  @ApiProperty({ description: 'Доступно для обмена' })
  isAvailable: boolean;

  @ApiProperty({ description: 'Изображение', nullable: true })
  imageUrl: string | null;
}

// ============================================================================
// INTERNAL DTOs
// ============================================================================

/**
 * Внутренний DTO для начисления баллов (от других сервисов)
 */
export interface InternalEarnPointsDto {
  userId: string;
  organizationId: string;
  amount: number;
  source: PointsSource;
  referenceId?: string;
  referenceType?: string;
  description?: string;
  descriptionUz?: string;
  metadata?: Record<string, any>;
}

/**
 * Внутренний DTO для списания баллов
 */
export interface InternalSpendPointsDto {
  userId: string;
  organizationId: string;
  amount: number;
  referenceId?: string;
  referenceType?: string;
  description?: string;
}
