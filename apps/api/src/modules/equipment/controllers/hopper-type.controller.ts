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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { HopperTypeService } from '../services/hopper-type.service';
import {
  CreateHopperTypeDto,
  UpdateHopperTypeDto,
  HopperTypeQueryDto,
} from '../dto/create-hopper-type.dto';
import { HopperType } from '../entities/equipment-component.entity';

// Placeholder decorators
interface UserPayload {
  id: string;
  [key: string]: unknown;
}
const Roles = (..._roles: string[]) => (target: object, key?: string, descriptor?: PropertyDescriptor) => descriptor || target;
const CurrentUser = () => (_target: object, _key: string, _index: number) => {};
const Organization = () => (_target: object, _key: string, _index: number) => {};

@ApiTags('Hopper Types')
@ApiBearerAuth()
@Controller('hopper-types')
export class HopperTypeController {
  constructor(private readonly hopperTypeService: HopperTypeService) {}

  @Post()
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create hopper type' })
  @ApiResponse({ status: 201, type: HopperType })
  async create(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateHopperTypeDto,
  ): Promise<HopperType> {
    return this.hopperTypeService.create(organizationId, user.id, dto);
  }

  @Get()
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List hopper types' })
  @ApiResponse({ status: 200 })
  async findAll(
    @Organization() organizationId: string,
    @Query() query: HopperTypeQueryDto,
  ) {
    return this.hopperTypeService.findAll(organizationId, query);
  }

  @Get(':id')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get hopper type by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: HopperType })
  async findOne(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HopperType> {
    return this.hopperTypeService.findOne(organizationId, id);
  }

  @Put(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update hopper type' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: HopperType })
  async update(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHopperTypeDto,
  ): Promise<HopperType> {
    return this.hopperTypeService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Delete hopper type (soft delete)' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.hopperTypeService.delete(organizationId, id);
  }
}
