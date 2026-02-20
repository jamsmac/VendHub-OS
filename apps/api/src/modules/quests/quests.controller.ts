/**
 * Quests Controller
 * API endpoints для системы квестов VendHub
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { QuestsService } from './quests.service';
import {
  CreateQuestDto,
  UpdateQuestDto,
  QuestFilterDto,
  UserQuestProgressDto,
  UserQuestsSummaryDto,
  ClaimResultDto,
  QuestStatsDto,
} from './dto/quest.dto';
import { Quest } from './entities/quest.entity';

@ApiTags('Quests')
@ApiBearerAuth()
@Controller('quests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  // ============================================================================
  // USER ENDPOINTS (Customer-facing)
  // ============================================================================

  @Get('my')
  @ApiOperation({
    summary: 'Get my quests summary',
    description: 'Получить сводку всех квестов текущего пользователя (ежедневные, еженедельные, достижения)',
  })
  @ApiResponse({ status: 200, type: UserQuestsSummaryDto })
  async getMyQuests(@CurrentUser() user: User): Promise<UserQuestsSummaryDto> {
    return this.questsService.getUserQuestsSummary(user.id);
  }

  @Get('my/:userQuestId')
  @ApiOperation({
    summary: 'Get specific quest progress',
    description: 'Получить детальный прогресс по конкретному квесту',
  })
  @ApiParam({ name: 'userQuestId', description: 'User Quest ID' })
  @ApiResponse({ status: 200, type: UserQuestProgressDto })
  async getMyQuestProgress(
    @CurrentUser() user: User,
    @Param('userQuestId', ParseUUIDPipe) userQuestId: string,
  ): Promise<UserQuestProgressDto> {
    return this.questsService.getUserQuest(user.id, userQuestId);
  }

  @Post('my/:userQuestId/claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Claim quest reward',
    description: 'Получить награду за выполненный квест',
  })
  @ApiParam({ name: 'userQuestId', description: 'User Quest ID' })
  @ApiResponse({ status: 200, type: ClaimResultDto })
  async claimReward(
    @CurrentUser() user: User,
    @Param('userQuestId', ParseUUIDPipe) userQuestId: string,
  ): Promise<ClaimResultDto> {
    return this.questsService.claimReward(user.id, userQuestId);
  }

  @Post('my/claim-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Claim all available rewards',
    description: 'Получить все доступные награды за выполненные квесты',
  })
  @ApiResponse({ status: 200, type: ClaimResultDto })
  async claimAllRewards(@CurrentUser() user: User): Promise<ClaimResultDto> {
    return this.questsService.claimAllRewards(user.id);
  }

  // ============================================================================
  // ADMIN ENDPOINTS (Quest Management)
  // ============================================================================

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get all quests',
    description: 'Получить список всех квестов организации (для админов)',
  })
  @ApiResponse({ status: 200, type: [Quest] })
  async getQuests(
    @CurrentUser() user: User,
    @Query() filter: QuestFilterDto,
  ): Promise<Quest[]> {
    return this.questsService.getQuests(user.organizationId, filter);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create quest',
    description: 'Создать новый квест',
  })
  @ApiResponse({ status: 201, type: Quest })
  async createQuest(
    @CurrentUser() user: User,
    @Body() dto: CreateQuestDto,
  ): Promise<Quest> {
    return this.questsService.createQuest(user.organizationId, dto);
  }

  @Put(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update quest',
    description: 'Обновить квест',
  })
  @ApiParam({ name: 'id', description: 'Quest ID' })
  @ApiResponse({ status: 200, type: Quest })
  async updateQuest(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestDto,
  ): Promise<Quest> {
    return this.questsService.updateQuest(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete quest',
    description: 'Удалить квест',
  })
  @ApiParam({ name: 'id', description: 'Quest ID' })
  @ApiResponse({ status: 204, description: 'Quest deleted' })
  async deleteQuest(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.questsService.deleteQuest(id, user.organizationId);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get quest statistics',
    description: 'Получить статистику по квестам',
  })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiResponse({ status: 200, type: QuestStatsDto })
  async getStats(
    @CurrentUser() user: User,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<QuestStatsDto> {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();
    return this.questsService.getStats(user.organizationId, from, to);
  }
}
