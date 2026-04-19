import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ConsumptionRate } from "./entities/consumption-rate.entity";
import { RefillRecommendation } from "./entities/refill-recommendation.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsumptionRate, RefillRecommendation]),
    BullModule.registerQueue({ name: "predictive-refill" }),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class PredictiveRefillModule {}
