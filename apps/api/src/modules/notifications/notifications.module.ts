/**
 * Notifications Module for VendHub OS
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
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
import { User } from "../users/entities/user.entity";
import { EmailModule } from "../email/email.module";
import { SmsModule } from "../sms/sms.module";
import { WebPushModule } from "../web-push/web-push.module";

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
      User,
    ]),
    ConfigModule,
    EmailModule,
    SmsModule,
    WebPushModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
