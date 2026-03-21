import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BatchMovement } from "./entities/batch-movement.entity";
import { IngredientBatch } from "../products/entities/product.entity";
import { BatchMovementsService } from "./batch-movements.service";
import { BatchMovementsController } from "./batch-movements.controller";
import { EntityEventsModule } from "../entity-events/entity-events.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([BatchMovement, IngredientBatch]),
    EntityEventsModule,
  ],
  controllers: [BatchMovementsController],
  providers: [BatchMovementsService],
  exports: [BatchMovementsService],
})
export class BatchMovementsModule {}
