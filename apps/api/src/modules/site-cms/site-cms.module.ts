import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { SiteCmsItem } from "./entities/site-cms-item.entity";
import { SiteCmsService } from "./site-cms.service";
import { SiteCmsController } from "./site-cms.controller";
import { SiteCmsPublicController } from "./site-cms-public.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SiteCmsItem]), ConfigModule],
  controllers: [SiteCmsController, SiteCmsPublicController],
  providers: [SiteCmsService],
  exports: [SiteCmsService],
})
export class SiteCmsModule {}
