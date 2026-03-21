import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EntityEvent } from "./entities/entity-event.entity";
import { EntityEventsService } from "./entity-events.service";
import { EntityEventsController } from "./entity-events.controller";

@Module({
  imports: [TypeOrmModule.forFeature([EntityEvent])],
  controllers: [EntityEventsController],
  providers: [EntityEventsService],
  exports: [EntityEventsService],
})
export class EntityEventsModule {}
