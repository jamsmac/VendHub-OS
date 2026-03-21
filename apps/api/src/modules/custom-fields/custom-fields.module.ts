import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EntityCustomTab,
  EntityCustomField,
} from "./entities/custom-field.entity";
import { CustomFieldsService } from "./custom-fields.service";
import { CustomFieldsController } from "./custom-fields.controller";

@Module({
  imports: [TypeOrmModule.forFeature([EntityCustomTab, EntityCustomField])],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
