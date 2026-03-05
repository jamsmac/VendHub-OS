import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Collection, CollectionHistory } from "./entities/collection.entity";
import { CollectionsService } from "./collections.service";
import { CollectionsController } from "./collections.controller";
import { MachinesModule } from "../machines/machines.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Collection, CollectionHistory]),
    MachinesModule,
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
