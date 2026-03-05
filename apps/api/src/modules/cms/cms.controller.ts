/**
 * CMS Controller
 *
 * REST endpoints for CMS article management.
 *
 * Endpoints:
 *   GET    /cms/articles              - List articles (paginated, Admin+, Viewer)
 *   GET    /cms/articles/:idOrSlug    - Get single article (Admin+, Viewer)
 *   GET    /cms/articles/category/:cat - Get articles by category (Admin+, Viewer)
 *   POST   /cms/articles              - Create article (Admin)
 *   PATCH  /cms/articles/:id          - Update article (Admin)
 *   DELETE /cms/articles/:id          - Delete article (Admin)
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { CurrentOrganizationId } from "../../common/decorators/current-user.decorator";
import { CurrentUserId } from "../../common/decorators/current-user.decorator";
import { CmsService } from "./cms.service";
import {
  CreateCmsArticleDto,
  UpdateCmsArticleDto,
  PaginationDto,
} from "./dto/cms-article.dto";

@ApiTags("CMS")
@Controller("cms/articles")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.VIEWER)
  @ApiOperation({ summary: "List CMS articles (paginated)" })
  @ApiResponse({
    status: 200,
    description: "List of articles with total count",
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "isPublished", required: false, type: Boolean })
  async listArticles(
    @CurrentOrganizationId() organizationId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.cmsService.getArticles(organizationId, pagination);
  }

  @Get("category/:category")
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.VIEWER)
  @ApiOperation({ summary: "Get articles by category" })
  @ApiResponse({ status: 200, description: "List of articles in category" })
  @ApiParam({ name: "category", type: String, description: "Category name" })
  async getByCategory(
    @CurrentOrganizationId() organizationId: string,
    @Param("category") category: string,
  ) {
    return this.cmsService.getArticlesByCategory(organizationId, category);
  }

  @Get(":idOrSlug")
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.VIEWER)
  @ApiOperation({ summary: "Get single article by ID or slug" })
  @ApiResponse({ status: 200, description: "Article details" })
  @ApiResponse({ status: 404, description: "Article not found" })
  @ApiParam({
    name: "idOrSlug",
    type: String,
    description: "Article ID (UUID) or slug",
  })
  async getArticle(
    @CurrentOrganizationId() organizationId: string,
    @Param("idOrSlug") idOrSlug: string,
  ) {
    return this.cmsService.getArticleByIdOrSlug(organizationId, idOrSlug);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new CMS article" })
  @ApiResponse({ status: 201, description: "Article created" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateCmsArticleDto,
  ) {
    return this.cmsService.createArticle(organizationId, dto, userId);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update a CMS article" })
  @ApiResponse({ status: 200, description: "Article updated" })
  @ApiResponse({ status: 404, description: "Article not found" })
  @ApiParam({ name: "id", type: String, description: "Article ID or slug" })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCmsArticleDto,
  ) {
    return this.cmsService.updateArticle(organizationId, id, dto, userId);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a CMS article" })
  @ApiResponse({ status: 204, description: "Article deleted" })
  @ApiResponse({ status: 404, description: "Article not found" })
  @ApiParam({ name: "id", type: String, description: "Article ID or slug" })
  async delete(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
  ) {
    await this.cmsService.deleteArticle(organizationId, id);
  }
}
