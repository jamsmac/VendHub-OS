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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import {
  NotificationsService,
  CreateNotificationDto,
  SendTemplatedNotificationDto,
  CreateCampaignDto,
  QueryNotificationsDto,
} from "./notifications.service";
import {
  NotificationType,
  NotificationStatus,
} from "./entities/notification.entity";
import {
  Notification,
  NotificationTemplate,
  NotificationCampaign,
  UserNotificationSettings,
} from "./entities/notification.entity";
import {
  SubscribePushDto,
  UnsubscribePushDto,
  RegisterFcmDto,
  UnregisterFcmDto,
} from "./dto/notification-channels.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUserId,
  CurrentOrganizationId,
  CurrentUser,
  ICurrentUser,
} from "../../common/decorators/current-user.decorator";
import { resolveOrganizationId } from "../../common/utils";
import { CleanupNotificationsDto } from "./dto/notification-operations.dto";
import { UpdateNotificationSettingsDto } from "./dto/update-notification-settings.dto";
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from "./dto/notification-template.dto";
import {
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
} from "./dto/notification-rule.dto";
import { NotificationRule } from "./entities/notification.entity";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ============================================================================
  // User Notifications
  // ============================================================================

  @Get()
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Get my notifications" })
  @ApiQuery({
    name: "type",
    required: false,
    enum: NotificationType,
    isArray: true,
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: NotificationStatus,
    isArray: true,
  })
  @ApiQuery({ name: "isRead", required: false, type: Boolean })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({
    status: 200,
    description: "Returns list of notifications",
    type: [Notification],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMyNotifications(
    @CurrentUserId() userId: string,
    @Query() query: Omit<QueryNotificationsDto, "userId">,
  ) {
    return this.notificationsService.query({ ...query, userId });
  }

  @Get("unread-count")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Get unread notifications count" })
  @ApiResponse({ status: 200, description: "Returns unread count" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUnreadCount(@CurrentUserId() userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post(":id/read")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Mark notification as read" })
  @ApiResponse({
    status: 200,
    description: "Notification marked as read",
    type: Notification,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Notification not found" })
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId, organizationId);
  }

  @Post("read-all")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiResponse({ status: 200, description: "All notifications marked as read" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUserId() userId: string) {
    const count = await this.notificationsService.markAllAsRead(userId);
    return { marked: count };
  }

  @Delete(":id")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Delete notification" })
  @ApiResponse({ status: 204, description: "Notification deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Notification not found" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    await this.notificationsService.delete(id, userId, organizationId);
  }

  // ============================================================================
  // User Settings
  // ============================================================================

  @Get("settings")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Get my notification settings" })
  @ApiResponse({
    status: 200,
    description: "Returns notification settings",
    type: UserNotificationSettings,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getSettings(@CurrentUserId() userId: string) {
    return this.notificationsService.getSettings(userId);
  }

  @Put("settings")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Update my notification settings" })
  @ApiResponse({
    status: 200,
    description: "Notification settings updated",
    type: UserNotificationSettings,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async updateSettings(
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
    @Body() updates: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(userId, orgId, updates);
  }

  // ============================================================================
  // Admin Operations
  // ============================================================================

  @Post()
  @ApiOperation({ summary: "Create and send notification" })
  @ApiResponse({
    status: 201,
    description: "Notification created",
    type: Notification,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateNotificationDto,
    @CurrentOrganizationId() orgId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const organizationId = resolveOrganizationId(user, dto.organizationId);
    return this.notificationsService.create({
      ...dto,
      organizationId,
    });
  }

  @Post("send-templated")
  @ApiOperation({ summary: "Send templated notification" })
  @ApiResponse({
    status: 201,
    description: "Templated notification sent",
    type: Notification,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.CREATED)
  async sendTemplated(
    @Body() dto: SendTemplatedNotificationDto,
    @CurrentOrganizationId() orgId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const organizationId = resolveOrganizationId(user, dto.organizationId);
    return this.notificationsService.sendTemplated({
      ...dto,
      organizationId,
    });
  }

  @Get("organization")
  @ApiOperation({ summary: "Get all notifications for organization" })
  @ApiQuery({
    name: "type",
    required: false,
    enum: NotificationType,
    isArray: true,
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: NotificationStatus,
    isArray: true,
  })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({
    status: 200,
    description: "Returns organization notifications",
    type: [Notification],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Roles("owner", "admin", "manager")
  async getOrganizationNotifications(
    @CurrentOrganizationId() orgId: string,
    @Query() query: Omit<QueryNotificationsDto, "organizationId">,
  ) {
    return this.notificationsService.query({ ...query, organizationId: orgId });
  }

  // ============================================================================
  // Templates
  // ============================================================================

  @Get("templates")
  @ApiOperation({ summary: "Get notification templates" })
  @ApiResponse({
    status: 200,
    description: "Returns list of templates",
    type: [NotificationTemplate],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Roles("owner", "admin", "manager")
  async getTemplates(@CurrentOrganizationId() orgId: string) {
    return this.notificationsService.getTemplates(orgId);
  }

  @Get("templates/:id")
  @ApiOperation({ summary: "Get template by ID" })
  @ApiResponse({
    status: 200,
    description: "Template found",
    type: NotificationTemplate,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Template not found" })
  @Roles("owner", "admin", "manager")
  async getTemplate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.notificationsService.getTemplate(id, orgId);
  }

  @Post("templates")
  @ApiOperation({ summary: "Create notification template" })
  @ApiResponse({
    status: 201,
    description: "Template created",
    type: NotificationTemplate,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() data: CreateNotificationTemplateDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.notificationsService.createTemplate({
      ...data,
      organizationId: orgId,
    });
  }

  @Patch("templates/:id")
  @ApiOperation({ summary: "Update notification template" })
  @ApiResponse({
    status: 200,
    description: "Template updated",
    type: NotificationTemplate,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Template not found" })
  @Roles("owner", "admin")
  async updateTemplate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
    @Body() data: UpdateNotificationTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(id, orgId, data);
  }

  // ============================================================================
  // Campaigns
  // ============================================================================

  @Get("campaigns")
  @ApiOperation({ summary: "Get notification campaigns" })
  @ApiResponse({
    status: 200,
    description: "Returns list of campaigns",
    type: [NotificationCampaign],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Roles("owner", "admin", "manager")
  async getCampaigns(@CurrentOrganizationId() orgId: string) {
    return this.notificationsService.getCampaigns(orgId);
  }

  @Post("campaigns")
  @ApiOperation({ summary: "Create notification campaign" })
  @ApiResponse({
    status: 201,
    description: "Campaign created",
    type: NotificationCampaign,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentOrganizationId() orgId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const organizationId = resolveOrganizationId(user, dto.organizationId);
    return this.notificationsService.createCampaign({
      ...dto,
      organizationId,
    });
  }

  @Post("campaigns/:id/start")
  @ApiOperation({ summary: "Start notification campaign" })
  @ApiResponse({
    status: 200,
    description: "Campaign started",
    type: NotificationCampaign,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Campaign not found" })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.OK)
  async startCampaign(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    return this.notificationsService.startCampaign(id, organizationId);
  }

  // ============================================================================
  // Notification Rules CRUD
  // ============================================================================

  @Get("rules")
  @ApiOperation({ summary: "List notification rules for organization" })
  @ApiResponse({
    status: 200,
    description: "List of notification rules",
    type: [NotificationRule],
  })
  @Roles("owner", "admin", "manager")
  async getRules(@CurrentOrganizationId() orgId: string) {
    return this.notificationsService.getRules(orgId);
  }

  @Get("rules/:id")
  @ApiOperation({ summary: "Get notification rule by ID" })
  @ApiResponse({ status: 200, description: "Notification rule" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  @Roles("owner", "admin", "manager")
  async getRuleById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.notificationsService.getRuleById(id, orgId);
  }

  @Post("rules")
  @ApiOperation({ summary: "Create notification rule" })
  @ApiResponse({ status: 201, description: "Rule created" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @Body() dto: CreateNotificationRuleDto,
    @CurrentOrganizationId() orgId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const organizationId = resolveOrganizationId(user, dto.organizationId);
    return this.notificationsService.createRule({
      ...dto,
      organizationId,
    });
  }

  @Patch("rules/:id")
  @ApiOperation({ summary: "Update notification rule" })
  @ApiResponse({ status: 200, description: "Rule updated" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  @Roles("owner", "admin")
  async updateRule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationRuleDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.notificationsService.updateRule(id, dto, orgId);
  }

  @Delete("rules/:id")
  @ApiOperation({ summary: "Delete notification rule" })
  @ApiResponse({ status: 204, description: "Rule deleted" })
  @ApiResponse({ status: 404, description: "Rule not found" })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    await this.notificationsService.deleteRule(id, orgId);
  }

  // ============================================================================
  // Admin Maintenance
  // ============================================================================

  @Post("cleanup")
  @ApiOperation({ summary: "Cleanup old notifications" })
  @ApiResponse({ status: 200, description: "Old notifications cleaned up" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.OK)
  async cleanup(@Body() dto: CleanupNotificationsDto) {
    const deleted = await this.notificationsService.deleteOld(
      dto.olderThanDays ?? 90,
    );
    return { deleted };
  }

  @Post("process-queue")
  @ApiOperation({ summary: "Process notification queue manually" })
  @ApiResponse({ status: 200, description: "Queue processed successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.OK)
  async processQueue() {
    await this.notificationsService.processQueue();
    return { success: true };
  }

  // ============================================================================
  // Push Subscriptions (Web Push)
  // ============================================================================

  @Post("push/subscribe")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Register a Web Push subscription" })
  @ApiResponse({ status: 201, description: "Push subscription registered" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
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

  @Delete("push/unsubscribe")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Remove a Web Push subscription by endpoint" })
  @ApiResponse({ status: 204, description: "Push subscription removed" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribePush(@Body() dto: UnsubscribePushDto) {
    await this.notificationsService.unsubscribePush(dto.endpoint);
  }

  // ============================================================================
  // FCM Tokens (Firebase Cloud Messaging)
  // ============================================================================

  @Post("fcm/register")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Register an FCM device token" })
  @ApiResponse({ status: 201, description: "FCM token registered" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
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

  @Delete("fcm/unregister")
  @Roles(
    "viewer",
    "operator",
    "warehouse",
    "accountant",
    "manager",
    "admin",
    "owner",
  )
  @ApiOperation({ summary: "Remove an FCM device token" })
  @ApiResponse({ status: 204, description: "FCM token removed" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregisterFcm(@Body() dto: UnregisterFcmDto) {
    await this.notificationsService.unregisterFcm(dto.token);
  }
}
