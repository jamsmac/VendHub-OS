/**
 * Equipment Controller
 * REST API endpoints for equipment components, maintenance, and movements
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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { EquipmentService } from "../services/equipment.service";
import {
  CreateEquipmentComponentDto,
  UpdateEquipmentComponentDto,
  CreateComponentMaintenanceDto,
  CreateComponentMovementDto,
  EquipmentQueryDto,
  MaintenanceHistoryQueryDto,
  MovementQueryDto,
} from "../dto/create-equipment.dto";
import {
  EquipmentComponent,
  ComponentMaintenance,
  ComponentMovement,
} from "../entities/equipment-component.entity";

import { Roles } from "../../../common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentOrganizationId,
  ICurrentUser,
} from "../../../common/decorators/current-user.decorator";

@ApiTags("Equipment")
@ApiBearerAuth()
@Controller("equipment")
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // ========================================================================
  // COMPONENT CRUD
  // ========================================================================

  @Post()
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Create equipment component" })
  @ApiResponse({ status: 201, type: EquipmentComponent })
  async createComponent(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateEquipmentComponentDto,
  ): Promise<EquipmentComponent> {
    return this.equipmentService.createComponent(organizationId, user.id, dto);
  }

  @Get()
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "List equipment components" })
  @ApiResponse({ status: 200 })
  async findAllComponents(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: EquipmentQueryDto,
  ) {
    return this.equipmentService.findAllComponents(organizationId, query);
  }

  @Get(":id")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get equipment component by ID" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: EquipmentComponent })
  async findOneComponent(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<EquipmentComponent> {
    return this.equipmentService.findOneComponent(organizationId, id);
  }

  @Put(":id")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Update equipment component" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: EquipmentComponent })
  async updateComponent(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentComponentDto,
  ): Promise<EquipmentComponent> {
    return this.equipmentService.updateComponent(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Delete equipment component (soft delete)" })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComponent(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.equipmentService.deleteComponent(organizationId, id);
  }

  // ========================================================================
  // MAINTENANCE ENDPOINTS
  // ========================================================================

  @Post("maintenance")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Record component maintenance" })
  @ApiResponse({ status: 201, type: ComponentMaintenance })
  async createMaintenance(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateComponentMaintenanceDto,
  ): Promise<ComponentMaintenance> {
    return this.equipmentService.createMaintenance(
      organizationId,
      user.id,
      dto,
    );
  }

  @Get("maintenance/history")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get component maintenance history" })
  @ApiResponse({ status: 200 })
  async findMaintenanceHistory(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: MaintenanceHistoryQueryDto,
  ) {
    return this.equipmentService.findMaintenanceHistory(organizationId, query);
  }

  // ========================================================================
  // MOVEMENT ENDPOINTS
  // ========================================================================

  @Post("movements")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Record component movement between machines" })
  @ApiResponse({ status: 201, type: ComponentMovement })
  async createMovement(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateComponentMovementDto,
  ): Promise<ComponentMovement> {
    return this.equipmentService.createMovement(organizationId, user.id, dto);
  }

  @Get("movements/history")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get component movement history" })
  @ApiResponse({ status: 200 })
  async findMovementHistory(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: MovementQueryDto,
  ) {
    return this.equipmentService.findMovementHistory(organizationId, query);
  }
}
