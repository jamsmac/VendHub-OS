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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { EquipmentService } from '../services/equipment.service';
import {
  CreateEquipmentComponentDto,
  UpdateEquipmentComponentDto,
  CreateComponentMaintenanceDto,
  CreateComponentMovementDto,
  EquipmentQueryDto,
  MaintenanceHistoryQueryDto,
  MovementQueryDto,
} from '../dto/create-equipment.dto';
import {
  EquipmentComponent,
  ComponentMaintenance,
  ComponentMovement,
} from '../entities/equipment-component.entity';

// Placeholder decorators (same pattern as maintenance module)
interface UserPayload {
  id: string;
  [key: string]: unknown;
}
const Roles = (..._roles: string[]) => (target: object, key?: string, descriptor?: PropertyDescriptor) => descriptor || target;
const CurrentUser = () => (_target: object, _key: string, _index: number) => {};
const Organization = () => (_target: object, _key: string, _index: number) => {};

@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // ========================================================================
  // COMPONENT CRUD
  // ========================================================================

  @Post()
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create equipment component' })
  @ApiResponse({ status: 201, type: EquipmentComponent })
  async createComponent(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateEquipmentComponentDto,
  ): Promise<EquipmentComponent> {
    return this.equipmentService.createComponent(organizationId, user.id, dto);
  }

  @Get()
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List equipment components' })
  @ApiResponse({ status: 200 })
  async findAllComponents(
    @Organization() organizationId: string,
    @Query() query: EquipmentQueryDto,
  ) {
    return this.equipmentService.findAllComponents(organizationId, query);
  }

  @Get(':id')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get equipment component by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: EquipmentComponent })
  async findOneComponent(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EquipmentComponent> {
    return this.equipmentService.findOneComponent(organizationId, id);
  }

  @Put(':id')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update equipment component' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: EquipmentComponent })
  async updateComponent(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentComponentDto,
  ): Promise<EquipmentComponent> {
    return this.equipmentService.updateComponent(organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Delete equipment component (soft delete)' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComponent(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.equipmentService.deleteComponent(organizationId, id);
  }

  // ========================================================================
  // MAINTENANCE ENDPOINTS
  // ========================================================================

  @Post('maintenance')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Record component maintenance' })
  @ApiResponse({ status: 201, type: ComponentMaintenance })
  async createMaintenance(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateComponentMaintenanceDto,
  ): Promise<ComponentMaintenance> {
    return this.equipmentService.createMaintenance(organizationId, user.id, dto);
  }

  @Get('maintenance/history')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get component maintenance history' })
  @ApiResponse({ status: 200 })
  async findMaintenanceHistory(
    @Organization() organizationId: string,
    @Query() query: MaintenanceHistoryQueryDto,
  ) {
    return this.equipmentService.findMaintenanceHistory(organizationId, query);
  }

  // ========================================================================
  // MOVEMENT ENDPOINTS
  // ========================================================================

  @Post('movements')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Record component movement between machines' })
  @ApiResponse({ status: 201, type: ComponentMovement })
  async createMovement(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateComponentMovementDto,
  ): Promise<ComponentMovement> {
    return this.equipmentService.createMovement(organizationId, user.id, dto);
  }

  @Get('movements/history')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get component movement history' })
  @ApiResponse({ status: 200 })
  async findMovementHistory(
    @Organization() organizationId: string,
    @Query() query: MovementQueryDto,
  ) {
    return this.equipmentService.findMovementHistory(organizationId, query);
  }
}
