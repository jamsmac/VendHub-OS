/**
 * Website Config Module
 *
 * Manages website configuration settings organized by section
 * (general, seo, social, theme, analytics).
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebsiteConfig } from "./entities/website-config.entity";
import { WebsiteConfigService } from "./website-config.service";
import { WebsiteConfigController } from "./website-config.controller";

@Module({
  imports: [TypeOrmModule.forFeature([WebsiteConfig])],
  controllers: [WebsiteConfigController],
  providers: [WebsiteConfigService],
  exports: [WebsiteConfigService],
})
export class WebsiteConfigModule {}
