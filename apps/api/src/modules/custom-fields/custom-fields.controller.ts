/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomFieldsService } from "./custom-fields.service";
import {
  CreateCustomTabDto,
  UpdateCustomTabDto,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
} from "./dto/custom-field.dto";

@ApiTags("Custom Fields")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("custom-fields")
export class CustomFieldsController {
  constructor(private readonly service: CustomFieldsService) {}

  // ========================================================================
  // TABS
  // ========================================================================

  @Get("tabs")
  @ApiOperation({
    summary: "Get custom tabs (optionally filtered by entityType)",
  })
  async getTabs(@Query("entityType") entityType: string, @Request() req: any) {
    return this.service.getTabs(req.user.organizationId, entityType);
  }

  @Post("tabs")
  @ApiOperation({ summary: "Create a custom tab" })
  async createTab(@Body() dto: CreateCustomTabDto, @Request() req: any) {
    return this.service.createTab(req.user.organizationId, dto);
  }

  @Patch("tabs/:id")
  @ApiOperation({ summary: "Update a custom tab" })
  async updateTab(
    @Param("id") id: string,
    @Body() dto: UpdateCustomTabDto,
    @Request() req: any,
  ) {
    return this.service.updateTab(id, req.user.organizationId, dto);
  }

  @Delete("tabs/:id")
  @ApiOperation({ summary: "Delete a custom tab (soft)" })
  async deleteTab(@Param("id") id: string, @Request() req: any) {
    return this.service.deleteTab(id, req.user.organizationId);
  }

  // ========================================================================
  // FIELDS
  // ========================================================================

  @Get("fields")
  @ApiOperation({ summary: "Get custom fields for an entity type" })
  async getFields(
    @Query("entityType") entityType: string,
    @Query("tabName") tabName: string,
    @Request() req: any,
  ) {
    return this.service.getFields(req.user.organizationId, entityType, tabName);
  }

  @Post("fields")
  @ApiOperation({ summary: "Create a custom field" })
  async createField(@Body() dto: CreateCustomFieldDto, @Request() req: any) {
    return this.service.createField(req.user.organizationId, dto);
  }

  @Patch("fields/:id")
  @ApiOperation({ summary: "Update a custom field" })
  async updateField(
    @Param("id") id: string,
    @Body() dto: UpdateCustomFieldDto,
    @Request() req: any,
  ) {
    return this.service.updateField(id, req.user.organizationId, dto);
  }

  @Delete("fields/:id")
  @ApiOperation({ summary: "Delete a custom field (soft)" })
  async deleteField(@Param("id") id: string, @Request() req: any) {
    return this.service.deleteField(id, req.user.organizationId);
  }
}
