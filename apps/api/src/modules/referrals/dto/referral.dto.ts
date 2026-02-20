/**
 * Referral DTOs
 * Data Transfer Objects для реферальной системы
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ReferralStatus } from '../entities/referral.entity';

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * Применить реферальный код при регистрации
 */
export class ApplyReferralCodeDto {
  @ApiProperty({
    description: 'Referral code',
    example: 'ABC12345',
  })
  @IsString()
  @Length(6, 20)
  referralCode: string;

  @ApiPropertyOptional({ description: 'Source of referral' })
  @IsString()
  @IsOptional()
  source?: 'link' | 'code' | 'qr' | 'share';

  @ApiPropertyOptional({ description: 'UTM campaign' })
  @IsString()
  @IsOptional()
  utmCampaign?: string;
}

/**
 * Генерация/обновление реферального кода
 */
export class GenerateReferralCodeDto {
  @ApiPropertyOptional({
    description: 'Custom referral code (if allowed)',
    example: 'MYCODE',
  })
  @IsString()
  @IsOptional()
  @Length(6, 12)
  @Transform(({ value }) => value?.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  customCode?: string;
}

/**
 * Фильтр рефералов (для админа)
 */
export class ReferralFilterDto {
  @ApiPropertyOptional({ enum: ReferralStatus })
  @IsOptional()
  status?: ReferralStatus;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 20)
  limit?: number;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Реферальный код и информация
 */
export class ReferralCodeInfoDto {
  @ApiProperty({ description: 'Referral code' })
  referralCode: string;

  @ApiProperty({ description: 'Share link' })
  shareLink: string;

  @ApiProperty({ description: 'Short share link' })
  shortLink: string;

  @ApiProperty({ description: 'QR code URL' })
  qrCodeUrl: string;

  @ApiProperty({ description: 'Referrer reward points' })
  referrerReward: number;

  @ApiProperty({ description: 'Referred welcome bonus' })
  referredBonus: number;

  @ApiProperty({ description: 'Share messages' })
  shareMessages: {
    telegram: string;
    whatsapp: string;
    sms: string;
    general: string;
  };
}

/**
 * Информация о реферале
 */
export class ReferralInfoDto {
  @ApiProperty() id: string;
  @ApiProperty() referredId: string;
  @ApiProperty() referredName: string;
  @ApiProperty() referredAvatar?: string;
  @ApiProperty({ enum: ReferralStatus }) status: ReferralStatus;
  @ApiProperty() referrerRewardPoints: number;
  @ApiProperty() referrerRewardPaid: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() activatedAt: Date;
  @ApiProperty() daysToActivate: number;
}

/**
 * Сводка по рефералам пользователя
 */
export class ReferralSummaryDto {
  @ApiProperty({ description: 'User referral code' })
  referralCode: string;

  @ApiProperty({ description: 'Share link' })
  shareLink: string;

  @ApiProperty({ description: 'Total referrals' })
  totalReferrals: number;

  @ApiProperty({ description: 'Pending referrals' })
  pendingReferrals: number;

  @ApiProperty({ description: 'Activated referrals' })
  activatedReferrals: number;

  @ApiProperty({ description: 'Total points earned from referrals' })
  totalPointsEarned: number;

  @ApiProperty({ description: 'Pending points (from pending referrals)' })
  pendingPoints: number;

  @ApiProperty({ description: 'Referrer reward per referral' })
  rewardPerReferral: number;

  @ApiProperty({ description: 'Recent referrals' })
  recentReferrals: ReferralInfoDto[];
}

/**
 * Список рефералов
 */
export class ReferralListDto {
  @ApiProperty({ type: [ReferralInfoDto] })
  items: ReferralInfoDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

/**
 * Результат применения реферального кода
 */
export class ApplyReferralResultDto {
  @ApiProperty() success: boolean;
  @ApiProperty() referrerName: string;
  @ApiProperty() welcomeBonus: number;
  @ApiProperty() message: string;
}

/**
 * Статистика реферальной программы (для админов)
 */
export class ReferralStatsDto {
  @ApiProperty() period: { from: Date; to: Date };
  @ApiProperty() totalReferrals: number;
  @ApiProperty() pendingReferrals: number;
  @ApiProperty() activatedReferrals: number;
  @ApiProperty() conversionRate: number;
  @ApiProperty() totalPointsAwarded: number;
  @ApiProperty() averageActivationDays: number;

  @ApiProperty()
  topReferrers: Array<{
    userId: string;
    userName: string;
    referralCount: number;
    activatedCount: number;
    pointsEarned: number;
  }>;

  @ApiProperty()
  bySource: Array<{
    source: string;
    count: number;
    activated: number;
    rate: number;
  }>;

  @ApiProperty()
  timeline: Array<{
    date: string;
    referrals: number;
    activated: number;
  }>;
}

// ============================================================================
// INTERNAL DTOs
// ============================================================================

/**
 * Событие активации реферала
 */
export class ReferralActivationEventDto {
  referralId: string;
  referrerId: string;
  referredId: string;
  orderId: string;
  orderAmount: number;
  organizationId: string;
}
