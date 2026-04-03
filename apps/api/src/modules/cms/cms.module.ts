/**
 * CMS Module
 *
 * Content Management System for articles, banners, and site content.
 * Supports publishing workflow, categorization, scheduling, and SEO metadata.
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { CmsArticle } from "./entities/cms-article.entity";
import { CmsBanner } from "./entities/cms-banner.entity";
import { CmsService } from "./cms.service";
import { CmsBannerService } from "./cms-banner.service";
import { CmsController } from "./cms.controller";
import { CmsBannerController } from "./cms-banner.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CmsArticle, CmsBanner]), ConfigModule],
  controllers: [CmsController, CmsBannerController],
  providers: [CmsService, CmsBannerService],
  exports: [CmsService, CmsBannerService],
})
export class CmsModule {}
