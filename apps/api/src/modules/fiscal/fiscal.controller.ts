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
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { CurrentOrganizationId } from "../../common/decorators/current-user.decorator";
import { FiscalService } from "./services/fiscal.service";
import {
  CreateFiscalDeviceDto,
  UpdateFiscalDeviceDto,
  CreateFiscalReceiptDto,
  FilterFiscalReceiptsDto,
  OpenShiftDto,
  FilterShiftHistoryDto,
  FilterFiscalQueueDto,
} from "./dto";
import {
  FiscalDevice,
  FiscalShift,
  FiscalReceipt,
  FiscalQueue,
} from "./entities/fiscal.entity";

interface AuthenticatedRequest extends Request {
  user: {
    organizationId: string;
    id: string;
    role: string;
  };
}

@ApiTags("Fiscal")
@Controller("fiscal")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  // ============================================
  // Device Management
  // ============================================

  @Get("devices")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get all fiscal devices" })
  @ApiResponse({
    status: 200,
    description: "Returns list of fiscal devices",
    type: [FiscalDevice],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getDevices(@Req() req: AuthenticatedRequest) {
    return this.fiscalService.getDevices(req.user.organizationId);
  }

  @Get("devices/:id")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get fiscal device by ID" })
  @ApiResponse({
    status: 200,
    description: "Fiscal device found",
    type: FiscalDevice,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async getDevice(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.getDevice(id, req.user.organizationId);
  }

  @Post("devices")
  @Roles("admin")
  @ApiOperation({ summary: "Create new fiscal device" })
  @ApiResponse({
    status: 201,
    description: "Fiscal device created",
    type: FiscalDevice,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createDevice(
    @Body() dto: CreateFiscalDeviceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.createDevice(req.user.organizationId, dto);
  }

  @Put("devices/:id")
  @Roles("admin")
  @ApiOperation({ summary: "Update fiscal device" })
  @ApiResponse({
    status: 200,
    description: "Fiscal device updated",
    type: FiscalDevice,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async updateDevice(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateFiscalDeviceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.updateDevice(id, req.user.organizationId, dto);
  }

  @Post("devices/:id/activate")
  @Roles("admin")
  @ApiOperation({ summary: "Activate fiscal device" })
  @ApiResponse({
    status: 201,
    description: "Fiscal device activated",
    type: FiscalDevice,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async activateDevice(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.activateDevice(id, req.user.organizationId);
  }

  @Post("devices/:id/deactivate")
  @Roles("admin")
  @ApiOperation({ summary: "Deactivate fiscal device" })
  @ApiResponse({
    status: 201,
    description: "Fiscal device deactivated",
    type: FiscalDevice,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async deactivateDevice(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.deactivateDevice(id, req.user.organizationId);
  }

  @Get("devices/:id/stats")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get device statistics" })
  @ApiResponse({ status: 200, description: "Returns device statistics" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async getDeviceStatistics(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.getDeviceStatistics(id, req.user.organizationId);
  }

  // ============================================
  // Shift Management
  // ============================================

  @Post("devices/:id/shift/open")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Open fiscal shift" })
  @ApiResponse({
    status: 201,
    description: "Fiscal shift opened",
    type: FiscalShift,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async openShift(
    @Param("id", ParseUUIDPipe) deviceId: string,
    @Body() dto: OpenShiftDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.openShift(
      deviceId,
      req.user.organizationId,
      dto.cashier_name,
    );
  }

  @Post("devices/:id/shift/close")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Close fiscal shift (Z-report)" })
  @ApiResponse({
    status: 201,
    description: "Fiscal shift closed",
    type: FiscalShift,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async closeShift(
    @Param("id", ParseUUIDPipe) deviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.closeShift(deviceId, req.user.organizationId);
  }

  @Get("devices/:id/shift/current")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get current open shift" })
  @ApiResponse({
    status: 200,
    description: "Returns current open shift",
    type: FiscalShift,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async getCurrentShift(
    @Param("id", ParseUUIDPipe) deviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.fiscalService.getDevice(deviceId, req.user.organizationId);
    return this.fiscalService.getCurrentShift(deviceId);
  }

  @Get("devices/:id/shift/history")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get shift history" })
  @ApiResponse({
    status: 200,
    description: "Returns shift history",
    type: [FiscalShift],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async getShiftHistory(
    @Param("id", ParseUUIDPipe) deviceId: string,
    @Query() filterDto: FilterShiftHistoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.getShiftHistory(
      deviceId,
      req.user.organizationId,
      filterDto.limit || 30,
    );
  }

  @Get("devices/:id/shift/x-report")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get X-report (intermediate report)" })
  @ApiResponse({ status: 200, description: "Returns X-report data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal device not found" })
  async getXReport(
    @Param("id", ParseUUIDPipe) deviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.getXReport(deviceId, req.user.organizationId);
  }

  // ============================================
  // Receipt Operations
  // ============================================

  @Post("receipts")
  @Roles("admin", "manager")
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 receipts/min per user
  @ApiOperation({ summary: "Create fiscal receipt" })
  @ApiResponse({
    status: 201,
    description: "Fiscal receipt created",
    type: FiscalReceipt,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createReceipt(
    @Body() dto: CreateFiscalReceiptDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.createReceipt(req.user.organizationId, dto);
  }

  @Get("receipts/:id")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get receipt by ID" })
  @ApiResponse({
    status: 200,
    description: "Fiscal receipt found",
    type: FiscalReceipt,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Fiscal receipt not found" })
  async getReceipt(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.getReceipt(id, req.user.organizationId);
  }

  @Get("receipts")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get receipts with filters" })
  @ApiResponse({
    status: 200,
    description: "Returns list of fiscal receipts",
    type: [FiscalReceipt],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getReceipts(
    @Query() filterDto: FilterFiscalReceiptsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.getReceipts(req.user.organizationId, {
      deviceId: filterDto.device_id,
      shiftId: filterDto.shift_id,
      type: filterDto.type,
      status: filterDto.status,
      startDate: filterDto.start_date
        ? new Date(filterDto.start_date)
        : undefined,
      endDate: filterDto.end_date ? new Date(filterDto.end_date) : undefined,
      limit: filterDto.limit || 50,
      offset: filterDto.offset || 0,
    });
  }

  // ============================================
  // Queue Management
  // ============================================

  @Get("queue")
  @Roles("admin")
  @ApiOperation({ summary: "Get queue items" })
  @ApiResponse({
    status: 200,
    description: "Returns list of queue items",
    type: [FiscalQueue],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getQueueItems(
    @Query() filterDto: FilterFiscalQueueDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.fiscalService.getQueueItems(
      req.user.organizationId,
      filterDto.status,
    );
  }

  @Post("queue/:id/retry")
  @Roles("admin")
  @ApiOperation({ summary: "Retry queue item" })
  @ApiResponse({
    status: 201,
    description: "Queue item retried",
    type: FiscalQueue,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Queue item not found" })
  async retryQueueItem(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.fiscalService.processQueueItem(id, orgId);
  }
}
