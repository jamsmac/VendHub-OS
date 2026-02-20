/**
 * Complaints Controller for VendHub OS
 * REST API for complaint management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
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
import { Throttle } from '@nestjs/throttler';
import { ComplaintsService, CreateComplaintDto, UpdateComplaintDto, CreateRefundDto, QueryComplaintsDto } from './complaints.service';
import { ComplaintStatus, ComplaintPriority, ComplaintCategory, ComplaintSource } from './entities/complaint.entity';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserId, CurrentOrganizationId } from '../../common/decorators/current-user.decorator';

@ApiTags('Complaints')
@ApiBearerAuth()
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create new complaint' })
  @ApiResponse({ status: 201, description: 'Complaint created' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateComplaintDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.complaintsService.create({
      ...dto,
      organizationId: dto.organizationId || orgId,
    });
  }

  @Post('public')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 complaints/min per IP -- prevent spam
  @ApiOperation({ summary: 'Create complaint via QR code (public)' })
  @ApiResponse({ status: 201, description: 'Complaint created' })
  @HttpCode(HttpStatus.CREATED)
  async createPublic(
    @Body() dto: {
      qrCode: string;
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      category: ComplaintCategory;
      subject: string;
      description: string;
    },
  ) {
    // Get QR code info
    const qrCodeInfo = await this.complaintsService.getQrCodeByCode(dto.qrCode);

    return this.complaintsService.create({
      organizationId: qrCodeInfo.organizationId,
      machineId: qrCodeInfo.machineId,
      qrCodeId: qrCodeInfo.id,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      category: dto.category,
      source: ComplaintSource.QR_CODE,
      subject: dto.subject,
      description: dto.description,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Query complaints with filters' })
  @ApiQuery({ name: 'status', required: false, enum: ComplaintStatus, isArray: true })
  @ApiQuery({ name: 'priority', required: false, enum: ComplaintPriority, isArray: true })
  @ApiQuery({ name: 'category', required: false, enum: ComplaintCategory, isArray: true })
  @ApiQuery({ name: 'assignedToId', required: false })
  @ApiQuery({ name: 'machineId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles('owner', 'admin', 'manager', 'operator')
  async query(
    @Query() query: QueryComplaintsDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.complaintsService.query({
      ...query,
      organizationId: query.organizationId || orgId,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get complaints assigned to me' })
  @Roles('owner', 'admin', 'manager', 'operator')
  async getMyComplaints(
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
    @Query('status') status?: ComplaintStatus[],
  ) {
    return this.complaintsService.query({
      organizationId: orgId,
      assignedToId: userId,
      status,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get complaint statistics' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @Roles('owner', 'admin', 'manager')
  async getStatistics(
    @CurrentOrganizationId() orgId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.complaintsService.getStatistics(
      orgId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complaint by ID' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager', 'operator')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.complaintsService.findById(id);
  }

  @Get('number/:number')
  @ApiOperation({ summary: 'Get complaint by number' })
  @ApiParam({ name: 'number', type: String })
  async findByNumber(@Param('number') number: string) {
    return this.complaintsService.findByNumber(number);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update complaint' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager', 'operator')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintDto,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.update(id, dto, userId);
  }

  // ============================================================================
  // Actions
  // ============================================================================

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign complaint to user' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.OK)
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assignedToId', ParseUUIDPipe) assignedToId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.assign(id, assignedToId, userId);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve complaint' })
  @Roles('owner', 'admin', 'manager', 'operator')
  @HttpCode(HttpStatus.OK)
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('resolution') resolution: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.resolve(id, resolution, userId);
  }

  @Post(':id/escalate')
  @ApiOperation({ summary: 'Escalate complaint' })
  @Roles('owner', 'admin', 'manager', 'operator')
  @HttpCode(HttpStatus.OK)
  async escalate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.escalate(id, reason, userId);
  }

  @Post(':id/feedback')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 feedback submissions/min per IP
  @ApiOperation({ summary: 'Submit customer feedback' })
  @HttpCode(HttpStatus.OK)
  async submitFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.complaintsService.submitFeedback(id, body.rating, body.comment);
  }

  // ============================================================================
  // Comments
  // ============================================================================

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get complaint comments' })
  @ApiQuery({ name: 'includeInternal', required: false, type: Boolean })
  async getComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeInternal') includeInternal?: boolean,
    @CurrentUser() user?: any,
  ) {
    // Only internal users can see internal comments
    const canSeeInternal = user && ['owner', 'admin', 'manager', 'operator'].includes(user.role);
    return this.complaintsService.getComments(id, canSeeInternal && includeInternal !== false);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to complaint' })
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { content: string; isInternal?: boolean; attachments?: string[] },
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.addComment({
      complaintId: id,
      userId,
      isInternal: body.isInternal || false,
      content: body.content,
      attachments: body.attachments,
    });
  }

  // ============================================================================
  // Refunds
  // ============================================================================

  @Post(':id/refunds')
  @ApiOperation({ summary: 'Request refund for complaint' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async createRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Omit<CreateRefundDto, 'complaintId' | 'requestedById'>,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.createRefund({
      ...dto,
      complaintId: id,
      requestedById: userId,
    });
  }

  @Post('refunds/:refundId/approve')
  @ApiOperation({ summary: 'Approve refund' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  async approveRefund(
    @Param('refundId', ParseUUIDPipe) refundId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.approveRefund(refundId, userId);
  }

  @Post('refunds/:refundId/process')
  @ApiOperation({ summary: 'Process refund' })
  @Roles('owner', 'admin', 'accountant')
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @Param('refundId', ParseUUIDPipe) refundId: string,
    @Body('referenceNumber') referenceNumber: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.processRefund(refundId, userId, referenceNumber);
  }

  @Post('refunds/:refundId/reject')
  @ApiOperation({ summary: 'Reject refund' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  async rejectRefund(
    @Param('refundId', ParseUUIDPipe) refundId: string,
    @Body('reason') reason: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.rejectRefund(refundId, userId, reason);
  }

  // ============================================================================
  // QR Codes
  // ============================================================================

  @Post('qr-codes/generate')
  @ApiOperation({ summary: 'Generate QR code for machine' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async generateQrCode(
    @Body('machineId', ParseUUIDPipe) machineId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.complaintsService.generateQrCode(orgId, machineId);
  }

  @Get('qr-codes/machine/:machineId')
  @ApiOperation({ summary: 'Get QR codes for machine' })
  @Roles('owner', 'admin', 'manager')
  async getQrCodesForMachine(@Param('machineId', ParseUUIDPipe) machineId: string) {
    return this.complaintsService.getQrCodesForMachine(machineId);
  }

  @Get('qr-codes/:code')
  @Public()
  @ApiOperation({ summary: 'Get QR code info' })
  async getQrCode(@Param('code') code: string) {
    return this.complaintsService.getQrCodeByCode(code);
  }

  // ============================================================================
  // Templates
  // ============================================================================

  @Get('templates')
  @ApiOperation({ summary: 'Get complaint templates' })
  async getTemplates(@CurrentOrganizationId() orgId: string) {
    return this.complaintsService.getTemplates(orgId);
  }
}
