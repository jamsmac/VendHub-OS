/**
 * Hopper Type Controller
 * REST API endpoints for hopper type dictionary
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { HopperTypeService } from "../services/hopper-type.service";
import {
  CreateHopperTypeDto,
  UpdateHopperTypeDto,
  HopperTypeQueryDto,
} from "../dto/create-hopper-type.dto";
import { HopperType } from "../entities/equipment-component.entity";

import { Roles } from "../../../common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentOrganizationId,
  ICurrentUser,
} from "../../../common/decorators/current-user.decorator";

@ApiTags("Hopper Types")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("hopper-types")
export class HopperTypeController {
  constructor(private readonly hopperTypeService: HopperTypeService) {}

  @Post()
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Create hopper type" })
  @ApiResponse({ status: 201, type: HopperType })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateHopperTypeDto,
  ): Promise<HopperType> {
    return this.hopperTypeService.create(organizationId, user.id, dto);
  }

  @Get()
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "List hopper types" })
  @ApiResponse({ status: 200 })
  async findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: HopperTypeQueryDto,
  ) {
    return this.hopperTypeService.findAll(organizationId, query);
  }

  @Get(":id")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get hopper type by ID" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: HopperType })
  async findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<HopperType> {
    return this.hopperTypeService.findOne(organizationId, id);
  }

  @Put(":id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Update hopper type" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: HopperType })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateHopperTypeDto,
  ): Promise<HopperType> {
    return this.hopperTypeService.update(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("admin", "owner")
  @ApiOperation({ summary: "Delete hopper type (soft delete)" })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.hopperTypeService.delete(organizationId, id);
  }
}
