/**
 * FCM Module
 * Firebase Cloud Messaging for mobile push notifications (Android/iOS)
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { FcmService } from "./fcm.service";
import { FcmController } from "./fcm.controller";
import { FcmToken } from "./entities/fcm-token.model";

@Module({
  imports: [TypeOrmModule.forFeature([FcmToken]), ConfigModule],
  controllers: [FcmController],
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}
