import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Container } from "../containers/entities/container.entity";
import { EquipmentComponent } from "../equipment/entities/equipment-component.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { SaleIngredient } from "../transactions/entities/sale-ingredient.entity";
import { EntityEvent } from "../entity-events/entities/entity-event.entity";
import { CalculatedStateService } from "./calculated-state.service";
import { CalculatedStateController } from "./calculated-state.controller";

@Module({
  imports: [
    CacheModule.register({ ttl: 300 }),
    TypeOrmModule.forFeature([
      Container,
      EquipmentComponent,
      Machine,
      Transaction,
      SaleIngredient,
      EntityEvent,
    ]),
  ],
  controllers: [CalculatedStateController],
  providers: [CalculatedStateService],
  exports: [CalculatedStateService],
})
export class CalculatedStateModule {}
