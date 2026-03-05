/**
 * CMS Module
 *
 * Content Management System for articles, help content, and documentation.
 * Supports publishing workflow, categorization, and SEO metadata.
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CmsArticle } from "./entities/cms-article.entity";
import { CmsService } from "./cms.service";
import { CmsController } from "./cms.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CmsArticle])],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
