import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PayoutRequest } from "./entities/payout-request.entity";
import { PayoutRequestsService } from "./payout-requests.service";
import { PayoutRequestsController } from "./payout-requests.controller";

@Module({
  imports: [TypeOrmModule.forFeature([PayoutRequest])],
  controllers: [PayoutRequestsController],
  providers: [PayoutRequestsService],
  exports: [PayoutRequestsService],
})
export class PayoutRequestsModule {}
