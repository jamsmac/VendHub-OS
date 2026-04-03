/**
 * CMS Banner Controller
 *
 * Admin CRUD for managing promotional banners.
 * Plus one public endpoint for the site to fetch active banners.
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
  ParseUUIDPipe,
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
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators";
import { CurrentOrganizationId } from "../../common/decorators/current-user.decorator";
import { CurrentUserId } from "../../common/decorators/current-user.decorator";
import { CmsBannerService } from "./cms-banner.service";
import { CreateCmsBannerDto, UpdateCmsBannerDto } from "./dto/cms-banner.dto";
import { BannerPosition } from "./entities/cms-banner.entity";

@ApiTags("CMS Banners")
@Controller("cms/banners")
export class CmsBannerController {
  constructor(private readonly bannerService: CmsBannerService) {}

  // ============================================
  // PUBLIC ENDPOINT (for vendhub.uz site)
  // ============================================

  @Public()
  @Get("public")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: "Get active banners for public site (no auth)",
    description:
      "Returns currently active banners sorted by position and sortOrder",
  })
  @ApiQuery({
    name: "position",
    required: false,
    enum: BannerPosition,
    description: "Filter by position",
  })
  @ApiResponse({ status: 200, description: "Active banners list" })
  async getPublicBanners(@Query("position") position?: BannerPosition) {
    return this.bannerService.getActiveBanners(position);
  }

  // ============================================
  // PUBLIC SITE CONTENT (hero, about, stats)
  // ============================================

  @Public()
  @Get("public/content")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: "Get public site content sections (no auth)",
    description:
      "Returns published CMS articles for site sections (hero, about, features, etc.)",
  })
  @ApiQuery({
    name: "category",
    required: false,
    type: String,
    description: "Filter by category (e.g. hero, about, features, stats, faq)",
  })
  @ApiResponse({ status: 200, description: "Site content sections" })
  async getPublicContent(@Query("category") category?: string) {
    return this.bannerService.getPublicSiteContent(category);
  }

  // ============================================
  // ADMIN CRUD
  // ============================================

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all banners (admin)" })
  @ApiResponse({ status: 200, description: "Banners list" })
  @ApiQuery({ name: "position", required: false, enum: BannerPosition })
  async listBanners(
    @CurrentOrganizationId() organizationId: string,
    @Query("position") position?: BannerPosition,
  ) {
    return this.bannerService.getAllBanners(organizationId, position);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get banner by ID (admin)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 200, description: "Banner details" })
  @ApiResponse({ status: 404, description: "Banner not found" })
  async getBanner(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.bannerService.getBannerById(organizationId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new banner (admin)" })
  @ApiResponse({ status: 201, description: "Banner created" })
  async createBanner(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateCmsBannerDto,
  ) {
    return this.bannerService.createBanner(organizationId, dto, userId);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a banner (admin)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 200, description: "Banner updated" })
  @ApiResponse({ status: 404, description: "Banner not found" })
  async updateBanner(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCmsBannerDto,
  ) {
    return this.bannerService.updateBanner(organizationId, id, dto, userId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a banner (admin)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiResponse({ status: 204, description: "Banner deleted" })
  @ApiResponse({ status: 404, description: "Banner not found" })
  async deleteBanner(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.bannerService.deleteBanner(organizationId, id);
  }
}
