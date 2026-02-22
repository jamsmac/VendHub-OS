/**
 * FCM Controller
 * REST API for Firebase Cloud Messaging device token management and push notifications
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { FcmService } from "./fcm.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User, UserRole } from "../users/entities/user.entity";
import {
  RegisterFcmTokenDto,
  SendFcmNotificationDto,
  SubscribeToTopicDto,
} from "./dto/register-token.dto";

@ApiTags("fcm")
@Controller("fcm")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FcmController {
  constructor(private readonly fcmService: FcmService) {}

  @Get("status")
  @ApiOperation({ summary: "Check FCM configuration status" })
  @ApiResponse({ status: 200, description: "FCM status" })
  getStatus() {
    return { configured: this.fcmService.isConfigured() };
  }

  @Post("register")
  @ApiOperation({ summary: "Register FCM device token" })
  @ApiResponse({ status: 201, description: "Token registered" })
  register(@Body() dto: RegisterFcmTokenDto, @CurrentUser() user: User) {
    return this.fcmService.registerToken(user.id, user.organizationId, dto);
  }

  @Delete("unregister/:token")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Unregister FCM device token" })
  @ApiParam({ name: "token", description: "FCM token to unregister" })
  @ApiResponse({ status: 204, description: "Token unregistered" })
  async unregister(
    @Param("token") token: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.fcmService.unregisterToken(user.id, user.organizationId, token);
  }

  @Get("tokens")
  @ApiOperation({ summary: "Get current user FCM tokens" })
  @ApiResponse({ status: 200, description: "List of registered tokens" })
  getTokens(@CurrentUser() user: User) {
    return this.fcmService.getUserTokens(user.id, user.organizationId);
  }

  @Post("subscribe-topic")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Subscribe current user to a topic" })
  @ApiResponse({ status: 200, description: "Subscribed to topic" })
  async subscribeToTopic(
    @Body() dto: SubscribeToTopicDto,
    @CurrentUser() user: User,
  ) {
    await this.fcmService.subscribeToTopic(
      user.id,
      user.organizationId,
      dto.topic,
    );
    return { success: true };
  }

  @Post("unsubscribe-topic")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unsubscribe current user from a topic" })
  @ApiResponse({ status: 200, description: "Unsubscribed from topic" })
  async unsubscribeFromTopic(
    @Body() dto: SubscribeToTopicDto,
    @CurrentUser() user: User,
  ) {
    await this.fcmService.unsubscribeFromTopic(
      user.id,
      user.organizationId,
      dto.topic,
    );
    return { success: true };
  }

  @Post("send")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send FCM notification to a user (Admin only)" })
  @ApiResponse({ status: 200, description: "Notifications sent" })
  async send(@Body() dto: SendFcmNotificationDto, @CurrentUser() user: User) {
    const sent = await this.fcmService.sendToUser(dto, user.organizationId);
    return { sent };
  }
}
