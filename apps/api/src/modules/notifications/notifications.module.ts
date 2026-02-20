/**
 * Notifications Module for VendHub OS
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationTemplate,
  UserNotificationSettings,
  NotificationRule,
  NotificationQueue,
  NotificationLog,
  NotificationCampaign,
} from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { FcmToken } from './entities/fcm-token.entity';

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
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
