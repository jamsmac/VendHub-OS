/**
 * Achievement Controller
 * API endpoints для достижений/бейджей программы лояльности
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
  ValidationPipe,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards";
import { Roles } from "../../../common/decorators";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User, UserRole } from "../../users/entities/user.entity";
import { AchievementService } from "../services/achievement.service";
import {
  CreateAchievementDto,
  UpdateAchievementDto,
  AchievementResponseDto,
  UserAchievementResponseDto,
  AchievementStatsDto,
} from "../dto/achievement.dto";

@ApiTags("Loyalty - Achievements")
@ApiBearerAuth()
@Controller("loyalty/achievements")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

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
    summary: "Get all achievements",
    description: `
Получить список всех достижений организации.

**Для обычных пользователей:**
- Скрытые достижения показываются только если разблокированы
- Включает статус разблокировки для текущего пользователя

**Фильтрация:**
- По категории: beginner, explorer, loyal, social, collector, special
    `,
  })
  @ApiQuery({
    name: "category",
    required: false,
    description: "Filter by category",
  })
  @ApiResponse({ status: 200, type: [AchievementResponseDto] })
  async getAchievements(
    @CurrentUser() user: User,
    @Query("category") category?: string,
  ): Promise<AchievementResponseDto[]> {
    // Admins see all (including inactive), users see only active
    const isAdmin = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER].includes(
      user.role,
    );

    if (isAdmin) {
      return this.achievementService.getAchievementsAdmin(
        user.organizationId,
        category,
      );
    }

    return this.achievementService.getAchievements(
      user.organizationId,
      user.id,
      category,
    );
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
    summary: "Get my unlocked achievements",
    description:
      "Получить список разблокированных достижений текущего пользователя.",
  })
  @ApiResponse({ status: 200, type: [UserAchievementResponseDto] })
  async getMyAchievements(
    @CurrentUser() user: User,
  ): Promise<UserAchievementResponseDto[]> {
    return this.achievementService.getUserAchievements(
      user.id,
      user.organizationId,
    );
  }

  @Get("stats")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Get achievement statistics (Admin)",
    description:
      "Получить статистику по достижениям: всего, разблокировано, выдано наград.",
  })
  @ApiResponse({ status: 200, type: AchievementStatsDto })
  async getStats(@CurrentUser() user: User): Promise<AchievementStatsDto> {
    return this.achievementService.getStats(user.organizationId);
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create achievement (Admin)",
    description: `
Создать новое достижение.

**Категории:** beginner, explorer, loyal, social, collector, special
**Редкость:** common, uncommon, rare, epic, legendary
**Типы условий:** total_orders, total_spent, streak_days, first_order, night_order, weekend_order и др.
    `,
  })
  @ApiResponse({ status: 201, type: AchievementResponseDto })
  async createAchievement(
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: CreateAchievementDto,
  ): Promise<AchievementResponseDto> {
    return this.achievementService.createAchievement(user.organizationId, dto);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Update achievement (Admin)",
    description: "Обновить существующее достижение.",
  })
  @ApiParam({ name: "id", description: "Achievement ID" })
  @ApiResponse({ status: 200, type: AchievementResponseDto })
  @ApiResponse({ status: 404, description: "Achievement not found" })
  async updateAchievement(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: UpdateAchievementDto,
  ): Promise<AchievementResponseDto> {
    return this.achievementService.updateAchievement(
      id,
      user.organizationId,
      dto,
    );
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete achievement (Admin)",
    description:
      "Мягкое удаление достижения. Разблокированные достижения у пользователей сохраняются.",
  })
  @ApiParam({ name: "id", description: "Achievement ID" })
  @ApiResponse({ status: 204, description: "Achievement deleted" })
  @ApiResponse({ status: 404, description: "Achievement not found" })
  async deleteAchievement(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.achievementService.deleteAchievement(id, user.organizationId);
  }

  @Post("seed")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Seed default achievements (Admin)",
    description: "Создать набор стандартных достижений для организации.",
  })
  @ApiResponse({ status: 201, type: [AchievementResponseDto] })
  async seedDefaults(
    @CurrentUser() user: User,
  ): Promise<AchievementResponseDto[]> {
    return this.achievementService.seedDefaults(user.organizationId);
  }
}
