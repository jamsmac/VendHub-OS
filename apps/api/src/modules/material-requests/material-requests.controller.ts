/**
 * Material Requests Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiParam,
} from '@nestjs/swagger';
import { MaterialRequestsService } from './material-requests.service';
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  MaterialRequestFilterDto,
  ApproveRequestDto,
  RejectRequestDto,
  RecordPaymentDto,
  ConfirmDeliveryDto,
  CancelRequestDto,
  SubmitRequestDto,
  SendToSupplierDto,
  MaterialRequestDto,
  MaterialRequestListDto,
  MaterialRequestStatsDto,
} from './dto/material-request.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { MaterialRequestHistory } from './entities/material-request.entity';

@ApiTags('Material Requests')
@ApiBearerAuth()
@Controller('material-requests')
export class MaterialRequestsController {
  constructor(private readonly service: MaterialRequestsService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  @Post()
  @Roles('operator', 'warehouse', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create material request' })
  @ApiResponse({ status: 201, type: MaterialRequestDto })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateMaterialRequestDto,
  ): Promise<MaterialRequestDto> {
    return this.service.createRequest(userId, organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get material requests list' })
  @ApiResponse({ status: 200, type: MaterialRequestListDto })
  async getList(
    @CurrentUser('organizationId') organizationId: string,
    @Query() filter: MaterialRequestFilterDto,
  ): Promise<MaterialRequestListDto> {
    return this.service.getRequests(organizationId, filter);
  }

  @Get('stats')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get material requests statistics' })
  @ApiResponse({ status: 200, type: MaterialRequestStatsDto })
  async getStats(
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<MaterialRequestStatsDto> {
    return this.service.getStats(organizationId);
  }

  @Get('pending')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get pending approval requests' })
  @ApiResponse({ status: 200, type: [MaterialRequestDto] })
  async getPendingApprovals(
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<MaterialRequestDto[]> {
    return this.service.getPendingApprovals(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get material request by ID' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<MaterialRequestDto> {
    return this.service.getRequest(id, organizationId);
  }

  @Put(':id')
  @Roles('operator', 'warehouse', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update material request (draft only)' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: UpdateMaterialRequestDto,
  ): Promise<MaterialRequestDto> {
    return this.service.updateRequest(id, userId, organizationId, dto);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get request history' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: [MaterialRequestHistory] })
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<MaterialRequestHistory[]> {
    return this.service.getRequestHistory(id, organizationId);
  }

  // ============================================================================
  // WORKFLOW ACTIONS
  // ============================================================================

  @Post(':id/submit')
  @Roles('operator', 'warehouse', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit request for approval' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SubmitRequestDto,
  ): Promise<MaterialRequestDto> {
    return this.service.submitRequest(id, userId, organizationId, dto?.comment);
  }

  @Post(':id/approve')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve material request' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ApproveRequestDto,
  ): Promise<MaterialRequestDto> {
    return this.service.approveRequest(id, userId, organizationId, dto);
  }

  @Post(':id/reject')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject material request' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: RejectRequestDto,
  ): Promise<MaterialRequestDto> {
    return this.service.rejectRequest(id, userId, organizationId, dto);
  }

  @Post(':id/send')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send request to supplier' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async sendToSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: SendToSupplierDto,
  ): Promise<MaterialRequestDto> {
    return this.service.sendToSupplier(id, userId, organizationId, dto?.comment);
  }

  @Post(':id/payment')
  @Roles('accountant', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record payment for request' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<MaterialRequestDto> {
    return this.service.recordPayment(id, userId, organizationId, dto);
  }

  @Post(':id/delivery')
  @Roles('warehouse', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm delivery' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async confirmDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: ConfirmDeliveryDto,
  ): Promise<MaterialRequestDto> {
    return this.service.confirmDelivery(id, userId, organizationId, dto);
  }

  @Post(':id/complete')
  @Roles('manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete material request' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<MaterialRequestDto> {
    return this.service.completeRequest(id, userId, organizationId);
  }

  @Post(':id/cancel')
  @Roles('operator', 'warehouse', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel material request' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CancelRequestDto,
  ): Promise<MaterialRequestDto> {
    return this.service.cancelRequest(id, userId, organizationId, dto);
  }

  @Post(':id/return-to-draft')
  @Roles('operator', 'warehouse', 'manager', 'admin', 'owner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return rejected request to draft' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, type: MaterialRequestDto })
  async returnToDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<MaterialRequestDto> {
    return this.service.returnToDraft(id, userId, organizationId);
  }
}
