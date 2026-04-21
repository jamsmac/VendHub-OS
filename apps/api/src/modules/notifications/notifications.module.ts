/**
 * Notifications Module for VendHub OS
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PushNotificationService } from "./services/push-notification.service";
import { NotificationDeliveryService } from "./services/notification-delivery.service";
import {
  Notification,
  NotificationTemplate,
  UserNotificationSettings,
  NotificationRule,
  NotificationQueue,
  NotificationLog,
  NotificationCampaign,
} from "./entities/notification.entity";
import { PushSubscription } from "./entities/push-subscription.entity";
import { FcmToken } from "./entities/fcm-token.entity";
import { DeviceToken } from "./entities/device-token.entity";
import { User } from "../users/entities/user.entity";
import { EmailModule } from "../email/email.module";
import { SmsModule } from "../sms/sms.module";
import { WebPushModule } from "../web-push/web-push.module";
import { WebSocketModule } from "../websocket/websocket.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      UserNotificationSettings,
      NotificationRule,
      NotificationQueue,
      NotificationLog,
      NotificationCampaign,
      PushSubscription,
      FcmToken,
      DeviceToken,
      User,
    ]),
    ConfigModule,
    HttpModule,
    EmailModule,
    SmsModule,
    WebPushModule,
    WebSocketModule,
  ],
  controllers: [NotificationsController],
  providers: [
    PushNotificationService,
    NotificationDeliveryService,
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
