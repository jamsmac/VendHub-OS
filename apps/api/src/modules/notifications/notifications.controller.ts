/**
 * Notifications Controller for VendHub OS
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  NotificationsService,
  CreateNotificationDto,
  SendTemplatedNotificationDto,
  CreateCampaignDto,
  QueryNotificationsDto,
} from './notifications.service';
import { NotificationType, NotificationStatus } from './entities/notification.entity';
import {
  SubscribePushDto,
  UnsubscribePushDto,
  RegisterFcmDto,
  UnregisterFcmDto,
} from './dto/notification-channels.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUserId, CurrentOrganizationId } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ============================================================================
  // User Notifications
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType, isArray: true })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus, isArray: true })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMyNotifications(
    @CurrentUserId() userId: string,
    @Query() query: Omit<QueryNotificationsDto, 'userId'>,
  ) {
    return this.notificationsService.query({ ...query, userId });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(@CurrentUserId() userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUserId() userId: string) {
    const count = await this.notificationsService.markAllAsRead(userId);
    return { marked: count };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationsService.delete(id);
  }

  // ============================================================================
  // User Settings
  // ============================================================================

  @Get('settings')
  @ApiOperation({ summary: 'Get my notification settings' })
  async getSettings(@CurrentUserId() userId: string) {
    return this.notificationsService.getSettings(userId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update my notification settings' })
  async updateSettings(
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
    @Body() updates: any,
  ) {
    return this.notificationsService.updateSettings(userId, orgId, updates);
  }

  // ============================================================================
  // Admin Operations
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create and send notification' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateNotificationDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.notificationsService.create({
      ...dto,
      organizationId: dto.organizationId || orgId,
    });
  }

  @Post('send-templated')
  @ApiOperation({ summary: 'Send templated notification' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async sendTemplated(
    @Body() dto: SendTemplatedNotificationDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.notificationsService.sendTemplated({
      ...dto,
      organizationId: dto.organizationId || orgId,
    });
  }

  @Get('organization')
  @ApiOperation({ summary: 'Get all notifications for organization' })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType, isArray: true })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus, isArray: true })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles('owner', 'admin', 'manager')
  async getOrganizationNotifications(
    @CurrentOrganizationId() orgId: string,
    @Query() query: Omit<QueryNotificationsDto, 'organizationId'>,
  ) {
    return this.notificationsService.query({ ...query, organizationId: orgId });
  }

  // ============================================================================
  // Templates
  // ============================================================================

  @Get('templates')
  @ApiOperation({ summary: 'Get notification templates' })
  @Roles('owner', 'admin', 'manager')
  async getTemplates(@CurrentOrganizationId() orgId: string) {
    return this.notificationsService.getTemplates(orgId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  @Roles('owner', 'admin', 'manager')
  async getTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.getTemplate(id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() data: any,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.notificationsService.createTemplate({
      ...data,
      organizationId: orgId,
    });
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update notification template' })
  @Roles('owner', 'admin')
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.notificationsService.updateTemplate(id, data);
  }

  // ============================================================================
  // Campaigns
  // ============================================================================

  @Get('campaigns')
  @ApiOperation({ summary: 'Get notification campaigns' })
  @Roles('owner', 'admin', 'manager')
  async getCampaigns(@CurrentOrganizationId() orgId: string) {
    return this.notificationsService.getCampaigns(orgId);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create notification campaign' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.notificationsService.createCampaign({
      ...dto,
      organizationId: dto.organizationId || orgId,
    });
  }

  @Post('campaigns/:id/start')
  @ApiOperation({ summary: 'Start notification campaign' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  async startCampaign(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.startCampaign(id);
  }

  // ============================================================================
  // Admin Maintenance
  // ============================================================================

  @Post('cleanup')
  @ApiOperation({ summary: 'Cleanup old notifications' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  async cleanup(@Body('olderThanDays') days: number = 90) {
    const deleted = await this.notificationsService.deleteOld(days);
    return { deleted };
  }

  @Post('process-queue')
  @ApiOperation({ summary: 'Process notification queue manually' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  async processQueue() {
    await this.notificationsService.processQueue();
    return { success: true };
  }

  // ============================================================================
  // Push Subscriptions (Web Push)
  // ============================================================================

  @Post('push/subscribe')
  @ApiOperation({ summary: 'Register a Web Push subscription' })
  @HttpCode(HttpStatus.CREATED)
  async subscribePush(
    @Body() dto: SubscribePushDto,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.notificationsService.subscribePush(
      userId,
      organizationId,
      dto.endpoint,
      dto.p256dh,
      dto.auth,
      dto.userAgent,
    );
  }

  @Delete('push/unsubscribe')
  @ApiOperation({ summary: 'Remove a Web Push subscription by endpoint' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribePush(@Body() dto: UnsubscribePushDto) {
    await this.notificationsService.unsubscribePush(dto.endpoint);
  }

  // ============================================================================
  // FCM Tokens (Firebase Cloud Messaging)
  // ============================================================================

  @Post('fcm/register')
  @ApiOperation({ summary: 'Register an FCM device token' })
  @HttpCode(HttpStatus.CREATED)
  async registerFcm(
    @Body() dto: RegisterFcmDto,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.notificationsService.registerFcm(
      userId,
      organizationId,
      dto.token,
      dto.deviceType,
      dto.deviceName,
      dto.deviceId,
    );
  }

  @Delete('fcm/unregister')
  @ApiOperation({ summary: 'Remove an FCM device token' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregisterFcm(@Body() dto: UnregisterFcmDto) {
    await this.notificationsService.unregisterFcm(dto.token);
  }
}
