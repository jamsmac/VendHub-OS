import { Module } from "@nestjs/common";
import { InventoryDashboardController } from "./inventory-dashboard.controller";
import { InventoryDashboardService } from "./inventory-dashboard.service";

@Module({
  controllers: [InventoryDashboardController],
  providers: [InventoryDashboardService],
  exports: [InventoryDashboardService],
})
export class InventoryDashboardModule {}
