import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { WebPushController } from "./web-push.controller";
import { WebPushService } from "./web-push.service";
import { PushSubscription } from "../notifications/entities/push-subscription.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription]), ConfigModule],
  controllers: [WebPushController],
  providers: [WebPushService],
  exports: [WebPushService],
})
export class WebPushModule {}
