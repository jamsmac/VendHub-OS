/**
 * Incidents Controller for VendHub OS
 * REST API for incident management
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
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto, QueryIncidentsDto } from './dto/update-incident.dto';
import { IncidentStatus, IncidentType, IncidentPriority } from './entities/incident.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUserId, CurrentOrganizationId } from '../../common/decorators/current-user.decorator';

@ApiTags('Incidents')
@ApiBearerAuth()
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  // ============================================================================
  // CRUD
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Report a new incident' })
  @ApiResponse({ status: 201, description: 'Incident created' })
  @Roles('owner', 'admin', 'manager', 'operator')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateIncidentDto,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.incidentsService.create(dto, userId, dto.organization_id || orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Query incidents with filters' })
  @ApiQuery({ name: 'machine_id', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: IncidentStatus })
  @ApiQuery({ name: 'type', required: false, enum: IncidentType })
  @ApiQuery({ name: 'priority', required: false, enum: IncidentPriority })
  @ApiQuery({ name: 'assigned_to_user_id', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles('owner', 'admin', 'manager', 'operator')
  async query(
    @Query() query: QueryIncidentsDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.incidentsService.query(query, query.organization_id || orgId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get incident statistics for a date range' })
  @ApiQuery({ name: 'dateFrom', required: true, type: String })
  @ApiQuery({ name: 'dateTo', required: true, type: String })
  @Roles('owner', 'admin', 'manager')
  async getStatistics(
    @CurrentOrganizationId() orgId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.incidentsService.getStatistics(
      orgId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Get('machine/:machineId')
  @ApiOperation({ summary: 'Get incidents for a specific machine' })
  @ApiParam({ name: 'machineId', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles('owner', 'admin', 'manager', 'operator')
  async findByMachine(
    @Param('machineId', ParseUUIDPipe) machineId: string,
    @CurrentOrganizationId() orgId: string,
    @Query('limit') limit?: number,
  ) {
    return this.incidentsService.findByMachine(machineId, orgId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get incident by ID' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager', 'operator')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.incidentsService.findById(id, orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an incident' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager', 'operator')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.incidentsService.update(id, dto, userId, orgId);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign incident to a user' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.OK)
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assigned_to_user_id', ParseUUIDPipe) assignedToUserId: string,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.incidentsService.assign(id, assignedToUserId, userId, orgId);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve an incident' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager', 'operator')
  @HttpCode(HttpStatus.OK)
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('resolution') resolution: string,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.incidentsService.resolve(id, resolution, userId, orgId);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a resolved incident' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.OK)
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.incidentsService.close(id, userId, orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a closed incident' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    await this.incidentsService.remove(id, userId, orgId);
  }
}
