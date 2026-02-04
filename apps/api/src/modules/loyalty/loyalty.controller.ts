/**
 * Loyalty Controller
 * API endpoints для системы лояльности VendHub
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { LoyaltyService } from './loyalty.service';
import {
  SpendPointsDto,
  AdjustPointsDto,
  PointsHistoryQueryDto,
  LoyaltyStatsQueryDto,
  LoyaltyBalanceDto,
  EarnPointsResultDto,
  SpendPointsResultDto,
  PointsHistoryResponseDto,
  LoyaltyStatsDto,
  AllLevelsInfoDto,
} from './dto/loyalty.dto';

@ApiTags('Loyalty')
@ApiBearerAuth()
@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  @Get('balance')
  @ApiOperation({
    summary: 'Get loyalty balance and status',
    description: `
Получить текущий баланс баллов, уровень лояльности и прогресс.

**Уровни лояльности:**
- 🥉 Bronze (0+ баллов) - 1% кэшбэк, x1 множитель
- 🥈 Silver (1000+ баллов) - 2% кэшбэк, x1.2 множитель
- 🥇 Gold (5000+ баллов) - 3% кэшбэк, x1.5 множитель
- 💎 Platinum (20000+ баллов) - 5% кэшбэк, x2 множитель

**Включает:**
- Текущий баланс и уровень
- Прогресс до следующего уровня
- Количество баллов, сгорающих в ближайшие 30 дней
- Текущую и лучшую серию заказов (streak)
    `,
  })
  @ApiResponse({ status: 200, type: LoyaltyBalanceDto })
  async getBalance(@CurrentUser() user: User): Promise<LoyaltyBalanceDto> {
    return this.loyaltyService.getBalance(user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get points transaction history',
    description: 'Получить историю всех операций с баллами с пагинацией и фильтрами.',
  })
  @ApiResponse({ status: 200, type: PointsHistoryResponseDto })
  async getHistory(
    @CurrentUser() user: User,
    @Query(ValidationPipe) query: PointsHistoryQueryDto,
  ): Promise<PointsHistoryResponseDto> {
    return this.loyaltyService.getHistory(user.id, query);
  }

  @Get('levels')
  @ApiOperation({
    summary: 'Get all loyalty levels info',
    description: 'Получить информацию обо всех уровнях лояльности и текущем уровне пользователя.',
  })
  @ApiResponse({ status: 200, type: AllLevelsInfoDto })
  async getLevels(@CurrentUser() user: User): Promise<AllLevelsInfoDto> {
    return this.loyaltyService.getAllLevels(user.id);
  }

  @Post('spend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Spend points on order',
    description: `
Использовать баллы для скидки на заказ.

**Правила:**
- Минимум 100 баллов для списания
- Максимум 50% от суммы заказа можно оплатить баллами
- 1 балл = 1 сум
    `,
  })
  @ApiResponse({ status: 200, type: SpendPointsResultDto })
  @ApiResponse({ status: 400, description: 'Insufficient points or validation error' })
  async spendPoints(
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: SpendPointsDto,
  ): Promise<SpendPointsResultDto> {
    return this.loyaltyService.spendPoints({
      userId: user.id,
      organizationId: user.organizationId,
      amount: dto.points,
      referenceId: dto.orderId,
      referenceType: 'order',
      description: dto.description,
    });
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Post('admin/adjust')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Adjust user points (Admin)',
    description: `
Корректировка баллов пользователя администратором.

**Используйте для:**
- Компенсации за технические сбои
- Бонусов за особые случаи
- Исправления ошибок

Все корректировки логируются с причиной.
    `,
  })
  @ApiResponse({ status: 200, type: EarnPointsResultDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async adjustPoints(
    @CurrentUser() admin: User,
    @Body(ValidationPipe) dto: AdjustPointsDto,
  ): Promise<EarnPointsResultDto | SpendPointsResultDto> {
    return this.loyaltyService.adjustPoints(
      dto.userId,
      admin.organizationId,
      dto.amount,
      dto.reason,
      admin.id,
    );
  }

  @Get('admin/stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get loyalty program statistics (Admin)',
    description: `
Статистика программы лояльности за период.

**Включает:**
- Количество участников и активных пользователей
- Распределение по уровням
- Общее количество начисленных и потраченных баллов
- Средний баланс и redemption rate
- Топ источников начисления
    `,
  })
  @ApiResponse({ status: 200, type: LoyaltyStatsDto })
  async getStats(
    @CurrentUser() user: User,
    @Query(ValidationPipe) query: LoyaltyStatsQueryDto,
  ): Promise<LoyaltyStatsDto> {
    return this.loyaltyService.getStats(user.organizationId, query);
  }

  @Get('admin/expiring')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get users with expiring points (Admin)',
    description: 'Получить список пользователей с баллами, которые скоро сгорят.',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Days until expiry (default: 30)' })
  async getExpiringPoints(
    @CurrentUser() user: User,
    @Query('days') days?: number,
  ) {
    return this.loyaltyService.getExpiringPointsReport(
      user.organizationId,
      days || 30,
    );
  }

  // ============================================================================
  // PUBLIC ENDPOINTS (no auth required)
  // ============================================================================

  @Get('levels/info')
  @ApiOperation({
    summary: 'Get loyalty levels information (public)',
    description: 'Публичная информация о программе лояльности и уровнях.',
  })
  async getLevelsInfo(): Promise<AllLevelsInfoDto> {
    return this.loyaltyService.getAllLevels();
  }
}
