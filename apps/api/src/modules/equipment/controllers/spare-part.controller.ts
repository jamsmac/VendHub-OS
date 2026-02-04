/**
 * Spare Part Controller
 * REST API endpoints for spare parts inventory
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
  ApiBody,
} from '@nestjs/swagger';

import { SparePartService } from '../services/spare-part.service';
import {
  CreateSparePartDto,
  UpdateSparePartDto,
  SparePartQueryDto,
} from '../dto/create-spare-part.dto';
import { SparePart } from '../entities/equipment-component.entity';

// Placeholder decorators
interface UserPayload {
  id: string;
  [key: string]: unknown;
}
const Roles = (..._roles: string[]) => (target: object, key?: string, descriptor?: PropertyDescriptor) => descriptor || target;
const CurrentUser = () => (_target: object, _key: string, _index: number) => {};
const Organization = () => (_target: object, _key: string, _index: number) => {};

@ApiTags('Spare Parts')
@ApiBearerAuth()
@Controller('spare-parts')
export class SparePartController {
  constructor(private readonly sparePartService: SparePartService) {}

  @Post()
  @Roles('warehouse', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create spare part' })
  @ApiResponse({ status: 201, type: SparePart })
  async create(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateSparePartDto,
  ): Promise<SparePart> {
    return this.sparePartService.create(organizationId, user.id, dto);
  }

  @Get()
  @Roles('operator', 'warehouse', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List spare parts' })
  @ApiResponse({ status: 200 })
  async findAll(
    @Organization() organizationId: string,
    @Query() query: SparePartQueryDto,
  ) {
    return this.sparePartService.findAll(organizationId, query);
  }

  @Get(':id')
  @Roles('operator', 'warehouse', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get spare part by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: SparePart })
  async findOne(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SparePart> {
    return this.sparePartService.findOne(organizationId, id);
  }

  @Put(':id')
  @Roles('warehouse', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update spare part' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: SparePart })
  async update(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSparePartDto,
  ): Promise<SparePart> {
    return this.sparePartService.update(organizationId, id, dto);
  }

  @Patch(':id/quantity')
  @Roles('warehouse', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Adjust spare part quantity (positive or negative)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ schema: { type: 'object', properties: { adjustment: { type: 'number' } } } })
  @ApiResponse({ status: 200, type: SparePart })
  async adjustQuantity(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('adjustment') adjustment: number,
  ): Promise<SparePart> {
    return this.sparePartService.adjustQuantity(organizationId, id, adjustment);
  }

  @Delete(':id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Delete spare part (soft delete)' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.sparePartService.delete(organizationId, id);
  }
}
