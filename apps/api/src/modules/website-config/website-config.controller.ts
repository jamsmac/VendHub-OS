/**
 * Website Config Controller
 *
 * REST endpoints for website configuration management.
 *
 * Endpoints:
 *   GET    /website-config              - Get all configs for organization (Admin+)
 *   GET    /website-config/:section     - Get configs by section (Admin+)
 *   GET    /website-config/key/:key     - Get config by key (Admin+)
 *   POST   /website-config              - Create config (Admin)
 *   PATCH  /website-config/:key         - Update config (Admin)
 *   PATCH  /website-config/bulk         - Bulk update configs (Admin)
 *   DELETE /website-config/:key         - Delete config (Admin)
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { CurrentOrganizationId } from "../../common/decorators/current-user.decorator";
import { CurrentUserId } from "../../common/decorators/current-user.decorator";
import { WebsiteConfigService } from "./website-config.service";
import { WebsiteConfigSection } from "./entities/website-config.entity";
import {
  CreateWebsiteConfigDto,
  UpdateWebsiteConfigDto,
  BulkUpdateWebsiteConfigDto,
} from "./dto/website-config.dto";

@ApiTags("Website Config")
@Controller("website-config")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebsiteConfigController {
  constructor(private readonly configService: WebsiteConfigService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Get all website configs for organization" })
  @ApiResponse({ status: 200, description: "List of website configs" })
  async getAll(@CurrentOrganizationId() organizationId: string) {
    return this.configService.getAll(organizationId);
  }

  @Get(":section")
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Get website configs by section" })
  @ApiResponse({ status: 200, description: "List of configs in section" })
  @ApiParam({
    name: "section",
    enum: WebsiteConfigSection,
    description: "Config section",
  })
  async getBySection(
    @CurrentOrganizationId() organizationId: string,
    @Param("section") section: WebsiteConfigSection,
  ) {
    return this.configService.getBySection(organizationId, section);
  }

  @Get("key/:key")
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Get website config by key" })
  @ApiResponse({ status: 200, description: "Config details" })
  @ApiResponse({ status: 404, description: "Config not found" })
  @ApiParam({ name: "key", type: String, description: "Config key" })
  async getByKey(
    @CurrentOrganizationId() organizationId: string,
    @Param("key") key: string,
  ) {
    return this.configService.getByKey(organizationId, key);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new website config" })
  @ApiResponse({ status: 201, description: "Config created" })
  @ApiResponse({
    status: 400,
    description: "Invalid input or key already exists",
  })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateWebsiteConfigDto,
  ) {
    return this.configService.create(organizationId, dto, userId);
  }

  @Patch(":key")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update a website config" })
  @ApiResponse({ status: 200, description: "Config updated" })
  @ApiResponse({ status: 404, description: "Config not found" })
  @ApiParam({ name: "key", type: String, description: "Config key" })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("key") key: string,
    @Body() dto: UpdateWebsiteConfigDto,
  ) {
    return this.configService.updateByKey(organizationId, key, dto, userId);
  }

  @Patch("bulk/update")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Bulk update website configs (upsert)" })
  @ApiResponse({ status: 200, description: "Configs updated" })
  async bulkUpdate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() configs: BulkUpdateWebsiteConfigDto[],
  ) {
    return this.configService.bulkUpdate(organizationId, configs, userId);
  }

  @Delete(":key")
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a website config" })
  @ApiResponse({ status: 204, description: "Config deleted" })
  @ApiResponse({ status: 404, description: "Config not found" })
  @ApiParam({ name: "key", type: String, description: "Config key" })
  async delete(
    @CurrentOrganizationId() organizationId: string,
    @Param("key") key: string,
  ) {
    await this.configService.deleteByKey(organizationId, key);
  }
}
