import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SlotHistory } from "./entities/slot-history.entity";
import { SlotHistoryService } from "./services/slot-history.service";
import { SlotHistoryController } from "./slot-history.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SlotHistory])],
  controllers: [SlotHistoryController],
  providers: [SlotHistoryService],
  exports: [SlotHistoryService],
})
export class SlotHistoryModule {}
