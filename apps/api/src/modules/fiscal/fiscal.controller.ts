import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { FiscalService, CreateDeviceDto, CreateReceiptDto } from './services/fiscal.service';
import { FiscalReceiptType, FiscalReceiptStatus, FiscalQueueStatus } from './entities/fiscal.entity';

interface AuthenticatedRequest extends Request {
  user: {
    organizationId: string;
    id: string;
    role: string;
  };
}

@ApiTags('Fiscal')
@Controller('fiscal')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  // ============================================
  // Device Management
  // ============================================

  @Get('devices')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get all fiscal devices' })
  async getDevices(@Req() req: AuthenticatedRequest) {
    return this.fiscalService.getDevices(req.user.organizationId);
  }

  @Get('devices/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get fiscal device by ID' })
  async getDevice(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.fiscalService.getDevice(id, req.user.organizationId);
  }

  @Post('devices')
  @Roles('admin')
  @ApiOperation({ summary: 'Create new fiscal device' })
  async createDevice(@Body() dto: CreateDeviceDto, @Req() req: AuthenticatedRequest) {
    return this.fiscalService.createDevice(req.user.organizationId, dto);
  }

  @Put('devices/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update fiscal device' })
  async updateDevice(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDeviceDto>,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.updateDevice(id, req.user.organizationId, dto);
  }

  @Post('devices/:id/activate')
  @Roles('admin')
  @ApiOperation({ summary: 'Activate fiscal device' })
  async activateDevice(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.fiscalService.activateDevice(id, req.user.organizationId);
  }

  @Post('devices/:id/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate fiscal device' })
  async deactivateDevice(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.fiscalService.deactivateDevice(id, req.user.organizationId);
  }

  @Get('devices/:id/stats')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get device statistics' })
  async getDeviceStatistics(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.fiscalService.getDeviceStatistics(id, req.user.organizationId);
  }

  // ============================================
  // Shift Management
  // ============================================

  @Post('devices/:id/shift/open')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Open fiscal shift' })
  async openShift(
    @Param('id') deviceId: string,
    @Body() body: { cashierName: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.openShift(
      deviceId,
      req.user.organizationId,
      body.cashierName,
    );
  }

  @Post('devices/:id/shift/close')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Close fiscal shift (Z-report)' })
  async closeShift(@Param('id') deviceId: string, @Req() req: AuthenticatedRequest) {
    return this.fiscalService.closeShift(deviceId, req.user.organizationId);
  }

  @Get('devices/:id/shift/current')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get current open shift' })
  async getCurrentShift(@Param('id') deviceId: string, @Req() req: AuthenticatedRequest) {
    await this.fiscalService.getDevice(deviceId, req.user.organizationId);
    return this.fiscalService.getCurrentShift(deviceId);
  }

  @Get('devices/:id/shift/history')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get shift history' })
  @ApiQuery({ name: 'limit', required: false })
  async getShiftHistory(
    @Param('id') deviceId: string,
    @Query('limit') limit: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.getShiftHistory(
      deviceId,
      req.user.organizationId,
      limit || 30,
    );
  }

  @Get('devices/:id/shift/x-report')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get X-report (intermediate report)' })
  async getXReport(@Param('id') deviceId: string, @Req() req: AuthenticatedRequest) {
    return this.fiscalService.getXReport(deviceId, req.user.organizationId);
  }

  // ============================================
  // Receipt Operations
  // ============================================

  @Post('receipts')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create fiscal receipt' })
  async createReceipt(@Body() dto: CreateReceiptDto, @Req() req: AuthenticatedRequest) {
    return this.fiscalService.createReceipt(req.user.organizationId, dto);
  }

  @Get('receipts/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get receipt by ID' })
  async getReceipt(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.fiscalService.getReceipt(id, req.user.organizationId);
  }

  @Get('receipts')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get receipts with filters' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiQuery({ name: 'shiftId', required: false })
  @ApiQuery({ name: 'type', enum: FiscalReceiptType, required: false })
  @ApiQuery({ name: 'status', enum: FiscalReceiptStatus, required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getReceipts(
    @Query('deviceId') deviceId?: string,
    @Query('shiftId') shiftId?: string,
    @Query('type') type?: FiscalReceiptType,
    @Query('status') status?: FiscalReceiptStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Req() req?: AuthenticatedRequest,
  ) {
    return this.fiscalService.getReceipts(req!.user.organizationId, {
      deviceId,
      shiftId,
      type,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit || 50,
      offset: offset || 0,
    });
  }

  // ============================================
  // Queue Management
  // ============================================

  @Get('queue')
  @Roles('admin')
  @ApiOperation({ summary: 'Get queue items' })
  @ApiQuery({ name: 'status', enum: FiscalQueueStatus, required: false })
  async getQueueItems(
    @Query('status') status?: FiscalQueueStatus,
    @Req() req?: AuthenticatedRequest,
  ) {
    return this.fiscalService.getQueueItems(req!.user.organizationId, status);
  }

  @Post('queue/:id/retry')
  @Roles('admin')
  @ApiOperation({ summary: 'Retry queue item' })
  async retryQueueItem(@Param('id') id: string) {
    return this.fiscalService.processQueueItem(id);
  }
}
