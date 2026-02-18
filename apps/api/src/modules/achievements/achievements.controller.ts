/**
 * Achievements Controller
 * API endpoints для системы достижений VendHub
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
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User, UserRole } from "../users/entities/user.entity";
import { AchievementsService } from "./achievements.service";
import {
  CreateAchievementDto,
  UpdateAchievementDto,
  AchievementFilterDto,
  UserAchievementDto,
  UserAchievementsSummaryDto,
  ClaimAchievementResultDto,
  AchievementStatsDto,
} from "./dto/achievement.dto";
import { Achievement } from "./entities/achievement.entity";

@ApiTags("Achievements")
@ApiBearerAuth()
@Controller("achievements")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  // ============================================================================
  // USER ENDPOINTS (Customer-facing)
  // ============================================================================

  @Get("my")
  @ApiOperation({
    summary: "Get my achievements summary",
    description: `
Получить сводку достижений текущего пользователя.

**Включает:**
- Общее количество и разблокированные
- Некизбранные бонусы
- Статистика по категориям
- Недавно разблокированные
- В процессе выполнения
    `,
  })
  @ApiResponse({ status: 200, type: UserAchievementsSummaryDto })
  async getMySummary(
    @CurrentUser() user: User,
  ): Promise<UserAchievementsSummaryDto> {
    return this.achievementsService.getUserAchievementsSummary(user.id);
  }

  @Get("my/all")
  @ApiOperation({
    summary: "Get all my achievements",
    description: "Получить все достижения с прогрессом",
  })
  @ApiResponse({ status: 200, type: [UserAchievementDto] })
  async getMyAchievements(
    @CurrentUser() user: User,
  ): Promise<UserAchievementDto[]> {
    return this.achievementsService.getUserAchievements(user.id);
  }

  @Post("my/:userAchievementId/claim")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Claim achievement reward",
    description: "Получить бонусные баллы за разблокированное достижение",
  })
  @ApiParam({ name: "userAchievementId", description: "User Achievement ID" })
  @ApiResponse({ status: 200, type: ClaimAchievementResultDto })
  async claimReward(
    @CurrentUser() user: User,
    @Param("userAchievementId", ParseUUIDPipe) userAchievementId: string,
  ): Promise<ClaimAchievementResultDto> {
    return this.achievementsService.claimReward(user.id, userAchievementId);
  }

  @Post("my/claim-all")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Claim all available rewards",
    description:
      "Получить все доступные награды за разблокированные достижения",
  })
  @ApiResponse({ status: 200, type: [ClaimAchievementResultDto] })
  async claimAllRewards(
    @CurrentUser() user: User,
  ): Promise<ClaimAchievementResultDto[]> {
    return this.achievementsService.claimAllRewards(user.id);
  }

  // ============================================================================
  // ADMIN ENDPOINTS (Achievement Management)
  // ============================================================================

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Get all achievements",
    description: "Получить список всех достижений организации (для админов)",
  })
  @ApiResponse({ status: 200, type: [Achievement] })
  async getAchievements(
    @CurrentUser() user: User,
    @Query(ValidationPipe) filter: AchievementFilterDto,
  ): Promise<Achievement[]> {
    return this.achievementsService.getAchievements(
      user.organizationId,
      filter,
    );
  }

  @Get("stats")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Get achievement statistics",
    description: "Получить статистику по достижениям",
  })
  @ApiResponse({ status: 200, type: AchievementStatsDto })
  async getStats(@CurrentUser() user: User): Promise<AchievementStatsDto> {
    return this.achievementsService.getStats(user.organizationId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Create achievement",
    description: "Создать новое достижение",
  })
  @ApiResponse({ status: 201, type: Achievement })
  async createAchievement(
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: CreateAchievementDto,
  ): Promise<Achievement> {
    return this.achievementsService.createAchievement(user.organizationId, dto);
  }

  @Put(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Update achievement",
    description: "Обновить достижение",
  })
  @ApiParam({ name: "id", description: "Achievement ID" })
  @ApiResponse({ status: 200, type: Achievement })
  async updateAchievement(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateAchievementDto,
  ): Promise<Achievement> {
    return this.achievementsService.updateAchievement(
      id,
      user.organizationId,
      dto,
    );
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete achievement",
    description: "Удалить достижение (мягкое удаление)",
  })
  @ApiParam({ name: "id", description: "Achievement ID" })
  @ApiResponse({ status: 204, description: "Achievement deleted" })
  async deleteAchievement(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.achievementsService.deleteAchievement(id, user.organizationId);
  }

  @Post("seed")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Seed default achievements",
    description: "Создать набор предустановленных достижений для организации",
  })
  async seedDefaults(@CurrentUser() user: User): Promise<{ created: number }> {
    const created = await this.achievementsService.seedDefaultAchievements(
      user.organizationId,
    );
    return { created };
  }
}
