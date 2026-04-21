import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ConsumptionRate } from "./entities/consumption-rate.entity";
import { RefillRecommendation } from "./entities/refill-recommendation.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { MachineSlot, Machine } from "../machines/entities/machine.entity";
import { Organization } from "../organizations/entities/organization.entity";
import { Product } from "../products/entities/product.entity";
import { AlertRule } from "../alerts/entities/alert-rule.entity";
import { AlertsModule } from "../alerts/alerts.module";
import { ConsumptionRateService } from "./services/consumption-rate.service";
import { ForecastService } from "./services/forecast.service";
import { RecommendationService } from "./services/recommendation.service";
import { PredictiveRefillCronService } from "./services/predictive-refill-cron.service";
import { PredictiveRefillController } from "./controllers/predictive-refill.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConsumptionRate,
      RefillRecommendation,
      Transaction,
      MachineSlot,
      Machine,
      Organization,
      Product,
      AlertRule,
    ]),
    BullModule.registerQueue({ name: "predictive-refill" }),
    AlertsModule,
  ],
  controllers: [PredictiveRefillController],
  providers: [
    ConsumptionRateService,
    ForecastService,
    RecommendationService,
    PredictiveRefillCronService,
  ],
  exports: [ConsumptionRateService, ForecastService, RecommendationService],
})
export class PredictiveRefillModule {}
