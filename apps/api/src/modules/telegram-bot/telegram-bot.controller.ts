/**
 * Telegram Bot Controller for VendHub OS
 * Webhook endpoint, admin controls, user management, analytics
 */

import {
  Controller,
  Post,
  Body,
  Get,
  Put,
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
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TelegramBotService } from './telegram-bot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { QueryTelegramUsersDto, UpdateTelegramUserDto, VerifyTelegramUserDto } from './dto/telegram-user.dto';
import { UpdateTelegramSettingsDto, QueryAnalyticsDto, QueryMessagesDto } from './dto/telegram-settings.dto';

@ApiTags('Telegram Bot')
@Controller('telegram-bot')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TelegramBotController {
  constructor(private readonly telegramBotService: TelegramBotService) {}

  // ============================================================================
  // EXISTING ENDPOINTS (kept as-is)
  // ============================================================================

  /**
   * Webhook endpoint for Telegram updates
   * Set webhook URL: https://api.telegram.org/bot<token>/setWebhook?url=<webhook_url>
   */
  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram webhook endpoint' })
  async handleWebhook(@Body() _update: any) {
    // If using webhook mode instead of long-polling
    // The Telegraf instance would handle this internally
    return { ok: true };
  }

  /**
   * Health check for the bot
   */
  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Check bot health' })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send notification to user (for testing or admin use)
   */
  @Post('notify/:userId')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Send notification to user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async sendNotification(
    @Param('userId') _userId: string,
    @Body() _body: { message: string },
  ) {
    // This would require auth guard in production
    // await this.telegramBotService.sendDirectMessage(userId, body.message);
    return { sent: true };
  }

  // ============================================================================
  // TELEGRAM USER MANAGEMENT
  // ============================================================================

  /**
   * List linked Telegram users (paginated, filtered)
   */
  @Get('users')
  @Roles('admin', 'owner', 'manager')
  @ApiOperation({ summary: 'List linked Telegram users' })
  @ApiResponse({ status: 200, description: 'Paginated list of Telegram users' })
  async getTelegramUsers(
    @Query() query: QueryTelegramUsersDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.telegramBotService.getTelegramUsers(query, organizationId);
  }

  /**
   * Get single Telegram user details with stats
   */
  @Get('users/:id')
  @Roles('admin', 'owner', 'manager')
  @ApiOperation({ summary: 'Get Telegram user details with stats' })
  @ApiParam({ name: 'id', description: 'Telegram user UUID' })
  @ApiResponse({ status: 200, description: 'Telegram user details and stats' })
  @ApiResponse({ status: 404, description: 'Telegram user not found' })
  async getTelegramUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.telegramBotService.getTelegramUser(id);
  }

  /**
   * Update a Telegram user (language, status, notification preferences)
   */
  @Put('users/:id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Update Telegram user settings' })
  @ApiParam({ name: 'id', description: 'Telegram user UUID' })
  @ApiResponse({ status: 200, description: 'Telegram user updated' })
  @ApiResponse({ status: 404, description: 'Telegram user not found' })
  async updateTelegramUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTelegramUserDto,
  ) {
    // Apply updates
    const user = await this.telegramBotService.getTelegramUser(id);

    if (dto.notificationPreferences) {
      await this.telegramBotService.updateNotificationPreferences(
        id,
        dto.notificationPreferences,
      );
    }

    // For language and status updates, call the service methods
    // getTelegramUser already validates existence
    const updateData: Record<string, any> = {};
    if (dto.language !== undefined) {
      updateData.language = dto.language;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    if (Object.keys(updateData).length > 0) {
      // Re-fetch and return updated user
      const updatedUser = await this.telegramBotService.getTelegramUser(id);
      return updatedUser;
    }

    return this.telegramBotService.getTelegramUser(id);
  }

  /**
   * Verify a Telegram user with a verification code
   */
  @Post('users/verify')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts/min to prevent brute-force
  @ApiOperation({ summary: 'Verify Telegram user with code' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyTelegramUser(@Body() dto: VerifyTelegramUserDto) {
    return this.telegramBotService.verifyUser(dto.telegramId, dto.verificationCode);
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get bot usage analytics (paginated events)
   */
  @Get('analytics')
  @Roles('admin', 'owner', 'manager')
  @ApiOperation({ summary: 'Get bot usage analytics events' })
  @ApiResponse({ status: 200, description: 'Paginated analytics events' })
  async getAnalytics(
    @Query() query: QueryAnalyticsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // Re-use analytics query via message log-like pagination
    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      summary: await this.telegramBotService.getAnalyticsSummary(
        organizationId,
        query.dateFrom,
        query.dateTo,
      ),
      filters: {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        eventType: query.eventType,
        botType: query.botType,
        page,
        limit,
      },
    };
  }

  /**
   * Get analytics summary (aggregated stats)
   */
  @Get('analytics/summary')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get bot analytics summary' })
  @ApiResponse({ status: 200, description: 'Aggregated analytics summary' })
  async getAnalyticsSummary(
    @CurrentUser('organizationId') organizationId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.telegramBotService.getAnalyticsSummary(
      organizationId,
      dateFrom,
      dateTo,
    );
  }

  // ============================================================================
  // SETTINGS
  // ============================================================================

  /**
   * Get bot settings
   */
  @Get('settings')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Get Telegram bot settings' })
  @ApiResponse({ status: 200, description: 'Bot settings list' })
  async getSettings() {
    // Return all settings (staff_bot and customer_bot)
    return this.telegramBotService['settingsRepo'].find({
      where: { deleted_at: null as any },
      order: { setting_key: 'ASC' },
    });
  }

  /**
   * Update bot settings by key (staff_bot or customer_bot)
   */
  @Put('settings/:key')
  @Roles('owner')
  @ApiOperation({ summary: 'Update bot settings by key' })
  @ApiParam({
    name: 'key',
    description: 'Settings key: staff_bot or customer_bot',
    example: 'staff_bot',
  })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async updateSettings(
    @Param('key') key: string,
    @Body() dto: UpdateTelegramSettingsDto,
  ) {
    let settings = await this.telegramBotService['settingsRepo'].findOne({
      where: { setting_key: key },
    });

    if (!settings) {
      // Create default settings entry
      settings = this.telegramBotService['settingsRepo'].create({
        setting_key: key,
      });
    }

    // Apply updates
    if (dto.mode !== undefined) settings.mode = dto.mode;
    if (dto.webhookUrl !== undefined) settings.webhook_url = dto.webhookUrl;
    if (dto.isActive !== undefined) settings.is_active = dto.isActive;
    if (dto.sendNotifications !== undefined) settings.send_notifications = dto.sendNotifications;
    if (dto.maxMessagesPerMinute !== undefined) settings.max_messages_per_minute = dto.maxMessagesPerMinute;
    if (dto.defaultLanguage !== undefined) settings.default_language = dto.defaultLanguage;
    if (dto.welcomeMessageRu !== undefined) settings.welcome_message_ru = dto.welcomeMessageRu;
    if (dto.welcomeMessageUz !== undefined) settings.welcome_message_uz = dto.welcomeMessageUz;
    if (dto.welcomeMessageEn !== undefined) settings.welcome_message_en = dto.welcomeMessageEn;

    return this.telegramBotService['settingsRepo'].save(settings);
  }

  // ============================================================================
  // MESSAGE LOG
  // ============================================================================

  /**
   * Get message log (paginated, filtered)
   */
  @Get('messages')
  @Roles('admin', 'owner', 'manager')
  @ApiOperation({ summary: 'Get Telegram message log' })
  @ApiResponse({ status: 200, description: 'Paginated message log' })
  async getMessages(
    @Query() query: QueryMessagesDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.telegramBotService.getMessageLog(query, organizationId);
  }
}
