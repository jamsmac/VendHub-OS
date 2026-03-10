import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { MachineEventsGateway } from "./gateways/machine-events.gateway";
import { OrderEventsGateway } from "./gateways/order-events.gateway";
import { NotificationGateway } from "./gateways/notification.gateway";
import { WebSocketService } from "./websocket.service";
import { Machine } from "../machines/entities/machine.entity";
import { Order } from "../orders/entities/order.entity";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Machine, Order]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRES_IN") || "15m",
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    MachineEventsGateway,
    OrderEventsGateway,
    NotificationGateway,
    WebSocketService,
  ],
  exports: [WebSocketService],
})
export class WebSocketModule {}
