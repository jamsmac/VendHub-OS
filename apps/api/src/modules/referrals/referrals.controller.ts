/**
 * Referrals Controller
 * API endpoints для реферальной программы VendHub
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import { ReferralsService } from './referrals.service';
import {
  ApplyReferralCodeDto,
  GenerateReferralCodeDto,
  ReferralFilterDto,
  ReferralCodeInfoDto,
  ReferralSummaryDto,
  ReferralListDto,
  ApplyReferralResultDto,
  ReferralStatsDto,
} from './dto/referral.dto';

@ApiTags('Referrals')
@ApiBearerAuth()
@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  @Get('my-code')
  @ApiOperation({
    summary: 'Get my referral code',
    description: 'Получить свой реферальный код и ссылки для шаринга',
  })
  @ApiResponse({ status: 200, type: ReferralCodeInfoDto })
  async getMyReferralCode(@CurrentUser() user: User): Promise<ReferralCodeInfoDto> {
    return this.referralsService.getReferralCode(user.id);
  }

  @Post('my-code/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regenerate referral code',
    description: 'Сгенерировать новый реферальный код (или указать свой)',
  })
  @ApiResponse({ status: 200, type: ReferralCodeInfoDto })
  async regenerateCode(
    @CurrentUser() user: User,
    @Body() dto: GenerateReferralCodeDto,
  ): Promise<ReferralCodeInfoDto> {
    return this.referralsService.regenerateReferralCode(user.id, dto);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get my referral summary',
    description: 'Получить сводку по моим рефералам',
  })
  @ApiResponse({ status: 200, type: ReferralSummaryDto })
  async getMySummary(@CurrentUser() user: User): Promise<ReferralSummaryDto> {
    return this.referralsService.getReferralSummary(user.id);
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get my referrals list',
    description: 'Получить список моих рефералов',
  })
  @ApiResponse({ status: 200, type: ReferralListDto })
  async getMyReferrals(
    @CurrentUser() user: User,
    @Query() filter: ReferralFilterDto,
  ): Promise<ReferralListDto> {
    return this.referralsService.getUserReferrals(user.id, filter);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply referral code',
    description: 'Применить реферальный код (получить бонус)',
  })
  @ApiResponse({ status: 200, type: ApplyReferralResultDto })
  async applyCode(
    @CurrentUser() user: User,
    @Body() dto: ApplyReferralCodeDto,
  ): Promise<ApplyReferralResultDto> {
    return this.referralsService.applyReferralCode(user.id, dto);
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get referral program statistics',
    description: 'Получить статистику реферальной программы',
  })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiResponse({ status: 200, type: ReferralStatsDto })
  async getStats(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<ReferralStatsDto> {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();
    return this.referralsService.getStats(user.organizationId, from, to);
  }
}
