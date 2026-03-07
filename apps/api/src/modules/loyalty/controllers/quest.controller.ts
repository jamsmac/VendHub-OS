/**
 * Quest Controller
 * API endpoints for quest/challenge management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards";
import { Roles } from "../../../common/decorators";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User, UserRole } from "../../users/entities/user.entity";
import { QuestService } from "../services/quest.service";
import {
  CreateQuestDto,
  UpdateQuestDto,
  QuestQueryDto,
  QuestResponseDto,
  QuestsListResponseDto,
  UserQuestProgressDto,
  ClaimRewardResultDto,
  QuestStatsDto,
} from "../dto/quest.dto";

@ApiTags("Loyalty - Quests")
@ApiBearerAuth()
@Controller("loyalty/quests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  @Get()
  @Roles(
    "owner",
    "admin",
    "manager",
    "operator",
    "warehouse",
    "accountant",
    "viewer",
  )
  @ApiOperation({
    summary: "Get active quests",
    description: `
Получить список активных квестов для текущей организации.

**Возвращает:**
- Все активные квесты с параметрами
- Отсортировано: featured first, потом по displayOrder
- Только квесты в текущем временном окне (startsAt/endsAt)
    `,
  })
  @ApiResponse({ status: 200, type: [QuestResponseDto] })
  async getActiveQuests(
    @CurrentUser() user: User,
  ): Promise<QuestResponseDto[]> {
    return this.questService.getActiveQuests(user.organizationId);
  }

  @Get("my")
  @Roles(
    "owner",
    "admin",
    "manager",
    "operator",
    "warehouse",
    "accountant",
    "viewer",
  )
  @ApiOperation({
    summary: "Get my quest progress",
    description: `
Получить прогресс текущего пользователя по активным квестам.

**Возвращает:**
- Все квесты пользователя с текущим прогрессом
- Процент выполнения
- Статус: in_progress, completed, claimed
- Автоматически создает записи для новых квестов
    `,
  })
  @ApiResponse({ status: 200, type: [UserQuestProgressDto] })
  async getMyQuests(
    @CurrentUser() user: User,
  ): Promise<UserQuestProgressDto[]> {
    return this.questService.getUserQuests(user.id, user.organizationId);
  }

  @Post(":id/claim")
  @Roles(
    "owner",
    "admin",
    "manager",
    "operator",
    "warehouse",
    "accountant",
    "viewer",
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Claim quest reward",
    description: `
Получить награду за выполненный квест.

**Правила:**
- Квест должен быть в статусе "completed"
- Баллы начисляются через LoyaltyService.earnPoints
- Источник баллов зависит от периода квеста (daily_quest, weekly_quest, etc.)
- После claim статус меняется на "claimed"
    `,
  })
  @ApiParam({ name: "id", description: "Quest ID" })
  @ApiResponse({ status: 200, type: ClaimRewardResultDto })
  @ApiResponse({
    status: 400,
    description: "Quest not completed or already claimed",
  })
  @ApiResponse({ status: 404, description: "Quest not found" })
  async claimReward(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) questId: string,
  ): Promise<ClaimRewardResultDto> {
    return this.questService.claimReward(user.id, questId, user.organizationId);
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Get("admin/list")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "List all quests (Admin)",
    description: `
Получить все квесты организации с пагинацией и фильтрами.

**Фильтры:**
- period: daily, weekly, monthly, one_time, special
- type: order_count, referral, etc.
- isActive: true/false
    `,
  })
  @ApiResponse({ status: 200, type: QuestsListResponseDto })
  async listQuests(
    @CurrentUser() user: User,
    @Query(ValidationPipe) query: QuestQueryDto,
  ): Promise<QuestsListResponseDto> {
    return this.questService.getQuests(user.organizationId, query);
  }

  @Get("admin/stats")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Get quest statistics (Admin)",
    description: `
Статистика квестов для админской панели.

**Включает:**
- Общее количество квестов и активных
- Общее количество выполнений и наград
- Completion rate
- Разбивку по периодам
    `,
  })
  @ApiResponse({ status: 200, type: QuestStatsDto })
  async getQuestStats(@CurrentUser() user: User): Promise<QuestStatsDto> {
    return this.questService.getQuestStats(user.organizationId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Create a quest (Admin)",
    description: `
Создать новый квест для организации.

**Параметры:**
- title / titleUz — заголовок
- description / descriptionUz — описание
- period — daily, weekly, monthly, one_time, special
- type — тип (order_count, referral, etc.)
- targetValue — целевое значение для выполнения
- rewardPoints — награда в баллах
- difficulty — easy, medium, hard, legendary
- icon / color — отображение
- startsAt / endsAt — временное окно
    `,
  })
  @ApiResponse({ status: 201, type: QuestResponseDto })
  async createQuest(
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: CreateQuestDto,
  ): Promise<QuestResponseDto> {
    return this.questService.createQuest(user.organizationId, dto);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Update a quest (Admin)",
    description: "Обновить параметры квеста. Все поля опциональны.",
  })
  @ApiParam({ name: "id", description: "Quest ID" })
  @ApiResponse({ status: 200, type: QuestResponseDto })
  @ApiResponse({ status: 404, description: "Quest not found" })
  async updateQuest(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) questId: string,
    @Body(ValidationPipe) dto: UpdateQuestDto,
  ): Promise<QuestResponseDto> {
    return this.questService.updateQuest(questId, user.organizationId, dto);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a quest (Admin)",
    description: "Мягкое удаление квеста. Данные сохраняются для аудита.",
  })
  @ApiParam({ name: "id", description: "Quest ID" })
  @ApiResponse({ status: 204, description: "Quest deleted" })
  @ApiResponse({ status: 404, description: "Quest not found" })
  async deleteQuest(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) questId: string,
  ): Promise<void> {
    return this.questService.deleteQuest(questId, user.organizationId);
  }
}
