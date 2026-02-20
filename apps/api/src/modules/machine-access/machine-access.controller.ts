/**
 * Machine Access Controller for VendHub OS
 * REST API for machine access management
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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { MachineAccessService } from './machine-access.service';
import { CreateMachineAccessDto, RevokeMachineAccessDto } from './dto/create-machine-access.dto';
import {
  CreateAccessTemplateDto,
  UpdateAccessTemplateDto,
  ApplyTemplateDto,
} from './dto/create-access-template.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUserId, CurrentOrganizationId } from '../../common/decorators/current-user.decorator';

@ApiTags('Machine Access')
@ApiBearerAuth()
@Controller('machine-access')
export class MachineAccessController {
  constructor(private readonly machineAccessService: MachineAccessService) {}

  // ============================================================================
  // ACCESS CRUD
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Grant access to a machine for a user' })
  @ApiResponse({ status: 201, description: 'Access granted' })
  @ApiResponse({ status: 409, description: 'User already has active access' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async grantAccess(
    @Body() dto: CreateMachineAccessDto,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.machineAccessService.grantAccess(dto, userId, dto.organization_id || orgId);
  }

  @Post('revoke')
  @ApiOperation({ summary: 'Revoke machine access' })
  @ApiResponse({ status: 200, description: 'Access revoked' })
  @ApiResponse({ status: 404, description: 'Access record not found' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.OK)
  async revokeAccess(
    @Body() dto: RevokeMachineAccessDto,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.machineAccessService.revokeAccess(dto, userId, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List all machine access records' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'machineId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @Roles('owner', 'admin', 'manager')
  async findAll(
    @CurrentOrganizationId() orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('machineId') machineId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.machineAccessService.findAll(orgId, { page, limit, machineId, userId });
  }

  @Get('machine/:machineId')
  @ApiOperation({ summary: 'Get all access records for a machine' })
  @ApiParam({ name: 'machineId', type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @Roles('owner', 'admin', 'manager', 'operator')
  async getAccessByMachine(
    @Param('machineId', ParseUUIDPipe) machineId: string,
    @CurrentOrganizationId() orgId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.machineAccessService.getAccessByMachine(machineId, orgId, includeInactive);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all access records for a user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @Roles('owner', 'admin', 'manager')
  async getAccessByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentOrganizationId() orgId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.machineAccessService.getAccessByUser(userId, orgId, includeInactive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific machine access record' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.machineAccessService.findById(id, orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a machine access record' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    await this.machineAccessService.remove(id, orgId);
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  @Post('templates')
  @ApiOperation({ summary: 'Create an access template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() dto: CreateAccessTemplateDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.machineAccessService.createTemplate(dto, dto.organization_id || orgId);
  }

  @Get('templates/list')
  @ApiOperation({ summary: 'List all access templates' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @Roles('owner', 'admin', 'manager')
  async findAllTemplates(
    @CurrentOrganizationId() orgId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.machineAccessService.findAllTemplates(orgId, includeInactive);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a specific access template' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager')
  async findTemplateById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.machineAccessService.findTemplateById(id, orgId);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update an access template' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager')
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccessTemplateDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.machineAccessService.updateTemplate(id, dto, orgId);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Soft delete an access template' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    await this.machineAccessService.removeTemplate(id, orgId);
  }

  @Post('templates/apply')
  @ApiOperation({ summary: 'Apply a template to grant access for users to a machine' })
  @ApiResponse({ status: 201, description: 'Template applied, access records created' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async applyTemplate(
    @Body() dto: ApplyTemplateDto,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.machineAccessService.applyTemplate(
      dto.template_id,
      dto.machine_id,
      dto.user_ids,
      userId,
      orgId,
    );
  }
}
