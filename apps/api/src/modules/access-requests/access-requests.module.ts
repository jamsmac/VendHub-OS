import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessRequestsService } from "./access-requests.service";
import { AccessRequestsController } from "./access-requests.controller";
import { AccessRequest } from "../telegram-bot/entities/access-request.entity";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([AccessRequest]), UsersModule],
  controllers: [AccessRequestsController],
  providers: [AccessRequestsService],
  exports: [AccessRequestsService],
})
export class AccessRequestsModule {}
