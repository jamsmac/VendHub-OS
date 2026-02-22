import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from "@nestjs/swagger";
import { WebPushService } from "./web-push.service";
import {
  SubscribePushDto,
  UnsubscribePushDto,
  SendPushDto,
} from "./dto/web-push.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUserId,
  CurrentOrganizationId,
} from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/enums";

@ApiTags("Web Push")
@ApiBearerAuth()
@Controller("web-push")
export class WebPushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Get("public-key")
  @ApiOperation({ summary: "Get VAPID public key for browser subscription" })
  @ApiOkResponse({ description: "VAPID public key string or null" })
  getPublicKey() {
    return { publicKey: this.webPushService.getPublicKey() };
  }

  @Post("subscribe")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Subscribe browser for push notifications" })
  async subscribe(
    @Body() dto: SubscribePushDto,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() organizationId: string,
  ) {
    const sub = await this.webPushService.subscribe(
      userId,
      organizationId,
      dto.endpoint,
      dto.keys.p256dh,
      dto.keys.auth,
      dto.userAgent,
    );
    return { id: sub.id, endpoint: sub.endpoint };
  }

  @Post("unsubscribe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove browser push subscription" })
  async unsubscribe(
    @Body() dto: UnsubscribePushDto,
    @CurrentUserId() userId: string,
  ) {
    const removed = await this.webPushService.unsubscribe(userId, dto.endpoint);
    return { removed };
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "List current user push subscriptions" })
  async getSubscriptions(@CurrentUserId() userId: string) {
    return this.webPushService.getUserSubscriptions(userId);
  }

  @Post("send")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send web push notification to a user (admin)" })
  async send(@Body() dto: SendPushDto) {
    const sent = await this.webPushService.sendToUser(
      dto.userId,
      dto.title,
      dto.body,
      dto.url,
      dto.data,
    );
    return { sent };
  }

  @Post("test")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send test push notification to self" })
  async testPush(@CurrentUserId() userId: string) {
    const sent = await this.webPushService.sendToUser(
      userId,
      "VendHub Test",
      "Web push is working!",
    );
    return { sent };
  }
}
